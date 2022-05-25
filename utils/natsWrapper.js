/* eslint-disable func-names */
/* eslint-disable no-underscore-dangle */
const NATS = require('nats');
const { nats_servers } = require('../config/environment');

const NatsWrapper = function () {
  this._client = null;
  return {
    get client() {
      if (!this._client) {
        console.log('Error: Cannot access NATS client before connecting!');
      }
      return this._client;
    },

    async connect(servers) {
      this._client = await NATS.connect({ servers });
      console.log(`NATS connected to ${this._client.getServer()}`);

      this._client.closed().then((err) => {
        let m = `connection to ${this._client.getServer()} closed`;
        if (err) {
          m = `${m} with an error: ${err.message}`;
        }
        console.log(m);
      });
    },

    async start() {
      if (!nats_servers) {
        throw new Error('NATS_SERVERS not defined');
      }
      await this.connect(nats_servers);
      process.on('SIGINT', () => this.client.close());
      process.on('SIGTERM', () => this.client.close());
    },

    publish(channel, payload) {
      this.client.publish(channel, NATS.JSONCodec().encode(payload));
    },
  };
};

module.exports = NatsWrapper();
