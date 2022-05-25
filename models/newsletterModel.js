const mongoose = require('mongoose');

const { Schema } = mongoose;

const NewsletterSchema = new Schema({
  email: {
    type: String,
    unique: true,
    required: true,
    match: [/^(([^<>()[\]\\.,;:\s@\\"]+(\.[^<>()[\]\\.,;:\s@\\"]+)*)|(\\".+\\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/, 'Please enter a valid email'],
  },
}, { timestamps: true });

module.exports = mongoose.model('Newsletter', NewsletterSchema);
