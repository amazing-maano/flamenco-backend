const express = require('express');

const router = express.Router();
const passport = require('passport');

const requireAuth = passport.authenticate('jwt', { session: false });

const { isAuthenticated } = require('../utils/isAuthenticated');

const { generateRoutes } = require('../utils/generateRoutes');
const {
  cancelEventSubscription,
  deleteEvent,
} = require('../controllers/cancelEventsController');

const cancelRoutes = [
  {
    method: 'post',
    route: '/cancel-event-subscription/:productId',
    middleware: [requireAuth, isAuthenticated],
    action: cancelEventSubscription,
  },
  {
    method: 'post',
    route: '/delete-event/:productId',
    middleware: [requireAuth, isAuthenticated],
    action: deleteEvent,
  },
];

generateRoutes(router, cancelRoutes);

module.exports = router;
