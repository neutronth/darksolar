/* jshint -W053 */

var Models = require ('./models');

var Q = require ('q');
var crypto = require ('crypto');
var Entities = require ('html-entities').AllHtmlEntities;
var User = require ('./user');
var RadiusSync = require ('./radiussync/radiussync');

var GenUsers = function (config) {
  this.config = config;

  this.mongoose = this.config.mongoose_conn;

  this.initModel ();
  this.model_meta = this.getModel ('genusersmeta');
  this.model_genusers = this.getModel ('genusers');
};

GenUsers.prototype.initModel = function () {
  var mods = new Models (this.mongoose);
  return this;
};

GenUsers.prototype.addNew = function (meta, session, cipher_key, callback) {
  var metaModel = this.mongoose.model ('genusersmeta');
  var genuserModel = this.mongoose.model ('genusers');

  function genPasswords (_model) {
    var task = [];

    for (var i = 1; i <= _model.get ('amount'); i++) {
      task.push (genPassword (_model, i));
    }

    return Q.all (task);
  }

  function userSerialnoPad (serialno, size) {
    var s = String (serialno);
    while (s.length < (size || 2)) {
      s = "0" + s;
    }
    return s;
  }

  function genPassword (_model, serialno) {
    var d = Q.defer ();

    var rndm = 0;
    var passwd = '';

    rndm = 100000 + Math.floor (Math.random () * 899999);
    passwd = "" + rndm;

    var cipher = crypto.createCipher ('aes-256-cbc', cipher_key);
    var crypted = cipher.update (passwd, 'utf8', 'hex');
    crypted += cipher.final ('hex');

    var length = new String (_model.amount).length;
    var username = _model.prefix + '.' + userSerialnoPad (serialno, length);

    var c = new genuserModel ({});
    c.meta = _model._id;
    c.set ('username', username);
    c.set ('password', crypted);

    c.save (function (err) {
      if (err) {
        d.reject (err);
      }

      _model.users.push (c);
      _model.save ();
      d.resolve ();
    });

    return d.promise;
  }

  entities = new Entities ();
  meta.info = entities.decode (meta.info);

  var m = new metaModel (meta);
  m.set ('issued.timestamp', new Date ());
  m.set ('issued.by', session.perm.username + ': ' + session.perm.fullname);

  this.getPrefixLastId (meta.prefix, function (err, prefix) {
    if (err) {
      callback (err);
      return;
    }

    m.set ('prefix', prefix);

    m.save (function (err) {
      if (err) {
        callback (err);
        return;
      }

      genPasswords (m)
        .then (function (success) {
          callback (null, m);
        })
        .fail (function (error) {
          var id = m._id;
          m.remove ();
          genuserModel.remove ({ meta: id }, function (err) {
             if (err) {
              callback (new Error ('Failed with not properly cleanup'));
              return;
             }

            callback (new Error ('Failed'));
          });
        });
    });
  });
};

GenUsers.prototype.numRows = function (query, callback) {
  query.count (function (err, count) {
    callback (err, count);
  });
};

GenUsers.prototype.query = function () {
  return this.mongoose.model ('genusersmeta').find ({});
};

GenUsers.prototype.codeQuery = function () {
  return this.mongoose.model ('genusers').find ({});
};

GenUsers.prototype.getPrefixLastId = function (prefix, callback) {
  var model = this.mongoose.model ('genusersmeta');

  function lastId () {
    var d = Q.defer ();
    var escapedPrefix = prefix.replace (".", "\\.");
    console.log (escapedPrefix);
    var query = model.find ({ prefix: new RegExp ('^' + escapedPrefix)},
                            { prefix: 1 });
    query.sort ('-prefix');
    query.exec (function (err, docs) {
      if (err) {
        d.reject (err);
        return;
      }

      if (docs && docs.length > 0) {
       var max = 0;
       for (var i = 0; i < docs.length; i++) {
         var stripped = docs[i].prefix.replace (prefix, "");
         var found = stripped.lastIndexOf ('.');
         if (found != -1) {
           var idstr = stripped.substring (found + 1);
           var id = parseInt (idstr);
           max = id > max ? id : max;
         }
       }
       d.resolve (prefix + '.' + (max + 1));
       return;
      }

      d.resolve (prefix);
    });

    return d.promise;
  }

  lastId ()
    .then (function (prefix) {
      callback (null, prefix);
    })
    .fail (function (error) {
      callback (error);
    });
};

GenUsers.prototype.getModel = function (modelname) {
  var model = this.mongoose.model (modelname);

  if (model)
    return model;
  else
    return undefined;
};


GenUsers.prototype.getById = function (id, callback) {
  var ac = this.mongoose.model ('genusersmeta');
  var query = ac.findOne ({ _id: id});

  query.exec (callback);
};

GenUsers.prototype.decryptPassword = function (crypted) {
  var decipher = crypto.createDecipher ('aes-256-cbc', this.config.accesscodeKey);
  var decrypt = decipher.update (crypted, 'hex', 'utf8');
  decrypt += decipher.final ('utf8');
  return decrypt;
};

GenUsers.prototype.deleteMeta = function (id, callback) {
  var o = this;
  var query = this.model_meta.find ({_id: id});

  function removeMeta (doc) {
    doc.remove ();
    doc.save (function (err) {
      function startSync (u, rs) {
        if (u.length === 0) {
          rs.closeClient ();
          callback (null);
          return;
        }

        var d = u.shift ();
        var ruser = new User (o.config);

        rs.userSync (d.username, null, function (err) {
          if (err) {
            startSync (u, rs);
            return;
          }

          ruser.remove (d._id, function (err) {
            startSync (u, rs);
          });
        });
      }

      if (!err) {
        var usr = new User (o.config);
        var query = usr.query ();
        query.where ('genid').equals (doc._id);
        query.exec (function (err, users) {
          if (err) {
            callback (err);
          } else if (users.length === 0) {
            callback (null);
          } else {
            var rs = new RadiusSync (o.config).instance ();
            rs.setClientPersistent ();

            startSync (users, rs);
          }
        });
      }
    });
  }

  query.exec (function (err, docs) {
    if (err) {
      callback (err);
    } else if (docs.length > 0) {
      doc = docs[0];

      o.model_genusers.remove ({meta: doc._id}, function (err) {
        if (err) {
          callback (err);
        } else {
          removeMeta (doc);
        }
      });
    } else {
      callback (new Error ("No Data"));
    }
  });
};

GenUsers.prototype.updateMeta = function (id, update, callback) {
  var conditions = { _id: id };
  var options = { multi: true };
  var forUpdate = { info: "" };
  var model = this.model_meta;

  entities = new Entities ();
  forUpdate.info = entities.decode (update.info);
  console.log ('For update:', forUpdate);

  model.update (conditions, forUpdate, options, callback);
};

module.exports = GenUsers;
