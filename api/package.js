var Q = require ('q');
var User = require ('./user');
var Models = require ('./models');

var Package = function (config, pkgtype) {
  this.config = config;
  this.filter_condition = [];

  this.pkgtype = pkgtype ? pkgtype : 'inheritance';
  this.mongoose = this.config.mongoose_conn;

  this.initModel ();

  this.model = this.getModel ('package');
};

Package.prototype.initModel = function () {
  var mods = new Models (this.mongoose);
  return mods;
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

Package.prototype.numRows = function (query, callback) {
  query.exec (function (err, docs) { 
    callback (null, docs.length);
  });
};

Package.prototype.dataWithNumRows = function (query, callback) {
  query.exec (function (err, docs) {
    callback (null, docs, docs.length);
  });
};

Package.prototype.query = function (cond) {
  var query = this.model.find ({ pkgtype: this.pkgtype });

  return query;
};

Package.prototype.getById = function (id, callback) {
  return this.model.findById (id, callback);
};

Package.prototype.getByMgs = function (mgs, callback) {
  if (!mgs) {
    callback (new Error ('No management group'));
    return;
  }

  var query = this.query ();

  var mgslist = [];
  for (var i = 0; i < mgs.length; i++) {
    mgslist.push (mgs[i]);
  }

  switch (this.pkgtype) {
    case 'template':
      if (mgslist.length > 0) {
        query.where ('management_group').in (mgslist);
      }

      query.exec (callback);
      break;
    case 'inheritance':
      var model = this.getModel ('package');
      var subQuery = model.find ({ pkgtype: 'template'}); 

      if (mgslist.length > 0) {
        subQuery.where ('management_group').in (mgslist);
      }

      subQuery.exec (function (err, p) {
        if (err) {
          callback (err);
          return;
        }

        if (!p || p.length === 0) {
          callback (new Error ('No Package'));
          return;
        }

        var ids = [];
        for (var i = 0; i < p.length; i++) {
          ids.push (p[i]._id);
        }

        if (ids.length > 0) {
          query.where ('inherited').in (ids);
        }

        query.exec (callback);
      });
      break;
  }
};

Package.prototype.addNew = function (data, callback) {
  this.proc_model = new this.model (data);

  if (!this.proc_model) {
    callback (new Error ('Could not create model'));
    return;
  }

  this.proc_model.save (callback);
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

  var o = this;

  switch (this.pkgtype) {
    case 'template':
      function tplUpdate () {
        d = Q.defer ();

        o.model.update (conditions, forUpdate, options,
                           function (err, numAffected) {
          if (err)
            d.reject (new Error (err));
          else
            d.resolve (numAffected);
        });

        return d.promise;
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
            d.resolve ({ numAffected: numAffected });
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

                if (tpl && tpl[1] !== undefined)
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
        if (data.docs === undefined)
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
      }

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
  var o = this;

  switch (this.pkgtype) {
    case 'template':
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
        var usr = new User (o.config);
        usr.model.find ({ package: doc.name }, function (err, users) {
          if (err) {
            callback (err);
            return;
          }

          if (users && users.length > 0) {
            callback (err, users);
            return;
          }

          var docname = doc.name;
          doc.remove ();
          callback (undefined, undefined, docname);
        });

        if (err) {
          callback (err);
          return;
        }
      });
      break;
  }
};

module.exports = Package;
