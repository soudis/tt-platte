/**
 * Module dependencies.
 */
const express = require('express');
const compression = require('compression');
const session = require('express-session');
const bodyParser = require('body-parser');
const logger = require('morgan');
const chalk = require('chalk');
const errorHandler = require('errorhandler');
const lusca = require('lusca');
const dotenv = require('dotenv');
const MongoStore = require('connect-mongo')(session);
const flash = require('express-flash');
const path = require('path');
const mongoose = require('mongoose');
const passport = require('passport');
const expressValidator = require('express-validator');
const expressStatusMonitor = require('express-status-monitor');
const sass = require('node-sass-middleware');
const multer = require('multer');
const helper = require('./utils/helper');
const config = require('./config/config');
const moment = require('moment');

const upload = multer({ dest: path.join(__dirname, 'tmp') });

const Recaptcha = require('express-recaptcha').RecaptchaV2;
if (process.env.RECAPTCHA_SITE_KEY && process.env.RECAPTCHA_SECRET_KEY) {
	var options = {'hl':'de', callback:'cb'};
	var recaptcha = new Recaptcha(process.env.RECAPTCHA_SITE_KEY, process.env.RECAPTCHA_SECRET_KEY, options);	
}


/**
 * Load environment variables from .env file, where API keys and passwords are configured.
 */
dotenv.config({ path: '.env.example' });

/**
 * Controllers (route handlers).
 */
const homeController = require('./controllers/home');
const userController = require('./controllers/user');
const apiController = require('./controllers/api');
const contactController = require('./controllers/contact');
const mapController = require('./controllers/map');
const mediaController = require('./controllers/media');


/**
 * API keys and Passport configuration.
 */
const passportConfig = require('./config/passport');

/**
 * Create Express server.
 */
const app = express();

/**
 * Connect to MongoDB.
 */
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);
mongoose.set('useNewUrlParser', true);
mongoose.connect(process.env.MONGODB_URI);
mongoose.connection.on('error', (err) => {
  console.error(err);
  console.log('%s MongoDB connection error. Please make sure MongoDB is running.', chalk.red('✗'));
  process.exit();
});

/**
 * Express configuration.
 */
app.set('host', process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0');
app.set('port', process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.use(expressStatusMonitor());
app.use(compression());
app.use(sass({
  src: path.join(__dirname, 'public'),
  dest: path.join(__dirname, 'public')
}));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(expressValidator());
app.use(session({
  resave: true,
  saveUninitialized: true,
  secret: process.env.SESSION_SECRET,
  cookie: { maxAge: 1209600000 }, // two weeks in milliseconds
  store: new MongoStore({
    url: process.env.MONGODB_URI,
    autoReconnect: true,
  })
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
const csrfExcluded = [
  '/media/upload',
  '/media/delete',
  '/item/delete',  
  '/item/fetch',
  '/item/create',
  '/item/rate'
]
app.use((req, res, next) => {
  if (csrfExcluded.find((entry) => {
    return req.path.startsWith(entry);
  })) {
    next();
  } else {
    lusca.csrf()(req, res, next);
  }
});
app.use(lusca.xframe('SAMEORIGIN'));
app.use(lusca.xssProtection(true));
app.disable('x-powered-by');

app.use((req, res, next) => {
  res.locals.user = req.user;
  if (!req.session.visited) {
    req.session.visited = 1;
  } else {
    req.session.visited ++;
  }
  res.locals.session = req.session;
  res.locals.helper = helper;
  res.locals.config = config;
  res.locals.moment = moment;
  if (req.url.startsWith('/?')) {
  	res.locals.url= '/';
  } else {
	res.locals.url = req.url;
  }  
  next();
});
app.use((req, res, next) => {
  // After successful login, redirect back to the intended page
  if (!req.user
    && req.path !== '/login'
    && req.path !== '/signup'
    && !req.path.match(/^\/auth/)
    && !req.path.match(/\./)) {
    req.session.returnTo = req.originalUrl;
  } else if (req.user
    && (req.path === '/account' || req.path.match(/^\/api/))) {
    req.session.returnTo = req.originalUrl;
  }
  next();
});

app.use((req,res,next) => {
	if (req.subdomains && req.subdomains.length > 0) {
		var place = config.places.find(place => { return place.subdomains.includes(req.subdomains[0].toLowerCase())});
		if (place) {
			var hostname = req.hostname.split('.');
			var tld = hostname.pop();
			var domain = hostname.pop();
			res.redirect(req.protocol + '://' + domain + '.' + tld + '/p/' + place.id);
		} else {
			next();
		}
	} else {
		next();	
	}
	
});

app.use('/', express.static(path.join(__dirname, 'public'), { maxAge: 14400000 })); // max age is 4 hours
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), { maxAge: 14400000 }));
app.use('/js/lib', express.static(path.join(__dirname, 'node_modules/chart.js/dist'), { maxAge: 14400000 }));
app.use('/js/lib', express.static(path.join(__dirname, 'node_modules/popper.js/dist/umd'), { maxAge: 14400000 }));
app.use('/js/lib', express.static(path.join(__dirname, 'node_modules/bootstrap/dist/js'), { maxAge: 14400000 }));
app.use('/js/lib', express.static(path.join(__dirname, 'node_modules/jquery/dist'), { maxAge: 14400000 }));
app.use('/js/lib', express.static(path.join(__dirname, 'node_modules/bootbox/dist'), { maxAge: 14400000 }));
app.use('/js/lib', express.static(path.join(__dirname, 'node_modules/leaflet.locatecontrol/dist'), { maxAge: 14400000 }));
app.use('/webfonts', express.static(path.join(__dirname, 'node_modules/@fortawesome/fontawesome-free/webfonts'), { maxAge: 14400000 }));
app.use('/fine-uploader', express.static(path.join(__dirname, 'node_modules/fine-uploader/jquery.fine-uploader'), { maxAge: 14400000 }));
app.use('/js/lib', express.static(path.join(__dirname, 'node_modules/leaflet-sidebar/src'), { maxAge: 14400000 }));
app.use('/js/lib', express.static(path.join(__dirname, 'node_modules/datatables.net-bs4/js'),  { maxAge: 14400000 }));
app.use('/css/lib', express.static(path.join(__dirname, 'node_modules/datatables.net-bs4/css'),  { maxAge: 14400000 }));
app.use('/js/lib', express.static(path.join(__dirname, 'node_modules/datatables.net/js'),  { maxAge: 14400000 }));


/**
 * Primary app routes.
 */
app.get('/',mapController.showMap);
app.get('/set/:place',mapController.setPlace);
app.get('/p/:place',mapController.goPlace);
app.get('/list',mapController.getList);

app.get('/item/fetch',mapController.fetchItems);
app.post('/item/create', passportConfig.isAuthenticated, mapController.createItem);
app.get('/item/create/:lat/:long', passportConfig.isAuthenticated, mapController.getCreateItem);
app.post('/item/edit', passportConfig.isAuthenticated, mapController.editItem);
app.get('/item/edit/:id', passportConfig.isAuthenticated, mapController.getEditItem);
app.get('/item/delete/:id', passportConfig.isAdmin, mapController.deleteItem);
app.put('/item/rate/:item_id/:criteria_name/:rating_value', passportConfig.isAuthenticated, mapController.rateItemCriteria);

app.get('/map/menu', mapController.renderMenu);

app.post('/media/upload',passportConfig.isAuthenticated, upload.single('qqfile'), mediaController.upload);
app.delete('/media/delete/:uuid',passportConfig.isAuthenticated, mediaController.delete);

app.get('/login', userController.getLogin);
app.post('/login', userController.postLogin);
app.get('/logout', userController.logout);
app.get('/forgot', userController.getForgot);
app.post('/forgot', userController.postForgot);
app.get('/reset/:token', userController.getReset);
app.post('/reset/:token', userController.postReset);
app.get('/signup/:token', userController.getSignup);
app.post('/signup/:token', userController.postSignup);

app.get('/invite', passportConfig.isAdmin, userController.getInvite);
app.post('/invite', passportConfig.isAdmin, userController.postInvite);
if (process.env.RECAPTCHA_SITE_KEY && process.env.RECAPTCHA_SECRET_KEY) {
	app.get('/contact', recaptcha.middleware.render, contactController.getContact);
	app.post('/contact', recaptcha.middleware.verify, contactController.postContact);
} else {
	app.get('/contact', contactController.getContact);
	app.post('/contact', contactController.postContact);
}

app.get('/about', contactController.getAbout);
app.get('/account/profile', userController.getAccount);
app.post('/account/profile', passportConfig.isAuthenticated, userController.postUpdateProfile);
app.post('/account/password', passportConfig.isAuthenticated, userController.postUpdatePassword);
app.post('/account/delete', passportConfig.isAuthenticated, userController.postDeleteAccount);
app.get('/account/unlink/:provider', passportConfig.isAuthenticated, userController.getOauthUnlink);

/**
 * API examples routes.
 */
/*app.get('/api', apiController.getApi);
app.get('/api/lastfm', apiController.getLastfm);
app.get('/api/nyt', apiController.getNewYorkTimes);
app.get('/api/aviary', apiController.getAviary);
app.get('/api/steam', passportConfig.isAuthenticated, passportConfig.isAuthorized, apiController.getSteam);
app.get('/api/stripe', apiController.getStripe);
app.post('/api/stripe', apiController.postStripe);
app.get('/api/scraping', apiController.getScraping);
app.get('/api/twilio', apiController.getTwilio);
app.post('/api/twilio', apiController.postTwilio);
app.get('/api/clockwork', apiController.getClockwork);
app.post('/api/clockwork', apiController.postClockwork);
app.get('/api/foursquare', passportConfig.isAuthenticated, passportConfig.isAuthorized, apiController.getFoursquare);
app.get('/api/tumblr', passportConfig.isAuthenticated, passportConfig.isAuthorized, apiController.getTumblr);
app.get('/api/facebook', passportConfig.isAuthenticated, passportConfig.isAuthorized, apiController.getFacebook);
app.get('/api/github', passportConfig.isAuthenticated, passportConfig.isAuthorized, apiController.getGithub);
app.get('/api/twitter', passportConfig.isAuthenticated, passportConfig.isAuthorized, apiController.getTwitter);
app.post('/api/twitter', passportConfig.isAuthenticated, passportConfig.isAuthorized, apiController.postTwitter);
app.get('/api/linkedin', passportConfig.isAuthenticated, passportConfig.isAuthorized, apiController.getLinkedin);
app.get('/api/instagram', passportConfig.isAuthenticated, passportConfig.isAuthorized, apiController.getInstagram);
app.get('/api/paypal', apiController.getPayPal);
app.get('/api/paypal/success', apiController.getPayPalSuccess);
app.get('/api/paypal/cancel', apiController.getPayPalCancel);
app.get('/api/lob', apiController.getLob);
app.get('/api/pinterest', passportConfig.isAuthenticated, passportConfig.isAuthorized, apiController.getPinterest);
app.post('/api/pinterest', passportConfig.isAuthenticated, passportConfig.isAuthorized, apiController.postPinterest);
app.get('/api/google-maps', apiController.getGoogleMaps);
app.get('/api/chart', apiController.getChart);*/

/**
 * OAuth authentication routes. (Sign in)
 */
/*app.get('/auth/instagram', passport.authenticate('instagram'));
app.get('/auth/instagram/callback', passport.authenticate('instagram', { failureRedirect: '/login' }), (req, res) => {
  res.redirect(req.session.returnTo || '/');
});
app.get('/auth/snapchat', passport.authenticate('snapchat'));
app.get('/auth/snapchat/callback', passport.authenticate('snapchat', { failureRedirect: '/login' }), (req, res) => {
  res.redirect(req.session.returnTo || '/');
});
app.get('/auth/facebook', passport.authenticate('facebook', { scope: ['email', 'public_profile'] }));
app.get('/auth/facebook/callback', passport.authenticate('facebook', { failureRedirect: '/login' }), (req, res) => {
  res.redirect(req.session.returnTo || '/');
});
app.get('/auth/github', passport.authenticate('github'));
app.get('/auth/github/callback', passport.authenticate('github', { failureRedirect: '/login' }), (req, res) => {
  res.redirect(req.session.returnTo || '/');
});
app.get('/auth/google', passport.authenticate('google', { scope: 'profile email' }));
app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/login' }), (req, res) => {
  res.redirect(req.session.returnTo || '/');
});
app.get('/auth/twitter', passport.authenticate('twitter'));
app.get('/auth/twitter/callback', passport.authenticate('twitter', { failureRedirect: '/login' }), (req, res) => {
  res.redirect(req.session.returnTo || '/');
});
app.get('/auth/linkedin', passport.authenticate('linkedin', { state: 'SOME STATE' }));
app.get('/auth/linkedin/callback', passport.authenticate('linkedin', { failureRedirect: '/login' }), (req, res) => {
  res.redirect(req.session.returnTo || '/');
});*/

/**
 * OAuth authorization routes. (API examples)
 */
// app.get('/auth/foursquare', passport.authorize('foursquare'));
// app.get('/auth/foursquare/callback', passport.authorize('foursquare', { failureRedirect: '/api' }), (req, res) => {
//   res.redirect('/api/foursquare');
// });
// app.get('/auth/tumblr', passport.authorize('tumblr'));
// app.get('/auth/tumblr/callback', passport.authorize('tumblr', { failureRedirect: '/api' }), (req, res) => {
//   res.redirect('/api/tumblr');
// });
// app.get('/auth/steam', passport.authorize('openid', { state: 'SOME STATE' }));
// app.get('/auth/steam/callback', passport.authorize('openid', { failureRedirect: '/api' }), (req, res) => {
//   res.redirect(req.session.returnTo);
// });
// app.get('/auth/pinterest', passport.authorize('pinterest', { scope: 'read_public write_public' }));
// app.get('/auth/pinterest/callback', passport.authorize('pinterest', { failureRedirect: '/login' }), (req, res) => {
//   res.redirect('/api/pinterest');
// });

/**
 * Error Handler.
 */
if (process.env.NODE_ENV === 'development') {
  // only use in development
  app.use(errorHandler());
} else {
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).send('Server Error');
  });
}

/**
 * Start Express server.
 */
app.listen(app.get('port'), () => {
  console.log('%s App is running at http://localhost:%d in %s mode', chalk.green('✓'), app.get('port'), app.get('env'));
  console.log('  Press CTRL-C to stop\n');
});

module.exports = app;
