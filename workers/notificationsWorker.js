/* eslint-disable func-names */
const BookedSession = require('../models/bookedSessionsModel');

const notificationWorkerFactory = function () {
  return {
    run() {
      BookedSession.sendNotifications();
    },
  };
};

module.exports = notificationWorkerFactory();
