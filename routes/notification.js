const express = require('express');

const router = express.Router();
const passport = require('passport');

const requireAuth = passport.authenticate('jwt', { session: false });

const { isAuthenticated } = require('../utils/isAuthenticated');

const { generateRoutes } = require('../utils/generateRoutes');
const {
  updateNotification, getNotification,
} = require('../controllers/notificationController');

const NotificationRoutes = [
  {
    method: 'get',
    route: '/get-notifications',
    middleware: [requireAuth, isAuthenticated],
    action: getNotification,
  },
  {
    method: 'put',
    route: '/update-notification',
    middleware: [requireAuth, isAuthenticated],
    action: updateNotification,
  },
];

generateRoutes(router, NotificationRoutes);

module.exports = router;
