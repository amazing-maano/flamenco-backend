/* eslint-disable no-unused-vars */
const mongoose = require('mongoose');
const Contact = require('../models/contactsModel');
const Profile = require('../models/profileModel');
const User = require('../models/userModel');

const { ERROR_TYPES } = require('../config/errorTypes');

const { USER_NOT_FOUND } = ERROR_TYPES;

module.exports = {
  fetchContact: async (req, res) => {
    try {
      const contacts = await Contact.findOne({ user: req.userId })
        .populate({
          path: 'user',
          select: '_id profile',
          populate: {
            path: 'profile',
            model: 'Profile',
            select: '-stripeVerificationStatus -profileBelt -stripeAccount -userCurrency -languages -eventsByHost -location -taxonomies -socialLinks -isStripeConnected -numtotalSpent -counts -numtotalEarnings -totalReviews -totalStudents -totalProductPurchased -productPurchasedAt -totalSessionsPurchased -bio -methodology -profileLevel -dob -totalSessionsByHost -totalEventsByHost -studentPurchasedProductAt -countUpdatedAt -bookedEventsByStudent -bookedSessionsByStudent -totalOrdersByStudent -videoLink -phoneNumber -postalAddress -background',
          },
        }).populate({
          path: 'contacts',
          select: '_id profile',
          populate: {
            path: 'profile',
            model: 'Profile',
            select: '-stripeVerificationStatus -profileBelt -stripeAccount -userCurrency -languages -languages -eventsByHost -location -taxonomies -socialLinks -isStripeConnected -numtotalSpent -counts -numtotalEarnings -totalReviews -totalStudents -totalProductPurchased -productPurchasedAt -totalSessionsPurchased -bio -methodology -profileLevel -dob -totalSessionsByHost -totalEventsByHost -studentPurchasedProductAt -countUpdatedAt -bookedEventsByStudent -bookedSessionsByStudent -totalOrdersByStudent -videoLink -phoneNumber -postalAddress -background',
          },
        });

      if (!contacts) {
        return res.status(404).send({
          success: false,
          msg: 'No contact found',
        });
      }

      return res.status(200).json(contacts);
    } catch (err) { return res.status(500).send(err.message); }
  },

  addContact: async (req, res) => {
    try {
      const contact = await User.findOne({ _id: req.params.contactId })
        .select('_id profile')
        .populate('profile', '-stripeVerificationStatus -profileBelt -stripeAccount -userCurrency -languages -eventsByHost -location -taxonomies -socialLinks -isStripeConnected -numtotalSpent -counts -numtotalEarnings -totalReviews -totalStudents -totalProductPurchased -productPurchasedAt -totalSessionsPurchased -bio -methodology -profileLevel -dob -totalSessionsByHost -totalEventsByHost -studentPurchasedProductAt -countUpdatedAt -bookedEventsByStudent -bookedSessionsByStudent -totalOrdersByStudent -videoLink -phoneNumber -postalAddress -background');

      if (!contact) {
        return res.status(404).send({
          success: false,
          msg: USER_NOT_FOUND,
        });
      }
      await Contact.findOneAndUpdate({
        user: req.userId,
      }, {
        $set: { user: req.userId },
        $addToSet: {
          contacts: req.params.contactId,
        },
      }, {
        upsert: true, returnOriginal: false,
      });

      await Contact.findOneAndUpdate({
        user: req.params.contactId,
      }, {
        $set: { user: req.params.contactId },
        $addToSet: {
          contacts: req.userId,
        },
      }, {
        upsert: true, returnOriginal: false,
      });

      return res.status(200).json({
        message: 'Successfuly added Contact',
        contact,
      });
    } catch (err) { return res.status(500).send(err.message); }
  },

};
