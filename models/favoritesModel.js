const mongoose = require('mongoose');

const { Schema } = mongoose;

const FavoritesSchema = new Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  favoriteUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  favoriteProducts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Products',
  }],
}, { timestamps: true });

module.exports = mongoose.model('Favorites', FavoritesSchema);
