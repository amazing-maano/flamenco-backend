const mongoose = require('mongoose');

const { Schema } = mongoose;

const InvitesSchema = new Schema({
  email: {
    type: String,
    // unique: true,
    required: true,
    match: [/^[a-zA-Z0-9+_.-]+@[a-zA-Z0-9.-]+$/, 'Please enter a valid email'],
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  invitationToken: {
    type: String,
    required: true,
  },
  tokenVerifiedAt: {
    type: Date,
    default: '',
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Products',
    default: null,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  hasAcceptedEventInvite: {
    type: Boolean,
    required: true,
    default: false,
  },
}, { timestamps: true });

module.exports = mongoose.model('Invites', InvitesSchema);
