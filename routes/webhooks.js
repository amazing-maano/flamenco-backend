const express = require('express');

const router = express.Router();

const { generateRoutes } = require('../utils/generateRoutes');
const { webhook, webhookConnectedAccount } = require('../controllers/webhooksController');

const WebhooksRoutes = [
  {
    method: 'post',
    route: '/webhook',
    action: webhook,
  },
  {
    method: 'post',
    route: '/webhook/connect',
    action: webhookConnectedAccount,
  },
];

generateRoutes(router, WebhooksRoutes);

module.exports = router;
