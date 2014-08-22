exports.Auth = require ('./routes/auth');
exports.Permission = require ('./routes/perm'); 
exports.Management = require ('./routes/management'); 
exports.Package = require ('./routes/package'); 
exports.User    = require ('./routes/user'); 
exports.AccessCode = require ('./routes/accesscode');

var Perm = require ('./perm');

exports.initRoutes = function (app) {
  app.Perm = new Perm ();

  this.Auth.initRoutes (app);
  this.Permission.initRoutes (app);
  this.Management.initRoutes (app);
  this.Package.initRoutes (app);
  this.User.initRoutes (app);
  this.AccessCode.initRoutes (app);
};
