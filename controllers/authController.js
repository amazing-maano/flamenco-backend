/* eslint-disable no-shadow */
/* eslint-disable no-param-reassign */
/* eslint-disable consistent-return */
/* eslint-disable no-underscore-dangle */
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const crypto = require('crypto');
const generator = require('generate-password');

const User = require('../models/userModel');
const Profile = require('../models/profileModel');
const Endorsements = require('../models/endorsementsModel');
const Invites = require('../models/invitesModel');

const { sendMail } = require('../utils/mail');
const { setOrigin } = require('../utils/origins');

const { token_secret, sender_email } = require('../config/environment');

const { ERROR_TYPES } = require('../config/errorTypes');

const { EMAIL_TEMPLATE_IDS } = require('../config/dynamiceEmailTemplateIds');

const Notifier = require('../utils/notifications');

let templateId;

const {
  DATA_MISSING,
  EMAIL_ALREADY_USED,
  EMAIL_NOT_VERIFIED,
  EMAIL_VERIFIED,
  EMAIL_SENT,
  ALREADY_A_USER,
  USER_CREATED,
  INCORRECT_PASSWORD,
  USER_NOT_FOUND,
  TRY_AGAIN,
  SIGN_OUT,
  CONFIRM_PASSWORD_MISMATCH,
  INVALID_INVITATION_TOKEN,
} = ERROR_TYPES;

module.exports = {
  social: async (req, res) => {
    try {
      let profile;
      const { email, providerId, uid } = req.body;

      const user = await User.findOne({
        email,
      });

      const invites = await Invites.findOne({
        invitationToken: req.query.invitationToken,
      });

      if (
        req.query.invitationToken
        && invites !== null
      ) {
        invites.tokenVerifiedAt = Date.now();
        invites.userId = user._id;

        await invites.save(async (err) => {
          if (err) {
            return res.status(500).json({
              success: false,
              msg: TRY_AGAIN,
            });
          }
        });
      }

      if (
        req.query.invitationToken
        && invites !== null
        && invites.tokenVerifiedAt !== null
      ) {
        return res.status(409).json({
          success: false,
          msg: ALREADY_A_USER,
        });
      }

      if (user && !user.socialUID) {
        return res.status(409).json({
          success: false,
          msg: 'DIFFERENT_PLATFORM',
        });
      }

      if (user && user.socialUID) {
        profile = await Profile.findOne({
          user: user._id,
        })
          .populate(
            'bookedEventsByStudent',
            '_id productName productImageURL productType -schedule',
          )
          .populate(
            'eventsByHost',
            '_id productName productImageURL productType currency',
          )
          .select('-bookedSessionsByStudent');

        const accessToken = jwt.sign(user.toJSON(), token_secret, {
          expiresIn: '1d',
        });
        return res.status(200).send({
          msg: ALREADY_A_USER,
          user,
          profile,
          accessToken: `JWT ${accessToken}`,
        });
      }

      let { password } = req.body;
      password = password
        || generator.generate({
          length: 15,
          numbers: true,
        });

      if (
        req.query.invitationToken
        && invites !== null
        && email === invites.email
      ) {
        const newSocialUser = await new User({
          email,
          password,
          socialProvider: providerId,
          socialUID: uid,
          isVerified: true,
          verifiedAt: Date.now(),
          isInvited: true,
          inviteId: invites._id,
        });

        // save the social user
        await newSocialUser.save();

        invites.tokenVerifiedAt = Date.now();
        invites.userId = newSocialUser._id;

        await invites.save(async (err) => {
          if (err) {
            return res.status(500).json({
              success: false,
              msg: TRY_AGAIN,
            });
          }
        });

        const accessToken = jwt.sign(newSocialUser.toJSON(), token_secret, {
          expiresIn: '1d',
        });

        return res.status(200).json({
          user: newSocialUser,
          accessToken: `JWT ${accessToken}`,
        });
      }

      const newSocialUser = await new User({
        email,
        password,
        socialProvider: providerId,
        socialUID: uid,
        isVerified: true,
        verifiedAt: Date.now(),
      });

      // save the social user
      await newSocialUser.save();

      const accessToken = jwt.sign(newSocialUser.toJSON(), token_secret, {
        expiresIn: '1d',
      });

      return res.status(200).json({
        user: newSocialUser,
        accessToken: `JWT ${accessToken}`,
      });
    } catch (error) {
      return res.status(403).send(error.message);
    }
  },
  signup: async (req, res) => {
    try {
      const data = req.body;

      const origin = await setOrigin(req.headers);
      console.log(req.headers.origin, 'headers origin');
      const verificationToken = crypto.randomBytes(32).toString('hex');
      console.log(origin);

      if (!data.email || !data.password) {
        return res.status(400).json({
          success: false,
          msg: DATA_MISSING,
        });
      }

      const invites = await Invites.findOne({
        invitationToken: req.query.invitationToken,
      });

      if (
        req.query.invitationToken
        && invites !== null
        && invites.tokenVerifiedAt !== null
      ) {
        return res.status(409).json({
          success: false,
          msg: ALREADY_A_USER,
        });
      }

      if (
        req.query.invitationToken
        && invites !== null
        && data.email === invites.email
      ) {
        const newUser = new User({
          email: data.email,
          password: data.password,
          verificationToken,
          isInvited: true,
          inviteId: invites._id,
        });

        invites.tokenVerifiedAt = Date.now();
        invites.userId = newUser._id;

        await invites.save(async (err) => {
          if (err) {
            return res.status(500).json({
              success: false,
              msg: TRY_AGAIN,
            });
          }
        });

        // save the user
        await newUser.save(async (err) => {
          if (err) {
            return res.status(500).json({
              success: false,
              msg: err.message,
            });
          }
          // send mail
          if (req.headers.language === 'en') {
            templateId = EMAIL_TEMPLATE_IDS.ENGLISH_ACCOUNT_CONFIRM;
          } else {
            templateId = EMAIL_TEMPLATE_IDS.SPANISH_ACCOUNT_CONFIRM;
          }
          const msg = {
            to: data.email,
            from: sender_email,
            templateId,
            dynamic_template_data: {
              url: `${origin}verify/${verificationToken}`,
            },
          };

          sendMail(msg);

          return res.status(200).json({
            success: true,
            msg: USER_CREATED,
            user: {
              newUser,
              verificationToken,
            },
          });
        });
      } else {
        const newUser = new User({
          email: data.email,
          password: data.password,
          verificationToken,
        });

        // save the user
        newUser.save(async (err) => {
          if (err) {
            return res.status(500).json({
              success: false,
              msg: err.message,
            });
          }

          // send mail
          if (req.headers.language === 'en') {
            templateId = EMAIL_TEMPLATE_IDS.ENGLISH_ACCOUNT_CONFIRM;
          } else {
            templateId = EMAIL_TEMPLATE_IDS.SPANISH_ACCOUNT_CONFIRM;
          }

          const msg = {
            to: data.email,
            from: sender_email,
            templateId,
            dynamic_template_data: {
              url: `${origin}verify/${verificationToken}`,
            },
          };

          sendMail(msg);

          return res.status(200).json({
            success: true,
            msg: USER_CREATED,
            user: {
              newUser,
              verificationToken,
            },
          });
        });
      }

      // console.log(verificationToken);
    } catch (error) {
      return res.status(500).send(error.message);
    }
  },

  signin: async (req, res) => {
    try {
      let profile;
      const origin = await setOrigin(req.headers);

      const { email, password } = req.body;

      const user = await User.findOne({
        email,
      });

      if (!user) {
        return res.status(404).send({
          success: false,
          msg: USER_NOT_FOUND,
        });
      }

      const invites = await Invites.findOne({
        invitationToken: req.query.invitationToken,
      });

      if (req.query.invitationToken && !invites) {
        return res.status(404).send({
          success: false,
          msg: INVALID_INVITATION_TOKEN,
        });
      }

      if (
        req.query.invitationToken
        && invites !== null
      ) {
        invites.tokenVerifiedAt = Date.now();
        invites.userId = user._id;

        await invites.save(async (err) => {
          if (err) {
            return res.status(500).json({
              success: false,
              msg: TRY_AGAIN,
            });
          }
        });
      }

      if (user && !user.isVerified) {
        const { verificationToken } = user;
        // send mail
        if (req.headers.language === 'en') {
          templateId = EMAIL_TEMPLATE_IDS.ENGLISH_ACCOUNT_CONFIRM;
        } else {
          templateId = EMAIL_TEMPLATE_IDS.SPANISH_ACCOUNT_CONFIRM;
        }
        const msg = {
          to: email,
          from: sender_email,
          templateId,
          dynamic_template_data: {
            url: `${origin}verify/${verificationToken}`,
          },
        };

        sendMail(msg);

        return res.status(403).send({
          success: true,
          msg: EMAIL_NOT_VERIFIED,
        });
      }

      if (user.profile) {
        profile = await Profile.findOne({
          user: user._id,
        }).select(
          '-bookedSessionsByStudent -eventsByHost -bookedEventsByStudent',
        );
      }

      if (user.isVerified) {
        user.comparePassword(password, (err, isMatch) => {
          if (isMatch && !err) {
            // if user is found and password is right create a token
            const accessToken = jwt.sign(user.toJSON(), token_secret, {
              expiresIn: '1d',
            });

            return res.status(200).json({
              user,
              profile,
              accessToken: `JWT ${accessToken}`,
            });
          }
          return res.status(401).send({
            success: false,
            msg: INCORRECT_PASSWORD,
          });
        });
      } else {
        return res.status(403).send({
          success: false,
          msg: EMAIL_NOT_VERIFIED,
        });
      }
    } catch (error) {
      return res.status(500).send(error);
    }
  },
  me: async (req, res) => {
    try {
      let skillsCount;
      const user = await User.findOne({
        _id: req.userId,
      });

      const accessToken = jwt.sign(user.toJSON(), token_secret, {
        expiresIn: '1d',
      });

      const profile = await Profile.findOne({
        user: user._id,
      })
        .populate('bookedEventsByStudent', '-schedule')
        .populate('eventsByHost')
        .select('-bookedSessionsByStudent');

      const totalEndorsements = await Endorsements.find({
        endorsedUser: req.userId,
      });

      const endorsementsData = await Endorsements.find({
        endorsedUser: req.userId,
      })
        .select('-skills -isHighlighted')
        .populate({
          path: 'endorsedBy',
          select: '_id profile',
          populate: {
            path: 'profile',
            model: 'Profile',
            select: '_id firstName lastName role -eventsByHost',
          },
        })
        .limit(3)
        .sort({ isHighlighted: -1, createdAt: 1 });

      if (endorsementsData) {
        const id = mongoose.Types.ObjectId(req.userId);
        skillsCount = await Endorsements.aggregate([
          { $match: { endorsedUser: id } },
          { $unwind: '$skills' },
          {
            $group: {
              _id: {
                $toString: '$skills',
              },
              count: { $sum: 1 },
            },
          },
          {
            $group: {
              _id: null,
              counts: {
                $push: {
                  k: '$_id',
                  v: '$count',
                },
              },
            },
          },
          {
            $replaceRoot: {
              newRoot: { $arrayToObject: '$counts' },
            },
          },
        ]);
      }

      return res.status(200).send({
        user,
        profile,
        endorsements: {
          totalEndorsementsCount: totalEndorsements.length,
          endorsementsData,
          skillsCount,
        },
        accessToken: `JWT ${accessToken}`,
      });
    } catch (error) {
      return res.status(500).send(error.message);
    }
  },
  verifyEmail: async (req, res) => {
    try {
      const user = await User.findOne({
        verificationToken: req.params.verificationToken,
      });

      if (!user || !req.params.verificationToken) {
        return res.status(404).json({
          success: false,
          msg: USER_NOT_FOUND,
        });
      }

      if (user.isVerified) {
        return res.status(409).json({
          success: false,
          msg: EMAIL_ALREADY_USED,
        });
      }

      user.isVerified = true;
      user.verifiedAt = Date.now();

      user.save(async (err) => {
        if (err) {
          return res.status(500).json({
            success: false,
            msg: TRY_AGAIN,
          });
        }
        // return res.json({ success: true, msg: EMAIL_VERIFIED });
      });

      const accessToken = jwt.sign(user.toJSON(), token_secret, {
        expiresIn: '1d',
      });

      return res.status(200).json({
        msg: EMAIL_VERIFIED,
        user,
        accessToken: `JWT ${accessToken}`,
      });
    } catch (error) {
      // console.log(error, 'error');
      return res.status(500).send(error.message);
    }
  },

  changedEmailVerification: async (req, res) => {
    try {
      const { verificationToken } = req.params;

      let id;
      let newEmail;

      jwt.verify(verificationToken, token_secret, (err, newUser) => {
        if (err) {
          return res.status(403).send({
            auth: false,
            message: 'Failed to authenticate token.',
          });
        }

        id = newUser.id;
        newEmail = newUser.newEmail;
      });

      const userWithSameEmail = await User.findOne({
        email: newEmail,
      });
      if (userWithSameEmail) {
        return res.status(409).send(EMAIL_ALREADY_USED);
      }

      const user = await User.findOneAndUpdate(
        {
          _id: id,
        },
        {
          $set: { email: newEmail },
        },
        { new: true },
      ).populate('profile');

      const accessToken = jwt.sign(user.toJSON(), token_secret, {
        expiresIn: '1d',
      });

      // send mail
      if (req.headers.language === 'en') {
        templateId = EMAIL_TEMPLATE_IDS.ENGLISH_EMAIL_CHANGE;
      } else {
        templateId = EMAIL_TEMPLATE_IDS.SPANISH_EMAIL_CHANGE;
      }

      const msg = {
        to: newEmail,
        from: sender_email,
        templateId,
        dynamic_template_data: {
          firstName: `${user.profile.firstName}`,
          url: `${origin}dashboard`,
        },
      };

      sendMail(msg);

      const notification = Notifier.notifyUser(
        user._id,
        'notification',
        'EMAIL_UPDATED',
        '',
        '',
        '',
        null,
        null,
      );

      return res.status(200).json({
        msg: notification,
        user,
        accessToken: `JWT ${accessToken}`,
      });
    } catch (error) {
      return res.status(500).send(error.message);
    }
  },

  resendEmailVerification: async (req, res) => {
    try {
      const origin = await setOrigin(req.headers);

      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          msg: DATA_MISSING,
        });
      }

      User.findOne({ email }, async (err, user) => {
        if (err) {
          return res.status(404).json({
            success: false,
            msg: USER_NOT_FOUND,
          });
        }

        const verificationToken = crypto.randomBytes(32).toString('hex');
        // console.log(verificationToken);

        // send mail
        if (req.headers.language === 'en') {
          templateId = EMAIL_TEMPLATE_IDS.ENGLISH_ACCOUNT_CONFIRM;
        } else {
          templateId = EMAIL_TEMPLATE_IDS.SPANISH_ACCOUNT_CONFIRM;
        }

        const msg = {
          to: email,
          from: sender_email,
          templateId,
          dynamic_template_data: {
            url: `${origin}verify/${verificationToken}`,
          },
        };

        sendMail(msg);

        user.verificationToken = verificationToken;

        await user.save((err) => {
          if (err) {
            return res.status(500).json({
              success: false,
              msg: TRY_AGAIN,
            });
          }
          // return res.json({ success: true, msg: EMAIL_VERIFIED });
          return res.status(200).json({
            success: true,
            msg: EMAIL_SENT,
            user,
          });
        });

        return user;
      });
    } catch (error) {
      return res.status(500).send(error.message);
    }
  },

  changePassword: async (req, res) => {
    try {
      const origin = await setOrigin(req.headers);

      const {
        email, password, newPassword, confirmPassword,
      } = req.body;

      if (!email || !password || !newPassword || !confirmPassword) {
        return res.status(400).json({
          success: false,
          msg: DATA_MISSING,
        });
      }

      if (newPassword !== confirmPassword) {
        return res.status(422).json({
          success: false,
          msg: CONFIRM_PASSWORD_MISMATCH,
        });
      }

      const user = await User.findOne({
        email,
      }).populate('profile', '_id firstName');

      if (!user) {
        return res.status(404).json({
          success: false,
          msg: USER_NOT_FOUND,
        });
      }

      let userName;

      if (user.profile) {
        userName = user.profile.firstName;
      } else {
        userName = 'User';
      }

      user.comparePassword(password, async (err, isMatch) => {
        if (isMatch && !err) {
          // if user is found and password is right, update password
          user.password = newPassword;
          await user.save((err) => {
            if (err) {
              return res.status(500).json({
                success: false,
                msg: TRY_AGAIN,
              });
            }
          });

          if (req.headers.language === 'en') {
            templateId = EMAIL_TEMPLATE_IDS.ENGLISH_PASSWORD_CHANGED;
          } else {
            templateId = EMAIL_TEMPLATE_IDS.SPANISH_PASSWORD_CHANGED;
          }

          const msg = {
            to: email,
            from: sender_email,
            templateId,
            dynamic_template_data: {
              firstName: `${userName}`,
              url: `${origin}`,
            },
          };
          sendMail(msg);

          return res.status(200).json({ user });
        }
        return res.status(403).send({
          success: false,
          msg: INCORRECT_PASSWORD,
        });
      });
    } catch (error) {
      return res.status(500).send(error.message);
    }
  },

  forgotPasswordEmail: async (req, res) => {
    try {
      const origin = await setOrigin(req.headers);

      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          msg: DATA_MISSING,
        });
      }

      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({
          success: false,
          msg: USER_NOT_FOUND,
        });
      }
      if (user && user.socialUID) {
        return res.status(403).json({
          success: false,
          msg: 'Social logged in user can\'t reset password',
        });
      }

      const token = crypto.randomBytes(32).toString('hex');
      // console.log(token);

      // send mail
      if (req.headers.language === 'en') {
        templateId = EMAIL_TEMPLATE_IDS.ENGLISH_NEW_PASSWORD_REQUESTED;
      } else {
        templateId = EMAIL_TEMPLATE_IDS.SPANISH_NEW_PASSWORD_REQUESTED;
      }

      const msg = {
        to: email,
        from: sender_email,
        templateId,
        dynamic_template_data: {
          url: `${origin}login/${token}`,
        },
      };

      sendMail(msg);

      user.resetPasswordToken = token;
      user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

      await user.save((err) => {
        if (err) {
          return res.status(500).json({
            success: false,
            msg: TRY_AGAIN,
          });
        }
        // return res.json({ success: true, msg: EMAIL_VERIFIED });
        return res.status(200).json({
          success: true,
          msg: EMAIL_SENT,
          user,
        });
      });
    } catch (error) {
      return res.status(403).send(error.message);
    }
  },

  passwordResetVerification: async (req, res) => {
    try {
      const user = await User.findOne(
        {
          resetPasswordToken: req.params.token,
          resetPasswordExpires: {
            $gt: Date.now(),
          },
        },
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          msg: 'Password reset token is invalid or has expired.',
        });
      }
      return res.status(200).json({
        msg: 'Token verified',
        user,
      });
    } catch (error) {
      return res.status(500).send(error.message);
    }
  },

  resetPassword: async (req, res) => {
    const origin = await setOrigin(req.headers);

    try {
      const { newPassword, confirmPassword } = req.body;

      if (!newPassword || !confirmPassword) {
        return res.status(400).json({
          success: false,
          msg: DATA_MISSING,
        });
      }

      if (newPassword !== confirmPassword) {
        return res.status(422).json({
          success: false,
          msg: CONFIRM_PASSWORD_MISMATCH,
        });
      }

      const user = await User.findOne(
        {
          resetPasswordToken: req.params.token,
          resetPasswordExpires: {
            $gt: Date.now(),
          },
        },
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          msg: 'Password reset token is invalid or has expired.',
        });
      }

      const profile = await Profile.findOne({ user: user._id });
      let userName;

      if (profile) {
        userName = profile.firstName;
      } else {
        userName = 'User';
      }

      user.password = confirmPassword;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;

      await user.save((err) => {
        if (err) return res.send(err.message);
        if (req.headers.language === 'en') {
          templateId = EMAIL_TEMPLATE_IDS.ENGLISH_PASSWORD_CHANGED;
        } else {
          templateId = EMAIL_TEMPLATE_IDS.SPANISH_PASSWORD_CHANGED;
        }

        const msg = {
          to: user.email,
          from: sender_email,
          templateId,
          dynamic_template_data: {
            firstName: `${userName}`,
            url: `${origin}`,
          },
        };

        sendMail(msg);
        return res.status(200).json({
          user,
        });
      });
    } catch (error) {
      return res.status(500).send(error.message);
    }
  },

  signout: (req, res) => {
    req.logout();
    res.status(200).json({
      msg: SIGN_OUT,
    });
  },
};
