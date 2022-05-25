const {
  netlify_secondary_origin,
  netlify_origin,
  local_origin,
  netlify_english_origin,
  flamenco_beta,
  vive_flamenco,
  live_flamenco,
  staging,
} = require('../config/environment');

exports.setOrigin = async (req) => {
  let origin;
  if (req.origin === 'http://localhost:3000' || req.host === 'localhost:1717') {
    origin = local_origin;
  }

  // secondary server - client
  if (req.origin === 'https://flamenco.netlify.app') {
    origin = netlify_secondary_origin;
  }

  // primary server
  if (req.origin === 'https://flamenco-dev.netlify.app') {
    origin = netlify_origin;
  }

  // client - english
  if (req.origin === 'https://flamenco-en.netlify.app') {
    origin = netlify_english_origin;
  }

  if (req.origin === 'https://flamencosonline.com' || req.origin === 'https://www.flamencosonline.com') {
    origin = flamenco_beta;
  }

  if (req.origin === 'https://viveflamenco.com' || req.origin === 'https://www.viveflamenco.com') {
    origin = vive_flamenco;
  }

  if (req.origin === 'https://liveflamenco.com' || req.origin === 'https://www.liveflamenco.com') {
    origin = live_flamenco;
  }

  // staging
  if (req.origin === staging) {
    origin = `${staging}/`;
  }

  return origin;
};
