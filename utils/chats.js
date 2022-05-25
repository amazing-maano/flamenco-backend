/* eslint-disable func-names */
const natsWrapper = require('./natsWrapper');
const Chats = require('../models/chatsModel');

const ChatNotifier = function () {
  return {
    chatNotifier(senderId, receiverId, type, message) {
      const chat = new Chats({
        senderId,
        receiverId,
        message,
      });
      const sortedUserIds = [senderId, receiverId].sort();
      const channelId = `users.${sortedUserIds[0]}.${sortedUserIds[1]}`;

      chat.save()
        .then(
          (newChat) => newChat.populate([{
            path: 'senderId',
            select: '_id profile',
            populate: {
              path: 'profile',
              model: 'Profile',
              select: '_id firstName lastName profileImage role',
            },
          },
          {
            path: 'receiverId',
            select: '_id profile',
            populate: {
              path: 'profile',
              model: 'Profile',
              select: '_id firstName lastName profileImage role',
            },
          },
          ]),
        )
        .then((data) => {
          natsWrapper.publish(channelId, { type, data });
          return data;
        });
    },
  };
};

module.exports = ChatNotifier();
