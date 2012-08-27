
/**
 * Module dependencies.
 */


var cluster = require('cluster');
var numCPUs = require('os').cpus().length;

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

  var app = module.exports = express.createServer(credentials);

  var config = require ('./settings');
  app.config = config;

  // Configuration
  //
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
      store: new MongoStore (app.config.StoreDb),
    }));
    app.use(auth.everyauth.middleware ());
    app.use(express.methodOverride());
    app.use(app.router);
    app.use(express.static(__dirname + '/public'));
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
  });

  auth.everyauth.helpExpress (app, { userAlias: '__user__' });
  auth.everyauth.password
    .loginLocals ({ title: 'Login: ' + app.config.appName })
    .registerLocals ({ title: 'Register: ' + app.config.appName });

  // Routes
  routes.init (app);

  app.listen(3000, function(){
    console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
  });
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
