/* eslint-disable func-names */
const mongoose = require('mongoose');
const moment = require('moment');
const Notifier = require('../utils/notifications');
const { sendMail } = require('../utils/mail');
const {
  session_reminder_minutes,
  sender_email,
} = require('../config/environment');

const { Schema } = mongoose;

let subject;
let text;

const BookedSessionsSchema = new Schema(
  {
    attendee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Products',
      required: true,
    },
    sessionCode: {
      type: String,
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },

    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Orders',
      required: true,
    },
    bookedSlotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProductVariants',
      required: true,
    },
    bookedVariantType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VariantTypes',
      required: true,
    },
  },
  { timestamps: true },
);

BookedSessionsSchema.plugin(require('mongoose-autopopulate'));

BookedSessionsSchema.methods.requiresNotification = function () {
  return this?.bookedSlotId?.startTime
    ? Math.round(
      moment
        .duration(moment.utc(this.bookedSlotId.startTime).diff(moment.utc()))
        .asMinutes(),
    ) === session_reminder_minutes
    : false;
};

BookedSessionsSchema.statics.sendNotifications = function (callback) {
  /**
   * Send emails to all session attendees
   * @param {array} sessions List of sessions.
   */

  function sendNotifications(sessions) {
    let firstName;
    let productType;
    sessions.forEach((session) => {
      // console.log(session.attendee, 'session.attendee');
      if (session.attendee.profile !== undefined) {
        firstName = session.attendee.profile.firstName;
      } else {
        firstName = 'User';
      }

      if (session.productId.productType !== undefined) {
        productType = session.productId.productType;
      } else {
        productType = 'Class';
      }

      Notifier.notifyUser(
        // eslint-disable-next-line no-underscore-dangle
        session.attendee._id,
        'notification',
        'UPCOMING_SESSION',
        session.productId.productName,
        session.bookedSlotId.startTime,
        '',
        null,
        null,
      );

      if (session.attendee.profile !== undefined) {
        firstName = session.attendee.profile.firstName;
      } else {
        firstName = 'User';
      }

      // send mail
      // Conditions needs to be fixed
      const lang = 'es'; // temp variable, needs to be removed later
      if (lang === 'en') {
        subject = `⏰ Your Vive Flamenco ${productType} ${session.productId.productName} starts in 30 minutes!`;
        text = `Your Vive Flamenco Class Reminder: You have 30 minutes to start!\nHi ${firstName},\nJust a reminder that your ${productType} ${session.productId.productName} starts in 30 minutes. Here are some best practices to make sure it is a success. 
        - Show up at least 10 minutes early
        - Make sure your material is ready
        - Have fun! 
        Remember you can email your students/guests to remind them of any information or give them last minute details.\nThe Vive Flamenco Team \n“The mother of flamenco is cante, although the most difficult task is the guitarist who makes the dancer and singer feel satisfied.” -Eva ‘La yerbabuena’.`;
      } else {
        subject = `⏰ ¡Tu ${productType} ${session.productId.productName} de Vive Flamenco comienza en 30 minutos!`;
        text = `Hola ${firstName},\nSolo un recordatorio de que tu ${productType} ${session.productId.productName} comienza en 30 minutos\nEstas son algunas de las mejores prácticas para asegurarse de que sea un éxito. 
        - Preséntate al menos 10 minutos antes.
        - Asegúrate de que tu material esté listo.
        - ¡Diviértete! 
        Recuerda que puedes enviar un correo electrónico a tus estudiantes / invitados para recordarles cualquier información o darles detalles de última hora.\nEl equipo de Vive Flamenco\n\n“La madre del flamenco es el cante, aunque la tarea más difícil es el guitarrista que hace que el bailaor y el cantaor se sienta satisfecho”.-Eva 'La yerbabuena'.`;
      }

      const msg = {
        to: session.attendee.email,
        from: sender_email,
        subject,
        text,
      };

      sendMail(msg);
    });
  }

  // eslint-disable-next-line no-use-before-define
  BookedSessions.find()
    .populate({
      path: 'attendee',
      select: '_id email profile',
      populate: {
        path: 'profile',
        model: 'Profile',
        select: '_id firstName',
      },
    })
    .populate('productId', 'productName productType')
    .populate('bookedSlotId', 'startTime')
    .then((_sessions) => {
      const notifiableSessions = _sessions.filter((session) => session.requiresNotification());
      if (notifiableSessions.length > 0) {
        sendNotifications(notifiableSessions);
      }
    });

  // Don't wait on success/failure, just indicate all messages have been
  // queued for delivery
  if (callback) {
    callback.call();
  }
};

const BookedSessions = mongoose.model('BookedSessions', BookedSessionsSchema);

module.exports = BookedSessions;
