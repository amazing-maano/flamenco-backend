/* eslint-disable func-names */
const natsWrapper = require('./natsWrapper');

const ContactNotifier = function () {
  return {
    contactNotifier(id, type, data) {
      const channelId = `users.${id}.self`;

      natsWrapper.publish(channelId, { type, data });
      return data;
    },
  };
};

module.exports = ContactNotifier();
