const mongoose = require('mongoose');

const { Schema } = mongoose;

const { sender_email } = require('../config/environment');

const { sendMail } = require('../utils/mail');

const ContactUsSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    // unique: true,
    required: true,
    match: [/^(([^<>()[\]\\.,;:\s@\\"]+(\.[^<>()[\]\\.,;:\s@\\"]+)*)|(\\".+\\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/, 'Please enter a valid email'],
  },
  message: {
    type: String,
    required: true,
  },
}, { timestamps: true });

// eslint-disable-next-line func-names
ContactUsSchema.statics.sendFollowUpMails = async function (callback) {
  /**
   * Send emails to all session attendees
   * @param {array} sessions List of sessions.
   */
  let templateId;

  // eslint-disable-next-line no-use-before-define
  const users = await ContactUs.find({});

  users.forEach((user) => {
    const oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
    const verifiedAtDate = user.createdAt;
    const todayDate = new Date();

    const diffDays = Math.round(Math.abs((verifiedAtDate - todayDate) / oneDay));

    if (diffDays === 3) {
      // send mail
      const lang = 'es';
      if (lang === 'en') {
        templateId = 'd-974740514d8f4f64af777387929d4abd';
      } else {
        templateId = 'd-872def7d6608439d897132a7425ec1e1';
      }

      const followUpEmail = {
        to: user.email,
        from: sender_email,
        templateId,
        dynamic_template_data: {
          customer_name: user.name,
        },
      };
      // console.log('followUpEmail', followUpEmail);
      sendMail(followUpEmail);
    }
  });

  // Don't wait on success/failure, just indicate all messages have been
  // queued for delivery
  if (callback) {
    callback.call();
  }
};

const ContactUs = mongoose.model('ContactUs', ContactUsSchema);

module.exports = ContactUs;
