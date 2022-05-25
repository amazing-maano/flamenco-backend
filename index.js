require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const logger = require('morgan');

const WebSocket = require('ws');

const app = express();
const http = require('http').createServer(app);

const wss = new WebSocket.Server({
  server: http,
  path: '/ws',
});
const prerender = require('prerender-node');

const {
  mongodb_uri,
  port,
  base_url,
  serviceUrl,
  prerenderToken,
} = require('./config/environment');

const {
  i18next,
  i18nextMiddleware,
} = require('./i18n/index');
// const cors = require('cors');
const scheduler = require('./scheduler');
const natsWrapper = require('./utils/natsWrapper');
const {
  isWebsocketAuthenticated,
} = require('./utils/isAuthenticated');
const {
  websocketHandler,
} = require('./controllers/websocketController');

require('./config/passport')(passport);

app.use(logger('dev'));
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  }),
);
app.use(
  express.urlencoded({
    extended: true,
  }),
);

prerender
  .set('prerenderToken', prerenderToken)
  .set('prerenderServiceUrl', serviceUrl);
prerender.crawlerUserAgents.push('googlebot');
prerender.crawlerUserAgents.push('bingbot');
prerender.crawlerUserAgents.push('yandex');
app.use(prerender);

// Calling routes
const authentication = require('./routes/auth');
const profile = require('./routes/profile');
const product = require('./routes/product');
const notification = require('./routes/notification');
const taxonomies = require('./routes/taxonomies');
const reviews = require('./routes/reviews');
const recommendations = require('./routes/recommendations');
const orders = require('./routes/orders');
const admin = require('./routes/admin');
const webhooks = require('./routes/webhooks');
const endorsements = require('./routes/endorsements');
const aboutus = require('./routes/aboutUs');
const contacts = require('./routes/contact');
const cancelRoutes = require('./routes/cancelEvent');
const inviteRoutes = require('./routes/inviteStudents');

/*
const possibleOrigins = [
  process.env.CORS_ORIGIN_LOCAL,
  process.env.CORS_ORIGIN_FIREBASE,
  process.env.CORS_ORIGIN_NETLIFY,
];
/*
const corsOptions = {
  origin: possibleOrigins,
  credentials: true, // access-control-allow-credentials:true
  optionSuccessStatus: 200,
};
// app.use(cors(corsOptions));
*/
app.use(i18nextMiddleware.handle(i18next));
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'PUT, POST, GET, DELETE, PATCH, OPTIONS',
  );
  next();
});

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

app.get('/', (_, res) => {
  res.send('Flamencos Backend!');
});

// Using routes
app.use('/', authentication);
app.use('/', profile);
app.use('/', product);
app.use('/', orders);
app.use('/', notification);
app.use('/', taxonomies);
app.use('/', reviews);
app.use('/', recommendations);
app.use('/', admin);
app.use('/', webhooks);
app.use('/', endorsements);
app.use('/', aboutus);
app.use('/', contacts);
app.use('/', cancelRoutes);
app.use('/', inviteRoutes);

// mongoose connection
mongoose
  .connect(mongodb_uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('DB Connected');
    http.listen(process.env.PORT || port, () => {
      console.log(`Flamencos is listening at ${base_url}`);
    });
    wss.on('connection', (ws) => {
      ws.addEventListener(
        'message',
        (data) => {
          isWebsocketAuthenticated(data, websocketHandler);
        }, {
          once: true,
        },
      );
    });
  })
  .catch((err) => {
    console.log(`DB connection error: ${err.message}`);
  });

scheduler.start();
natsWrapper.start();

module.exports = app;
