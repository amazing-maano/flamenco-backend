const mongoose = require('mongoose');

const { Schema } = mongoose;

const NotificationSchema = new Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['notification', 'profileUpdated'],
  },
  productName: {
    type: String,
    default: '',
  },
  startTime: {
    type: Date,
    default: '',
  },
  favoriteBy: {
    type: String,
    default: '',
  },
  favProfileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Profile',
  },
  favEventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Products',
  },
  unread: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('Notifications', NotificationSchema);
