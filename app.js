
/**
 * Module dependencies.
 */

var env = process.env.NODE_ENV || 'development';
var cluster = require('cluster');
var numCPUs = require('os').cpus().length;
      path = require('path');
var mongoose = require ('mongoose');
var production = false;

const crypto = require ('crypto');
      fs = require ('fs');

var config = require ('./conf/app/settings');

var privatekey = fs.readFileSync (config.ssl.privatekey).toString ();
var certificate = fs.readFileSync (config.ssl.certificate).toString ();
var ca = fs.readFileSync (config.ssl.ca).toString ();
var credentials = {
  key: privatekey,
  cert: certificate,
  ca: ca,
};


var workers = [];

if (cluster.isMaster) {
  // Fork workers
  for (var i = 0; i < numCPUs; i++) {
    var worker = cluster.fork ();
    workers.push (worker);
  }
} else { /* Child process */
  var http = require ('http'),
      https = require ('https'),
      express = require('express'),
      session = require('express-session'),
      MongoStore = require ('connect-mongo')(session),
      cookieParser = require ('cookie-parser'),
      errorhandler = require ('errorhandler'),
      routes = require ('./routes'),
      auth = require ('./api/auth'),
      domain = require ('domain');

  var app = express ();

  app.config = config;
  app.config.mongoose_conn = mongoose.createConnection (app.config.DSDb);

  // Configuration
  //
  //
  var retryConnectDB;

  app.sessionStore = {};
  var _app = app;
  retryConnectDB = setInterval (function () {
    var d = domain.create ();
    d.on ('error', function (err) {
      console.log ('Error: ' + err);
      delete _app.sessionStore
    });

    d.run (function () {
      _app.sessionStore = new MongoStore (_app.config.StoreDb, function () {
        clearInterval (retryConnectDB);
        startService (app);
      });
    });
  }, 5000);
}

startService = function (app) {
  app.locals.socketio_url = 'https://authen.rahunas.org:3000';
  app.auth = auth;

  app.set('view engine', 'jade');
  app.use(cookieParser());
  app.use(session({
    secret: app.config.cookie_secret,
    store:  app.sessionStore,
    cookie: {
      httoOnly: true,
      secure: true,
      maxAge: 3600000,
    },
    saveUninitialized: true,
    resave: true
  }));
  app.use(require ('body-parser').urlencoded ({extended: true}));
  app.use(require ('body-parser').json ());
  app.use(require ('method-override')());
  app.use(auth.everyauth.loadUser ());
  app.use(auth.everyauth.addRequestLocals ('user'));
  app.use(express.static(path.join(__dirname, 'public')));

  if (env == 'development') {
    app.use(errorhandler());

    process.on ('uncaughtException', function (err) {
      console.log ('Caught exception: ', err);
    });
  } else { /* production */
    process.on ('uncaughtException', function (err) {
      /* Silently ignore */
    });

    production = true;
  }

  // Routes
  routes.init (app);

  var server = https.createServer(credentials, app)
    .listen (3000, function () {
      console.log ("Express server listening on port %d in %s mode",
                   3000, env);

      if (production)
        console.log = function () {}
    });

  var io = require ('socket.io')(server);
  io.adapter (require ('socket.io-redis')({ host: 'localhost', port: 6379}));

  io.on ('connection', function (socket) {
    socket.emit ('updateperm', {});
  });

  io.use (function (socket, next) {
    var cookie = require ('cookie').parse (socket.request.headers.cookie);

    if (cookie) {
      var raw = cookie['connect.sid'];
      var sessionID = raw ?
                        require ('cookie-signature').unsign (raw.slice (2),
                          app.config.cookie_secret) : "";
      app.sessionStore.get (sessionID, function (err, session) {
        if (err || !session) {
          next (new Error ('not authorized'));
        } else {
          if (session.perm == undefined) {
            next (new Error ('not authorized'));
          } else {
            next ();
          }
        }
      });
    } else {
      next (new Error ('not authorized'));
    }
  });

/*
  io.set ('authorization', function (data, accept) {
    if (data.headers.cookie) {
      var cookieParser = require ('cookie-parser');
      data.cookie = cookieParser.signedCookies (data.headers.cookie, app.config.cookie_secret);
      console.log (data.cookie);
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
*/

  app.config.websockets = io;
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
