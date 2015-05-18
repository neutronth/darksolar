var PackageModels    = require ('./models/package');
var ManagementModels = require ('./models/management');
var UserModels       = require ('./models/user');
var GenUsersModels   = require ('./models/genusers');
var AccessCodeModels = require ('./models/accesscode');

Models = function (mongoose_conn) {
  this.mongoose = mongoose_conn;
  this.schemas = {};

  var Package    = new PackageModels (this.mongoose, this.schemas);
  var Management = new ManagementModels (this.mongoose, this.schemas);
  var User       = new UserModels (this.mongoose, this.schemas);
  var GenUsers   = new GenUsersModels (this.mongoose, this.schemas);
  var AccessCode = new AccessCodeModels (this.mongoose, this.schemas);
};

module.exports = exports = Models;
