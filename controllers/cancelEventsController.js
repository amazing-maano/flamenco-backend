/* eslint-disable no-underscore-dangle */
const Product = require('../models/productsModel');
const User = require('../models/userModel');
const Order = require('../models/ordersModel');

const { sendMail } = require('../utils/mail');
const { setOrigin } = require('../utils/origins');

const { ERROR_TYPES } = require('../config/errorTypes');

const { EMAIL_TEMPLATE_IDS } = require('../config/dynamiceEmailTemplateIds');

const {
  sender_email,
  ana_email,
  coqui_email,
} = require('../config/environment');

module.exports = {
  // to cancel the purchases subscription for an event
  cancelEventSubscription: async (req, res) => {
    try {
      const origin = await setOrigin(req.headers);

      const user = await User.findOne({
        _id: req.userId,
      });

      const product = await Product.findOne({
        _id: req.params.productId,
      });

      const findOrder = await Order.findOne({
        buyerId: req.userId,
        productId: req.params.productId,
        isPaid: true,
      });

      if (!user) {
        return res.status(404).send({
          success: false,
          msg: ERROR_TYPES.USER_NOT_FOUND,
        });
      }
      if (!product) {
        return res.status(404).send({
          success: false,
          msg: ERROR_TYPES.PRODUCT_NOT_FOUND,
        });
      }
      if (!findOrder) {
        return res.status(404).send({
          success: false,
          msg: ERROR_TYPES.ORDER_NOT_FOUND,
        });
      }

      const msg = {
        to: [ana_email, coqui_email],
        from: sender_email,
        templateId: EMAIL_TEMPLATE_IDS.CANCEL_EVENT_SUBSCRIPTION_REQUEST,
        dynamic_template_data: {
          subscriptionId: `${findOrder.subscriptionID}`,
          user: `${origin}profile/${user.profile}`,
          event: `${origin}event/${product._id}`,
        },
      };

      sendMail(msg);
      return res.status(200).send('REQUEST_SENT');
    } catch (error) {
      return res.status(500).send(error.message);
    }
  },

  // to delete the event created by a host
  deleteEvent: async (req, res) => {
    try {
      const origin = await setOrigin(req.headers);

      const user = await User.findOne({
        _id: req.userId,
      });
      const product = await Product.findOne({
        _id: req.params.productId,
      });

      if (!user) {
        return res.status(404).send({
          success: false,
          msg: ERROR_TYPES.USER_NOT_FOUND,
        });
      }
      if (!product) {
        return res.status(404).send({
          success: false,
          msg: ERROR_TYPES.PRODUCT_NOT_FOUND,
        });
      }

      const msg = {
        to: [ana_email, coqui_email],
        from: sender_email,
        templateId: EMAIL_TEMPLATE_IDS.DELETE_EVENT_REQUEST,
        dynamic_template_data: {
          user: `${origin}profile/${user.profile}`,
          event: `${origin}event/${product._id}`,
        },
      };

      sendMail(msg);

      return res.status(200).send('REQUEST_SENT');
    } catch (error) {
      return res.status(500).send(error.message);
    }
  },
};
