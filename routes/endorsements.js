const express = require('express');

const router = express.Router();
const passport = require('passport');

const requireAuth = passport.authenticate('jwt', { session: false });

const { isAuthenticated, ifTokenExists } = require('../utils/isAuthenticated');

const { generateRoutes } = require('../utils/generateRoutes');
const {
  createEndorsement, getYoursEndorsements, getProfilesYouEndorse, updateEndorsementHighlightStatus,
  addProfileToFavorites, getFavorites, addEventToFavorites, getProfileEndorsements,
  getAllProfileEndorsements,
} = require('../controllers/endorsementsController');

const WebhooksRoutes = [
  {
    method: 'post',
    route: '/create-endorsement/:id',
    middleware: [requireAuth, isAuthenticated],
    action: createEndorsement,
  },
  {
    method: 'get',
    route: '/user-endorsements',
    middleware: [requireAuth, isAuthenticated],
    action: getYoursEndorsements,
  },
  {
    method: 'get',
    route: '/profiles-you-endorse',
    middleware: [requireAuth, isAuthenticated],
    action: getProfilesYouEndorse,
  },
  {
    method: 'put',
    route: '/update-highlight-status/:id',
    middleware: [requireAuth, isAuthenticated],
    action: updateEndorsementHighlightStatus,
  },
  {
    method: 'post',
    route: '/add-profile-favorites/:id',
    middleware: [requireAuth, isAuthenticated],
    action: addProfileToFavorites,
  },
  {
    method: 'post',
    route: '/add-events-favorites/:id',
    middleware: [requireAuth, isAuthenticated],
    action: addEventToFavorites,
  },
  {
    method: 'get',
    route: '/get-favorites',
    middleware: [requireAuth, isAuthenticated],
    action: getFavorites,
  },
  {
    method: 'get',
    route: '/profile-endorsements/:id',
    middleware: ifTokenExists,
    action: getProfileEndorsements,
  },
  {
    method: 'get',
    route: '/all-profile-endorsements/:id',
    action: getAllProfileEndorsements,
  },
];

generateRoutes(router, WebhooksRoutes);

module.exports = router;
