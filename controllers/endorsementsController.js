const mongoose = require('mongoose');
const User = require('../models/userModel');
const Profile = require('../models/profileModel');
const Endorsements = require('../models/endorsementsModel');
const Favorites = require('../models/favoritesModel');
const Product = require('../models/productsModel');

const { ERROR_TYPES } = require('../config/errorTypes');

const Notifier = require('../utils/notifications');

const {
  DATA_MISSING, SOURCE_USER_NOT_FOUND, TARGET_USER_NOT_FOUND, USER_NOT_FOUND, ENDORSEMENT_NOT_FOUND,
  FAVORITES_NOT_FOUND, USER_IDS_CANNOT_BE_SAME, PRODUCT_NOT_FOUND, PROFILE_NOT_FOUND,
} = ERROR_TYPES;

module.exports = {

  createEndorsement: async (req, res) => {
    try {
      const reqUser = await User.findOne({ _id: req.userId });
      const paramsUser = await User.findOne({ _id: req.params.id });

      if (!reqUser) {
        return res.status(400).json({
          success: false,
          msg: SOURCE_USER_NOT_FOUND,
        });
      }
      if (!paramsUser) {
        return res.status(400).json({
          success: false,
          msg: TARGET_USER_NOT_FOUND,
        });
      }

      if (req.userId === req.params.id) {
        return res.status(400).json({
          success: false,
          msg: USER_IDS_CANNOT_BE_SAME,
        });
      }

      const { skills } = req.body;
      if (Object.getOwnPropertyNames(req.body).length === 0) {
        return res.status(400).json({
          success: false,
          msg: DATA_MISSING,
        });
      }
      const endorsements = await Endorsements.findOneAndUpdate({
        endorsedBy: req.userId,
        endorsedUser: req.params.id,
      }, {
        $set: {
          endorsedUser: req.params.id, endorsedBy: req.userId, skills,
        },
      },
      { upsert: true, returnOriginal: false });

      if (endorsements.skills.length === 0) {
        await Endorsements.deleteOne({
          // eslint-disable-next-line no-underscore-dangle
          _id: endorsements._id,
        });
      }

      return res.status(200).send(endorsements);
    } catch (err) {
      return res.status(500).send(err.message);
    }
  },

  addProfileToFavorites: async (req, res) => {
    try {
      const reqUser = await User.findOne({ _id: req.userId }).populate('profile', '_id firstName lastName');
      const paramsUser = await User.findOne({ _id: req.params.id });

      if (!reqUser) {
        return res.status(400).json({
          success: false,
          msg: SOURCE_USER_NOT_FOUND,
        });
      }
      if (!paramsUser) {
        return res.status(400).json({
          success: false,
          msg: TARGET_USER_NOT_FOUND,
        });
      }

      if (req.userId === req.params.id) {
        return res.status(400).json({
          success: false,
          msg: USER_IDS_CANNOT_BE_SAME,
        });
      }
      let favorites;

      if (req.body.type === 'add') {
        favorites = await Favorites.findOneAndUpdate({
          user: req.userId,
        }, {
          $addToSet: {
            favoriteUsers: req.params.id,
          },
        },
        { upsert: true, returnOriginal: false });

        // eslint-disable-next-line no-underscore-dangle
        Notifier.notifyUser(paramsUser._id, 'notification', 'PROFILE_ADDED_TO_FAVORITES', '', '', `${reqUser.profile.firstName + reqUser.profile.lastName}`, reqUser.profile._id, null);
      } else {
        favorites = await Favorites.findOneAndUpdate({
          user: req.userId,
        }, {
          $pull: {
            favoriteUsers: req.params.id,
          },
        },
        { upsert: true, returnOriginal: false });
      }

      return res.status(200).send({ favorites });
    } catch (err) {
      return res.status(500).send(err.message);
    }
  },

  addEventToFavorites: async (req, res) => {
    try {
      const reqUser = await User.findOne({ _id: req.userId }).populate('profile', '_id firstName lastName');
      const paramsProduct = await Product.findOne({ _id: req.params.id });

      if (!reqUser) {
        return res.status(400).json({
          success: false,
          msg: SOURCE_USER_NOT_FOUND,
        });
      }
      if (!paramsProduct) {
        return res.status(400).json({
          success: false,
          msg: PRODUCT_NOT_FOUND,
        });
      }

      let favorites;

      if (req.body.type === 'add') {
        favorites = await Favorites.findOneAndUpdate({
          user: req.userId,
        }, {
          $addToSet: {
            favoriteProducts: req.params.id,
          },
        },
        { upsert: true, returnOriginal: false });
        // eslint-disable-next-line no-underscore-dangle
        Notifier.notifyUser(paramsProduct.user, 'notification', 'EVENT_ADDED_TO_FAVORITES', paramsProduct.productName, '', `${reqUser.profile.firstName + reqUser.profile.lastName}`, null, paramsProduct._id);
      } else {
        favorites = await Favorites.findOneAndUpdate({
          user: req.userId,
        }, {
          $pull: {
            favoriteProducts: req.params.id,
          },
        },
        { upsert: true, returnOriginal: false });
      }

      return res.status(200).send({ favorites });
    } catch (err) {
      return res.status(500).send(err.message);
    }
  },

  getYoursEndorsements: async (req, res) => {
    try {
      const reqUser = await User.findOne({ _id: req.userId });

      if (!reqUser) {
        return res.status(400).json({
          success: false,
          msg: USER_NOT_FOUND,
        });
      }

      const data = req.body;
      const perPage = Number(data.limit);
      const page = Math.max(0, Number(data.skip));

      const endorsements = await Endorsements.find({
        endorsedUser: req.userId,
      })
        .populate({
          path: 'endorsedBy',
          select: '_id profile',
          populate: {
            path: 'profile',
            model: 'Profile',
            select: '_id firstName lastName profileImage location.address role -eventsByHost',
          },
        })
        .skip(perPage * page)
        .limit(perPage)
        .sort({ isHighlighted: -1, createdAt: 1 });

      if (endorsements.length === 0) {
        return res.status(404).send({
          msg: ENDORSEMENT_NOT_FOUND,
        });
      }

      return res.status(200).json({
        endorsements,
      });
    } catch (err) {
      return res.status(500).send(err.message);
    }
  },

  getProfilesYouEndorse: async (req, res) => {
    try {
      const reqUser = await User.findOne({ _id: req.userId });

      if (!reqUser) {
        return res.status(400).json({
          success: false,
          msg: USER_NOT_FOUND,
        });
      }

      const data = req.body;

      const perPage = Number(data.limit);
      const page = Math.max(0, Number(data.skip));

      const endorsements = await Endorsements.find({
        endorsedBy: req.userId,
      })
        .select('-isHighlighted')
        .populate({
          path: 'endorsedUser',
          select: '_id profile',
          populate: {
            path: 'profile',
            model: 'Profile',
            select: '_id firstName lastName profileImage location.address role -eventsByHost',
          },
        })
        .skip(perPage * page)
        .limit(perPage)
        .sort('createdAt');

      if (endorsements.length === 0) {
        return res.status(404).send({
          msg: ENDORSEMENT_NOT_FOUND,
        });
      }

      return res.status(200).json({
        endorsements,
      });
    } catch (err) {
      return res.status(500).send(err.message);
    }
  },

  getFavorites: async (req, res) => {
    try {
      const reqUser = await User.findOne({ _id: req.userId });

      if (!reqUser) {
        return res.status(400).json({
          success: false,
          msg: USER_NOT_FOUND,
        });
      }

      const favorites = await Favorites.findOne({ user: req.userId })
        .populate({
          path: 'favoriteUsers',
          select: 'profile',
          populate: {
            path: 'profile',
            model: 'Profile',
            select: '-stripeVerificationStatus -stripeAccount -userCurrency -languages -languages -eventsByHost -taxonomies -socialLinks -isStripeConnected -numtotalSpent -counts -numtotalEarnings -totalReviews -totalStudents -totalProductPurchased -productPurchasedAt -totalSessionsPurchased -bio -methodology -dob -totalSessionsByHost -totalEventsByHost -studentPurchasedProductAt -countUpdatedAt -bookedEventsByStudent -bookedSessionsByStudent -totalOrdersByStudent -videoLink -phoneNumber -postalAddress -background',
            // select: '_id user firstName lastName location role profileImage -eventsByHost',
          },
        })
        .populate('favoriteProducts', '_id productName productType productMode productImageURL currency variantTypes -schedule');

      if (favorites.length === 0) {
        return res.status(404).send({
          msg: FAVORITES_NOT_FOUND,
        });
      }

      return res.status(200).json({
        favorites,
      });
    } catch (err) {
      return res.status(500).send(err.message);
    }
  },

  getProfileEndorsements: async (req, res) => {
    try {
      let skillsCount;

      const profile = await Profile.findOne({
        _id: req.params.id,
      });

      if (!profile) {
        return res.status(404).send(PROFILE_NOT_FOUND);
      }

      const endorsedByLoggedInUser = await Endorsements.findOne({
        endorsedUser: profile.user,
        endorsedBy: req.userId,
      })
        .select('skills');

      const totalEndorsements = await Endorsements.find({ endorsedUser: profile.user });

      const endorsementsData = await Endorsements.find({ endorsedUser: profile.user })
        .populate({
          path: 'endorsedBy',
          select: '_id profile',
          populate: {
            path: 'profile',
            model: 'Profile',
            select: '_id firstName lastName role profileImage location.address -eventsByHost',
          },
        })
        .sort({ isHighlighted: -1, createdAt: 1 });

      if (endorsementsData) {
        const id = mongoose.Types.ObjectId(profile.user);
        skillsCount = await Endorsements.aggregate([
          { $match: { endorsedUser: id } },
          { $unwind: '$skills' },
          {
            $group: {
              _id: {
                $toString: '$skills',
              },
              count: { $sum: 1 },
            },
          },
          {
            $group: {
              _id: null,
              counts: {
                $push: {
                  k: '$_id',
                  v: '$count',
                },
              },
            },
          },
          {
            $replaceRoot: {
              newRoot: { $arrayToObject: '$counts' },
            },
          },
        ]);
      }

      return res.status(200).json({
        totalEndorsementsCount: totalEndorsements.length,
        endorsementsData,
        skillsCount,
        endorsedByLoggedInUser,
      });
    } catch (err) {
      return res.status(500).send(err.message);
    }
  },

  getAllProfileEndorsements: async (req, res) => {
    try {
      const profile = await Profile.findOne({
        _id: req.params.id,
      });

      if (!profile) {
        return res.status(404).send(PROFILE_NOT_FOUND);
      }

      const endorsementsData = await Endorsements.find({ endorsedUser: profile.user })
        .populate({
          path: 'endorsedBy',
          select: '_id profile',
          populate: {
            path: 'profile',
            model: 'Profile',
            select: '_id firstName lastName role location.address -eventsByHost',
          },
        })
        .sort({ isHighlighted: -1, createdAt: 1 });

      return res.status(200).json({
        endorsementsData,
      });
    } catch (err) {
      return res.status(500).send(err.message);
    }
  },

  updateEndorsementHighlightStatus: async (req, res) => {
    try {
      const { status } = req.body;

      const reqUser = await User.findOne({ _id: req.userId });

      if (!reqUser) {
        return res.status(400).json({
          success: false,
          msg: USER_NOT_FOUND,
        });
      }

      const checkEndorsement = await Endorsements.findOne({ _id: req.params.id });

      if (!checkEndorsement) {
        return res.status(404).send({
          msg: ENDORSEMENT_NOT_FOUND,
        });
      }

      const endorsements = await Endorsements.findOneAndUpdate({
        _id: req.params.id,
        endorsedUser: req.userId,
      }, {
        $set: { isHighlighted: status },
      }, { upsert: true, returnOriginal: false });
      return res.status(200).json({
        endorsements,
      });
    } catch (err) {
      return res.status(500).send(err.message);
    }
  },

};
