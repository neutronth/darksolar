/*
 * GET home page.
 */
var DSAPI = require('../api');

function index (req, res) {
  res.render('index', { title: 'DarkSolar Control Panel' });
}

function loginCheck (req, res, next) {
  if (!req.app.auth.loggedIn (req))
    res.redirect ('/login');
  else
    next ();
};

function appForbidden (req, res, next) {
  if (!req.app.auth.loggedIn (req)) {
    res.send (403);
  } else {
    next (); 
  }
};

exports.init = function (app) {
  app.get ('/', loginCheck, index);
  app.get ('/js/*', appForbidden);

  DSAPI.initRoutes (app);
};
