exports.Auth = require ('./routes/auth');
exports.Permission = require ('./routes/perm'); 
exports.Management = require ('./routes/management'); 
exports.Package = require ('./routes/package'); 
exports.User    = require ('./routes/user'); 
exports.AccessCode = require ('./routes/accesscode');
exports.Help = require ('./routes/help');
exports.Monitor = require ('./routes/monitor');

var Perm = require ('./perm');
var RadiusSync = require ('./radiussync/radiussync');

exports.initRoutes = function (app) {
  app.Perm = new Perm ();

  this.Auth.initRoutes (app);
  this.Permission.initRoutes (app);
  this.Management.initRoutes (app);
  this.Package.initRoutes (app);
  this.User.initRoutes (app);
  this.AccessCode.initRoutes (app);
  this.Help.initRoutes (app);
  this.Monitor.initRoutes (app);

  var rs_prepare = new RadiusSync (app.config).instance ();
  rs_prepare.prepare ();

  delete rs_prepare;
};
