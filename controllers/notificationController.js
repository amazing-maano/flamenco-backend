const Notification = require('../models/notificationsModel');

module.exports = {
  getNotification: async (req, res) => {
    try {
      Notification.find({ user: req.userId },
        (err, notifications) => {
          if (err) {
            res.send(err);
          } else {
            res.send(notifications);
          }
        });
    } catch (err) {
      res.send(err);
    }
  },
  updateNotification: async (req, res) => {
    try {
      const notificationId = req.body.id;

      Notification.findByIdAndUpdate(notificationId, { unread: false },
        (err, updatedNotification) => {
          if (err) {
            res.send(err);
          } else {
            res.send(updatedNotification);
          }
        });
    } catch (err) {
      res.send(err);
    }
  },
};
