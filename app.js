
/**
 * Module dependencies.
 */


var cluster = require('cluster');
var numCPUs = require('os').cpus().length;
      path = require('path');
var socketio_store   = new (require('socket.io-clusterhub'));
var production = false;

const crypto = require ('crypto');
      fs = require ('fs');

var privatekey = fs.readFileSync ('cert/rahunas.org.key').toString ();
var certificate = fs.readFileSync ('cert/rahunas.org.crt').toString ();
var credentials = {
  key: privatekey,
  cert: certificate,
};


var workers = [];

if (cluster.isMaster) {
  // Fork workers
  for (var i = 0; i < numCPUs; i++) {
    var worker = cluster.fork ();
    workers.push (worker);
  }
} else { /* Child process */
  var express = require('express'),
      MongoStore = require ('connect-mongo')(express)
      routes = require ('./routes');
      auth = require ('./api/auth');
      cookie = require ('cookie');

  var io = require ('socket.io');

  var app = module.exports = express.createServer(credentials);

  var config = require ('./settings');
  app.config = config;

  // Configuration
  //
  //
  app.sessionStore = new MongoStore (app.config.StoreDb);

  app.configure(function(){
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
    app.use(express.bodyParser());
    app.use(express.cookieParser());
    app.use(express.session({
      secret: app.config.cookie_secret,
      cookie: {
        maxAge: 1800000,
      },
      store: app.sessionStore,
    }));
    app.use(auth.everyauth.middleware ());
    app.use(express.methodOverride());
    app.use(app.router);
    app.use(express.static(path.join(__dirname, 'public')));
  });

  app.locals ({
    socketio_url: 'https://authen.rahunas.org:3000',
  });

  app.configure('development', function(){
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));

    process.on ('uncaughtException', function (err) {
      console.log ('Caught exception: ', err);
    });
  });

  app.configure('production', function(){
    app.use(express.errorHandler());

    process.on ('uncaughtException', function (err) {
      /* Silently ignore */
    });

    production = true;
  });

  auth.everyauth.helpExpress (app, { userAlias: '__user__' });
  auth.everyauth.password
    .loginLocals ({ title: 'Login: ' + app.config.appName })
    .registerLocals ({ title: 'Register: ' + app.config.appName });

  // Routes
  routes.init (app);

  app.listen(3000, function(){
    console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);

    if (production)
      console.log = function () {}
  });

  var sio = io.listen (app);
  sio.configure (function () {
    sio.set ('store', socketio_store);
  });

  sio.sockets.on ('connection', function (socket) {
    socket.emit ('updateperm', {});
  });

  sio.set ('authorization', function (data, accept) {
    if (data.headers.cookie) {
      data.cookie = cookie.parse (data.headers.cookie);
      data.sessionID = data.cookie['connect.sid'];
      app.sessionStore.get (data.sessionID, function (err, session) {
        if (err || !session) {
          return accept ('Error', false);
        } else {
          if (session.perm == undefined) {
            return accept ('Error', false);
          } else {
            data.session = session;
            return accept (null, true);
          }
        }
      });
    } else {
      accept ('Error: no cookie', false);
    }
  });

  app.config.websockets = sio;
}

cluster.on ('death', function (worker) {
  console.log ('Worker ' + worker.pid + ' died, respawn');

  for (var i = 0; i < workers.length; i++) {
    var death = workers[i];

    if (worker.pid === death.pid)
      workers.splice (i);
  }

  var respawn = cluster.fork ();
  workers.push (respawn);
});

process.on ('SIGTERM', function () {
  for (var i = 0; i < workers.length; i++) {
    workers[i].kill ('SIGTERM');
  }

  process.exit (1);
});
