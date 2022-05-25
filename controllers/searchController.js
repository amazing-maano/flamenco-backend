/* eslint-disable no-underscore-dangle */
const mongoose = require('mongoose');

const Product = require('../models/productsModel');
const Profile = require('../models/profileModel');
const ClassTaxonomies = require('../models/classTaxonomiesModel');
const SearchStats = require('../models/searchStatsModel');

const fetchProducts = async (productIds, maxPrice, minPrice) => {
  try {
    const products = await Product.find({ _id: { $in: productIds } })
      .populate({
        path: 'user',
        select: 'profile',
        populate: {
          path: 'profile',
          model: 'Profile',
          select:
            '-eventsByHost -taxonomies -socialLinks -isStripeConnected -numtotalSpent -counts -numtotalEarnings -totalReviews -totalStudents -totalProductPurchased -productPurchasedAt -totalSessionsPurchased -bio -methodology -profileLevel -dob -totalSessionsByHost -totalEventsByHost -studentPurchasedProductAt -countUpdatedAt -bookedEventsByStudent -bookedSessionsByStudent -totalOrdersByStudent -videoLink -phoneNumber -stripeAccount -postalAddress -background',
        },
      })
      .populate('variantTypes')
      .select(
        '-stripeProductId -numberOfStudents -bookedEventSessions -productTotalEarnings -about -reviews -schedule',
      )
      .sort({ rating: -1 });

    let filteredProducts = products.map((product) => {
      const prod = product;
      if (prod?.variantTypes && maxPrice) {
        prod.variantTypes = prod.variantTypes.filter(
          (variant) => variant.price <= maxPrice,
        );
      }
      if (prod?.variantTypes && minPrice) {
        prod.variantTypes = prod.variantTypes.filter(
          (variant) => minPrice <= variant.price,
        );
      }
      return prod;
    });
    filteredProducts = filteredProducts.filter(
      (product) => product?.variantTypes?.length > 0,
    );

    return filteredProducts;
  } catch (err) {
    return err.message;
  }
};

const fetchProfiles = async (profileIds) => {
  const results = await Profile.find({ _id: { $in: profileIds } }).select(
    '-numtotalSpent -userCurrency -socialLinks -stripeVerificationStatus -dob -phoneNumber -studentPurchasedProductAt -countUpdatedAt -totalOrdersByStudent -postalAddress -numtotalEarnings -totalProductPurchased -totalSessionsPurchased -videoLink -stripeAccount -productPurchasedAt -eventsByHost -bookedEventsByStudent -bookedSessionsByStudent -bio -methodology -background',
  );

  return results;
};

module.exports = {
  searchProductByFilters: async (req, res) => {
    try {
      let regex;

      let minDis;
      let maxDis;
      let coordinates;

      const maxPrice = parseFloat(req.query.maxPrice);
      const minPrice = parseFloat(req.query.minPrice);

      const perPage = Number(req.body.pageSize);
      const page = Math.max(0, Number(req.body.pageNumber));

      if (req.query.lng && req.query.lat) {
        coordinates = [req.query.lng, req.query.lat].map(parseFloat);

        if (!req.query.minDistance && !req.query.maxDistance) {
          minDis = 0;
          maxDis = 200000;
        } else {
          minDis = req.query.minDistance * 1000;
          maxDis = req.query.maxDistance * 1000;
        }
      }

      let finalProfileQuery;

      const keyWordQuery = {};
      const teachersIds = [];

      const searchProfession = [];
      const searchSubject = [];
      const searchTopics = [];
      const searchTags = [];

      let findTeachers;

      if (
        Object.keys(req.query).length === 0
        && maxPrice.length == null
        && minPrice.length == null
      ) {
        const initialSearchDataProduct = await Product.find({
          isActive: true,
          isPublished: true,
        })
          .populate({
            path: 'user',
            select: 'profile',
            populate: {
              path: 'profile',
              model: 'Profile',
              select:
                '-eventsByHost -taxonomies -socialLinks -isStripeConnected -numtotalSpent -counts -numtotalEarnings -totalReviews -totalStudents -totalProductPurchased -productPurchasedAt -totalSessionsPurchased -bio -methodology -profileLevel -dob -totalSessionsByHost -totalEventsByHost -studentPurchasedProductAt -countUpdatedAt -bookedEventsByStudent -bookedSessionsByStudent -totalOrdersByStudent -videoLink -phoneNumber -stripeAccount -postalAddress -background',
            },
          })
          .populate('variantTypes')
          .select(
            '-stripeProductId -numberOfStudents -bookedEventSessions -productTotalEarnings -about -reviews -schedule',
          )
          .sort({ rating: -1 })
          .skip(perPage * page)
          .limit(perPage);

        return res.status(200).json({
          productData: initialSearchDataProduct,
          productIdResult: [],
        });
      }

      if (
        req.query.keyword
        && Object.keys(req.query.keyword).length !== 0
      ) {
        const splitKeyword = req.query.keyword
          .trim()
          .replace(/\s+/g, ' ')
          .split(' ');

        regex = splitKeyword.map((e) => new RegExp(e, 'i'));

        keyWordQuery.productName = { $in: regex };

        const findProfession = await ClassTaxonomies.find({
          $or: [
            { profession: { $in: regex } },
            { professionESP: { $in: regex } },
          ],
        }).select('profession professionESP');

        const findSubjects = await ClassTaxonomies.aggregate([
          {
            $match: {
              $or: [
                { 'sub.subject': { $in: regex } },
                { 'sub.subjectESP': { $in: regex } },
              ],
            },
          },
          { $unwind: '$sub' },
          { $group: { _id: '$sub' } },
          {
            $match: {
              $or: [
                { '_id.subject': { $in: regex } },
                { '_id.subjectESP': { $in: regex } },
              ],
            },
          },
          { $project: { '_id._id': 1 } },
        ]);

        const findTopics = await ClassTaxonomies.aggregate([
          {
            $match: {
              $or: [
                { 'sub.topics.topicName': { $in: regex } },
                { 'sub.topics.topicNameESP': { $in: regex } },
              ],
            },
          },
          { $unwind: '$sub' },
          { $unwind: '$sub.topics' },
          { $unwind: '$sub.topics.topicName' },
          { $unwind: '$sub.topics.topicNameESP' },
          { $group: { _id: '$sub.topics' } },
          {
            $match: {
              $or: [
                { '_id.topicName': { $in: regex } },
                { '_id.topicNameESP': { $in: regex } },
              ],
            },
          },
          { $project: { '_id._id': 1, '_id.tags': 1 } },
        ]);

        const findTags = await ClassTaxonomies.aggregate([
          {
            $match: {
              $or: [
                { 'sub.tags.tagName': { $in: regex } },
                { 'sub.tags.tagNameESP': { $in: regex } },
              ],
            },
          },
          { $unwind: '$sub' },
          { $unwind: '$sub.tags' },
          { $unwind: '$sub.tags.tagName' },
          { $unwind: '$sub.tags.tagNameESP' },
          { $group: { _id: '$sub.tags' } },
          {
            $match: {
              $or: [
                { '_id.tagName': { $in: regex } },
                { '_id.tagNameESP': { $in: regex } },
              ],
            },
          },
          { $project: { '_id._id': 1, '_id.topics': 1 } },
        ]);

        findProfession.forEach(async (taxonomy) => {
          searchProfession.push(mongoose.Types.ObjectId(taxonomy._id));
        });

        findSubjects.forEach(async (taxonomy) => {
          searchSubject.push(mongoose.Types.ObjectId(taxonomy._id._id));
        });

        findTopics.forEach(async (taxonomy) => {
          searchTopics.push(mongoose.Types.ObjectId(taxonomy._id._id));
        });

        findTags.forEach(async (taxonomy) => {
          searchTags.push(mongoose.Types.ObjectId(taxonomy._id._id));
        });

        finalProfileQuery = {
          role: 'host',
          $or: [
            { firstName: { $in: regex } },
            { lastName: { $in: regex } },
            { 'taxonomies.profession': { $in: searchProfession } },
            { commercialName: { $in: regex } },
          ],
        };
      }

      if (finalProfileQuery !== undefined) {
        findTeachers = await Profile.find(finalProfileQuery).select(
          '-profileImage -lastName -role -profileLevel -profileBelt -createdAt -updatedAt -firstName -counts -totalSessionsByHost -totalStudents -totalEventsByHost -totalReviews -languages -isStripeConnected -taxonomies -location -numtotalSpent -userCurrency -socialLinks -stripeVerificationStatus -dob -phoneNumber -studentPurchasedProductAt -countUpdatedAt -totalOrdersByStudent -postalAddress -numtotalEarnings -totalProductPurchased -totalSessionsPurchased -videoLink -stripeAccount -productPurchasedAt -eventsByHost -bookedEventsByStudent -bookedSessionsByStudent -bio -methodology -background',
        );

        findTeachers.forEach(async (teacher) => {
          const id = mongoose.Types.ObjectId(teacher.user._id);
          teachersIds.push(id);
        });
      }

      let finalProductQuery = {};

      if (req.query.lat && req.query.lng && !req.query.keyword) {
        finalProductQuery = {
          location: {
            $near: {
              $geometry: { type: 'Point', coordinates },
              $minDistance: minDis,
              $maxDistance: maxDis,
            },
          },
        };
      } else if (req.query.lat && req.query.lng) {
        finalProductQuery = {
          location: {
            $near: {
              $geometry: { type: 'Point', coordinates },
              $minDistance: minDis,
              $maxDistance: maxDis,
            },
          },
          $or: [
            keyWordQuery,
            { 'eventTaxonomies.subjects': { $in: searchSubject } },
            { 'eventTaxonomies.topics': { $in: searchTopics } },
            { 'eventTaxonomies.topics': { $in: searchTags } },
            { user: { $in: teachersIds } },
          ],
        };
      } else {
        finalProductQuery = {
          $or: [
            keyWordQuery,
            { 'eventTaxonomies.subjects': { $in: searchSubject } },
            { 'eventTaxonomies.topics': { $in: searchTopics } },
            { 'eventTaxonomies.topics': { $in: searchTags } },
            { user: { $in: teachersIds } },
          ],
        };
      }

      if (req.query.rating) {
        finalProductQuery.rating = { $gte: req.query.rating };
      }

      if (req.query.productLevel) {
        finalProductQuery.productLevel = req.query.productLevel;
      }

      if (req.query.productMode) {
        finalProductQuery.productMode = req.query.productMode;
      }

      if (req.query.type === 'classes') {
        finalProductQuery.productType = 'class';
      }

      if (req.query.type === 'experiences') {
        finalProductQuery.productType = 'experience';
      }

      finalProductQuery.isPublished = true;
      finalProductQuery.isActive = true;

      if (finalProductQuery.length !== 0) {
        await SearchStats.updateMany({},
          {
            $inc: { totalSearches: 1 },
          }, { upsert: true, multi: true });
      }

      const products = await Product.find(finalProductQuery).select(
        '-updatedAt -createdAt -productImageURL -currency -feeDescription -productType -numberOfSeats -productLevel -productMode -isIndividual -location -languages -rating -totalReviews -firstClassFree -timeSlots -isSoldOut -variantTypes -user -eventTaxonomies -stripeProductId -numberOfStudents -bookedEventSessions -productTotalEarnings -about -reviews -schedule',
      );

      if (products.length === 0 && findTeachers.length === 0) {
        return res.status(404).send('No exact match found!');
      }

      const productIdResult = products.map((id) => id._id);

      const finalProductResult = await fetchProducts(
        productIdResult.slice(0, perPage),
        maxPrice,
        minPrice,
      );

      return res.status(200).json({
        productData: finalProductResult || [],
        productIdResult,
      });
    } catch (err) {
      return res.status(404).send(err.message);
    }
  },

  fetchNextResults: async (req, res) => {
    try {
      const maxPrice = parseFloat(req.query.maxPrice);
      const minPrice = parseFloat(req.query.minPrice);

      const products = await fetchProducts(
        req.body.productIds.slice(0, req.query.pageSize),
        maxPrice,
        minPrice,
      );

      const teachers = await fetchProfiles(
        req.body.profileIds.slice(0, req.query.pageSize),
      );

      return res.status(200).json({
        productData: products,
        profileData: teachers,
      });
    } catch (err) {
      return res.status(404).send(err.message);
    }
  },

  updatePurchasesOnSearches: async (req, res) => {
    try {
      await SearchStats.updateMany({},
        {
          $inc: { totalPurchases: 1 },
        }, { upsert: true, returnOriginal: false });

      return res.status(200).send('UPDATED_STATS');
    } catch (error) {
      return res.status(500).send(error.message);
    }
  },
};
