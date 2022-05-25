const express = require('express');

const router = express.Router();
const passport = require('passport');

const requireAuth = passport.authenticate('jwt', { session: false });

const { generateRoutes } = require('../utils/generateRoutes');

const { isAuthenticated } = require('../utils/isAuthenticated');

const {
  social, signup, signin, signout, verifyEmail, me, changedEmailVerification,
  changePassword, forgotPasswordEmail, passwordResetVerification, resetPassword,
} = require('../controllers/authController');

const authRoutes = [
  {
    method: 'post',
    route: '/social',
    action: social,
  },
  {
    method: 'post',
    route: '/signup',
    action: signup,
  },
  {
    method: 'post',
    route: '/signin',
    action: signin,
  },
  {
    method: 'get',
    route: '/signout',
    middleware: [requireAuth, isAuthenticated],
    action: signout,
  },
  {
    method: 'get',
    route: '/verify/:verificationToken',
    action: verifyEmail,
  },
  {
    method: 'post',
    route: '/change-password',
    action: changePassword,
  },
  {
    method: 'post',
    route: '/forgot-password',
    action: forgotPasswordEmail,
  },
  {
    method: 'get',
    route: '/new-email-verify/:verificationToken',
    action: changedEmailVerification,
  },
  {
    method: 'get',
    route: '/verify/reset-password-token/:token',
    action: passwordResetVerification,
  },
  {
    method: 'post',
    route: '/reset-password/:token',
    action: resetPassword,
  },
  {
    method: 'get',
    route: '/me',
    middleware: [requireAuth, isAuthenticated],
    action: me,
  },

];

generateRoutes(router, authRoutes);

module.exports = router;
