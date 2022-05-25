/* eslint-disable no-underscore-dangle */
const moment = require('moment');

const User = require('../models/userModel');
const Profile = require('../models/profileModel');
const Product = require('../models/productsModel');
const ProductVariants = require('../models/productVariantsModel');
const Contacts = require('../models/contactsModel');
const BookedSessions = require('../models/bookedSessionsModel');
const Orders = require('../models/ordersModel');
const Invites = require('../models/invitesModel');

const { sendMail } = require('./mail');

const { sender_email } = require('../config/environment');

const {
  ERROR_TYPES,
} = require('../config/errorTypes');

const {
  SUCCESS_MSG_TYPES,
} = require('../config/successMsgTypes');

const {
  DATA_MISSING,
  ORDER_NOT_FOUND,
  PRODUCT_NOT_FOUND,
} = ERROR_TYPES;

const {
  SUBSCRIPTION_RENEWED,
} = SUCCESS_MSG_TYPES;

const { EMAIL_TEMPLATE_IDS } = require('../config/dynamiceEmailTemplateIds');

let templateId;
let subject;
let text;

const getFormattedError = ({ statusCode, msg }) => ({
  statusCode,
  responseBody: {
    success: false,
    msg,
  },
});

const getTotalSum = ({ currentBalance, amountPaid }) => {
  const amountsArray = [currentBalance, amountPaid].map((elem) => parseInt(elem, 10));
  return amountsArray.reduce((a, b) => a + b, 0);
};

const getOrderParticipentsData = async ({
  orderId,
  subscriptionID,
  isUpdateSubscriptionOrder = false,
}) => {
  const orderFilters = isUpdateSubscriptionOrder ? { subscriptionID } : { _id: orderId };
  const order = await Orders.findOne(orderFilters);
  if (!order) {
    return {
      error: getFormattedError({ statusCode: 404, msg: ORDER_NOT_FOUND }),
      data: null,
    };
  }
  const product = await Product.findOne({ _id: order.productId });

  if (!product) {
    return {
      error: getFormattedError({ statusCode: 404, msg: PRODUCT_NOT_FOUND }),
      data: null,
    };
  }

  const buyerProfile = await Profile.findOne({ user: order.buyerId });
  const newTotalSpentByBuyer = getTotalSum({
    currentBalance: buyerProfile.numtotalSpent,
    amountPaid: order.amountPaid,
  });

  const hostProfile = await Profile.findOne({ user: order.eventHostId });
  const newTotalEarningsByEventHost = getTotalSum({
    currentBalance: hostProfile.numtotalEarnings,
    amountPaid: order.amountPaid,
  });

  const newTotalProductEarnings = getTotalSum({
    currentBalance: product.productTotalEarnings,
    amountPaid: order.amountPaid,
  });

  return {
    error: null,
    data: {
      order,
      product,
      buyerProfile,
      hostProfile,
      newTotalSpentByBuyer,
      newTotalEarningsByEventHost,
      newTotalProductEarnings,
    },
  };
};

module.exports = {

  updateSubscriptionOrder: async (subscriptionID) => {
    const {
      error,
      data,
    } = await getOrderParticipentsData({
      subscriptionID,
      isUpdateSubscriptionOrder: true,
    });

    if (error) {
      return error;
    }

    if (!data) {
      return getFormattedError({ statusCode: 404, msg: DATA_MISSING });
    }

    const {
      order,
      newTotalSpentByBuyer,
      newTotalEarningsByEventHost,
      newTotalProductEarnings,
    } = data || {};

    try {
      await Profile.findOneAndUpdate({
        user: order.buyerId,
      }, {
        $set: { numtotalSpent: newTotalSpentByBuyer },
      }, { upsert: true, returnOriginal: false });

      await Profile.findOneAndUpdate({
        user: order.eventHostId,
      }, {
        $set: {
          numtotalEarnings: newTotalEarningsByEventHost,
        },

      }, { upsert: true, returnOriginal: false });

      await Product.findOneAndUpdate({
        _id: order.productId,
      }, {
        $set: {
          productTotalEarnings: newTotalProductEarnings,
        },
      },
      { upsert: true, returnOriginal: false });
    } catch (err) {
      return {
        statusCode: 500,
        responseBody: {
          success: false,
          msg: err.message,
        },
      };
    }

    return {
      statusCode: 200,
      responseBody: {
        success: true,
        msg: SUBSCRIPTION_RENEWED,
      },
    };
  },

  setOrderSuccessful: async (orderId, origin, subscriptionID) => {
    const {
      error,
      data,
    } = await getOrderParticipentsData({
      orderId,
      subscriptionID,
      isUpdateSubscriptionOrder: false,
    });

    if (error) {
      return error;
    }

    if (!data) {
      return getFormattedError({ statusCode: 404, msg: DATA_MISSING });
    }

    const {
      order,
      product,
      buyerProfile,
      hostProfile,
      newTotalSpentByBuyer,
      newTotalEarningsByEventHost,
      newTotalProductEarnings,
    } = data;

    const bookedSessions = order.bookedSessions.map((bookedSession) => ({
      ...bookedSession,
      orderId: order._id,
    }));
    const bookedSessionsArray = await BookedSessions.insertMany(bookedSessions);

    const { startTime } = bookedSessionsArray[0];
    const time = moment(startTime).format('hh:mmA');
    const dates = bookedSessionsArray.map((x) => x.startTime.toDateString());

    const buyer = await User.findOne({ _id: order.buyerId });
    const host = await User.findOne({ _id: order.eventHostId });

    const checkIfUserWasInvited = await Invites.findOne({
      productId: order.productId,
      userId: order.buyerId,
      invitedBy: order.eventHostId,
    });

    if (checkIfUserWasInvited) {
      await Invites.findOneAndUpdate({
        _id: checkIfUserWasInvited._id,
      }, {
        $set: { hasAcceptedEventInvite: true },

      }, { upsert: true, returnOriginal: false });
    }

    await ProductVariants.updateMany({
      _id: { $in: order.bookedSessionId },
      seatsAvailable: { $gt: 0 },
    }, { $inc: { seatsAvailable: -1 } }, {
      multi: true,
    });

    await Profile.findOneAndUpdate({
      user: order.buyerId,
    }, {
      $set: { numtotalSpent: newTotalSpentByBuyer },
      $inc: { totalOrdersByStudent: 1 },
      $addToSet: {
        bookedEventsByStudent: order.productId,
        bookedSessionsByStudent: bookedSessionsArray,
      },
      $push: {
        studentPurchasedProductAt: Date.now(),
      },

    }, { upsert: true, returnOriginal: false });

    await Profile.findOneAndUpdate({
      user: order.eventHostId,
    }, {
      $inc: { totalProductPurchased: 1, totalSessionsPurchased: bookedSessionsArray.length },
      $push: { productPurchasedAt: Date.now() },
      $addToSet: { totalStudents: order.buyerId },
      $set: {
        numtotalEarnings: newTotalEarningsByEventHost,
      },

    }, { upsert: true, returnOriginal: false });

    await Product.findOneAndUpdate({
      _id: order.productId,
    }, {
      $set: {
        productTotalEarnings: newTotalProductEarnings,
      },
      $addToSet: {
        numberOfStudents: order.buyerId,
        bookedEventSessions: bookedSessionsArray,
      },
      $push: {
        totalEarnings: order.amountPaid,
      },
    },
    { upsert: true, returnOriginal: false });

    const updateOrder = await Orders.findOneAndUpdate(
      { _id: orderId },
      {
        $set: {
          isPaid: true,
          subscriptionID,
        },
      },
      { returnNewDocument: true, new: true },
    );
    console.log(updateOrder.subscriptionID);
    await Contacts.findOneAndUpdate({
      user: order.buyerId,
    }, {
      $addToSet: {
        contacts: order.eventHostId,
      },
    }, { upsert: true, returnOriginal: false });

    await Contacts.findOneAndUpdate({
      user: order.eventHostId,
    }, {
      $addToSet: {
        contacts: order.buyerId,
      },
    }, { upsert: true, returnOriginal: false });

    const sessions = await ProductVariants.find({
      productId: product._id,
      endTime: { $gte: new Date() },
      seatsAvailable: { $gt: 0 },
    });

    if (sessions.length === 0) {
      await Product.findOneAndUpdate(
        { _id: product._id },
        {
          $set: {
            isSoldOut: true,
            isPublished: false,
          },
        },
        {
          upsert: true,
          returnOriginal: false,
        },
      );

      const lang = 'es'; // Setting default lang to es for now until it's being stored in the DB.
      if (lang === 'en') {
        subject = '🤩  You are rocking Vive Flamenco!';
        text = `Hi ${hostProfile.firstName},\n\nCongratulations!\n\nYour ${product.productType} ${product.productName} is at capacity! Open a new one today via your profile!.\n\nThe Vive Flamenco Team\n“She would be half a planet away, floating in a turquoise sea, dancing by moonlight to flamenco guitar.” `;
      } else {
        subject = '🤩¡  Estás rockeando Vive Flamenco!';
        text = `Hola ${hostProfile.firstName}, \n\n¡Felicidades!\n\n¡tu ${product.productType} ${product.productName} está a capacidad! ¡Abra uno nuevo hoy a través de tu perfil! .\n\nEl equipo de Vive Flamenco\n\n“Ella estaría a medio planeta de distancia, flotando en un mar turquesa, bailando a la luz de la luna al son de la guitarra flamenca”.`;
      }

      const msg = {
        to: host.email,
        from: sender_email,
        subject,
        text,
      };

      sendMail(msg);
    }

    // send mail
    // Conditions need to be fixed
    const lang = 'es'; // temp variable needs to be removed later
    let msg;
    if (updateOrder.subscriptionID !== null) {
      if (lang === 'en') {
        templateId = EMAIL_TEMPLATE_IDS.ENGLISH_SUBSCRIPTION_CREATED;
      } else {
        templateId = EMAIL_TEMPLATE_IDS.SPANISH_SUBSCRIPTION_CREATED;
      }
      msg = {
        to: buyer.email,
        from: sender_email,
        templateId,
        dynamic_template_data: {
          firstName: `${buyerProfile.firstName}`,
          productName: `${product.productName}`,
          url: `${origin}event/${product._id}`,
          dates: `${dates[0]}`,
          time: `${time}`,
        },
      };
    } else {
      if (lang === 'en') {
        templateId = EMAIL_TEMPLATE_IDS.ENGLISH_ONLINE_PURCHASE;
      } else {
        templateId = EMAIL_TEMPLATE_IDS.SPANISH_ONLINE_PURCHASE;
      }

      msg = {
        to: buyer.email,
        from: sender_email,
        templateId,
        dynamic_template_data: {
          firstName: `${buyerProfile.firstName}`,
          productName: `${product.productName}`,
          url: `${origin}event/${product._id}`,
        },
      };
    }

    sendMail(msg);

    // Conditions need to be fixed
    if (lang === 'en') {
      templateId = EMAIL_TEMPLATE_IDS.ENGLISH_NEW_REGISTERATION;
    } else {
      templateId = EMAIL_TEMPLATE_IDS.SPANISH_NEW_REGISTERATION;
    }
    const msg2 = {
      to: host.email,
      from: sender_email,
      templateId,
      dynamic_template_data: {
        firstName: `${hostProfile.firstName}`,
        studentName: `${buyerProfile.firstName}`,
        productName: `${product.productName}`,
        productType: `${product.productType}`,
        url: `${origin}event/${product._id}`,
      },
    };

    sendMail(msg2);

    return {
      statusCode: 200,
      responseBody: {
        received: true,
      },
    };
  },

};
