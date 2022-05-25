const express = require('express');

const router = express.Router();
const passport = require('passport');

const requireAuth = passport.authenticate('jwt', { session: false });

const { isAuthenticated, ifTokenExists } = require('../utils/isAuthenticated');
const { isHost } = require('../utils/checkRole');

const { generateRoutes } = require('../utils/generateRoutes');
const {
  createRecommendation, getAllRecommendations,
} = require('../controllers/recommendationsController');

const RecommendationsRoutes = [
  {
    method: 'post',
    route: '/create-recommendation',
    middleware: [requireAuth, isAuthenticated, isHost],
    action: createRecommendation,
  },
  {
    method: 'get',
    route: '/recommendations/:userId',
    middleware: ifTokenExists,
    action: getAllRecommendations,
  },
];

generateRoutes(router, RecommendationsRoutes);

module.exports = router;
