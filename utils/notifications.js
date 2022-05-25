/* eslint-disable func-names */
const natsWrapper = require('./natsWrapper');
const { notificationsChannelPrefix } = require('../config/environment');
const Notification = require('../models/notificationsModel');

const Notifier = function () {
  return {
    // eslint-disable-next-line max-len
    notifyUser(userId, type, message, productName, startTime, favoriteBy, favProfileId, favEventId) {
      const newNotification = new Notification({
        user: userId, message, type, productName, startTime, favoriteBy, favProfileId, favEventId,
      });

      newNotification.save().then(
        (notification) => notification.populate({
          path: 'user',
          select: '_id profile',
          populate: {
            path: 'profile',
            model: 'Profile',
            select: '_id firstName lastName profileImage -eventsByHost',
          },
        }),
      ).then((data) => {
        natsWrapper.publish(`${notificationsChannelPrefix}${userId}`, {
          type, data,
        });
        return data;
      });
    },
  };
};

module.exports = Notifier();
