module.exports = {
  token_secret: process.env.TOKEN_SECRET,
  port: process.env.PORT,
  mongodb_uri: process.env.MONGODB_URI,
  base_url: process.env.BASE_URL,
  dashboard_redirect: process.env.DASHBOARD_REDIRECT,
  local_origin: process.env.LOCAL_ORIGIN,
  netlify_secondary_origin: process.env.NETLIFY_SECONDARY_ORIGIN,
  netlify_origin: process.env.NETLIFY_ORIGIN,
  netlify_english_origin: process.env.NETLIFY_ENGLISH_ORIGIN,
  flamenco_beta: process.env.FLAMENCO_BETA,
  smtp_host: process.env.SMTP_HOST,
  smtp_port: process.env.SMTP_PORT,
  smtp_username: process.env.SMTP_USERNAME,
  smtp_password: process.env.SMTP_PASSWORD,
  access_Key_Id: process.env.AWS_ACCESS_KEY_ID,
  secret_Access_Key: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
  s3_bucket: process.env.AWS_BUCKET_NAME,
  stripe_secret_key: process.env.STRIPE_SECRET_KEY,
  stripe_webhook_key: process.env.STRIPE_WEBHOOK_KEY,
  session_reminder_minutes: parseInt(process.env.SESSION_REMINDER_MINUTES, 10) || 30,
  stripe_connect_webhook_key: process.env.STRIPE_CONNECT_WEBHOOK_KEY,
  nats_servers: process.env.NATS_SERVERS,
  notificationsChannelPrefix: process.env.NOTIFICATIONS_CHANNEL_PREFIX || 'notifications.',
  sender_email: process.env.sender_email,
  ana_email: process.env.ana_email,
  coqui_email: process.env.coqui_email,
  support_email: process.env.support_email,
  prerenderToken: process.env.prerenderToken,
  serviceUrl: process.env.serviceUrl,
  staging: process.env.STAGING,
  live_flamenco: process.env.LIVE_FLAMENCO,
  vive_flamenco: process.env.VIVE_FLAMENCO,
};