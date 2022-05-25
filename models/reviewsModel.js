const mongoose = require('mongoose');

const { Schema } = mongoose;

const ReviewsSchema = new Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Products',
    // autopopulate: true,
  },
  stars: { type: Number, required: true },
  comment: { type: String, required: true, trim: true },
  profile: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Profile',
    // autopopulate: true,
  },
}, { timestamps: true });

const Reviews = mongoose.model('Reviews', ReviewsSchema, 'reviews');

module.exports = Reviews;
