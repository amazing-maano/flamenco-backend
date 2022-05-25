/* eslint-disable func-names */
const Productvariants = require('../models/productVariantsModel');

const productVariantWorkerFactory = function () {
  return {
    run() {
      Productvariants.deactivateExpired();
    },
  };
};

module.exports = productVariantWorkerFactory();
