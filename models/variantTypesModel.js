const mongoose = require('mongoose');

const { Schema } = mongoose;

const VariantTypesSchema = new Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Products',
    required: true,
  },
  price: {
    type: Number,
    min: [0, 'Variant\'s price can not be less than 0!'],
    required: true,
  },
  numberOfClass: {
    type: Number,
    min: [1, 'Variant\'s numberOfClass can not be less than 1!'],
  },
  frequency: {
    type: String,
    required: true,
    enum: ['single', 'combo', 'month', 'year'],
  },
  daysCount: {
    type: Number,
    min: [1, 'Variant\'s daysCount can not be less than 1!'],
  },
  priceId: {
    type: String,
  },
}, { timestamps: true });
VariantTypesSchema.set('toObject', { virtuals: true });
VariantTypesSchema.set('toJSON', { virtuals: true });
module.exports = mongoose.model('VariantTypes', VariantTypesSchema);
