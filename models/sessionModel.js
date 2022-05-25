const mongoose = require('mongoose');

const { Schema } = mongoose;

const seatsValidators = [
  { validator: (val) => val >= 0, msg: 'numberOfSeatsLeft can not be negative!' },
  { validator: (val) => val === 0, msg: 'numberOfSeatsLeft can not be zero!' },
];

const SessionSchema = new Schema({
  attendees: [{
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  }],
  productVariantId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  sessionCode: {
    type: String,
  },
  numberOfSeatsLeft: {
    type: Number,
    validate: seatsValidators,
  },
  startTime: {
    type: String,
  },
  endTime: {
    type: String,
  },
  date: {
    type: Date,
  },
}, { timestamps: true });

module.exports = mongoose.model('Session', SessionSchema);
