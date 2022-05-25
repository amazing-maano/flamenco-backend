/* eslint-disable func-names */
const mongoose = require('mongoose');
const moment = require('moment');

const { Schema } = mongoose;

const ProductVariantsSchema = new Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Products',
    // autopopulate: true,
    required: true,
  },
  sessionCode: {
    type: String,
    required: true,
  },
  classType: String,
  startTime: {
    type: Date,
    required: true,
  },
  endTime: {
    type: Date,
    required: true,
  },
  eventStartDate: {
    type: Date,
    required: true,
  },
  eventEndDate: {
    type: Date,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },

  seatsAvailable: {
    type: Number,
  },
  productFrequency: {
    type: String,
    // enum: ['single', 'weekly', 'monthly', 'yearly'],
  },

}, { timestamps: true });

ProductVariantsSchema.plugin(require('mongoose-autopopulate'));

ProductVariantsSchema.set('toObject', { virtuals: true });
ProductVariantsSchema.set('toJSON', { virtuals: true });

ProductVariantsSchema.methods.requiresDeactivationByTime = function () {
  return (this?.endTime && (this?.isActive === true || this?.isActive == null)
    ? moment.utc(this.endTime).isBefore(moment.utc()) : false
  );
};

ProductVariantsSchema.methods.requiresDeactivationBySeats = function () {
  return (this?.seatsAvailable === 0);
};

ProductVariantsSchema.statics.deactivateExpired = function (callback) {
  function deactivateProductVariants(variants) {
    variants.forEach(async (variant) => {
      // eslint-disable-next-line no-use-before-define
      await ProductVariants.findOneAndUpdate(
        // eslint-disable-next-line no-underscore-dangle
        { _id: variant._id },
        {
          $set: {
            isActive: false,
          },
        },
      );
    });
  }

  // eslint-disable-next-line no-use-before-define
  ProductVariants
    .find({ $or: [{ isActive: null }, { isActive: true }] })
    .then((variants) => {
      const deactivatableVariantsByTime = variants.filter(
        (variant) => variant.requiresDeactivationByTime(),
      );
      const deactivatableVariantsBySeats = variants.filter(
        (variant) => variant.requiresDeactivationBySeats(),
      );

      if (deactivatableVariantsByTime.length > 0 || deactivatableVariantsBySeats.length > 0) {
        deactivateProductVariants(deactivatableVariantsByTime);
        deactivateProductVariants(deactivatableVariantsBySeats);
      }
    });

  if (callback) {
    callback.call();
  }
};

const ProductVariants = mongoose.model('ProductVariants', ProductVariantsSchema);

module.exports = ProductVariants;
