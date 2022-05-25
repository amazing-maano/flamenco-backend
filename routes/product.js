const express = require('express');

const router = express.Router();
const passport = require('passport');

const multer = require('multer');

const singleUpload = multer({ dest: 'tmp/public/' }).single('file');

const requireAuth = passport.authenticate('jwt', { session: false });

const { isAuthenticated, ifTokenExists } = require('../utils/isAuthenticated');

const { isHost } = require('../utils/checkRole');

const { generateRoutes } = require('../utils/generateRoutes');
const {
  createProduct, getProductByProductId, updateProduct, getAllProductsByUser,
  getAllProducts, getProductByUserId, getSessionsByHost, getLoggedInUserProduct,
  updateVariant, updateSchedule, updateisPublishedProduct,
} = require('../controllers/productsController');

const { searchProductByFilters, fetchNextResults, updatePurchasesOnSearches } = require('../controllers/searchController');

const ProductRoutes = [
  {
    method: 'post',
    route: '/create-product',
    middleware: [requireAuth, isAuthenticated, singleUpload, isHost],
    action: createProduct,
  },
  {
    method: 'get',
    route: '/all-products',
    middleware: [requireAuth, isAuthenticated],
    action: getAllProducts,
  },
  {
    method: 'get',
    route: '/user/products/:productId',
    middleware: [requireAuth, isAuthenticated, isHost],
    action: getLoggedInUserProduct,
  },
  {
    method: 'get',
    route: '/product/user/:userId',
    action: getProductByUserId,
  },
  {
    method: 'get',
    route: '/user/all-products',
    middleware: [requireAuth, isAuthenticated],
    action: getAllProductsByUser,
  },
  {
    method: 'get',
    route: '/sessions-by-host',
    middleware: [requireAuth, isAuthenticated, isHost],
    action: getSessionsByHost,
  },
  {
    method: 'get',
    route: '/product/:productId',
    middleware: ifTokenExists,
    action: getProductByProductId,
  },
  {
    method: 'put',
    route: '/update-product/:productId',
    middleware: [requireAuth, isAuthenticated, isHost, singleUpload],
    action: updateProduct,
  },
  {
    method: 'put',
    route: '/update-published/:productId',
    middleware: [requireAuth, isAuthenticated, isHost],
    action: updateisPublishedProduct,
  },
  {
    method: 'put',
    route: '/update-variant',
    middleware: [requireAuth, isAuthenticated, isHost],
    action: updateVariant,
  },
  {
    method: 'put',
    route: '/update-schedule/:productId',
    middleware: [requireAuth, isAuthenticated, isHost],
    action: updateSchedule,
  },
  {
    method: 'post',
    route: '/search-events/',
    action: searchProductByFilters,
  },
  {
    method: 'post',
    route: '/fetch-results/',
    action: fetchNextResults,
  },
  {
    method: 'put',
    route: '/update-purchase-stats',
    action: updatePurchasesOnSearches,
  },
];

generateRoutes(router, ProductRoutes);

module.exports = router;
