const mongoose = require('mongoose');

const { Schema } = mongoose;

const NewsletterSchema = new Schema({
  email: {
    type: String,
    unique: true,
    required: true,
    match: [/^[a-zA-Z0-9+_.-]+@[a-zA-Z0-9.-]+$/, 'Please enter a valid email'],
  },
}, { timestamps: true });

module.exports = mongoose.model('Newsletter', NewsletterSchema);
