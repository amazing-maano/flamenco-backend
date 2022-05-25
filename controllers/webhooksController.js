const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const Profile = require('../models/profileModel');
const Orders = require('../models/ordersModel');
const Notifier = require('../utils/notifications');
const BookedSessions = require('../models/bookedSessionsModel');
const ProductVariants = require('../models/productVariantsModel');

const {
  setOrderSuccessful,
  updateSubscriptionOrder,
} = require('../utils/setOrderSuccessful');

const {
  stripe_webhook_key,
  stripe_connect_webhook_key,
} = require('../config/environment');

const { ERROR_TYPES } = require('../config/errorTypes');

const {
  ORDER_NOT_FOUND,
  METADATA_NOT_FOUND,
  SUBSCRIPTION_ALREADY_HANDLED_BY_INVOICE_PAID,
} = ERROR_TYPES;

module.exports = {
  webhook: async (req, res) => {
    try {
      // Only for platform stripe account
      // const event = req.body;
      const sig = req.headers['stripe-signature'];
      let event;
      try {
        event = await stripe.webhooks.constructEvent(
          req.rawBody,
          sig,
          stripe_webhook_key,
        );
      } catch (err) {
        // console.log(err);
        res.status(400).send(`Webhook Error: ${err.message}`);
      }
      // Handle the event
      switch (event.type) {
        case 'payment_intent.succeeded': {
          const paymentIntent = event.data.object;
          console.log(paymentIntent);
          break;
        }
        default:
          console.log(`Unhandled event type ${event.type}`);
      }
      return res.json({ received: true });
    } catch (err) {
      return res.status(403).send(err.message);
    }
  },

  webhookConnectedAccount: async (req, res) => {
    console.log('webhookConnectedAccount');
    try {
      // For stripe connected accounts
      // const event = req.body;
      const sig = req.headers['stripe-signature'];
      let event;
      try {
        event = await stripe.webhooks.constructEvent(
          req.rawBody,
          sig,
          stripe_connect_webhook_key,
        );
      } catch (err) {
        // console.log(err);
        return res.status(400).send(`Connect webhook Error: ${err.message}`);
      }

      switch (event.type) {
        case 'account.updated': {
          const account = event.data.object;
          // console.log('account', account);
          const profile = await Profile.findOne({ stripeAccount: account.id });
          if (
            Object.keys(account.requirements.currently_due).length
            || Object.keys(account.requirements.pending_verification).length
          ) {
            profile.stripeVerificationStatus = 'pending';
            await profile.save();
          } else {
            const wasStripeConnected = profile.isStripeConnected;
            profile.isStripeConnected = account.payouts_enabled || profile.isStripeConnected;
            profile.stripeVerificationStatus = 'completed';
            await profile.save();
            // Send notification on stripe profile compeletion (i.e. payouts enable)
            if (!wasStripeConnected && profile.isStripeConnected) {
              Notifier.notifyUser(
                profile.user,
                'profileUpdated',
                'STRIPE_CONNECTED',
                '',
                '',
                '',
                null,
                null,
              );
            }
          }

          // console.log(profile);
          break;
        }
        case 'payment_intent.succeeded': {
          const paymentIntent = event.data.object;
          // console.log(paymentIntent, 'paymentIntent');
          if (!paymentIntent.metadata.orderId && paymentIntent.invoice) {
            return res.status(200).json({
              received: true,
              message: SUBSCRIPTION_ALREADY_HANDLED_BY_INVOICE_PAID,
            });
          }
          if (!paymentIntent.metadata.orderId && !paymentIntent.invoice) {
            return res
              .status(404)
              .json({ received: false, message: METADATA_NOT_FOUND });
          }
          const { orderId, origin } = paymentIntent.metadata;
          const responseObj = await setOrderSuccessful(orderId, origin);
          if (responseObj.statusCode === 404) {
            return res
              .status(responseObj.statusCode)
              .json(responseObj.responseBody);
          }
          break;
        }
        case 'invoice.paid': {
          const invoicePaidIntent = event.data.object;
          // console.log(invoicePaidIntent, 'invoicePaidIntent');
          if (!invoicePaidIntent.lines.data[0].metadata.orderId) {
            return res
              .status(404)
              .json({ received: false, message: METADATA_NOT_FOUND });
          }
          const { orderId, origin, isSearchedEvent } = invoicePaidIntent.lines.data[0].metadata;
          const subscriptionID = invoicePaidIntent.subscription;
          const order = await Orders.findOne({ subscriptionID });
          let responseObj = {};
          if (!!order && order?.isPaid) {
            responseObj = await updateSubscriptionOrder(subscriptionID);
          } else {
            responseObj = await setOrderSuccessful(
              orderId,
              origin,
              subscriptionID,
              isSearchedEvent,
            );
          }

          if (responseObj.statusCode === 404) {
            return res
              .status(responseObj.statusCode)
              .json(responseObj.responseBody);
          }
          break;
        }
        case 'invoice.payment_failed':
        case 'invoice.payment_action_required': {
          const invoicePaidIntentFailed = event.data.object;
          // console.log(invoicePaidIntentFailed.lines.data[0].metadata);
          const { orderId } = invoicePaidIntentFailed.lines.data[0].metadata;
          const order = await Orders.findOne({ _id: orderId });

          if (!order) {
            res.status(404).json({
              success: false,
              msg: ORDER_NOT_FOUND,
            });
          }

          try {
            await Orders.findOneAndUpdate(
              { _id: orderId },
              { $set: { isPaid: false } },
              { returnNewDocument: true, new: true },
            );

            const bookedSessionsArray = await BookedSessions.find({
              attendee: order.buyerId,
              productId: order.productId,
              // eslint-disable-next-line no-underscore-dangle
              orderId: order._id,
              startTime: { $gte: new Date() },
            });

            const ids = [];
            const productVarientIds = [];
            bookedSessionsArray.forEach((bookedSession) => {
              // eslint-disable-next-line no-underscore-dangle
              ids.push(bookedSession._id);
              productVarientIds.push(bookedSession.bookedSlotId);
            });

            await Profile.findOneAndUpdate(
              {
                user: order.buyerId,
              },
              {
                $pull: {
                  bookedSessionsByStudent: { $in: ids },
                },
              },
              { returnOriginal: false },
            );

            await ProductVariants.updateMany(
              {
                _id: { $in: productVarientIds },
              },
              { $inc: { seatsAvailable: 1 } },
              {
                multi: true,
              },
            );

            await Profile.findOneAndUpdate(
              {
                user: order.eventHostId,
              },
              {
                $inc: { totalSessionsPurchased: -bookedSessionsArray.length },
              },
              { returnOriginal: false },
            );

            await BookedSessions.deleteMany({ _id: { $in: ids } });
          } catch (err) {
            return res.status(500).json({
              success: false,
              msg: err.message,
            });
          }

          break;
        }
        default:
          console.log(`Unhandled event type ${event.type}`);
      }
      return res.json({ received: true });
    } catch (err) {
      return res.status(403).send(err);
    }
  },
};
