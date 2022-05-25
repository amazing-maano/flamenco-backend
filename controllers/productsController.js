/* eslint-disable no-underscore-dangle */
/* eslint-disable consistent-return */
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const moment = require('moment');
const countryJS = require('country-js');

const Product = require('../models/productsModel');
const User = require('../models/userModel');
const Profile = require('../models/profileModel');
const ProductVariants = require('../models/productVariantsModel');
const VariantTypes = require('../models/variantTypesModel');
const { uploadImage } = require('../utils/imageUpload');

const { sendMail } = require('../utils/mail');
const { setOrigin } = require('../utils/origins');

const {
  ERROR_TYPES,
} = require('../config/errorTypes');

const { sender_email } = require('../config/environment');

const { EMAIL_TEMPLATE_IDS } = require('../config/dynamiceEmailTemplateIds');

const {
  DATA_MISSING,
  USER_NOT_FOUND,
  TOKEN_VERIFIED,
  PRODUCT_NOT_FOUND,
  PROFILE_NOT_FOUND,
  CANNOT_PUBLISH_SOLD_OUT_EVENT,
  STRIPE_NOT_CONNECTED,
  CANNOT_PUBLISH_WITH_EXPIRED_SCHEDULES,
} = ERROR_TYPES;

let templateId;

module.exports = {
  createProduct: async (req, res) => {
    try {
      const origin = await setOrigin(req.headers);

      const user = await User.findOne({
        _id: req.userId,
      });
      const profile = await Profile.findOne({
        user: req.userId,
      });
      if (!user) {
        return res.status(404).send({
          success: false,
          msg: USER_NOT_FOUND,
        });
      }
      if (!profile) {
        return res.status(404).send({
          success: false,
          msg: PROFILE_NOT_FOUND,
        });
      }
      const data = req.body;
      if (Object.getOwnPropertyNames(data).length === 0) {
        res.status(400).json({
          success: false,
          msg: DATA_MISSING,
        });
      } else {
        let hostCurrencyCode;
        const hostCountryCurrency = countryJS.search(profile.location.address.split(' ').pop());
        if (hostCountryCurrency.length > 0) {
          hostCurrencyCode = hostCountryCurrency[0].currency.currencyCode.toLowerCase() || 'eur';
        }

        const newAbout = {
          methodology: data.methodology,
          whatWillYouLearn: data.whatWillYouLearn,
        };
        const newtaxonomies = {
          profession: data.profession,
          subjects: data.subjects,
          topics: data.topics,
        };

        const newLocation = {};
        if (data.locationDetails && data.address) {
          newLocation.type = 'Point';
          newLocation.coordinates = data.locationDetails;
          newLocation.address = data.address;
        }

        const newProduct = await new Product({
          user: req.userId,
          productName: data.productName,
          isIndividual: data.isIndividual,
          productMode: data.productMode,
          isPublished: data.isPublished,
          productLevel: data.productLevel,
          eventTaxonomies: newtaxonomies,
          numberOfSeats: data.numberOfSeats,
          about: newAbout,
          productType: data.productType,
          location: newLocation,
          feeDescription: data.feeDescription,
          firstClassFree: data.firstClassFree,
          languages: data.languages,
          timeSlots: data.timeSlots,
          schedule: data.schedule,
          currency: profile.userCurrency,
        });

        if (req.file) {
          const imageUrl = await uploadImage('eventImages', req.userId, req.file);
          if (imageUrl) {
            newProduct.productImageURL = imageUrl;
          }
        }

        const scheduleItems = data.newSchedule.map((item) => ({
          user: req.userId,
          productId: newProduct._id,
          classType: item.classType,
          startTime: item.startTime,
          endTime: item.endTime,
          eventStartDate: item.eventStartDate,
          eventEndDate: item.eventEndDate,
          productFrequency: item.productFrequency,
          sessionCode: item.sessionCode,
          seatsAvailable: data.numberOfSeats,
        }));

        const items = data.newData.map((item) => ({
          user: req.userId,
          productId: newProduct._id,
          price: item.price,
          frequency: item.frequency,
          daysCount: item.daysCount,
        }));

        const newSessions = [profile.totalSessionsByHost, scheduleItems.length]
          .map((elem) => parseInt(elem, 10));

        const totalSessionsLength = newSessions.reduce((a, b) => a + b, 0);

        await newProduct.save();

        await Profile.findOneAndUpdate({
          user: req.userId,
        }, {
          $inc: { totalEventsByHost: 1, counts: 1 },
          $set: { totalSessionsByHost: totalSessionsLength },
          $push: {
            eventsByHost: newProduct,
            countUpdatedAt: Date.now(),
          },
        }, {
          upsert: true,
          returnOriginal: false,
        });

        const scheduleResult = await ProductVariants.insertMany(scheduleItems);

        await Product.findOneAndUpdate({
          _id: newProduct._id,
          user: req.userId,
        }, {
          $push: {
            schedule: scheduleResult,
          },
        }, {
          new: true,
        });

        const variantsResult = await VariantTypes.insertMany(items);

        const productResult = await Product.findOneAndUpdate({
          _id: newProduct._id,
          user: req.userId,
        }, {
          $push: {
            variantTypes: variantsResult,
          },
        }, {
          new: true,
        });

        const stripeProduct = await stripe.products.create({
          name: productResult.productName,
        }, { stripeAccount: profile.stripeAccount });

        productResult.stripeProductId = stripeProduct.id;
        variantsResult.forEach(async (variant, i) => {
          if (variant.frequency === 'month' || variant.frequency === 'year') {
            const price = await stripe.prices.create({
              nickname: variant.frequency,
              product: productResult.stripeProductId,
              unit_amount: variant.price * 100,
              // uncomment below line to for other type of currency
              // currency: hostCountryCurrency[0].currency.currencyCode.toLowerCase(),
              currency: hostCurrencyCode || 'eur',
              recurring: {
                interval: variant.frequency,
                usage_type: 'licensed',
              },
            }, { stripeAccount: profile.stripeAccount });
            variantsResult[i].priceId = price.id;
            await variantsResult[i].save();
          }
        });
        await productResult.save();

        // send mail
        if (req.headers.language === 'en') {
          templateId = EMAIL_TEMPLATE_IDS.ENGLISH_CLASS_CREATED;
        } else {
          templateId = EMAIL_TEMPLATE_IDS.SPANISH_CLASS_CREATED;
        }

        const msg = {
          to: user.email,
          from: sender_email,
          templateId,
          dynamic_template_data: {
            firstName: `${profile.firstName}`,
            url: `${origin}event/${productResult._id}`,
          },
        };

        sendMail(msg);

        return res.status(200).json({
          productResult,
        });
      }
    } catch (err) {
      // console.log(err);
      return res.status(500).send(err.message);
    }
  },

  getAllProducts: async (req, res) => {
    try {
      await Product.find({}).select(['_id', 'productName', 'productType', 'productImageURL', 'isPublished']).then((data) => {
        res.status(200).send({
          product: data,
        });
      });
    } catch (err) {
      res.status(500).send(err.message);
    }
  },
  getLoggedInUserProduct: async (req, res) => {
    try {
      const profile = await Profile.findOne({
        user: req.userId,
      })
        .select(['_id', 'firstName', 'lastName', 'profileImage', 'profileLevel', 'role', 'profileBelt']);
      await Product.findOne({
        _id: req.params.productId,
      })
        .populate('bookedEventSessions', 'bookedSlotId')
        .populate('profile', '_id firstName lastName role profileImage profileLevel profileBelt')
        .populate('schedule')
        .populate('variantTypes')
        .then((data) => {
          if (!data) {
            return res.status(404).send(PRODUCT_NOT_FOUND);
          }

          if (data.isPublished === false
            && (data.user !== req.userId && !data.numberOfStudents.includes(req.userId))) {
            return res.status(403).send({
              success: false,
              msg: ERROR_TYPES.YOU_CANNOT_VIEW_THIS_PRODUCT,
            });
          }

          return res.status(200).send({
            product: data,
            profile,
          });
        });
    } catch (err) {
      return res.send(err.message);
    }
  },
  getProductByUserId: async (req, res) => {
    try {
      const user = await User.find({
        _id: req.params.userid,
      })
        .select('_id', 'email');
      const profile = await Profile.findOne({
        user: req.params.id,
      })
        .populate('event', '-numberOfStudents -productTotalEarnings');

      return res.status(200).send({
        msg: TOKEN_VERIFIED,
        product: { ...user, ...profile },
      });
    } catch (err) {
      return res.send(err.message);
    }
  },

  getAllProductsByUser: async (req, res) => {
    try {
      const product = await Profile.findOne({
        user: req.userId,
      })
        .select('_id firstName lastName profileImage bookedEventsByStudent eventsByHost')
        .populate('eventsByHost')
        .populate('bookedEventsByStudent');
      /* const hostProducts = await Product.find({
        user: req.userId,
      });
*/
      return res.status(200).send({
        msg: TOKEN_VERIFIED,
        // product: hostProducts,
        product,
      });
    } catch (err) {
      return res.status(500).end(err.message);
    }
  },

  getSessionsByHost: async (req, res) => {
    try {
      const ongoingSessions = [];
      const upcomingSessions = [];
      const time = moment.utc();

      const userSession = await ProductVariants.find({
        user: req.userId, isActive: true, endTime: { $gte: new Date() },
      })
        .populate('productId', '_id productName productType numberOfSeats productImageURL -variantTypes -schedule')
        .sort({ endTime: 1 });

      // console.log(userSession.length, 'userSession.length');

      if (userSession.length === 0) {
        return res.status(200).send({
          msg: TOKEN_VERIFIED,
          ongoingSessions,
          upcomingSessions,
        });
      }
      userSession.forEach((session, index) => {
        const startTime = moment.utc(session.startTime);
        const endTime = moment.utc(session.endTime);

        if (time.isSame(startTime)
            || time.isSame(endTime)
            || time.isBetween(startTime, endTime)
        ) {
          ongoingSessions.push(session);
        } else if (time.isBefore(startTime)) {
          upcomingSessions.push(session);
        }

        if (userSession.length === index + 1) {
          return res.status(200).send({
            msg: TOKEN_VERIFIED,
            ongoingSessions,
            upcomingSessions,
          });
        }
      });
    } catch (err) {
      return res.status(500).send(err.message);
    }
  },

  getProductByProductId: async (req, res) => {
    try {
      const data = await Product.findOne({
        _id: req.params.productId,
      })
        .populate({
          path: 'user',
          select: 'profile',
          populate: {
            path: 'profile',
            model: 'Profile',
            select: '-eventsByHost -location -taxonomies -socialLinks -isStripeConnected -numtotalSpent -counts -numtotalEarnings -totalReviews -totalStudents -totalProductPurchased -productPurchasedAt -totalSessionsPurchased -bio -methodology -profileLevel -dob -totalSessionsByHost -totalEventsByHost -studentPurchasedProductAt -countUpdatedAt -bookedEventsByStudent -bookedSessionsByStudent -totalOrdersByStudent -videoLink -phoneNumber -postalAddress -background',
          },
        })
        .populate('schedule')
        .populate('variantTypes');

      if (!data) {
        return res.status(404).send({
          success: false,
          msg: PRODUCT_NOT_FOUND,
        });
      }

      if (data.isPublished === false
        && (!data.user._id.equals(req.userId) && !data.numberOfStudents.includes(req.userId))) {
        return res.status(403).send({
          success: false,
          msg: ERROR_TYPES.YOU_CANNOT_VIEW_THIS_PRODUCT,
        });
      }

      await Profile.findOneAndUpdate({
        user: data.user._id,
      }, {
        $inc: { counts: 1 },
        $push: { countUpdatedAt: Date.now() },
      }, {
        upsert: true,
        returnOriginal: false,
      });
      return res.status(200).json({
        data,
      });
    } catch (err) {
      return res.status(500).send(err.message);
    }
  },

  updateProduct: async (req, res) => {
    try {
      const user = await User.findOne({
        _id: req.userId,
      });
      const profile = await Profile.findOne({
        user: req.userId,
      });
      const product = await Product.findOne({
        _id: req.params.productId,
        user: req.userId,
      });
      if (!user) {
        return res.status(404).send({
          success: false,
          msg: USER_NOT_FOUND,
        });
      }
      if (!product) {
        return res.status(404).send({
          success: false,
          msg: PRODUCT_NOT_FOUND,
        });
      }
      const data = req.body;
      if (Object.getOwnPropertyNames(data).length === 0 && !req.file) {
        return res.status(400).json({
          success: false,
          msg: DATA_MISSING,
        });
      }

      if (req.file) {
        const imageUrl = await uploadImage('eventImages', req.userId, req.file);
        if (imageUrl) {
          data.productImageURL = imageUrl;
        }
      }

      let hostCurrencyCode;
      const hostCountryCurrency = countryJS.search(profile.location.address.split(' ').pop());
      if (hostCountryCurrency.length > 0) {
        hostCurrencyCode = hostCountryCurrency[0].currency.currencyCode.toLowerCase() || 'eur';
      }

      if (data.pricingData) {
        const items = data.pricingData.map((item) => ({
          user: req.userId,
          productId: req.params.productId,
          price: item.price,
          frequency: item.frequency,
          daysCount: item.daysCount,
        }));

        const updatedVariantsResult = await VariantTypes.insertMany(items);

        updatedVariantsResult.forEach(async (variant, i) => {
          if (variant.frequency === 'month' || variant.frequency === 'year') {
            const price = await stripe.prices.create({
              nickname: variant.frequency,
              product: product.stripeProductId,
              unit_amount: variant.price * 100,
              // uncomment below line to for other type of currency
              // currency: hostCountryCurrency[0].currency.currencyCode.toLowerCase(),
              currency: hostCurrencyCode || 'eur',
              recurring: {
                interval: variant.frequency,
                usage_type: 'licensed',
              },
            }, { stripeAccount: profile.stripeAccount });
            updatedVariantsResult[i].priceId = price.id;
            await updatedVariantsResult[i].save();
          }
        });

        await Product.findOneAndUpdate({
          _id: req.params.productId,
          user: req.userId,
        }, {
          $push: {
            variantTypes: updatedVariantsResult,
          },
        }, {
          new: true,
        });
      }

      if (data.numberOfSeats && data.numberOfSeats < product.numberOfSeats) {
        return res.status(400).json({
          success: false,
          msg: 'CANNOT_DECREMENT_SEATS',
        });
      }
      data.isSoldOut = false;
      data.isPublished = true;

      if (data.numberOfSeats) {
        const a = product.numberOfSeats;
        const b = data.numberOfSeats;

        const seatsDiff = Math.abs(b - a);

        const query = {
          productId: product._id,
          startTime: { $gte: new Date() },
        };
        const update = { $inc: { seatsAvailable: seatsDiff } };
        const options = { upsert: false };

        await ProductVariants.updateMany(query, update, options)
          .then((sessions) => sessions)
          .catch((err) => err);
      }

      let result;

      if (!data.location) {
        result = await Product.findOneAndUpdate({
          _id: req.params.productId,
          user: req.userId,
        }, {
          $set: data,
          $unset: {
            location: '',
          },
        },
        { new: true });
      } else {
        result = await Product.findOneAndUpdate({
          _id: req.params.productId,
          user: req.userId,
        }, { $set: data },
        { new: true });
      }

      if (result == null) {
        return res.status(404).json({
          success: false,
          msg: ERROR_TYPES.PRODUCT_NOT_FOUND,
        });
      }

      return res.status(200).json({
        updatedProduct: result,
      });
    } catch (err) {
      return res.status(500).send(err.message);
    }
  },

  updateisPublishedProduct: async (req, res) => {
    try {
      const data = req.body;

      const product = await Product.findOne({
        _id: req.params.productId,
        user: req.userId,
      });

      const profile = await Profile.findOne({
        user: req.userId,
      });

      if (!product) {
        return res.status(404).send({
          success: false,
          msg: PRODUCT_NOT_FOUND,
        });
      }

      if (Object.getOwnPropertyNames(data).length === 0) {
        return res.status(400).json({
          success: false,
          msg: DATA_MISSING,
        });
      }

      if (product.isSoldOut === true && (data.isPublished === 'true' || data.isPublished === true)) {
        return res.status(403).send({
          success: false,
          msg: CANNOT_PUBLISH_SOLD_OUT_EVENT,
        });
      }

      if (product.isActive === false && (data.isPublished === 'true' || data.isPublished === true)) {
        return res.status(403).send({
          success: false,
          msg: CANNOT_PUBLISH_WITH_EXPIRED_SCHEDULES,
        });
      }

      if (profile.isStripeConnected === false && (data.isPublished === 'true' || data.isPublished === true)) {
        return res.status(403).send({
          success: false,
          msg: STRIPE_NOT_CONNECTED,
        });
      }

      const result = await Product.findOneAndUpdate({
        _id: req.params.productId,
        user: req.userId,
      }, { $set: data },
      { new: true });

      if (result == null) {
        return res.status(404).json({
          success: false,
          msg: ERROR_TYPES.PRODUCT_NOT_FOUND,
        });
      }

      return res.status(200).json({
        updatedProduct: result,
      });
    } catch (err) {
      return res.status(500).send(err.message);
    }
  },

  updateVariant: async (req, res) => {
    try {
      const user = await User.findOne({
        _id: req.userId,
      });

      if (!user) {
        return res.status(404).send({
          success: false,
          msg: USER_NOT_FOUND,
        });
      }

      const data = req.body;
      if (Object.getOwnPropertyNames(data).length === 0) {
        return res.status(400).json({
          success: false,
          msg: DATA_MISSING,
        });
      }

      let productId;
      const promises = [];
      const updatedPromise = [];

      data.forEach((item) => {
        productId = item.productId;
        if (item._id) {
          const promise = VariantTypes.findOneAndUpdate(
            { _id: item._id, user: req.userId },
            {
              $set: {
                price: item.price,
                frequency: item.frequency,
                updatedAt: Date.now(),

              },
            },
            {
              returnOriginal: false,
            },
          );
          promises.push(promise);
        } else {
          const upProduct = new VariantTypes({
            user: req.userId,
            productId,
            price: item.price,
            frequency: item.frequency,
            daysCount: item.daysCount,
          });

          const promise2 = upProduct.save();

          promises.push(promise2);
          updatedPromise.push(promise2);
        }
      });

      Promise.all(updatedPromise)
        .then((result) => Product.findOneAndUpdate({
          _id: productId,
          user: req.userId,
        }, {
          $push: {
            variantTypes: result,
          },
        }, {
          new: true,
          returnOriginal: false,
        }));

      Promise.all(promises)
        .then((result) => res.status(200).send({
          updatedProduct: result,
        }))
        .catch((err) => {
          // console.log(err.message);
          res.status(403).send(err.message);
        });
    } catch (err) {
      // console.log(err);
      res.status(500).send(err.message);
    }
  },

  updateSchedule: async (req, res) => {
    try {
      const user = await User.findOne({
        _id: req.userId,
      });

      const product = await Product.findOne({
        _id: req.params.productId,
        user: req.userId,
      });

      if (!user) {
        return res.status(404).send({
          success: false,
          msg: USER_NOT_FOUND,
        });
      }

      if (!product) {
        return res.status(404).send({
          success: false,
          msg: PRODUCT_NOT_FOUND,
        });
      }

      const data = req.body;
      if (Object.getOwnPropertyNames(data).length === 0) {
        return res.status(400).json({
          success: false,
          msg: DATA_MISSING,
        });
      }

      const promises = [];
      const updatedPromise = [];

      data.forEach((item) => {
        const upProduct = new ProductVariants({
          user: req.userId,
          productId: product._id,
          classType: item.classType,
          startTime: item.startTime,
          endTime: item.endTime,
          eventStartDate: item.eventStartDate,
          eventEndDate: item.eventEndDate,
          productFrequency: item.productFrequency,
          sessionCode: item.sessionCode,
          seatsAvailable: product.numberOfSeats,
        });

        const promise2 = upProduct.save();

        promises.push(promise2);
        updatedPromise.push(promise2);
      });

      Promise.all(updatedPromise)
        .then((result) => Product.findOneAndUpdate({
          _id: product._id,
          user: req.userId,
        }, {
          $set: {
            isActive: true,
            isSoldOut: false,
          },
          $push: {
            schedule: result,
          },
        }, {
          new: true,
          returnOriginal: false,
        }));

      Promise.all(promises).then((results) => {
        res.status(200).send({
          updatedProduct: results,
        });
      })
        .catch((err) => {
          // console.log(err.message); // some coding error in handling happenedr
          res.status(500).send(err.message);
        });
    } catch (err) {
      // console.log(err);
      return res.status(500).send(err.message);
    }
  },

};
