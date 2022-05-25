/* eslint-disable no-underscore-dangle */
const crypto = require('crypto');
const User = require('../models/userModel');
const Profile = require('../models/profileModel');
const Products = require('../models/productsModel');
const Invites = require('../models/invitesModel');
const Orders = require('../models/ordersModel');

const { sendMail } = require('../utils/mail');
const { setOrigin } = require('../utils/origins');

const { ERROR_TYPES } = require('../config/errorTypes');

const { sender_email } = require('../config/environment');

const { EMAIL_TEMPLATE_IDS } = require('../config/dynamiceEmailTemplateIds');

let tempId;

const sendEmails = async (email, templateId, firstName, lastName, url) => {
  const msg = {
    to: email,
    from: sender_email,
    templateId,
    dynamic_template_data: {
      firstName,
      lastName,
      url,
    },
  };

  sendMail(msg);
  return msg;
};

module.exports = {
  sendPlatformInvitations: async (req, res) => {
    try {
      const origin = await setOrigin(req.headers);

      const { emails } = req.body;

      if (!emails) {
        return res.status(400).json({
          success: false,
          msg: ERROR_TYPES.DATA_MISSING,
        });
      }

      const teacher = await User.findOne({ _id: req.userId });
      const teacherName = await Profile.findOne({ user: req.userId });

      emails.forEach(async (email, index) => {
        const invitationToken = crypto.randomBytes(32).toString('hex');
        const newUser = await User.findOne({ email });

        if (!newUser) {
          const invitesData = {
            email,
            invitedBy: teacher._id,
            invitationToken,
          };

          const invites = new Invites(invitesData);

          invites.save((err) => {
            if (err) {
              return res.status(500).json({
                success: false,
                msg: err.message,
              });
            }

            return invites;
          });
          if (req.headers.language === 'en') {
            tempId = EMAIL_TEMPLATE_IDS.ENGLISH_INVITE_EMAIL;
          } else {
            tempId = EMAIL_TEMPLATE_IDS.SPANISH_INVITE_EMAIL;
          }

          await sendEmails(
            email,
            tempId,
            `${teacherName.firstName}`,
            `${teacherName.lastName}`,
            `${origin}signup/${invitationToken}`,
          );
        }

        if (emails.length === index + 1) {
          return res.status(200).send('Emails sent!');
        }
        return true;
      });
      return true;
    } catch (error) {
      return res.status(500).send(error.message);
    }
  },

  inviteStudentsToEvents: async (req, res) => {
    try {
      let existingUser;
      if (req.headers.language === 'en') {
        tempId = EMAIL_TEMPLATE_IDS.ENGLISH_INVITE_EMAIL;
      } else {
        tempId = EMAIL_TEMPLATE_IDS.SPANISH_INVITE_EMAIL;
      }

      const origin = await setOrigin(req.headers);

      const { invitesData } = req.body;

      if (!invitesData) {
        return res.status(400).json({
          success: false,
          msg: ERROR_TYPES.DATA_MISSING,
        });
      }

      const teacher = await User.findOne({ _id: req.userId });
      const teacherName = await Profile.findOne({ user: req.userId });
      const findProduct = await Products.findOne({
        _id: invitesData.productId,
      });

      invitesData.emails.forEach(async (email, index) => {
        const invitationToken = crypto.randomBytes(32).toString('hex');

        const userId = await User.findOne({ email });
        if (userId !== null) {
          existingUser = userId._id;
        }

        const invitedUser = await Invites.findOne({
          invitedBy: teacher._id,
          productId: invitesData.productId,
          email,
        });

        if (
          invitedUser
          && (invitedUser.tokenVerifiedAt === null
            || invitedUser.hasAcceptedEventInvite === false)
        ) {
          await sendEmails(
            invitedUser.email,
            tempId,
            `${teacherName.firstName}`,
            `${teacherName.lastName}`,
            `${origin}event/${findProduct._id}/?invitationToken=${invitedUser.invitationToken}`,
          );
        }

        if (!invitedUser) {
          const uploadStudentsData = {
            email,
            invitedBy: teacher._id,
            invitationToken,
            productId: invitesData.productId || null,
            userId: existingUser || null,
          };

          const invites = new Invites(uploadStudentsData);

          invites.save((err) => {
            if (err) {
              return res.status(500).json({
                success: false,
                msg: err.message,
              });
            }

            return invites;
          });

          await sendEmails(
            email,
            tempId,
            `${teacherName.firstName}`,
            `${teacherName.lastName}`,
            `${origin}event/${findProduct._id}/?invitationToken=${invitationToken}`,
          );
        }

        if (invitesData.emails.length === index + 1) {
          return res.status(200).send('Emails sent!');
        }
        return true;
      });
      return true;
    } catch (error) {
      return res.status(500).send(error.message);
    }
  },

  fetchEventStudents: async (req, res) => {
    try {
      const eventStudents = await Orders.find({
        productId: req.params.productId,
      })
        .select(
          '-bookedSessionId -bookedSessions -transactionId -amountPaid -subscriptionID',
        )
        .populate({
          path: 'buyerId',
          select: '_id profile',
          populate: {
            path: 'profile',
            model: 'Profile',
            select:
              '-createdAt -updatedAt -commercialName -profileBelt -role -userCurrency -languages -location -stripeVerificationStatus -variantTypes -schedule -eventsByHost -taxonomies -socialLinks -isStripeConnected -numtotalSpent -counts -numtotalEarnings -totalReviews -totalStudents -totalProductPurchased -productPurchasedAt -totalSessionsPurchased -bio -methodology -profileLevel -dob -totalSessionsByHost -totalEventsByHost -studentPurchasedProductAt -countUpdatedAt -bookedEventsByStudent -bookedSessionsByStudent -totalOrdersByStudent -videoLink -phoneNumber -stripeAccount -postalAddress -background',
          },
        });

      const invitedStudents = await Invites.find({
        productId: req.params.productId,
        hasAcceptedEventInvite: false,
      }).select('-createdAt -updatedAt -invitationToken');

      return res.status(200).json({
        eventStudents,
        invitedStudents,
      });
    } catch (error) {
      return res.status(500).send(error.message);
    }
  },
};
