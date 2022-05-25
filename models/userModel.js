/* eslint-disable no-shadow */
/* eslint-disable func-names */
/* eslint-disable consistent-return */
const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');

const { Schema } = mongoose;

const bcrypt = require('bcrypt');

const { sender_email } = require('../config/environment');

const { sendMail } = require('../utils/mail');

const UserSchema = new Schema({
  email: {
    type: String,
    unique: true,
    required: true,
    match: [/^[a-zA-Z0-9+_.-]+@[a-zA-Z0-9.-]+$/, 'Please enter a valid email'],
  },
  password: {
    type: String,
    required: true,
  },
  subscription: {
    type: String,
    enum: ['basic', 'medium', 'advanced'],
  },
  verificationToken: {
    type: String,
  },
  socialUID: {
    type: String,
  },
  socialProvider: {
    type: String,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  isInvited: {
    type: Boolean,
    default: false,
  },
  inviteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invites',
  },
  verifiedAt: {
    type: Date,
    default: '',
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  profile: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Profile',
  },
  event: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Products',
  }],
}, { timestamps: true });

UserSchema.pre('save', function (next) {
  // get access to the user model
  const user = this;
  if (this.isModified('password') || this.isNew) {
    // generate a salt then run callback
    bcrypt.genSalt(10, (err, salt) => {
      if (err) {
        return next(err);
      }
      // hash our password using the salt
      bcrypt.hash(user.password, salt, (err, hash) => {
        if (err) {
          return next(err);
        }
        // overwrite plain text password with encrypted password
        user.password = hash;
        next();
      });
    });
  } else {
    return next();
  }
});

UserSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.verificationToken;
  return obj;
};

UserSchema.methods.comparePassword = function (passw, cb) {
  bcrypt.compare(passw, this.password, (err, isMatch) => {
    if (err) {
      return cb(err);
    }
    cb(null, isMatch);
  });
};

UserSchema.statics.sendMails = async function (callback) {
  /**
   * Send emails to all session attendees
   * @param {array} sessions List of sessions.
   */
  let templateId;
  let emailForFans;
  let emailForProfessionals;

  // eslint-disable-next-line no-use-before-define
  const users = await Users.find({ isVerified: true }).populate('profile', '_id firstName role');

  // console.log(users.length, 'users');

  users.forEach((user) => {
    // console.log(user, 'user role');
    const oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
    const verifiedAtDate = user.verifiedAt;
    const todayDate = new Date();

    const diffDays = Math.round(Math.abs((verifiedAtDate - todayDate) / oneDay));

    if (user.profile && user.profile.role === 'host' && diffDays === 4) {
      // send mail
      const lang = 'es';
      if (lang === 'en') {
        templateId = 'd-12afc3d06d8e429ba120d929909add61';
      } else {
        templateId = 'd-c85e0a2254fa4da28d54ef814782f998';
      }

      emailForProfessionals = {
        to: user.email,
        from: sender_email,
        templateId,
        dynamic_template_data: {

          first_name: user.profile.firstName,
        },
      };
      // console.log('emailForProfessionals1', emailForProfessionals);
      sendMail(emailForProfessionals);
    }

    if (user.profile && user.profile.role === 'host' && diffDays === 8) {
      // send mail
      const lang = 'es';
      if (lang === 'en') {
        templateId = 'd-faa8453734f0404c9e8563aba6f003fb';
      } else {
        templateId = 'd-5e99805e014146a8b03518394ab2244a';
      }

      emailForProfessionals = {
        to: user.email,
        from: sender_email,
        templateId,
        dynamic_template_data: {

          first_name: user.profile.firstName,
        },
      };
      // console.log('emailForProfessionals2', emailForProfessionals);
      sendMail(emailForProfessionals);
    }

    if (user.profile && user.profile.role === 'host' && diffDays === 12) {
      // send mail
      const lang = 'es';
      if (lang === 'en') {
        templateId = 'd-1f3e306dad474b36afa5fcab6890888e';
      } else {
        templateId = 'd-124fbdcda13e42f09e46adf056ed9143';
      }

      emailForProfessionals = {
        to: user.email,
        from: sender_email,
        templateId,
      };
      // console.log('emailForProfessionals3', emailForProfessionals);
      sendMail(emailForProfessionals);
    }

    if (user.profile && user.profile.role === 'host' && diffDays === 16) {
      // send mail
      const lang = 'es';
      if (lang === 'en') {
        templateId = 'd-6922f557475549e196052f013bec603b';
      } else {
        templateId = 'd-17827d4ec1b049559d632f0fd4e1cb22';
      }

      emailForProfessionals = {
        to: user.email,
        from: sender_email,
        templateId,
      };
      // console.log('emailForProfessionals4s', emailForProfessionals);
      sendMail(emailForProfessionals);
    }

    // Onboarding Emails (Fans)

    if (user.profile && user.profile.role === 'student' && diffDays === 7) {
      // send mail
      const lang = 'es';
      if (lang === 'en') {
        templateId = 'd-96c49db52d464d5b8d2d53fe9a57933a';
      } else {
        templateId = 'd-4fa6858f157847dabd5a2cb054203383';
      }

      emailForFans = {
        to: user.email,
        from: sender_email,
        templateId,
        dynamic_template_data: {

          first_name: user.profile.firstName,
        },
      };
      // console.log('emailForFans1', emailForFans);
      sendMail(emailForFans);
    }

    if (user.profile && user.profile.role === 'student' && diffDays === 14) {
      // send mail
      const lang = 'es';
      if (lang === 'en') {
        templateId = 'd-583217272b934e87be408b23753e5e89';
      } else {
        templateId = 'd-7ca087a242284f209395d71b986eea19';
      }

      emailForFans = {
        to: user.email,
        from: sender_email,
        templateId,
      };
      // console.log('emailForFans2', emailForFans);
      sendMail(emailForFans);
    }

    if (user.profile && user.profile.role === 'student' && diffDays === 21) {
      // send mail
      const lang = 'es';
      if (lang === 'en') {
        templateId = 'd-2b6fad2db29447a28f3cfb0c7aefc449';
      } else {
        templateId = 'd-e071e16bdfa34b89a7be13c0f4e84456';
      }

      emailForFans = {
        to: user.email,
        from: sender_email,
        templateId,
      };
      // console.log('emailForFans3', emailForFans);
      sendMail(emailForFans);
    }

    if (user.profile && user.profile.role === 'student' && diffDays === 28) {
      // send mail
      const lang = 'es';
      if (lang === 'en') {
        templateId = 'd-4277cddee3814467b25d8cac6decbeba';
      } else {
        templateId = 'd-14acdd20edb94ae38491b9c933a18c84';
      }

      emailForFans = {
        to: user.email,
        from: sender_email,
        templateId,
      };
      // console.log('emailForFans4', emailForFans);
      sendMail(emailForFans);
    }
  });

  // Don't wait on success/failure, just indicate all messages have been
  // queued for delivery
  if (callback) {
    callback.call();
  }
};

UserSchema.plugin(uniqueValidator);
UserSchema.plugin(require('mongoose-autopopulate'));

const Users = mongoose.model('User', UserSchema);

module.exports = Users;
