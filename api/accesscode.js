var mongoose = require ('mongoose');
var mongoose_conn = undefined;
var Models = require ('./models');

var Q = require ('q');
var crypto = require ('crypto');

var AccessCode = function (config) {
  this.config = config;

  if (!mongoose_conn)
    mongoose_conn = mongoose.createConnection (config.DSDb);

  this.mongoose = mongoose_conn;

  this.initModel ();
};

AccessCode.prototype.initModel = function () {
  var mods = new Models (this.mongoose);
  return this;
};

AccessCode.prototype.addNew = function (meta, session, cipher_key, callback) {
  var metaModel = this.mongoose.model ('accesscodemeta');
  var codeModel = this.mongoose.model ('accesscode');

  function genCodes (_model) {
    var task = [];

    for (var i = 1; i <= _model.get ('amount'); i++) {
      task.push (genCode (_model, i));
    }

    return Q.all (task);
  }

  function genCode (_model, serialno) {
    var d = Q.defer ();
    var prefix = 'ABCDEFGHIJKLMNPRSTUVWXY';

    var rndm = 0;
    var prefixChar = '';
    var code = '';

    /*
    rndm = Math.floor (Math.random () * prefix.length);
    prefixChar = prefix.substring (rndm, rndm+1);
    */

    rndm = 1000000000 + Math.floor (Math.random () * 8999999999);

    code = prefixChar + '' + rndm;

    var cipher = crypto.createCipher ('aes-256-cbc', cipher_key); 
    var crypted = cipher.update (code, 'utf8', 'hex');
    crypted += cipher.final ('hex');

    var c = new codeModel ({ serialno: serialno });
    c.meta = _model._id;
    c.set ('code', crypted);

    c.save (function (err) {
      if (err) {
        d.reject (new Error ('Failed'));
      }

      _model.codes.push (c);
      _model.save ();
      d.resolve ();
    });

    return d.promise; 
  }

  var m = new metaModel (meta);
  m.set ('issued.timestamp', new Date ());
  m.set ('issued.by', session.perm.username + ': ' + session.perm.fullname);
  m.set ('registered', 0);

  this.getLastId (function (err, id) {
    if (err) {
      callback (err);
      return;
    }

    m.set ('id', id + 1);

    m.save (function (err) {
      if (err) {
        callback (err);
        return;
      }

      genCodes (m)
        .then (function (success) {
          callback (null, m);
        })
        .fail (function (error) {
          var id = m._id;
          m.remove ();
          codeModel.remove ({ meta: id }, function (err) {
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

AccessCode.prototype.update = function (id, update, callback) {
  var conditions = { _id: id };
  var options = { multi: true };
  var forUpdate = JSON.parse (JSON.stringify (update));
  var model = this.mongoose.model ('accesscodemeta');

  if (forUpdate._id != undefined)
    delete forUpdate._id;

  if (forUpdate.id != undefined)
    delete forUpdate.id;

  if (forUpdate.listno != undefined)
    delete forUpdate.listno;

  if (forUpdate.package != undefined)
    delete forUpdate.package;

  if (forUpdate.purpose != undefined)
    delete forUpdate.purpose;

  if (forUpdate.amount != undefined)
    delete forUpdate.amount;

  if (forUpdate.issued != undefined)
    delete forUpdate.issued;

  if (forUpdate.expired_icon != undefined)
    delete forUpdate.expired_icon;

  if (forUpdate.issued_fmt != undefined)
    delete forUpdate.issued_fmt;

  console.log ('For update:', forUpdate);

  model.update (conditions, forUpdate, options, callback);
};

AccessCode.prototype.numRows = function (query, callback) {
  query.count (function (err, count) {
    callback (err, count);
  });
};

AccessCode.prototype.query = function () {
  return this.mongoose.model ('accesscodemeta').find ({});
};

AccessCode.prototype.codeQuery = function () {
  return this.mongoose.model ('accesscode').find ({});
};

AccessCode.prototype.getLastId = function (callback) {
  var model = this.mongoose.model ('accesscodemeta');

  function lastId () {
    var d = Q.defer ();

    var query = model.find ({}, { id: 1 });
    query.sort ('id', -1);
    query.exec (function (err, docs) {
      if (err) {
        d.reject (err);
        return;
      }

      if (docs && docs.length > 0) {
        d.resolve (docs[0].id);
        return;
      }

      d.resolve (0);
    });

    return d.promise;
  }

  lastId ()
    .then (function (id) {
      callback (null, id);
    })
    .fail (function (error) {
      callback (error);
    });
};

AccessCode.prototype.getModel = function (modelname) {
  var model = this.mongoose.model (modelname);

  if (model)
    return model;
  else
    return undefined;
};


AccessCode.prototype.getById = function (id, callback) {
  var ac = this.mongoose.model ('accesscodemeta');
  var query = ac.findOne ({ _id: id});

  query.exec (callback);
};

AccessCode.prototype.verifyCode = function (code, callback) {
  var ac = this.mongoose.model ('accesscode');
  var cipher = crypto.createCipher ('aes-256-cbc', this.config.accesscodeKey);
  var crypted = cipher.update (code, 'utf8', 'hex');
  crypted += cipher.final ('hex');

  var query = ac.findOne ({ code: crypted});
  query.populate ('meta', ['id', 'package', 'expiration']);

  query.exec (function (err, doc) {
    if (err) {
      callback (err);
      return;
    }

    if (!doc) {
      callback (new Error ('Access Code is invalid'));
      return;
    }

    if (doc.meta.expiration.enabled) {
      var now = new Date;
      var exp = new Date (doc.meta.expiration.timestamp);

      if (now > exp) {
        callback (new Error ('Access Code expired'));
        return;
      }
    }

    if (doc.registered.to != undefined) {
        callback (new Error ('Access Code already registered'));
        return;
    }

    callback (null, doc);
  });
};

module.exports = AccessCode;
