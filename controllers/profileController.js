/* eslint-disable no-underscore-dangle */
/* eslint-disable consistent-return */
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const moment = require('moment');
const jwt = require('jsonwebtoken');
const countryJS = require('country-js');

const Profile = require('../models/profileModel');
const Recommendations = require('../models/recommendationsModel');
const BookedSessions = require('../models/bookedSessionsModel');
const ProductVariants = require('../models/productVariantsModel');
const Contacts = require('../models/contactsModel');
const User = require('../models/userModel');
const Favorites = require('../models/favoritesModel');
const Products = require('../models/productsModel');

const { sendMail } = require('../utils/mail');
const { setOrigin } = require('../utils/origins');

const Notifier = require('../utils/notifications');
const { uploadImage } = require('../utils/imageUpload');

const {
  token_secret, sender_email, flamenco_beta, ana_email, coqui_email,
} = require('../config/environment');

const {
  ERROR_TYPES,
} = require('../config/errorTypes');

const {
  DATA_MISSING, USER_NOT_FOUND, PROFILE_NOT_FOUND, PROFILE_ALREADY_EXISTS, NO_PROFILE_FOUND,
  NOT_A_NEW_EMAIL, EMAIL_ALREADY_USED,
} = ERROR_TYPES;

const { EMAIL_TEMPLATE_IDS } = require('../config/dynamiceEmailTemplateIds');

let templateId;

module.exports = {
  createProfile: async (req, res) => {
    try {
      const data = req.body;
      if (Object.getOwnPropertyNames(data).length === 0) {
        return res.status(400).json({
          success: false,
          msg: DATA_MISSING,
        });
      }

      let stripeID;

      if (data.role === 'host') {
        const newStripeAccount = await stripe.accounts.create({
          type: 'standard',
        });

        stripeID = newStripeAccount.id;
      }

      const user = await User.findOne({ _id: req.userId })
        .populate('inviteId');

      if (!user) {
        return res.status(404).send({
          success: false,
          msg: USER_NOT_FOUND,
        });
      }

      if (user.profile) {
        return res.status(409).send({
          success: false,
          msg: PROFILE_ALREADY_EXISTS,
        });
      }

      const newSocialLinks = {
        facebook: data.facebook,
        twitter: data.twitter,
        instagram: data.instagram,
      };

      const newtaxonomies = {
        profession: data.profession,
        subjects: data.subjects,
        topics: data.topics,
      };

      const newLocation = {
        coordinates: data.locationDetails,
        address: data.address,
      };

      let hostCurrencySymbol;
      const hostCountryCurrency = countryJS.search(data.address.split(' ').pop());
      if (hostCountryCurrency.length > 0) {
        hostCurrencySymbol = hostCountryCurrency[0].currency.currencySymbol;
      }

      const newProfile = new Profile({
        user: req.userId,
        firstName: data.firstName,
        lastName: data.lastName,
        commercialName: data.commercialName,
        role: data.role?.toLowerCase(),
        userLocation: data.userLocation,
        bio: data.bio,
        methodology: data.methodology,
        background: data.background,
        profileLevel: data.profileLevel,
        profileBelt: data.profileBelt,
        videoLink: data.videoLink,
        dob: data.dob,
        postalAddress: data.postalAddress,
        phoneNumber: data.phoneNumber,
        languages: data.languages,
        socialLinks: newSocialLinks,
        taxonomies: newtaxonomies,
        location: newLocation,
        stripeAccount: stripeID,
        userCurrency: hostCurrencySymbol || '€',
      });

      if (req.file) {
        const imageUrl = await uploadImage('profileImages', req.userId, req.file);
        if (imageUrl) {
          newProfile.profileImage = imageUrl;
        }
      }

      const profileData = await newProfile.save();

      const result = await User.findByIdAndUpdate({ _id: req.userId },
        { $set: { profile: profileData } }, { new: true });

      if (user.isInvited) {
        // if user invited by a user,
        // add him to contacts
        const invitedByUser = await User.findOne({ _id: user.inviteId.invitedBy });

        await Contacts.findOneAndUpdate({
          user: req.userId,
        }, {
          $addToSet: {
            contacts: invitedByUser._id,
          },
        }, { upsert: true, returnOriginal: false });

        await Contacts.findOneAndUpdate({
          user: invitedByUser._id,
        }, {
          $addToSet: {
            contacts: req.userId,
          },
        }, { upsert: true, returnOriginal: false });
      } else {
        // initiate contact doc
        await Contacts.create({ user: req.userId });
      }

      // const initiateContacts = new Contacts(contactData);

      // await initiateContacts.save();

      const initiateFavorites = new Favorites({ user: req.userId });

      await initiateFavorites.save();

      Notifier.notifyUser(req.userId, 'notification', 'PROFILE_COMPLETED', '', '', '', null, null);

      let msg;

      // send mail
      if (profileData.role === 'host') {
        if (req.headers.language === 'en') {
          templateId = EMAIL_TEMPLATE_IDS.ENGLISH_WELCOME_HOST;
        } else {
          templateId = EMAIL_TEMPLATE_IDS.SPANISH_WELCOME_HOST;
        }
        msg = {
          to: user.email,
          from: sender_email,
          templateId,
          dynamic_template_data: {
            firstName: `${profileData.firstName}`,
          },
        };

        sendMail(msg);
      } else {
        if (req.headers.language === 'en') {
          templateId = EMAIL_TEMPLATE_IDS.ENGLISH_WELCOME_FAN;
        } else {
          templateId = EMAIL_TEMPLATE_IDS.SPANISH_WELCOME_FAN;
        }
        msg = {
          to: user.email,
          from: sender_email,
          templateId,
          dynamic_template_data: {
            firstName: `${profileData.firstName}`,
          },
        };

        sendMail(msg);
      }

      const profileId = profileData._id;
      if (req.headers.origin === 'https://flamencosonline.com' || req.headers.origin === 'https://www.flamencosonline.com' || req.headers.origin === 'https://viveflamenco.com' || req.headers.origin === 'https://liveflamenco.com' || req.headers.origin === 'https://www.viveflamenco.com' || req.headers.origin === 'https://www.liveflamenco.com') {
        const mailAna = {
          to: [ana_email, coqui_email],
          from: sender_email,
          templateId: EMAIL_TEMPLATE_IDS.NOTIFY_NEW_PROFILE_CREATED,
          dynamic_template_data: {
            // subject: 'Testing Templates',
            firstName: profileData.firstName,
            email: user.email,
            url: `${flamenco_beta}profile/${profileId}`,
          },
        };
        sendMail(mailAna);
      } else {
        const mailAna = {
          to: [ana_email, coqui_email],
          from: sender_email,
          templateId: EMAIL_TEMPLATE_IDS.NOTIFY_NEW_PROFILE_CREATED,
          dynamic_template_data: {
            // subject: 'Testing Templates',
            firstName: profileData.firstName,
            email: user.email,
            url: `https://flamenco-dev.netlify.app/profile/${profileId}`,
          },
        };
        sendMail(mailAna);
      }

      return res.status(200).json({
        result,
        newProfile,
      });
    } catch (err) {
      // console.log(err);
      return res.status(500).send(err.message);
    }
  },

  stripeConnectAccount: async (req, res) => {
    try {
      const origin = await setOrigin(req.headers);

      const profile = await Profile.findOne({ user: req.userId });

      const accountLink = await stripe.accountLinks.create({
        account: profile.stripeAccount,
        refresh_url: `${origin}dashboard/settings/payment`,
        return_url: `${origin}dashboard/settings/payment`,
        type: 'account_onboarding',
      });
      return res.status(200).json({
        accountLink,
      });
    } catch (err) {
      return res.send(err);
    }
  },

  getAllUserProfiles: async (req, res) => {
    try {
      const data = await Profile.find({}).select(['_id', 'userName', 'role',
        'profileImage', 'userLocation', 'profileLevel', 'taxonomies',
      ]);

      if (data === null) {
        return res.status(404).send(NO_PROFILE_FOUND);
      }
      return res.status(200).json({
        data,
      });
    } catch (err) {
      return res.status(500).send(err.message);
    }
  },

  getLoggedInUserProfile: async (req, res) => {
    try {
      const data = await Profile.findOne({
        user: req.userId,
      })
        .populate('bookedEventsByStudent', '_id productName productImageURL productType -schedule')
        .populate('eventsByHost', '_id productName productImageURL productType currency')
        .select('-bookedSessionsByStudent');

      if (!data) {
        return res.status(404).send(PROFILE_NOT_FOUND);
      }

      const recommendationsData = await Recommendations.find({ recommendedTo: req.userId })
        .populate({
          path: 'recommendedBy',
          select: '_id email profile',
          populate: {
            path: 'profile',
            model: 'Profile',
            select: '_id firstName lastName role profileImage location.address profileBelt',
          },
        });

      return res.status(200).send({
        user: data,
        recommendations: recommendationsData,

      });
    } catch (err) {
      return res.send(err.message);
    }
  },

  dashboard: async (req, res) => {
    try {
      const ongoingSessions = [];
      const upcomingSessions = [];

      const purchasedOngoingSessions = [];
      const purchasedUpcomingSessions = [];

      let hostSessions;
      let purchasedSessions;
      let studentPurchasedSessions;

      const time = moment.utc();
      const profile = await Profile.findOne({ user: req.userId });

      if (!profile) {
        return res.status(404).send(PROFILE_NOT_FOUND);
      }

      const user_data = await User.findOne({
        _id: req.userId,
      })
        .select(['email', 'isVerified', '_id'])
        .populate('profile', '-bio -background -methodology -eventsByHost -taxonomies -languages -bookedEventsByStudent -bookedSessionsByStudent');

      if (!user_data) {
        return res.status(404).send(USER_NOT_FOUND);
      }

      if (profile.role?.toLowerCase() === 'host') {
        hostSessions = await ProductVariants.find({
          user: req.userId,
          endTime: { $gte: new Date() },
        })
          .sort({ endTime: 1 })
          .limit(15)
          .populate('productId', '_id productName productType numberOfSeats productImageURL -schedule -variantTypes');
        purchasedSessions = await BookedSessions.find({
          attendee: req.userId,
          endTime: { $gte: new Date() },
        })
          .sort({ endTime: 1 })
          .limit(15)
          .populate('productId', 'productName productImageURL numberOfSeats currency -schedule -variantTypes')
          .populate('bookedVariantType', 'price');
      } else {
        studentPurchasedSessions = await BookedSessions.find({
          attendee: req.userId,
          endTime: { $gte: new Date() },
        })
          .sort({ endTime: 1 })
          .limit(15)
          .populate('productId', 'productName productImageURL numberOfSeats currency -schedule -variantTypes')
          .populate('bookedVariantType', 'price');
      }

      if (((hostSessions !== undefined && hostSessions.length === 0)
      && (purchasedSessions !== undefined && purchasedSessions.length === 0))
      || (studentPurchasedSessions !== undefined && studentPurchasedSessions.length === 0)) {
        return res.status(200).json({
          user: user_data,
          ongoingSessions,
          upcomingSessions,
          purchasedOngoingSessions,
          purchasedUpcomingSessions,
        });
      }

      if (profile.role?.toLowerCase() === 'host'
        && ((hostSessions !== undefined && hostSessions.length !== 0)
        || (purchasedSessions !== undefined && purchasedSessions.length !== 0))) {
        hostSessions.forEach((session, index) => {
          const startTime = moment.utc(session.startTime);
          const endTime = moment.utc(session.endTime);

          if (time.isSame(startTime)
              || time.isSame(endTime)
              || time.isBetween(startTime, endTime)) {
            ongoingSessions.push(session);
          } else if (time.isBefore(startTime)) {
            upcomingSessions.push(session);
          }
          if (hostSessions.length === index + 1) {
            return hostSessions;
          }
        });
        purchasedSessions.forEach((session2, index2) => {
          const startTime2 = moment.utc(session2.startTime);
          const endTime2 = moment.utc(session2.endTime);
          if (time.isSame(startTime2)
                || time.isSame(endTime2)
                || time.isBetween(startTime2, endTime2)) {
            purchasedOngoingSessions.push(session2);
          } else if (time.isBefore(startTime2)) {
            purchasedUpcomingSessions.push(session2);
          }
          if (purchasedSessions.length === index2 + 1) {
            return purchasedSessions;
          }
        });
        return res.status(200).send({
          user: user_data,
          ongoingSessions,
          upcomingSessions,
          purchasedOngoingSessions,
          purchasedUpcomingSessions,
        });
      }

      studentPurchasedSessions.forEach((session2, index2) => {
        const startTime2 = moment.utc(session2.startTime);
        const endTime2 = moment.utc(session2.endTime);
        if (time.isSame(startTime2)
                || time.isSame(endTime2)
                || time.isBetween(startTime2, endTime2)) {
          purchasedOngoingSessions.push(session2);
        } else if (time.isBefore(startTime2)) {
          purchasedUpcomingSessions.push(session2);
        }
        if (studentPurchasedSessions.length === index2 + 1) {
          return res.status(200).send({
            user: user_data,
            ongoingSessions,
            upcomingSessions,
            purchasedOngoingSessions,
            purchasedUpcomingSessions,
          });
        }
      });
    } catch (err) {
      return res.status(500).send(err);
    }
  },

  getProfile: async (req, res) => {
    try {
      let query;

      const profile = await Profile.findOne({
        _id: req.params.id,
      })
        .select('-eventsByHost')
        .populate('bookedSessionsByStudent', '_id sessionCode')
        .populate('bookedEventsByStudent', 'productName productType productMode totalEarnings productImageURL rating');

      if (!profile) {
        return res.status(404).send(PROFILE_NOT_FOUND);
      }

      if (profile.user.equals(req.userId)) {
        query = {
          user: profile.user,
        };
      } else {
        query = {
          user: profile.user, isPublished: true,
        };
      }

      const product = await Products.find(query)
        .select('productName productType productMode totalEarnings productImageURL rating isPublished currency');

      profile.eventsByHost = product;

      const recommendations = await Recommendations.find({ recommendedTo: profile.user })
        .populate({
          path: 'recommendedBy',
          select: '_id profile',
          populate: {
            path: 'profile',
            model: 'Profile',
            select: '_id firstName lastName profileImage location.address',
          },
        });

      return res.status(200).json({
        user: profile,
        recommendations,
      });
    } catch (err) {
      return res.send(err.message);
    }
  },

  updateProfile: async (req, res) => {
    try {
      const data = req.body;
      if (Object.getOwnPropertyNames(data).length === 0 && !req.file) {
        return res.status(400).json({
          success: false,
          msg: DATA_MISSING,
        });
      }

      if (req.file) {
        const imageUrl = await uploadImage('profileImages', req.userId, req.file);
        if (imageUrl) {
          data.profileImage = imageUrl;
        }
      }
      data.updatedAt = Date.now();

      const result = await Profile.findOneAndUpdate({ user: req.userId },
        { $set: data }, { new: true });
      return res.status(200).json({ updatedProfile: result });
    } catch (err) {
      return res.status(500).send(err.message);
    }
  },

  updateProfileSettings: async (req, res) => {
    try {
      const data = req.body;
      if (Object.getOwnPropertyNames(data).length === 0) {
        return res.status(400).json({
          success: false,
          msg: DATA_MISSING,
        });
      }

      let user;
      let verificationToken;

      const origin = await setOrigin(req.headers);

      const findUser = await User.findOne({ _id: req.userId });
      if (findUser.email === data.email) {
        return res.status(409).send(NOT_A_NEW_EMAIL);
      }

      const userWithSameEmail = await User.findOne({ email: data.email });
      if (userWithSameEmail) {
        return res.status(409).send(EMAIL_ALREADY_USED);
      }

      if (data.email) {
        const newEmailObject = {};
        newEmailObject.newEmail = data.email;
        newEmailObject.id = findUser._id;

        verificationToken = jwt.sign(newEmailObject, token_secret, {
          expiresIn: '1d',
        });

        // send mail
        if (req.headers.language === 'en') {
          templateId = EMAIL_TEMPLATE_IDS.ENGLISH_ACCOUNT_CONFIRM;
        } else {
          templateId = EMAIL_TEMPLATE_IDS.SPANISH_ACCOUNT_CONFIRM;
        }
        const msg = {
          to: data.email,
          from: sender_email,
          templateId,
          dynamic_template_data: {
            url: `${origin}new-email-verify/${verificationToken}`,
          },
        };

        sendMail(msg);
      }

      const profile = await Profile.findOneAndUpdate({ user: req.userId },
        {
          $set: {
            postalAddress: data.postalAddress,
            phoneNumber: data.phoneNumber,
            updatedAt: Date.now(),
          },
        },
        { new: true });
      return res.status(200).json({ verificationToken, user, profile });
    } catch (err) {
      return res.status(500).send(err.message);
    }
  },
};
