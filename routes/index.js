/*
 * GET home page.
 */
var DSAPI = require('../api');

/* Debuging purpose, will removed soon */
var override_auth = false;

function index (req, res) {
  res.render('index', { title: 'DarkSolar Control Panel' })
}

function loginCheck (req, res, next) {
  if (override_auth) {
    req.loggedIn = true;
    req.user = 'neutron';
    next ();
    return;
  }

  if (!req.loggedIn)
    res.redirect ('/login');
  else
    next ();
};

function appForbidden (req, res, next) {
  if (override_auth) {
    req.loggedIn = true;
    req.user = 'nitrogen';

    next ();
    return;
  }

  if (!req.loggedIn) {
    res.send (403);
  } else {
    next (); 
  }
};

function appMain (req, res) {
  res.header('Cache-Control','no-cache, private, no-store, must-revalidate,\
    max-stale=0, post-check=0, pre-check=0');
  res.sendfile ('public/js/' + req.params.file);
};

exports.init = function (app) {
  app.get ('/', loginCheck, index);
  app.get ('/js/:file', appForbidden, appMain);

  DSAPI.initRoutes (app);
};
