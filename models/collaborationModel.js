const mongoose = require('mongoose');

const { Schema } = mongoose;

const CollaborationSchema = new Schema({
  email: {
    type: String,
    // unique: true,
    required: true,
    match: [/^[a-zA-Z0-9+_.-]+@[a-zA-Z0-9.-]+$/, 'Please enter a valid email'],
  },
  message: {
    type: String,
    required: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('Collaboration', CollaborationSchema);
