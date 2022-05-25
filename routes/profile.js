const express = require('express');

const router = express.Router();
const passport = require('passport');
const multer = require('multer');

const singleUpload = multer({ dest: 'tmp/public/' }).single('file');

const requireAuth = passport.authenticate('jwt', { session: false });

const { generateRoutes } = require('../utils/generateRoutes');

const { isAuthenticated, ifTokenExists } = require('../utils/isAuthenticated');

const {
  createProfile, getProfile, updateProfile, getAllUserProfiles, getLoggedInUserProfile,
  dashboard, updateProfileSettings, stripeConnectAccount,
} = require('../controllers/profileController');

const profileRoutes = [
  {
    method: 'get',
    route: '/dashboard',
    middleware: [requireAuth, isAuthenticated],
    action: dashboard,
  },
  {
    method: 'post',
    route: '/create-profile',
    middleware: [isAuthenticated, requireAuth, singleUpload],
    action: createProfile,
  },
  {
    method: 'get',
    route: '/create-stripe-profile',
    middleware: [isAuthenticated, requireAuth, singleUpload],
    action: stripeConnectAccount,
  },
  {
    method: 'get',
    route: '/profile/:id',
    middleware: ifTokenExists,
    action: getProfile,
  },
  {
    method: 'get',
    route: '/user/profile',
    middleware: [requireAuth, isAuthenticated],
    action: getLoggedInUserProfile,
  },
  {
    method: 'get',
    route: '/profiles',
    middleware: [requireAuth, isAuthenticated],
    action: getAllUserProfiles,
  },
  {
    method: 'put',
    route: '/update-profile',
    middleware: [isAuthenticated, requireAuth, singleUpload],
    action: updateProfile,
  },
  {
    method: 'put',
    route: '/update-profile-settings',
    middleware: [isAuthenticated, requireAuth],
    action: updateProfileSettings,
  },
];

generateRoutes(router, profileRoutes);

module.exports = router;
