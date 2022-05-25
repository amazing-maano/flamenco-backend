const mongoose = require('mongoose');

const { Schema } = mongoose;

const OrdersSchema = new Schema({
  buyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Products',
    required: true,
  },
  eventHostId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  bookedSessionId: {
    type: [{
      type: [String],
      required: true,
    }],
    validate: {
      validator: (val) => val !== null && val.length > 0,
      message: () => 'Session id array is null or empty',
    },
  },
  bookedSessions: {
    type: [{}],
    required: true,
    validate: {
      validator: (val) => val !== null && val.length > 0,
      message: () => 'Booking session is null or empty',
    },
  },
  transactionId: {
    type: String,
  },
  isPaid: {
    type: Boolean,
    required: true,
    default: false,
  },
  amountPaid: {
    type: Number,
    min: [0, 'Amount can not be less than 0!'],
    required: true,
  },
  subscriptionID: {
    type: String,
    default: '',
  },
}, { timestamps: true });

module.exports = mongoose.model('Orders', OrdersSchema);
