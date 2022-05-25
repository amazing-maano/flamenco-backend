/* eslint-disable func-names */
const Products = require('../models/productsModel');

const productWorkerFactory = function () {
  return {
    run() {
      // Products.deactivateExpired();
      Products.deactivateExpiredProduct();
    },
  };
};

module.exports = productWorkerFactory();
