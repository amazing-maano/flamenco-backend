/* eslint-disable no-underscore-dangle */
/* eslint-disable func-names */
const mongoose = require('mongoose');

const { Schema } = mongoose;

const User = require('./userModel');
const { sendMail } = require('../utils/mail');

const { sender_email } = require('../config/environment');

/*
const reviewSchema = new Schema({
  stars: { type: Number, required: true },
  comment: { type: String, required: true },
  profile: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Profile',
    // autopopulate: true,
  },
}, { timestamps: true });
*/

const ProductsSchema = new Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  userProfile: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Profile',
  },
  productName: {
    type: String,
    required: true,
    trim: true,
  },
  productType: {
    type: String,
    required: true,
    enum: ['class', 'experience'],
  },
  isIndividual: {
    type: Boolean,
    required: true,
  },
  productMode: {
    type: String,
    required: true,
    enum: ['Online', 'Offline', 'Both'],
  },
  numberOfSeats: {
    type: Number,
    min: [1, 'Products\'s numberOfSeats can not be zero!'],
    required: true,
  },
  isPublished: {
    type: Boolean,
    required: true,
  },
  productLevel: {
    type: String,
    required: true,
    enum: ['beginner', 'intermediate', 'advanced'],
  },
  productImageURL: {
    type: String,
  },
  about: {
    methodology: String,
    whatWillYouLearn: String,
  },
  eventTaxonomies: {
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
  languages: [{
    type: String,
    required: true,
  }],

  views: {
    type: Number,
  },

  productTotalEarnings: {
    type: Number,
    default: 0,
    index: true,
  },

  // reviews: [reviewSchema],
  rating: {
    type: Number,
    required: true,
    default: 0,
  },
  totalReviews: {
    type: Number,
    required: true,
    default: 0,
  },

  location: {
    type: {
      type: String,
      // default: 'Point',
    },

    coordinates: [{
      type: Number,
      // required: [true, 'You must supply coordinates'],
    }],

    address: {
      type: String,
      // required: [true, 'You must supply an address!'],
    },
  },

  feeDescription: {
    type: String,
    required: true,
  },
  firstClassFree: {
    type: Boolean,
    required: true,
    default: false,
  },

  timeSlots: [String],
  rrule: {
    type: String,
  },

  currency: {
    type: String,
  },

  isSoldOut: {
    type: Boolean,
    default: false,
    required: true,
  },
  // key used for events with past schedules
  isActive: {
    type: Boolean,
    default: true,
  },

  profile: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Profile',
    autopopulate: true,
  },
  schedule: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProductVariants',
    autopopulate: true,
  }],
  variantTypes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VariantTypes',
    autopopulate: true,
  }],

  numberOfStudents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  bookedEventSessions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BookedSessions',
  }],
  stripeProductId: {
    type: String,
  },

}, { timestamps: true });

let subject;
let text;

ProductsSchema.index({
  location: '2dsphere',
});

ProductsSchema.plugin(require('mongoose-autopopulate'));

ProductsSchema.methods.requiresDeactivation = function () {
  const notEmptyProduct = [];
  let soldOutProduct;

  this.schedule.forEach(async (product, index) => {
    // check for products with some available seats
    if (product.seatsAvailable > 0) {
      notEmptyProduct.push(this._id);
    }

    // check if total schedule of a products matches the current loop index
    // and also the length of the notEmptyProduct array is zero
    // console.log(notEmptyProduct.length, 'notEmptyProduct.length');
    if (this.schedule.length === index + 1 && notEmptyProduct.length === 0) {
      soldOutProduct = this._id;
    // console.log(soldOutProduct, 'soldOutProduct');
    }
  });
  return soldOutProduct;
};

ProductsSchema.statics.deactivateExpired = function (callback) {
  function deactivateProductVariants(products) {
    products.forEach(async (product) => {
      // console.log(product);
      // eslint-disable-next-line no-use-before-define
      await Products.findOneAndUpdate(
        { _id: product._id },
        {
          $set: {
            isSoldOut: true,
            isPublished: false,
          },
        },
        {
          upsert: true,
          returnOriginal: false,
        },
      );

      const user = await User.findOne({ _id: mongoose.Types.ObjectId(product.user) }).populate('profile', '_id firstName');

      // send mail
      // Conditions needs to be fixed
      const lang = 'es'; // temp variable needs to be removed later
      if (lang === 'en') {
        subject = '🤩  You are rocking Vive Flamenco!';
        text = `Hi ${user.profile.firstName},\n\nCongratulations!\n\nYour ${product.productType} ${product.productName} is at capacity! Open a new one today via your profile!.\n\nThe Vive Flamenco Team\n“She would be half a planet away, floating in a turquoise sea, dancing by moonlight to flamenco guitar.” `;
      } else {
        subject = '🤩¡  Estás rockeando Vive Flamenco!';
        text = `Hola ${user.profile.firstName}, \n\n¡Felicidades!\n\n¡tu ${product.productType} ${product.productName} está a capacidad! ¡Abra uno nuevo hoy a través de tu perfil! .\n\nEl equipo de Vive Flamenco\n\n“Ella estaría a medio planeta de distancia, flotando en un mar turquesa, bailando a la luz de la luna al son de la guitarra flamenca”.`;
      }

      const msg = {
        to: user.email,
        from: sender_email,
        subject,
        text,
      };

      sendMail(msg);
    });
  }

  // eslint-disable-next-line no-use-before-define
  Products
    .find({ isSoldOut: false })
    .then((products) => {
      const deactivatableVariants = products.filter((product) => product.requiresDeactivation());
      if (deactivatableVariants.length > 0) {
        deactivateProductVariants(deactivatableVariants);
      }
    });

  if (callback) {
    callback.call();
  }
};

ProductsSchema.methods.requiresProductDeactivation = function () {
  const activatedSchedule = [];
  let pastDateProduct;

  this.schedule.forEach(async (product, index) => {
    if (product.isActive === true) {
      activatedSchedule.push(this._id);
    }

    if (this.schedule.length === index + 1 && activatedSchedule.length === 0) {
      pastDateProduct = this._id;
    }
  });
  return pastDateProduct;
};

ProductsSchema.statics.deactivateExpiredProduct = function (callback) {
  function deactivateProducts(products) {
    products.forEach(async (product) => {
      // console.log(product);
      // eslint-disable-next-line no-use-before-define
      await Products.findOneAndUpdate(
        { _id: product._id },
        {
          $set: {
            isActive: false,
            isPublished: false,
            isSoldOut: true,
          },
        },
        {
          upsert: true,
          returnOriginal: false,
        },
      );
    });
  }

  // eslint-disable-next-line no-use-before-define
  Products
    .find({ isActive: true })
    .then((products) => {
      // eslint-disable-next-line max-len
      const deactivatableProducts = products.filter((product) => product.requiresProductDeactivation());
      if (deactivatableProducts.length > 0) {
        deactivateProducts(deactivatableProducts);
      }
    });

  if (callback) {
    callback.call();
  }
};

const Products = mongoose.model('Products', ProductsSchema, 'products');

module.exports = Products;
