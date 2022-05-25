const Profile = require('../models/profileModel');
const { ERROR_TYPES } = require('../config/errorTypes');

module.exports = {
  isAdmin: async (req, res, next) => {
    const user = await Profile.find({ user: req.userId });
    if (!user) {
      return res.status(403).send({ auth: false, message: ERROR_TYPES.USER_NOT_FOUND });
    }
    if (user.role?.toLowerCase() !== 'admin') {
      return res.status(403).send({ auth: false, message: ERROR_TYPES.NOT_AN_ADMIN });
    }
    return next();
  },
  isHost: async (req, res, next) => {
    const user = await Profile.findOne({ user: req.userId });
    if (!user) {
      return res.status(403).send({ auth: false, message: ERROR_TYPES.USER_NOT_FOUND });
    }
    if (user.role.toLowerCase() !== 'host') {
      return res.status(403).send({ auth: false, message: ERROR_TYPES.NOT_A_HOST });
    }
    return next();
  },
};
