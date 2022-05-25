const mongoose = require('mongoose');

const { Schema } = mongoose;

const ChatsSchema = new Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
  },
  message: {
    type: String,
    required: true,
  },
  unread: {
    type: Boolean,
    default: false,
  },
  type: {
    type: String,
    default: 'chat',
  },
}, { timestamps: true });

module.exports = mongoose.model('Chats', ChatsSchema);
