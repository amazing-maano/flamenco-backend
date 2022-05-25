const Recommendations = require('../models/recommendationsModel');
const { ERROR_TYPES } = require('../config/errorTypes');
const User = require('../models/userModel');
const Profile = require('../models/profileModel');

const {
  TOKEN_VERIFIED, SELF_RECOMMENDATION_PROHIBITED, USER_NOT_FOUND,
  CAN_ONLY_RECOMMEND_A_HOST, CANNOT_GIVE_MORE_THAN_ONE_RECOMMENDATION,
} = ERROR_TYPES;

module.exports = {
  createRecommendation: async (req, res) => {
    try {
      const { recommendedTo, message } = req.body;

      const checkIfExists = await Recommendations.find({
        recommendedTo,
        recommendedBy: req.userId,
      });

      if (recommendedTo === req.userId) {
        res.status(422).send(SELF_RECOMMENDATION_PROHIBITED);
      } else if (checkIfExists && checkIfExists.length !== 0) {
        res.status(404).send(CANNOT_GIVE_MORE_THAN_ONE_RECOMMENDATION);
      } else if (!await User.exists({ _id: recommendedTo })) {
        res.status(404).send(USER_NOT_FOUND);
      } else if (!await Profile.exists({ user: recommendedTo, role: { $regex: /^host$/i } })) {
        res.status(422).send(CAN_ONLY_RECOMMEND_A_HOST);
      } else {
        const newRecommendation = new Recommendations({
          recommendedTo,
          recommendedBy: req.userId,
          message,
        });

        newRecommendation.save().then(
          (recommendation) => recommendation.populate({
            path: 'recommendedBy',
            select: '_id profile',
            populate: {
              path: 'profile',
              model: 'Profile',
              select: '_id firstName lastName profileImage location.address -eventsByHost',
            },
          }),
        ).then((data) => {
          res.status(200).json({ data });
        });
      }
    } catch (err) {
      res.status(500).send(err.message);
    }
  },
  getAllRecommendations: async (req, res) => {
    try {
      const paginationQuery = req.query;
      const perPage = Number(paginationQuery.pageSize);
      const page = Math.max(0, Number(paginationQuery.pageNumber));

      await Recommendations.find({ recommendedTo: req.params.userId })
        .sort({ createdAt: -1 })
        .populate({
          path: 'recommendedBy',
          select: '_id profile',
          populate: {
            path: 'profile',
            model: 'Profile',
            select: '-location.type -location.coordinates -totalEventsByHost -totalSessionsByHost -totalProductPurchased -counts -bio -background -totalReviews -totalStudents -totalSessionsPurchased -totalOrdersByStudent -bookedSessionsByStudent -bookedEventsByStudent -methodology -dob -phoneNumber -stripeAccount -userCurrency -schedule -socialLinks -taxonomies -isStripeConnected -stripeVerificationStatus -numtotalSpent -numtotalEarnings -studentPurchasedProductAt -productPurchasedAt -countUpdatedAt -eventsByHost',
          },
        })

        .skip(perPage * page)
        .limit(perPage)
        .then((data) => {
          res.status(200).send({
            msg: TOKEN_VERIFIED,
            data,
          });
        });
    } catch (err) {
      res.status(500).send(err.message);
    }
  },
};
