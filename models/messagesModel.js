const mongoose = require('mongoose');

const { Schema } = mongoose;

const MessageSchema = new Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  chatId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  message: {
    type: String,
    required: true,
    trim: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('Message', MessageSchema);
