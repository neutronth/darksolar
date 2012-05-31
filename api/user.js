var mongoose = require ('mongoose');
var mongoose_conn = undefined;

var User = function (config) {
  if (!mongoose_conn)
    mongoose_conn = mongoose.createConnection (config.DSDb);

  this.mongoose = mongoose_conn;

  this.initModel ();
  this.model = this.getModel ('user');
};

User.prototype.initModel = function () {
  var Schema = mongoose.Schema;
  var ObjectId = Schema.ObjectId;

  var Role = new Schema ({
    name: String,
  });

  var schemas = {
    user: new Schema({
      username: { type: String, trim: true, index: { unique: true }},
      personid: { type: String, index: { unique: true }},
      firstname: { type: String, index: true },
      surname: { type: String, index: true },
      email: { type: String, index: true },
      salt: String,
      password: String,
      role: [ Role ],
    }, { safe: true, strict: true }),
  };

  var model = this.mongoose.model ('user', schemas.user, 'users');
};

User.prototype.getModel = function (modelname) {
  var model = this.mongoose.model (modelname);

  if (model)
    return model;
  else
    return undefined;
};

User.prototype.numRows = function (callback) {
  var all = this.model.find ({});

  all.count (callback);
};

User.prototype.get = function (login, callback) {
  this.model.findOne ({ username: login }, callback); 
};

module.exports = User;
