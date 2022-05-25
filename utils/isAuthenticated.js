/* eslint-disable no-underscore-dangle */
/* eslint-disable consistent-return */
const jwt = require('jsonwebtoken');
const { token_secret } = require('../config/environment');

module.exports = {
  isAuthenticated: (req, res, next) => {
    const token = req.header('Authorization');
    if (!token) { return res.status(403).send({ auth: false, message: 'No token provided.' }); }

    jwt.verify(token.replace('JWT ', ''), token_secret, (err, verifiedJwt) => {
      if (err) { return res.status(401).send({ auth: false, message: 'Failed to authenticate token.' }); }

      req.userId = verifiedJwt._id;
      return next();
    });
  },

  ifTokenExists: (req, res, next) => {
    const token = req.header('Authorization');

    if (!token) {
      req.userId = undefined;
      return next();
    }

    jwt.verify(token.replace('JWT ', ''), token_secret, (err, verifiedJwt) => {
      if (err) { return res.status(401).send({ auth: false, message: 'Failed to authenticate token.' }); }

      req.userId = verifiedJwt._id;
      return next();
    });
  },

  isWebsocketAuthenticated: (data, next) => {
    const ws = data.target;
    let token;
    try {
      token = JSON.parse(data.data)?.token;
    } catch (e) {
      return ws.close(1008, JSON.stringify({ auth: false, msg: 'INVALID_MESSAGE_FORMAT' }));
    }

    if (!token) { return ws.close(1008, JSON.stringify({ auth: false, msg: 'NO_TOKEN_PROVIDED' })); }

    jwt.verify(token.replace('JWT ', ''), token_secret, (err, verifiedJwt) => {
      if (err) { return ws.close(1008, JSON.stringify({ auth: false, msg: 'TOKEN_AUTHENTICATION_FAILED' })); }

      if (next) { return next(ws, verifiedJwt._id); }
    });
  },
};
