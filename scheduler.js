/* eslint-disable func-names */
const cron = require('node-cron');
const moment = require('moment');
const notificationsWorker = require('./workers/notificationsWorker');
const productVariantWorker = require('./workers/productVariantWorker');
const productWorker = require('./workers/productWorker');
const userEmailWorker = require('./workers/usersEmailWorker');
const followUpMailWorkerFactory = require('./workers/customerEmailWorker');

const schedulerFactory = function () {
  return {
    start() {
      console.log(`Started Send Notifications Worker at ${moment.utc().format()}`);
      cron.schedule('00 * * * * *', () => {
        notificationsWorker.run();
      });
      console.log(`Started Product Variant Worker at ${moment.utc().format()}`);
      cron.schedule('00 * * * * *', () => {
        productVariantWorker.run();
      });
      console.log(`Started Product Worker at ${moment.utc().format()}`);
      cron.schedule('00 * * * * *', () => {
        productWorker.run();
      });
      console.log(`Started User Worker at ${moment.utc().format()}`);
      cron.schedule('0 20 * * *', () => {
        userEmailWorker.run();
      });
      console.log(`Started Follow Up Worker at ${moment.utc().format()}`);
      cron.schedule('0 12 */3 * *', () => {
        followUpMailWorkerFactory.run();
      });
    },
  };
};

module.exports = schedulerFactory();
