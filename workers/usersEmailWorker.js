/* eslint-disable func-names */
const Users = require('../models/userModel');

const userWorkerFactory = function () {
  return {
    run() {
      Users.sendMails();
    },
  };
};

module.exports = userWorkerFactory();
