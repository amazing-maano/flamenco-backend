const express = require('express');

const router = express.Router();
const passport = require('passport');

const requireAuth = passport.authenticate('jwt', { session: false });

const { generateRoutes } = require('../utils/generateRoutes');
const { isAuthenticated } = require('../utils/isAuthenticated');

const { fetchContact, addContact } = require('../controllers/contactsController');

const contactRoutes = [
  {
    method: 'get',
    route: '/getcontacts',
    middleware: [requireAuth, isAuthenticated],
    action: fetchContact,
  },
  {
    method: 'post',
    route: '/addcontact/:contactId',
    middleware: [requireAuth, isAuthenticated],
    action: addContact,
  },
];

generateRoutes(router, contactRoutes);
module.exports = router;
