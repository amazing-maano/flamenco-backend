/* eslint-disable consistent-return */
/* eslint-disable no-unused-vars */
/* eslint-disable no-underscore-dangle */
const mongoose = require('mongoose');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const countryJS = require('country-js');
const moment = require('moment');

const User = require('../models/userModel');
const Profile = require('../models/profileModel');
const Product = require('../models/productsModel');
const Orders = require('../models/ordersModel');
const BookedSessions = require('../models/bookedSessionsModel');
const ProductVariants = require('../models/productVariantsModel');
const Contacts = require('../models/contactsModel');

const { setOrderSuccessful } = require('../utils/setOrderSuccessful');
const { setOrigin } = require('../utils/origins');

const {
  ERROR_TYPES,
} = require('../config/errorTypes');

const {
  DATA_MISSING,
  USER_NOT_FOUND,
  TOKEN_VERIFIED,
  PRODUCT_NOT_FOUND,
  PRODUCT_NOT_PUBLISHED,
  SCHEDULEIDS_ARE_MISSING,
  SCHEDULES_ARE_NOT_FOUND_IN_PRODUCT,
  PRODUCT_VARIANT_NOT_FOUND,
  PRODUCT_HOST_NOT_FOUND,
  HOST_PAYOUTS_NOT_ENABLED,
  INVALID_COMBO_SESSIONS_COUNT,
  SESSIONS_OUT_OF_RANGE_FOR_GIVEN_PACKAGE,
  SOLD_OUT_SESSION,
} = ERROR_TYPES;

module.exports = {

  bookProduct: async (req, res) => {
    // console.log(req.body);

    try {
      const origin = await setOrigin(req.headers);

      const data = req.body;
      // console.log(data, 'data');
      if (Object.getOwnPropertyNames(data).length === 0) {
        return res.status(400).json({
          msg: DATA_MISSING,
        });
      }
      const user = await User.findOne({ _id: req.userId })
        .populate('inviteId');

      if (!user) {
        return res.status(404).send({
          success: false,
          msg: USER_NOT_FOUND,
        });
      }

      const profile = await Profile.findOne({ user: req.userId });

      const product = await Product.findOne({ _id: req.params.productId })
        .populate('schedule')
        .populate('variantTypes');
      if (!product) {
        return res.status(404).send({
          success: false,
          msg: PRODUCT_NOT_FOUND,
        });
      }

      if (product && product.isPublished === false) {
        return res.status(404).send({
          success: false,
          msg: PRODUCT_NOT_PUBLISHED,
        });
      }
      // console.log(product);
      if (!(data.scheduleIds && data.scheduleIds.length)) {
        return res.status(404).send({
          success: false,
          msg: SCHEDULEIDS_ARE_MISSING,
        });
      }

      if (data.scheduleIds.every((id) => product.schedule.some((s) => s._id === id))) {
        return res.status(404).send({
          success: false,
          msg: SCHEDULES_ARE_NOT_FOUND_IN_PRODUCT,
        });
      }

      const schedules = await ProductVariants.find({ _id: { $in: data.scheduleIds } });

      if (data.scheduleIds.every((id) => schedules.some((s) => s.seatsAvailable === 0))) {
        return res.status(404).send({
          success: false,
          msg: SOLD_OUT_SESSION,
        });
      }

      const scheduleIds = schedules.map((s) => s._id.toString());

      const vtype = product.variantTypes.find((v) => v._id.toString() === data.bookedVariantType);

      // console.log(vtype, 'vtype');

      if (!vtype) {
        return res.status(404).send({
          success: false,
          msg: PRODUCT_VARIANT_NOT_FOUND,
        });
      }
      // console.log(vtype, 'vtype');

      const hostProfile = await Profile.findOne({ user: product.user })
        .populate('user');

      if (!hostProfile) {
        return res.status(404).send({
          success: false,
          msg: PRODUCT_HOST_NOT_FOUND,
        });
      }
      if (!hostProfile.isStripeConnected || !hostProfile.stripeAccount) {
        return res.status(404).send({
          success: false,
          msg: HOST_PAYOUTS_NOT_ENABLED,
        });
      }
      // console.log('host', hostProfile);

      let buyerCurrencyCode;
      let hostCurrencyCode;

      const buyerCountryCurrency = countryJS.search(profile.location.address.split(' ').pop());
      if (buyerCountryCurrency.length > 0) {
        buyerCurrencyCode = buyerCountryCurrency[0].currency.currencyCode;
      }
      // console.log(buyerCurrencyCode, 'buyerCurrencyCode');

      const hostCountryCurrency = countryJS.search(hostProfile.location.address.split(' ').pop());
      if (hostCountryCurrency.length > 0) {
        hostCurrencyCode = hostCountryCurrency[0].currency.currencyCode;
      }
      // console.log(hostCurrencyCode, 'hostCurrencyCode');

      let amount = vtype.price;
      const oneDayMilliseconds = 1000 * 60 * 60 * 24;
      schedules.sort((s1, s2) => new Date(s1.startTime) - new Date(s2.startTime));
      const timeDelta = new Date(schedules[schedules.length - 1].startTime) - Date.now();
      const noOfDays = timeDelta / oneDayMilliseconds;
      // console.log(noOfDays);
      if (vtype.frequency === 'single') {
        amount = vtype.price * schedules.length;
      } else if (vtype.frequency === 'combo') {
        // check does sessions are multiple of given combo

        // uncomment below code to enable multiple of combo
        // if (schedules.length % vtype.daysCount !== 0) {
        //   return res.status(400).send({ success: false, message: INVALID_COMBO_SESSIONS_COUNT });
        // }
        // amount = (schedules.length / vtype.daysCount) * vtype.price;

        // comment below code to when you enable multiple of combo
        if (schedules.length > vtype.daysCount) {
          return res.status(400).send({ success: false, message: INVALID_COMBO_SESSIONS_COUNT });
        }
      }
      // else if (vtype.frequency === 'month') {
      //   if (noOfDays > 30) {
      //     return res.status(400).send({
      //       success: false,
      //       message: SESSIONS_OUT_OF_RANGE_FOR_GIVEN_PACKAGE,
      //     });
      //   }
      // } else if (vtype.frequency === 'year') {
      //   // check does sessions are in range of given packages
      //   if (noOfDays > 365) {
      //     return res.status(400).send({
      //       success: false,
      //       message: SESSIONS_OUT_OF_RANGE_FOR_GIVEN_PACKAGE,
      //     });
      //   }
      // }
      // await exchangeRates().latest().symbols(['USD', 'GBP']).fetch();
      const bookedSlots = schedules.map((item) => ({
        attendee: req.userId,
        productId: req.params.productId,
        startTime: item.startTime,
        endTime: item.endTime,
        bookedVariantType: vtype._id,
        bookedSlotId: item._id,
        sessionCode: item.sessionCode,
      }));

      const newOrder = new Orders({
        buyerId: req.userId,
        transactionId: data.transactionId,
        productId: product._id,
        eventHostId: hostProfile.user,
        // isPaid: data.isPaid,
        amountPaid: amount,
        bookedSessions: bookedSlots,
        bookedSessionId: scheduleIds,
      });

      await newOrder.save();

      if (amount === 0) {
        setOrderSuccessful(newOrder);
        return res.status(200).json({
          newOrder,
        });
      }

      const feePercent = ((user.isInvited && user.isInvited === true)
        && (user.inviteId.invitedBy.toString() === hostProfile.user._id.toString()
        )) ? 5 : 15;

      console.log(feePercent, 'feePercent');

      // Calculate the percent.
      const feeAmount = ((feePercent / 100) * amount).toFixed(0);
      const feeAmount2 = (Math.round(amount * feePercent) / 100).toFixed(0);
      console.log(feeAmount, 'feeAmount');

      console.log(amount, 'amount');
      const checkoutSessionParameters = {
        customer_email: user.email,
        payment_method_types: ['card'],
        success_url: `${origin}dashboard/mysessions`,
        cancel_url: `${origin}event/${product._id}`,
      };
      if (vtype.frequency.toLowerCase() === 'month' || vtype.frequency.toLowerCase() === 'year') {
        checkoutSessionParameters.mode = 'subscription';
        checkoutSessionParameters.line_items = [{
          price: vtype.priceId,
          quantity: 1,
        }];
        checkoutSessionParameters.subscription_data = {
          metadata: {
            orderId: newOrder._id.toString(),
            origin,
            user: req.userId,
            isSearchedEvent: data.searchedEvent,
          },
          application_fee_percent: feePercent,
        };
      } else {
        checkoutSessionParameters.mode = 'payment';
        checkoutSessionParameters.line_items = [{
          price_data: {
            // currency: buyerCurrencyCode,
            currency: hostCurrencyCode || 'EUR',
            product_data: {
              name: product.productName,
            },
            unit_amount: amount * 100,
          },
          quantity: 1,
        }];
        checkoutSessionParameters.payment_intent_data = {
          metadata: {
            orderId: newOrder._id.toString(),
            origin,
            user: req.userId,
          },
          application_fee_amount: feeAmount * 100,
        };
      }
      // console.log(checkoutSessionParameters, 'checkoutSessionParameters');
      const session = await stripe.checkout.sessions.create(
        checkoutSessionParameters, { stripeAccount: hostProfile.stripeAccount },
      );
      // console.log(session, 'session');
      return res.status(200).json({
        bookedSlots, sessionId: session.id,
      });
    } catch (err) {
      // console.log(err);
      return res.status(500).send(err.message);
    }
  },

  getBookedSessionsByUserId: async (req, res) => {
    try {
      const ongoingSessions = [];
      const upcomingSessions = [];
      const time = moment.utc();

      const userSession = await BookedSessions.find({
        attendee: req.userId, endTime: { $gte: new Date() },
      })
        .populate({
          path: 'productId',
          select: '_id productName productType productImageURL numberOfSeats currency -variantTypes',
          populate: {
            path: 'schedule',
            model: 'ProductVariants',
            select: '_id user classType sessionCode seatsAvailable',
          },
        })
        .populate('bookedVariantType')
        .sort({ endTime: 1 });

      if (userSession.length === 0) {
        return res.status(200).send({
          msg: TOKEN_VERIFIED,
          ongoingSessions,
          upcomingSessions,
        });
      }

      userSession.forEach((session, index) => {
        const startTime = moment.utc(session.startTime);
        const endTime = moment.utc(session.endTime);

        if (time.isSame(startTime)
             || time.isSame(endTime)
             || time.isBetween(startTime, endTime)
        ) {
          ongoingSessions.push(session);
        } else if (time.isBefore(startTime)) {
          upcomingSessions.push(session);
        }

        if (userSession.length === index + 1) {
          return res.status(200).send({
            msg: TOKEN_VERIFIED,
            ongoingSessions,
            upcomingSessions,
          });
        }
      });
    } catch (err) {
      return res.status(500).send(err.message);
    }
  },
  getPaymentDetailsByUser: async (req, res) => {
    try {
      const data = await Orders.find({
        buyerId: req.userId,
      }).select(['isPaid', 'amountPaid', 'paymentMethod', 'cardNumber', 'cardExpiryMonth', 'cardExpiryYear'])
        .sort({ createdAt: -1 })
        .limit(1);
      return res.status(200).send({
        msg: TOKEN_VERIFIED,
        paymentDetails: data,
      });
    } catch (err) {
      return res.status(500).send(err.message);
    }
  },
  getContacts: async (req, res) => {
    try {
      const data = await Contacts.find({
        user: req.userId,
      }).populate({
        path: 'contacts',
        select: '_id profile',
        populate: {
          path: 'profile',
          model: 'Profile',
          select: '_id firstName lastName profileImage role -eventsByHost',
        },
      });
      return res.status(200).send({
        msg: TOKEN_VERIFIED,
        contacts: data,
      });
    } catch (err) {
      return res.status(500).send(err.message);
    }
  },
};
