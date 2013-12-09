var mongoose = require ('mongoose');
var mongoose_conn = undefined;
var Q = require ('q');
var Models = require ('./models');

var Management = function (config) {
  this.config = config;

  if (!mongoose_conn)
    mongoose_conn = mongoose.createConnection (config.DSDb);

  this.mongoose = mongoose_conn;

  this.initModel ();
  this.modelGroup = this.getModel ('group');
};

Management.prototype.initModel = function () {
  var mods = new Models (this.mongoose); 
  return mods;
};

Management.prototype.getModel = function (modelname) {
  var model = this.mongoose.model (modelname);

  if (model)
    return model;
  else
    return undefined;
};

Management.prototype.groupQuery = function () {
  return this.modelGroup.find ({});
};

Management.prototype.numRows = function (query, callback) {
  query.exec (function (err, docs) {
    callback (null, docs.length);
  });
};

Management.prototype.groupGetById = function (id, callback) {
  return this.modelGroup.findById (id, callback);
};

Management.prototype.groupGetByName = function (name, callback) {
  var o = this;
  this.modelGroup.findOne ({ groupname: name }, function (err, group) {
    o.group = group;
    callback (err, group);
  }); 
};

Management.prototype.groupAddNew = function (group, callback) {
  this.proc_model = new this.modelGroup (group);

  if (!this.proc_model) {
    callback (new Error ('Could not create model'));
    return;
  } 

  this.proc_model.save (callback);
};

Management.prototype.fieldSort = function (data) {
  var newdata = {};
  var fields = [];

  for (var d in data) {
    fields.push (d);
  }

  fields.sort ();

  for (var i in fields) {
    newdata[fields[i]] = data[fields[i]];
  }

  return newdata;
};

Management.prototype.groupUpdate = function (id, update, callback) {
  var conditions = { _id: id };
  var options = { multi: true };
  var forUpdate = JSON.parse (JSON.stringify (update));

  if (forUpdate._id)
    delete forUpdate._id;

  if (forUpdate.listno)
    delete forUpdate.listno;

  console.log ('For update:', forUpdate);

  this.modelGroup.update (conditions, forUpdate, options, callback);
};

Management.prototype.groupRemove = function (id, callback) {
  var Package = require ('./package');
  var pkg = new Package (this.config, 'template');
  var query = pkg.query ();
  var o = this;

  query.where ('management_group', id);

  query.exec (function (err, pkgs) {
    if (err) {
      callback (err);
      return;
    }

    if (pkgs && pkgs.length > 0) {
      callback (undefined, pkgs);
      return;
    }

    o.groupGetById (id, function (err, doc) {
      if (err) {
        callback (err);
        return;
      }
  
      doc.remove ();
      callback ();
    });
  });
};

module.exports = Management;
