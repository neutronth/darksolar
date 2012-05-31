var Q = require ('q');
var mongoose = require ('mongoose');
var mongoose_conn = undefined;

var Package = function (config, pkgtype) {
  if (!mongoose_conn)
    mongoose_conn = mongoose.createConnection (config.DSDb);

  this.pkgtype = pkgtype ? pkgtype : 'inheritance';
  this.mongoose = mongoose_conn; 

  this.initModel ();

  this.model = this.getModel ('package');
};

Package.prototype.initModel = function () {
  var Schema = mongoose.Schema;
  var ObjectId = Schema.ObjectId;

  var schemas = {
    package: new Schema({
      name: { type: String, trim: true, index: { unique: true }},
      description: String,
      pkgtype: { type: String, index: true},
      inherited: String,
      simulteneous_use: String,
      session_timeout: String,
      max_all_session: String,
      max_daily_session: String,
      max_monthly_session: String,
      max_access_period: String,
    }, { safe: true, strict: true }),
  };

  var model = this.mongoose.model ('package', schemas.package, 'packages');
};

Package.prototype.setPkgType = function (pkgtype) {
  this.pkgtype = pkgtype;

  return this;
};

Package.prototype.getModel = function (modelname) {
  var model = this.mongoose.model (modelname);

  if (model)
    return model;
  else
    return undefined;
};

Package.prototype.numRows = function (callback) {
  var all = this.model.find ({ pkgtype: this.pkgtype });

  all.count (callback);
};

Package.prototype.query = function () {
  return this.model.find ({ pkgtype: this.pkgtype });
};

Package.prototype.getById = function (id, callback) {
  return this.model.findById (id, callback);
};

Package.prototype.addNew = function (data, callback) {
  this.proc_model = new this.model (data);

  if (!this.proc_model)
    return new Error ('Could not create model');

  this.proc_model.save (callback);

  return undefined;
};

Package.prototype.update = function (id, update, callback) {
  var conditions = { _id: id };
  var options = { multi: true };
  var forUpdate = update;

  this.proc_model = new this.model ();

  if (!this.proc_model)
    return new Error ('Could not create model');

  if (forUpdate._id)
    delete forUpdate._id;

  if (forUpdate.listno)
    delete forUpdate.listno;

  switch (this.pkgtype) {
    case 'template':
      var o = this;

      function tplUpdate () {
        d = Q.defer ();

        o.model.update (conditions, forUpdate, options,
                           function (err, numAffected) {
          if (err)
            d.reject (new Error (err));
          else
            d.resolve (numAffected);
        });

        return d.promise
      }

      function inhPrepare (numAffected) {
        var d = Q.defer ();
        var conditions = { inherited: id,
                           pkgtype: 'inheritance' };

        o.model.find (conditions, function (err, docs) {
          if (err) {
            d.reject (new Error (err));
            return;
          }

          if (docs.length <= 0) {
            d.resolve (numAffected);
            return;
          }

          numDocs = docs.length;
          
          var updateDocs = [];

          docs.forEach (function (doc) {
            for (var key in doc.schema.paths) {
              if (typeof doc[key] === 'string') {
                var tpl = typeof update[key] === 'string' ?
                            update[key].split ('*') : undefined;
                var inh = typeof doc[key] === 'string' ?
                            doc[key].split ('*') : undefined;

                if (inh)
                  doc[key] = inh[0];

                if (tpl && tpl[1] != undefined)
                  doc[key] = update[key];
              }
            }

            updateDocs.push (doc);
           
            if (--numDocs <= 0)
              d.resolve ({ numAffected: numAffected,
                           docs: updateDocs });
          });
        });

        return d.promise;
      }

      function inhUpdate (data) {
        if (data.docs == undefined)
          return data;

        var d = Q.defer ();

        var numDocs = data.docs.length;

        data.docs.forEach (function (doc) {
          var upd = JSON.parse (JSON.stringify (doc)); // Copy object

          var inh_id = upd._id;
          delete upd._id;
          var conditions = { _id: inh_id };

          var model = o.getModel ('package');
          model.update (conditions, upd, options,
                          function (err, numAffected) {
            if (--numDocs <= 0)
              d.resolve ({ numAffected: data.numAffected,
                           inherit: data.docs,
                         });
          });
        });
       
        return d.promise; 
      };

      tplUpdate ()
        .then (inhPrepare) 
        .then (inhUpdate) 
        .then (function (data) {
          callback (undefined, data.numAffected, data.inherit);
        })
        .fail (function (error) {
          console.log ('Error: ', error);
        });

      break;
    case 'inheritance':
      var o = this;
      this.getById (id, function (err, doc) {
        if (err) {
          callback (err);
        }

        var prevdoc = doc;

        o.model.update (conditions, forUpdate, options,
                        function (err, numAffected) {
          if (err) {
            callback (err);
            return;
          }

          callback (err, numAffected, prevdoc);
        });
      });
      break;
  }

  return undefined;
};

Package.prototype.remove = function (id, callback) {
  switch (this.pkgtype) {
    case 'template':
      var o = this;

      this.model.find ({ inherited: id }, function (err, docs) {
        if (err) {
          callback (err);
          return;
        }

        if (docs && docs.length > 0) {
          callback (err, docs);
          return;
        }

        o.getById (id, function (err, doc) {
          if (err) {
            callback (err);
            return;
          }

          doc.remove ();
          callback ();
        });
      });
      break;
    case 'inheritance':
      this.getById (id, function (err, doc) {
        if (err) {
          callback (err);
          return;
        }
        var docname = doc.name;
        doc.remove ();
        callback (undefined, undefined, docname);
      });
      break;
  }

  return undefined;
};

module.exports = Package;
