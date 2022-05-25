/* eslint-disable consistent-return */
const User = require('../models/userModel');
const Profile = require('../models/profileModel');
const Product = require('../models/productsModel');
const ProductVariants = require('../models/productVariantsModel');
const Orders = require('../models/ordersModel');
const BookedSessions = require('../models/bookedSessionsModel');
const Recommendations = require('../models/recommendationsModel');
const VariantTypes = require('../models/variantTypesModel');

const {
  ERROR_TYPES,
} = require('../config/errorTypes');

const {
  DATA_MISSING, NO_HOST_FOUND, NO_STUDENT_FOUND,
} = ERROR_TYPES;

module.exports = {
  dashboardOverview: async (req, res) => {
    try {
      const totalUsers = await Profile.find({}).select(['_id', 'createdAt', 'role']);
      const totalOrders = await Orders.find({}).select(['_id', 'createdAt']);

      const highestBookedHosts = await Profile.find({ role: { $regex: /^host$/i } })
        .select(['_id', 'numtotalEarnings', 'role', 'userName', 'profileImage', 'profileLevel', 'totalEventsByHost'])
        .sort({ numtotalEarnings: -1 })
        .limit(3);

      const leastBookedHosts = await Profile.find({ role: { $regex: /^host$/i } })
        .select(['_id', 'numtotalEarnings', 'role', 'userName', 'profileImage', 'profileLevel', 'totalEventsByHost'])
        .sort({ numtotalEarnings: 1 })
        .limit(3);

      const highestBookingStudent = await Profile.find({ role: { $regex: /^student$/i } })
        .populate('user', 'email')
        .select(['_id', 'numtotalSpent', 'userName', 'profileImage', 'user'])
        .sort({ numtotalSpent: -1 })
        .limit(3);

      const highestBookedEvents = await Product.find({ })
        .sort('-productTotalEarnings')
        .limit(4)
        .populate('variantTypes', 'price currency variantTypes')
        .select(['_id', 'productTotalEarnings', 'productName', 'productType', 'productImageURL', 'variantTypes']);

      console.log(totalUsers.length);
      res.status(200).json({
        totalUsers,
        totalOrders,
        highestBookedHosts,
        leastBookedHosts,
        highestBookingStudent,
        highestBookedEvents,
      });
    } catch (err) {
      console.log(err);
      res.status(500).send(err);
    }
  },
  viewAllHosts: async (req, res) => {
    try {
      Profile.find({ role: { $regex: /^host$/i } })
        .exec((err, data) => {
          if (err) {
            console.log(err.message);
            return res.status(400).json({
              error: err,
            });
          }
          console.log(data);
          if (data === null) {
            return res.status(404).send(NO_HOST_FOUND);
          }
          return res.json({
            data,
          });
        });
    } catch (err) {
      console.log(err);
      res.send(err);
    }
  },
  viewAllStudentss: async (req, res) => {
    try {
      Profile.find({ role: { $regex: /^student$/i } })
        .populate('user', 'email')
        .exec((err, data) => {
          if (err) {
            console.log(err.message);
            return res.status(400).json({
              error: err,
            });
          }
          console.log(data);
          if (data === null) {
            return res.status(404).send(NO_STUDENT_FOUND);
          }
          return res.json({
            data,
          });
        });
    } catch (err) {
      console.log(err);
      res.send(err);
    }
  },
  addUsers: (req, res) => {
    try {
      const data = req.body;
      if (Object.getOwnPropertyNames(data).length === 0) {
        return res.status(400).json({
          success: false,
          msg: DATA_MISSING,
        });
      }

      Profile.insert(data)
        .then((result) => {
          res.status(200).json({ profile: result });
        })
        .catch((err) => {
          res.status(500).json({ error: err });
        });
    } catch (err) {
      res.send(err);
    }
  },

  editHostOrStudent: (req, res) => {
    try {
      const data = req.body;
      if (Object.getOwnPropertyNames(data).length === 0) {
        return res.status(400).json({
          success: false,
          msg: DATA_MISSING,
        });
      }

      data.updatedAt = Date.now();

      User.findByIdAndUpdate({ _id: req.params.userId },
        { $set: { email: data.email } }, { new: true })
        .then(() => {
          Profile.findByIdAndUpdate({ user: req.params.userId },
            { $set: data }, { new: true });
        })
        .then((profile) => {
          res.status(200).json({ updatedProfile: profile });
        })
        .catch((err) => {
          res.status(500).json({ error: err });
        });
    } catch (err) {
      res.send(err);
    }
  },
  deleteHostOrStudent: (req, res) => {
    try {
      User.findByIdAndDelete({ _id: req.params.userId })
        .then(() => Profile.findByIdAndDelete({ user: req.params.userId }))
        .then(() => Product.findByIdAndDelete({ user: req.params.userId }))
        .then(() => ProductVariants.findByIdAndDelete({ user: req.params.userId }))
        .then(() => VariantTypes.findByIdAndDelete({ user: req.params.userId }))
        .then(() => Recommendations.findByIdAndDelete({ recommendedBy: req.params.userId }))
        .then(() => Orders.findByIdAndDelete({ buyerId: req.params.userId }))
        .then(() => BookedSessions.findByIdAndDelete({ attendee: req.params.userId }))
        .then(() => {
          res.status(200).json({ deletedUser: 'User deleted' });
        })
        .catch((err) => {
          res.status(500).json({ error: err });
        });
    } catch (err) {
      res.send(err);
    }
  },
};
