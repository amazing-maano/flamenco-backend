const mongoose = require('mongoose');

const { Schema } = mongoose;

const ContactsSchema = new Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  contacts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
}, { timestamps: true });

module.exports = mongoose.model('Contacts', ContactsSchema);
