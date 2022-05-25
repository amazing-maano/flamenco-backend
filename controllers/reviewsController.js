/* eslint-disable no-underscore-dangle */
/* eslint-disable consistent-return */
const mongoose = require('mongoose');
const User = require('../models/userModel');
const Profile = require('../models/profileModel');
const Product = require('../models/productsModel');
const Reviews = require('../models/reviewsModel');
const { ERROR_TYPES } = require('../config/errorTypes');

const { sendMail } = require('../utils/mail');
const { setOrigin } = require('../utils/origins');

const {
  sender_email,
} = require('../config/environment');

const {
  SELF_REVIEW_PROHIBITED, CANNOT_GIVE_MORE_THAN_ONE_REVIEW, PRODUCT_NOT_FOUND,
} = ERROR_TYPES;

const { EMAIL_TEMPLATE_IDS } = require('../config/dynamiceEmailTemplateIds');

let templateId;

module.exports = {

  createReview: async (req, res) => {
    try {
      const origin = await setOrigin(req.headers);

      const { stars, comment } = req.body;

      const isPurchasedProduct = await Profile.findOne({ user: req.userId });
      const product = await Product.findById(req.params.productId);

      if (!product) {
        return res.status(404).send({
          success: false,
          msg: PRODUCT_NOT_FOUND,
        });
      }

      const reviewerProfile = await User.findOne({ _id: req.userId }).populate('profile', '_id firstName role');
      const hostProfile = await User.findOne({ _id: product.user }).populate('profile', '_id firstName role');

      const checkIfReviewerExists = await Reviews.findOne({
        productId: req.params.productId,
        profile: isPurchasedProduct._id,
      });

      if (!isPurchasedProduct.bookedEventsByStudent.includes(req.params.productId)) {
        return res.status(403).send('Please buy this event to drop a review!');
      }

      if (product.user.equals(req.userId)) {
        return res.status(422).send(SELF_REVIEW_PROHIBITED);
      }
      if (checkIfReviewerExists) {
        return res.status(422).send(CANNOT_GIVE_MORE_THAN_ONE_REVIEW);
      }
      if (stars > 5 || stars <= 0) {
        return res.status(422).send('ratings allowed range 1 to 5');
      }

      if (product) {
        const newReview = new Reviews({
          productId: product._id,
          stars,
          comment,
          profile: mongoose.Types.ObjectId(isPurchasedProduct._id),
        });

        const productData = await newReview.save().then((prod) => prod.populate({
          path: 'profile',
          model: 'Profile',
          select: '_id user firstName lastName location role profileImage -eventsByHost',
        }));

        const allReviews = await Reviews.find({ productId: product._id });

        // product.reviews.push(review);
        product.totalReviews = allReviews.length;
        product.rating = allReviews.reduce((acc, item) => item.stars + acc, 0)
          / allReviews.length;

        await product.save();

        const data = await Reviews.aggregate([
          { $match: { productId: mongoose.Types.ObjectId(product._id) } },
          { $project: { stars: 1, createdAt: 1 } },
          { $group: { _id: '$stars', count: { $sum: 1 } } },
        ]);

        await Profile.findOneAndUpdate({ user: product.user }, {
          $inc: { totalReviews: 1 },
        }, { upsert: true });

        // send email to fan for posting a review
        if (req.headers.language === 'en') {
          templateId = EMAIL_TEMPLATE_IDS.ENGLISH_REVIEWS_POST;
        } else {
          templateId = EMAIL_TEMPLATE_IDS.SPANISH_REVIEWS_POST;
        }
        const msg1 = {
          to: reviewerProfile.email,
          from: sender_email,
          templateId,
          dynamic_template_data: {
            firstName: `${isPurchasedProduct.firstName}`,
            hostName: `${hostProfile.profile.firstName}`,
            url: `${origin}profile/${hostProfile.profile._id}`,
          },
        };

        sendMail(msg1);
        // send email to host for getting a review on his product
        if (req.headers.language === 'en') {
          templateId = EMAIL_TEMPLATE_IDS.ENGLISH_PRODUCT_REVIEWED;
        } else {
          templateId = EMAIL_TEMPLATE_IDS.SPANISH_PRODUCT_REVIEWED;
        }
        const msg2 = {
          to: hostProfile.email,
          from: sender_email,
          templateId,
          dynamic_template_data: {
            firstName: `${hostProfile.profile.firstName}`,
            studentName: `${isPurchasedProduct.firstName}`,
            hostUrl: `${origin}profile/${hostProfile.profile._id}`,
            productUrl: `${origin}event/${product._id}`,
            productType: `${product.productType}`,
          },
        };

        sendMail(msg2);

        return res.status(200).send({
          reviews: {
            rating: product.rating,
            totalReviews: product.totalReviews,
            _id: product._id,
            reviews: productData,
          },
          starsCount: data,
        });
      }
      return res.status(404).send(ERROR_TYPES.PRODUCT_NOT_FOUND);
    } catch (err) {
      // console.log(err);
      return res.status(500).send(err.message);
    }
  },
  getAllReviews: async (req, res) => {
    try {
      const paginationQuery = req.query;
      const perPage = Number(paginationQuery.pageSize);
      const page = Math.max(0, Number(paginationQuery.pageNumber));

      const productReviews = await Reviews.find({ productId: req.params.productId })
        .populate({
          path: 'profile',
          model: 'Profile',
          select: '_id user firstName lastName location role profileImage',
        })
        .sort({ createdAt: -1 })
        .skip(perPage * page)
        .limit(perPage);

      const product = await Product.findOne({ _id: req.params.productId })
        .select('rating totalReviews -schedule -variantTypes');

      if (productReviews) {
        await Reviews.aggregate([
          { $match: { productId: mongoose.Types.ObjectId(req.params.productId) } },
          { $project: { stars: 1, createdAt: 1 } },
          { $group: { _id: '$stars', count: { $sum: 1 } } },
        ]).then((data) => {
          res.status(200).send({
            reviews: productReviews,
            ratingsCount: product,
            starsCount: data,
          });
        });
      } else {
        return res.status(404).send(ERROR_TYPES.PRODUCT_NOT_FOUND);
      }
    } catch (err) {
      return res.status(500).send(err);
    }
  },
};
