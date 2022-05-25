const express = require('express');

const router = express.Router();
const passport = require('passport');

const requireAuth = passport.authenticate('jwt', { session: false });

const { isAuthenticated } = require('../utils/isAuthenticated');

const { generateRoutes } = require('../utils/generateRoutes');
const {
  bookProduct, getBookedSessionsByUserId, getPaymentDetailsByUser, getContacts,
} = require('../controllers/ordersController');

const OrderRoutes = [
  {
    method: 'post',
    route: '/book-product/:productId',
    middleware: [requireAuth, isAuthenticated],
    action: bookProduct,
  },
  {
    method: 'get',
    route: '/user/sessions',
    middleware: [requireAuth, isAuthenticated],
    action: getBookedSessionsByUserId,
  },
  {
    method: 'get',
    route: '/me/payments',
    middleware: [requireAuth, isAuthenticated],
    action: getPaymentDetailsByUser,
  },
  {
    method: 'get',
    route: '/contacts',
    middleware: [requireAuth, isAuthenticated],
    action: getContacts,
  },
];

generateRoutes(router, OrderRoutes);

module.exports = router;
