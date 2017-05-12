var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var http = require('http');
var pug = require('pug');

// Chatroom dependency
var Twilio = require('twilio');
var AccessToken = Twilio.jwt.AccessToken;
var VideoGrant = AccessToken.VideoGrant;
var IpMessagingGrant = AccessToken.IpMessagingGrant;
var SyncGrant = AccessToken.SyncGrant;
require('dotenv').load();


//New Code
var mongo = require('mongodb');
var monk = require('monk');
//var mongoose = require('mongoose');
var db = monk('mongodb://baxia_lan:***REMOVED***@clustercc-shard-00-00-hfapv.mongodb.net:27017,clustercc-shard-00-01-hfapv.mongodb.net:27017,clustercc-shard-00-02-hfapv.mongodb.net:27017/lighthouse?ssl=true&replicaSet=ClusterCC-shard-0&authSource=admin');
var fileUpload = require('express-fileupload');

var index = require('./routes/index');
var users = require('./routes/users');
var session = require('express-session');
var app = express();
var chatname = index.chatname;

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(session({secret: 'secret',saveUninitialized: true,resave: true}));

// Configuration for Twilio API, which requires several Keys and SIDs and these can be found/ created on the online console
app.get('/config', function(request, response) {
  response.json( {
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
    TWILIO_NOTIFICATION_SERVICE_SID: process.env.TWILIO_NOTIFICATION_SERVICE_SID,
    TWILIO_API_KEY: process.env.TWILIO_API_KEY,
    TWILIO_API_SECRET: process.env.TWILIO_API_SECRET != '',
    TWILIO_CHAT_SERVICE_SID: process.env.TWILIO_CHAT_SERVICE_SID,
    TWILIO_SYNC_SERVICE_SID: process.env.TWILIO_SYNC_SERVICE_SID,
    TWILIO_CONFIGURATION_SID: process.env.TWILIO_CONFIGURATION_SID
  });
});

// Pass the javascript session's user parameter to the token identity of the chatroom when creating a new AccessToken
app.get('/token', function(request, response) {
    console.log(request.session.user);
    console.log(`token identity: ${request.session.user}`)

    // Create an access token which we will sign and return to the client
    var token = new AccessToken(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_API_KEY,
        process.env.TWILIO_API_SECRET
    );

    // Assign the generated identity to the token
    token.identity = request.session.user;
    //grant the access token Twilio Video capabilities
    if (process.env.TWILIO_CONFIGURATION_SID) {
        var videoGrant = new VideoGrant({
          room: 'default room'
        });

        token.addGrant(videoGrant);
    }

    if (process.env.TWILIO_CHAT_SERVICE_SID) {
        // Create a unique ID for the client on their current device
        var appName = 'TwilioChatDemo';
        // Create a "grant" which enables a client to use IPM as a given user,
        // on a given device
        var ipmGrant = new IpMessagingGrant({
            serviceSid: process.env.TWILIO_CHAT_SERVICE_SID
        });
        token.addGrant(ipmGrant);
    }

    if (process.env.TWILIO_SYNC_SERVICE_SID) {
        // Create a unique ID for the client on their current device
        var appName = 'TwilioSyncDemo';

        // Create a "grant" which enables a client to use Sync as a given user,
        // on a given device
        var syncGrant = new SyncGrant({
            serviceSid: process.env.TWILIO_SYNC_SERVICE_SID
        });
        token.addGrant(syncGrant);
    }

    // Serialize the token to a JWT string and include it in a JSON response
    response.send({
        identity: token.identity,
        token: token.toJwt()
    });
});
// Bind Twilio endpoint with a local client
app.post('/register', function(request, response) {

  // Authenticate with Twilio
var client = new Twilio(process.env.TWILIO_API_KEY,  process.env.TWILIO_API_SECRET, null, {accountSid:process.env.TWILIO_ACCOUNT_SID});

  // Get a reference to the user notification service instance
  var service = client.notify.v1.services(process.env.TWILIO_NOTIFICATION_SERVICE_SID);

  service.bindings.create({
    "endpoint": request.body.endpoint,
    "identity": request.body.identity,
    "bindingType": request.body.BindingType,
    "address": request.body.Address
  }).then(function(binding) {
    var message = 'Binding created!';
    console.log(binding);
    // Send a JSON response indicating success
    response.send({
      message: message
    });
  }).catch(function(error) {
    var message = 'Failed to create binding: ' + error;
    console.log(message);

    // Send a JSON response indicating an internal server error
    response.status(500).send({
      error: error,
      message: message
    });
  });
});
app.post('/send-notification', function(request, response) {

  // Authenticate with Twilio
  var client = new Twilio(process.env.TWILIO_API_KEY,  process.env.TWILIO_API_SECRET, null, {accountSid:process.env.TWILIO_ACCOUNT_SID});

  // Create a reference to the user notification service
  var service = client.notify.v1.services(process.env.TWILIO_NOTIFICATION_SERVICE_SID);

  // Send a notification
  service.notifications.create({
    'identity':'' + request.body.identity,
    'body':'Hello, ' + request.body.identity + '!'
  }).then(function(message) {
    console.log(message);
    response.send({
      message:'Successful sending notification'
    });
  }).catch(function(error) {
    var message = 'Failed to send notification: ' + error;
    console.log(message);
    // Send a JSON response indicating an internal server error
    response.status(500).send({
      error: error,
    });
  });
});

// Besides running on port 8081, we also set a port at 3002 for testing purpose
var server = http.createServer(app);
var port = process.env.PORT || 3002;
server.listen(port, function() {
    console.log('Express server running on *:' + port);
});
//

//test session
app.use(session({
  resave: false, // don't save session if unmodified
  saveUninitialized: false, // don't create session until something stored
  secret: 'shhhh, very secret'
}));
app.use(function(req, res, next){
  var err = req.session.error;
  var msg = req.session.success;
  delete req.session.error;
  delete req.session.success;
  res.locals.message = '';
  if (err) res.locals.message = '<p class="msg error">' + err + '</p>';
  if (msg) res.locals.message = '<p class="msg success">' + msg + '</p>';
  next();
});
//test session


app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(fileUpload());

//Make our db accessible to our router
app.use(function(req,res,next){
    req.db = db;
    next();
});

app.use('/', index);
app.use('/users', users);

// Was used to direct user to signin page but 
app.get("/", function(req, res){
    var title="Welcome";
    res.render("signin.ejs", {title : title});
});
// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
