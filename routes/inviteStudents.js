const express = require('express');

const router = express.Router();
const passport = require('passport');

const requireAuth = passport.authenticate('jwt', { session: false });

const { isAuthenticated } = require('../utils/isAuthenticated');

const { generateRoutes } = require('../utils/generateRoutes');
const {
  sendPlatformInvitations, fetchEventStudents, inviteStudentsToEvents,
} = require('../controllers/inviteStudentsController');

const InviteRoutes = [
  {
    method: 'post',
    route: '/send-invites',
    middleware: [requireAuth, isAuthenticated],
    action: sendPlatformInvitations,
  },
  {
    method: 'post',
    route: '/invite-students',
    middleware: [requireAuth, isAuthenticated],
    action: inviteStudentsToEvents,
  },
  {
    method: 'get',
    route: '/invited-students/:productId',
    middleware: [requireAuth, isAuthenticated],
    action: fetchEventStudents,
  },
];

generateRoutes(router, InviteRoutes);

module.exports = router;
