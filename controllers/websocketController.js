/* eslint-disable no-underscore-dangle */
/* eslint-disable func-names */
const { JSONCodec } = require('nats');
const natsWrapper = require('../utils/natsWrapper');
const { notificationsChannelPrefix } = require('../config/environment');
const Notification = require('../models/notificationsModel');
const Contacts = require('../models/contactsModel');
const Chats = require('../models/chatsModel');
const ChatNotifier = require('../utils/chats');
const ContactNotifier = require('../utils/addContact');

const messageHandler = function (message, ws) {
  ws.send(message);
};

const notificationsHandler = function (notification, ws) {
  ws.send(JSON.stringify(notification));
};

exports.websocketHandler = (ws, userId) => {
  // Register message handler, which can be extended to handle chat
  // eslint-disable-next-line consistent-return
  ws.on('message', (message) => {
    messageHandler(message, ws);
    const messageObj = JSON.parse(message);

    if (messageObj.type !== undefined && messageObj.type === 'chat') {
      return ChatNotifier.chatNotifier(
        userId,
        messageObj.receiverId,
        messageObj.type,
        messageObj.message,
      );
    }

    if (messageObj.type === 'room') {
      const perPage = Number(messageObj.limit);
      const page = Math.max(0, Number(messageObj.skip));
      // Send all available messages to a limit
      Chats.find({
        $or: [{ senderId: userId, receiverId: messageObj.id },
          { senderId: messageObj.id, receiverId: userId }],
      })
        .skip(perPage * page)
        .limit(perPage)
        .sort('-createdAt')
        .populate({
          path: 'senderId',
          select: '_id profile',
          populate: {
            path: 'profile',
            model: 'Profile',
            select: '-stripeVerificationStatus -profileBelt -stripeAccount -userCurrency -languages -languages -eventsByHost -location -taxonomies -socialLinks -isStripeConnected -numtotalSpent -counts -numtotalEarnings -totalReviews -totalStudents -totalProductPurchased -productPurchasedAt -totalSessionsPurchased -bio -methodology -profileLevel -dob -totalSessionsByHost -totalEventsByHost -studentPurchasedProductAt -countUpdatedAt -bookedEventsByStudent -bookedSessionsByStudent -totalOrdersByStudent -videoLink -phoneNumber -postalAddress -background',
          },
        })
        .populate({
          path: 'receiverId',
          select: '_id profile',
          populate: {
            path: 'profile',
            model: 'Profile',
            select: '-stripeVerificationStatus -profileBelt -stripeAccount -userCurrency -languages -languages -eventsByHost -location -taxonomies -socialLinks -isStripeConnected -numtotalSpent -counts -numtotalEarnings -totalReviews -totalStudents -totalProductPurchased -productPurchasedAt -totalSessionsPurchased -bio -methodology -profileLevel -dob -totalSessionsByHost -totalEventsByHost -studentPurchasedProductAt -countUpdatedAt -bookedEventsByStudent -bookedSessionsByStudent -totalOrdersByStudent -videoLink -phoneNumber -postalAddress -background',
          },
        })
        .exec((err, chats) => {
          if (err) {
            ws.send(JSON.stringify({
              type: 'error',
              data: err.message,
            }));
          }

          chats?.forEach((chat) => ws.send(JSON.stringify({
            type: 'chat',
            data: chat,
          })));
        });
    }
    if (messageObj.type === 'initialMessages') {
      // Send all Unread messages and first message of user having no unread message
      Chats.find({
        $or: [{ senderId: userId },
          { receiverId: userId }],
      })
        .sort('createdAt')
        .populate({
          path: 'senderId',
          select: '_id profile',
          populate: {
            path: 'profile',
            model: 'Profile',
            select: '-stripeVerificationStatus -profileBelt -stripeAccount -userCurrency -languages -languages -eventsByHost -location -taxonomies -socialLinks -isStripeConnected -numtotalSpent -counts -numtotalEarnings -totalReviews -totalStudents -totalProductPurchased -productPurchasedAt -totalSessionsPurchased -bio -methodology -profileLevel -dob -totalSessionsByHost -totalEventsByHost -studentPurchasedProductAt -countUpdatedAt -bookedEventsByStudent -bookedSessionsByStudent -totalOrdersByStudent -videoLink -phoneNumber -postalAddress -background',
          },
        })
        .populate({
          path: 'receiverId',
          select: '_id profile',
          populate: {
            path: 'profile',
            model: 'Profile',
            select: '-stripeVerificationStatus -profileBelt -stripeAccount -userCurrency -languages -languages -eventsByHost -location -taxonomies -socialLinks -isStripeConnected -numtotalSpent -counts -numtotalEarnings -totalReviews -totalStudents -totalProductPurchased -productPurchasedAt -totalSessionsPurchased -bio -methodology -profileLevel -dob -totalSessionsByHost -totalEventsByHost -studentPurchasedProductAt -countUpdatedAt -bookedEventsByStudent -bookedSessionsByStudent -totalOrdersByStudent -videoLink -phoneNumber -postalAddress -background',
          },
        })
        .exec((err, chats) => {
          if (err) {
            ws.send(JSON.stringify({
              type: 'error',
              data: err.message,
            }));
          }
          const latestReadChats = [...new Map(chats.map((c) => [[c.senderId, c.receiverId].sort().join('.'), c])).values()].filter((c) => c.unread);
          const unReadChats = chats.filter((c) => !c.unread);
          latestReadChats?.forEach((chat) => ws.send(JSON.stringify({
            type: 'chat',
            data: chat,
          })));
          unReadChats?.forEach((chat) => ws.send(JSON.stringify({
            type: 'chat',
            data: chat,
          })));
        });
    }

    // message unread message status update
    if (messageObj.type !== undefined && messageObj.type === 'updateStatus') {
      const query = { _id: { $in: messageObj.messageId } };
      const update = { $set: { unread: true } };
      const options = { upsert: false };

      Chats.updateMany(query, update, options)
        .then((result) => result)
        .catch((err) => err);
    }

    if (messageObj.type !== undefined && messageObj.type === 'addContact') {
      if (messageObj.contactId === userId) {
        ws.send(JSON.stringify({
          type: 'error',
          data: 'You cannot add youself as contact',
        }));
      } else {
        Contacts.findOneAndUpdate({
          user: userId,
        }, {
          $set: { user: userId },
          $addToSet: {
            contacts: messageObj.contactId,
          },
        }, {
          upsert: true, returnOriginal: false, sort: { createdAt: -1 },
        })

          .populate({
            path: 'user',
            select: '_id profile',
            populate: {
              path: 'profile',
              model: 'Profile',
              select: '-stripeVerificationStatus -profileBelt -stripeAccount -userCurrency -languages -eventsByHost -location -taxonomies -socialLinks -isStripeConnected -numtotalSpent -counts -numtotalEarnings -totalReviews -totalStudents -totalProductPurchased -productPurchasedAt -totalSessionsPurchased -bio -methodology -profileLevel -dob -totalSessionsByHost -totalEventsByHost -studentPurchasedProductAt -countUpdatedAt -bookedEventsByStudent -bookedSessionsByStudent -totalOrdersByStudent -videoLink -phoneNumber -postalAddress -background',
            },
          })
          .populate({
            path: 'contacts',
            select: '_id profile',
            populate: {
              path: 'profile',
              model: 'Profile',
              select: '-stripeVerificationStatus -profileBelt -stripeAccount -userCurrency -languages -languages -eventsByHost -location -taxonomies -socialLinks -isStripeConnected -numtotalSpent -counts -numtotalEarnings -totalReviews -totalStudents -totalProductPurchased -productPurchasedAt -totalSessionsPurchased -bio -methodology -profileLevel -dob -totalSessionsByHost -totalEventsByHost -studentPurchasedProductAt -countUpdatedAt -bookedEventsByStudent -bookedSessionsByStudent -totalOrdersByStudent -videoLink -phoneNumber -postalAddress -background',
            },
          })
          .exec((err, newContact) => {
            if (err) {
              return ContactNotifier.contactNotifier(
                userId,
                'error',
                err.message,
              );
            }

            const filteredContact = newContact.contacts.filter(
              (user) => user._id.toString() === messageObj.contactId,
            );
            /*
            ws.send(JSON.stringify({
              type: 'contact',
              data: filteredContact,
            }));
            */
            return ContactNotifier.contactNotifier(
              userId,
              'contact',
              filteredContact,
            );
          });

        Contacts.findOneAndUpdate({
          user: messageObj.contactId,
        }, {
          $set: { user: messageObj.contactId },
          $addToSet: {
            contacts: userId,
          },
        }, {
          upsert: true, returnOriginal: false, sort: { createdAt: -1 },
        })
          .populate({
            path: 'user',
            select: '_id profile',
            populate: {
              path: 'profile',
              model: 'Profile',
              select: '-stripeVerificationStatus -profileBelt -stripeAccount -userCurrency -languages -eventsByHost -location -taxonomies -socialLinks -isStripeConnected -numtotalSpent -counts -numtotalEarnings -totalReviews -totalStudents -totalProductPurchased -productPurchasedAt -totalSessionsPurchased -bio -methodology -profileLevel -dob -totalSessionsByHost -totalEventsByHost -studentPurchasedProductAt -countUpdatedAt -bookedEventsByStudent -bookedSessionsByStudent -totalOrdersByStudent -videoLink -phoneNumber -postalAddress -background',
            },
          })
          .populate({
            path: 'contacts',
            select: '_id profile',
            populate: {
              path: 'profile',
              model: 'Profile',
              select: '-stripeVerificationStatus -profileBelt -stripeAccount -userCurrency -languages -languages -eventsByHost -location -taxonomies -socialLinks -isStripeConnected -numtotalSpent -counts -numtotalEarnings -totalReviews -totalStudents -totalProductPurchased -productPurchasedAt -totalSessionsPurchased -bio -methodology -profileLevel -dob -totalSessionsByHost -totalEventsByHost -studentPurchasedProductAt -countUpdatedAt -bookedEventsByStudent -bookedSessionsByStudent -totalOrdersByStudent -videoLink -phoneNumber -postalAddress -background',
            },
          })
          .exec((err, newContact) => {
            if (err) {
              return ContactNotifier.contactNotifier(
                messageObj.contactId,
                'error',
                err.message,
              );
            }
            const filteredContact2 = newContact.contacts.filter(
              (user) => user._id.toString() === userId,
            );
            return ContactNotifier.contactNotifier(
              messageObj.contactId,
              'contact',
              filteredContact2,
            );
          });
      }
    }
  });

  // Register notifications handler
  natsWrapper.client?.subscribe(`${notificationsChannelPrefix}${userId}`, {
    callback: (err, msg) => { notificationsHandler(JSONCodec().decode(msg.data), ws); },
  });
  const channelIds = [`users.${userId}.*`, `users.*.${userId}`];
  channelIds.forEach((channelId) => {
    natsWrapper.client?.subscribe(channelId, {
      callback: (err, msg) => { notificationsHandler(JSONCodec().decode(msg.data), ws); },
    });
  });

  // Send all available notifications
  Notification.find({ user: userId }).populate({
    path: 'user',
    select: '_id profile',
    populate: {
      path: 'profile',
      model: 'Profile',
      select: '_id firstName lastName profileImage',
    },
  }).exec((err, notifications) => {
    if (err) {
      ws.send(JSON.stringify({
        type: 'error',
        data: err.message,
      }));
    }
    notifications?.forEach((notification) => ws.send(JSON.stringify({
      type: notification.type,
      data: notification,
    })));
  });

  // Send all contacts
  Contacts.find({ user: userId })
    .populate({
      path: 'user',
      select: '_id profile',
      populate: {
        path: 'profile',
        model: 'Profile',
        select: '-stripeVerificationStatus -profileBelt -stripeAccount -userCurrency -languages -eventsByHost -location -taxonomies -socialLinks -isStripeConnected -numtotalSpent -counts -numtotalEarnings -totalReviews -totalStudents -totalProductPurchased -productPurchasedAt -totalSessionsPurchased -bio -methodology -profileLevel -dob -totalSessionsByHost -totalEventsByHost -studentPurchasedProductAt -countUpdatedAt -bookedEventsByStudent -bookedSessionsByStudent -totalOrdersByStudent -videoLink -phoneNumber -postalAddress -background',
      },
    }).populate({
      path: 'contacts',
      select: '_id profile',
      populate: {
        path: 'profile',
        model: 'Profile',
        select: '-stripeVerificationStatus -profileBelt -stripeAccount -userCurrency -languages -languages -eventsByHost -location -taxonomies -socialLinks -isStripeConnected -numtotalSpent -counts -numtotalEarnings -totalReviews -totalStudents -totalProductPurchased -productPurchasedAt -totalSessionsPurchased -bio -methodology -profileLevel -dob -totalSessionsByHost -totalEventsByHost -studentPurchasedProductAt -countUpdatedAt -bookedEventsByStudent -bookedSessionsByStudent -totalOrdersByStudent -videoLink -phoneNumber -postalAddress -background',
      },
    }).exec((err, contacts) => {
      if (err) {
        ws.send(JSON.stringify({
          type: 'error',
          data: err.message,
        }));
      }
      contacts?.forEach((contact) => ws.send(JSON.stringify({
        type: 'contacts',
        data: contact,
      })));
    });
};
