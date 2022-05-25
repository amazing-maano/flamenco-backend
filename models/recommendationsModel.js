const mongoose = require('mongoose');

const { Schema } = mongoose;

const RecommendationSchema = new Schema({
  recommendedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  recommendedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  message: {
    type: String,
    required: true,
    trim: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('Recommendation', RecommendationSchema);
