const express = require('express');

const router = express.Router();

const { generateRoutes } = require('../utils/generateRoutes');
const {
  sendContactUsRequest, subscribeToNewsletter, collaborationRequest,
} = require('../controllers/aboutUsController');

const AboutUsRoutes = [
  {
    method: 'post',
    route: '/request-contactUs',
    action: sendContactUsRequest,
  },
  {
    method: 'post',
    route: '/subscribe-newsletter',
    action: subscribeToNewsletter,
  },
  {
    method: 'post',
    route: '/collaboration-request',
    action: collaborationRequest,
  },
];

generateRoutes(router, AboutUsRoutes);

module.exports = router;
