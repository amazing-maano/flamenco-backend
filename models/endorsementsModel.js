const mongoose = require('mongoose');

const { Schema } = mongoose;

const EndorsementsSchema = new Schema({
  endorsedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  endorsedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  skills: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ClassTaxonomies',
    required: true,
  }],
  isHighlighted: {
    type: Boolean,
    required: true,
    default: false,
  },
}, { timestamps: true });

module.exports = mongoose.model('Endorsements', EndorsementsSchema);
