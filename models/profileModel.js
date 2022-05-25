const mongoose = require('mongoose');

const { Schema } = mongoose;

const ProfileSchema = new Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  firstName: {
    type: String,
    required: true,
    trim: true,
  },
  lastName: {
    type: String,
    trim: true,
    // required: true,
  },
  commercialName: {
    type: String,
    trim: true,
    // required: true,
  },
  role: {
    type: String,
    required: true,
    enum: ['host', 'student', 'admin'],
  },
  stripeAccount: {
    type: String,
    // required: true,
  },
  isStripeConnected: {
    type: Boolean,
    default: false,
  },
  stripeVerificationStatus: {
    type: String,
    default: '',
  },
  location: {
    type: {
      type: String,
      default: 'Point',
    },

    coordinates: [{
      type: Number,
      required: [true, 'You must supply coordinates'],
    }],

    address: {
      type: String,
      required: [true, 'You must supply an address!'],
    },
  },
  profileImage: {
    type: String,
  },
  bio: {
    type: String,
    trim: true,
  },
  methodology: {
    type: String,
    trim: true,
  },
  background: {
    type: String,
    trim: true,
  },
  profileLevel: {
    type: String,
  },
  profileBelt: {
    type: String,
  },
  socialLinks: {
    facebook: String,
    twitter: String,
    instagram: String,
  },
  videoLink: {
    type: String,
  },
  userResponseTime: {
    type: String,
  },

  taxonomies: {
    profession: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClassTaxonomies',
    },
    subjects: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClassTaxonomies',
    }],
    topics: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClassTaxonomies',
    }],
  },
  billingInfo: {
    type: String,
  },
  dob: {
    type: Date,
  },
  postalAddress: {
    type: String,
  },
  phoneNumber: {
    type: String,
  },
  languages: [{
    type: String,
    required: true,
  }],
  userCurrency: {
    type: String,
  },

  numtotalSpent: {
    type: Number,
    default: 0,
    index: true,
  },
  numtotalEarnings: {
    type: Number,
    default: 0,
    index: true,
  },

  totalReviews: {
    type: Number,
    default: 0,
    index: true,
  },

  totalEventsByHost: {
    type: Number,
    default: 0,
    index: true,
  },
  totalStudents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  totalSessionsByHost: {
    type: Number,
    default: 0,
    index: true,
  },

  totalProductPurchased: {
    type: Number,
    default: 0,
    index: true,
  },
  totalSessionsPurchased: {
    type: Number,
    default: 0,
    index: true,
  },
  productPurchasedAt: [Date],

  studentPurchasedProductAt: [Date],

  counts: {
    type: Number,
    default: 0,
    index: true,
  },
  countUpdatedAt: [Date],

  eventsByHost: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Products',
    autopopulate: true,
  }],

  bookedEventsByStudent: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Products',
    // autopopulate: true,
  }],
  bookedSessionsByStudent: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BookedSessions',
  }],
  totalOrdersByStudent: {
    type: Number,
    default: 0,
    index: true,
  },
}, { timestamps: true });

ProfileSchema.index({
  location: '2dsphere',
});

ProfileSchema.plugin(require('mongoose-autopopulate'));

module.exports = mongoose.model('Profile', ProfileSchema, 'profiles');
