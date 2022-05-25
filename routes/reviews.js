const express = require('express');

const router = express.Router();
const passport = require('passport');

const requireAuth = passport.authenticate('jwt', { session: false });

const { isAuthenticated } = require('../utils/isAuthenticated');

const { generateRoutes } = require('../utils/generateRoutes');
const {
  createReview, getAllReviews,
} = require('../controllers/reviewsController');

const ReviewsRoutes = [
  {
    method: 'post',
    route: '/create-review/:productId',
    middleware: [requireAuth, isAuthenticated],
    action: createReview,
  },
  {
    method: 'get',
    route: '/reviews/:productId',
    // middleware: [requireAuth, isAuthenticated],
    action: getAllReviews,
  },
];

generateRoutes(router, ReviewsRoutes);

module.exports = router;
