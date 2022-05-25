/* eslint-disable consistent-return */
const ContactUs = require('../models/contactUsModel');
const Newsletter = require('../models/newsletterModel');
const Collaboration = require('../models/collaborationModel');

const {
  sender_email, support_email,
} = require('../config/environment');

const { sendMail } = require('../utils/mail');

const { ERROR_TYPES } = require('../config/errorTypes');

let subjectForClient;
let textForClient;

let msgForUser;
let msgForClient;

let templateId;

module.exports = {

  sendContactUsRequest: async (req, res) => {
    // sends contact request for customer support
    try {
      const data = req.body;
      if (Object.getOwnPropertyNames(data).length === 0) {
        return res.status(400).json({
          success: false,
          msg: ERROR_TYPES.DATA_MISSING,
        });
      }
      const contactUs = new ContactUs(data);

      contactUs.save((err) => {
        if (err) {
          return res.status(500).json({
            success: false,
            msg: err.message,
          });
        }

        return res.status(200).json(contactUs);
      });

      // send mail
      const lang = 'es';
      if (lang === 'en') {
        templateId = 'd-3782cb3b2c214b0f93b43eb746e397ad';

        subjectForClient = 'New Contact Request';
        textForClient = `Following user details has been collected:\n\nName - ${data.name}\nEmail - ${data.email}\nMessage - ${data.message} `;
      } else {
        templateId = 'd-86648b7e16eb4466bb194dc648989687';

        subjectForClient = 'New Contact Request';
        textForClient = `Following user details has been collected:\n\nName - ${data.name}\nEmail - ${data.email}\nMessage - ${data.message} `;
      }

      msgForUser = {
        to: data.email,
        from: sender_email,
        templateId,
        dynamic_template_data: {
          // subject: 'Testing Templates',
          first_name: data.name,
        },
      };

      msgForClient = {
        to: support_email,
        from: sender_email,

        subject: subjectForClient,
        text: textForClient,

      };

      sendMail(msgForUser);
      sendMail(msgForClient);
    } catch (err) {
      return res.status(500).send(err.message);
    }
  },

  subscribeToNewsletter: async (req, res) => {
    try {
      const data = req.body;
      if (Object.getOwnPropertyNames(data).length === 0) {
        return res.status(400).json({
          success: false,
          msg: ERROR_TYPES.DATA_MISSING,
        });
      }
      const newsletterSubscription = new Newsletter(data);

      newsletterSubscription.save((err) => {
        if (err) {
          return res.status(500).json({
            success: false,
            msg: err.message,
          });
        }

        return res.status(200).json(newsletterSubscription);
      });

      // send mail
      const lang = 'es';
      if (lang === 'en') {
        templateId = 'd-ea706438d2fb4b2eb3ed476686266dc1';

        subjectForClient = 'New user subscribed for newsletter';
        textForClient = `Following user details has been collected:\n\nEmail - ${data.email}\n`;
      } else {
        templateId = 'd-ddf947d5b9ef4758b92080af1c4e2d6c';

        subjectForClient = 'New user subscribed for newsletter';
        textForClient = `Following user details has been collected:\n\nEmail - ${data.email}\n`;
      }

      msgForUser = {
        to: data.email,
        from: sender_email,
        templateId,
      };

      msgForClient = {
        to: support_email,
        from: sender_email,
        subject: subjectForClient,
        text: textForClient,
      };

      sendMail(msgForUser);
      sendMail(msgForClient);
    } catch (err) {
      return res.status(500).send(err.message);
    }
  },

  collaborationRequest: async (req, res) => {
    try {
      const data = req.body;
      if (Object.getOwnPropertyNames(data).length === 0) {
        return res.status(400).json({
          success: false,
          msg: ERROR_TYPES.DATA_MISSING,
        });
      }

      const collaborationRequest = new Collaboration(data);

      collaborationRequest.save((err) => {
        if (err) {
          return res.status(500).json({
            success: false,
            msg: err.message,
          });
        }

        return res.status(200).json(collaborationRequest);
      });

      // send mail
      const lang = 'es';
      if (lang === 'en') {
        templateId = 'd-84c29fdbd4c04d0f9e1ef1fd225eb737';

        subjectForClient = 'Collaboration Request';
        textForClient = `Following user details has been collected:\n\nEmail - ${data.email}\nMessage - ${data.message}`;
      } else {
        templateId = 'd-84c29fdbd4c04d0f9e1ef1fd225eb737';

        subjectForClient = 'Collaboration Request';
        textForClient = `Following user details has been collected:\n\nEmail - ${data.email}\nMessage - ${data.message}`;
      }

      msgForUser = {
        to: data.email,
        from: sender_email,
        templateId,
      };

      msgForClient = {
        to: support_email,
        from: sender_email,
        subject: subjectForClient,
        text: textForClient,
      };

      sendMail(msgForUser);
      sendMail(msgForClient);
    } catch (err) {
      return res.status(500).send(err.message);
    }
  },
};
