/* eslint-disable func-names */
/* eslint-disable consistent-return */
const JwtStrategy = require('passport-jwt').Strategy;
const { ExtractJwt } = require('passport-jwt');

// load up the user model
const User = require('../models/userModel');
const { token_secret } = require('./environment');

module.exports = function (passport) {
  const opts = {};
  opts.jwtFromRequest = ExtractJwt.fromAuthHeaderWithScheme('jwt');
  opts.secretOrKey = token_secret;
  passport.use(
    new JwtStrategy(opts, (jwt_payload, done) => {
      User.findOne({ id: jwt_payload.id }, (err, user) => {
        if (err) {
          return done(err, false);
        }
        if (user) {
          done(null, user);
        } else {
          done(null, false);
        }
      });
    }),
  );
};
