const mongoose = require('mongoose');

const { Schema } = mongoose;

const SearchStatsSchema = new Schema({
  totalSearches: {
    type: Number,
    required: true,
    default: 0,
  },
  totalPurchases: {
    type: Number,
    required: true,
    default: 0,
  },
}, { timestamps: true });

module.exports = mongoose.model('SearchStats', SearchStatsSchema);
