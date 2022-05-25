/* eslint-disable func-names */
const ContactUs = require('../models/contactUsModel');

const followUpMailWorkerFactory = function () {
  return {
    run() {
      ContactUs.sendFollowUpMails();
    },
  };
};

module.exports = followUpMailWorkerFactory();
