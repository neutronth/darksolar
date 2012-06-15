var mongoose = require ('mongoose');
var mongoose_conn = undefined;
var Q = require ('q');
var crypto = require ('crypto');
var uuid = require ('node-uuid');
var Management = require ('./management');
var Models = require ('./models');

var User = function (config) {
  this.config = config;

  this.setSalt ();

  if (!mongoose_conn)
    mongoose_conn = mongoose.createConnection (config.DSDb);

  this.mongoose = mongoose_conn;

  this.initModel ();
  this.model = this.getModel ('user');
};

User.prototype.initModel = function () {
  var mods = new Models (this.mongoose);
  return this;
};

User.prototype.setHashPassword = function (v) {
  if (!v && v == "") {
    return v;
  }

  var hash = crypto.createHash ('sha1');
  var saltHex = new Buffer (this.getSalt (), 'binary').toString ('hex');

  hash.update (v);
  hash.update (this.getSalt ());

  var ssha = new Buffer (hash.digest ('hex') + saltHex, 'hex').toString ('base64');

  return ssha;
};

User.prototype.setSalt = function () {
  this.salt = uuid.v4 ();

  return this.salt;
};

User.prototype.getSalt = function () {
  if (!this.salt)
    this.setSalt ();

  return this.salt;
};

User.prototype.getModel = function (modelname) {
  var model = this.mongoose.model (modelname);

  if (model)
    return model;
  else
    return undefined;
};

User.prototype.query = function () {
  return this.model.find ({});
};

User.prototype.numRows = function (query, callback) {
  query.exec (function (err, docs) {
    callback (err, docs.length);
  });
};

User.prototype.getById = function (id, callback) {
  return this.model.findById (id, callback);
};

User.prototype.getByName = function (login, callback) {
  var o = this;
  this.model.findOne ({ username: login }, function (err, user) {
    o.user = user;
    callback (err, user);
  }); 
};

User.prototype.addNew = function (user, callback) {
  user.salt = this.getSalt ();
  user.password = this.setHashPassword (user.password);

  this.proc_model = new this.model (user);

  if (!this.proc_model) {
    callback (new Error ('Could not create model'));
    return;
  } 

  this.proc_model.save (callback);
};

User.prototype.update = function (id, update, callback) {
  var conditions = { _id: id };
  var options = { multi: true };
  var forUpdate = JSON.parse (JSON.stringify (update));

  if (forUpdate._id)
    delete forUpdate._id;

  if (forUpdate.listno)
    delete forUpdate.listno;

  if (forUpdate.password == "") {
    delete forUpdate.password;
  } else if (forUpdate.password != undefined) {
    forUpdate.salt = this.getSalt (); 
    var p = forUpdate.password;
    forUpdate.password = this.setHashPassword (p);
  }

  if (forUpdate.password_confirm != undefined)
    delete forUpdate.password_confirm;

  console.log ('For update:', forUpdate);

  this.model.update (conditions, forUpdate, options, callback);
};

User.prototype.remove = function (id, callback) {
  var o = this;

  this.getById (id, function (err, doc) {
    if (err) {
      callback (err);
      return;
    }

    var username = doc.username;
    var mg = new Management (o.config);
    var query = mg.groupQuery ();

    query.where ('members.username', username);
    query.exec (function (err, docs) {
      docs.forEach (function (doc) {
        for (var i = 0; i < doc.members.length; i++) {
          if (doc.members[i].username == username) {
            doc.members[i].remove ();
            doc.save ();
          }
        }
      });
    });

    doc.timestamp.remove = new Date;
    var archive = o.getModel ('archiveduser');
    var archivedoc = new archive (doc);

    archivedoc.save (function (err) {
      if (err) {
        callback (err);
        return;
      }

      doc.remove ();
      callback (null, username);
    });
  });
};

User.prototype.passwordMatch = function (password) {
  if (!this.user)
    return false;

  var hash = crypto.createHash ('sha1');
  var saltHex = new Buffer (this.user.salt, 'binary').toString ('hex');
  hash.update (password);
  hash.update (this.user.salt);
  var ssha = new Buffer (hash.digest ('hex') + saltHex, 'hex').toString ('base64');

  return this.user.password == ssha; 
};

module.exports = User;
