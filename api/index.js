exports.Package = require ('./routes/package'); 
exports.User    = require ('./routes/user'); 

exports.initRoutes = function (app) {
  this.Package.initRoutes (app);
  this.User.initRoutes (app);
};
