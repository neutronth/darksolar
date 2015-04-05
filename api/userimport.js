var mongoose = require ('mongoose');
var Q = require ('q');
var Models = require ('./models');
var fs = require ('fs');
var Grid = require ('gridfs-stream');
var User = require ('./user');
var RadiusSync = require ('./radiussync/radiussync');

Grid.mongo = mongoose.mongo;

var UserImport = function (config) {
  this.recordsTpl = {
    index: 0,
    username: "",
    password: "",
    firstname: "",
    surname: "",
    description: "",
    id: "",
    email: "",
    activated: "",
    profile: ""
  };

  this.totalFields = Object.keys (this.recordsTpl).length;

  this.config = config;

  this.mongoose = this.config.mongoose_conn;

  this.initModel ();
  this.model_meta = this.getModel ('userimport_meta');
}

UserImport.prototype.initModel = function () {
  var mods = new Models (this.mongoose);
  return this;
}

UserImport.prototype.getModel = function (modelname) {
  var model = this.mongoose.model (modelname);
  return model ? model : undefined;
}

UserImport.prototype.saveFile = function (path, session, callback) {
  var o = this;
  var fname = path.substr (path.lastIndexOf ("/") + 1);
  fname = fname.replace (/upload_/g, '');

  var gfs_conn = this.mongoose;

  var gfs = Grid (gfs_conn.db);

  var writestream = gfs.createWriteStream({
    filename: fname
  });
  
  var readstream = fs.createReadStream (path);
  
  readstream.on ('end', function () {

  });
  
  readstream.on ('error', function () {
    callback (new Error ());
  });

  writestream.on ('unpipe', function () {
    var opts = { get: "description" };

    o.readFile (fname, opts, null, function (err, desc) {
      if (err) {
        callback (err);
        return;
      }

      var meta = {
        importid: fname,
        timestamp: new Date (),
        description: desc,
        by: session.perm.username
      };

      var meta_model = new o.model_meta (meta);
      meta_model.save (function (err) {
        if (err)
          callback (err);
        else
          callback (null);
      });
    });
  });
 
  readstream.pipe (writestream);
}

UserImport.prototype.readFile = function (fname, opts, response, callback) {
  var o = this;
  var gfs_conn = this.mongoose;

  var gfs = Grid (gfs_conn.db);
  var opt = { filename : fname };

  gfs.exist (opt, function (err, found) {
    if (err) {
      callback (err);
      return;
    }

    if (!found) {
      callback (new Error ("File not found"));
      return;
    }

    var readstream = gfs.createReadStream({
      filename: fname
    });

    o.csvProcess (readstream, opts, response, function (err, desc) {
      callback (err, desc);
    });
  });
}

UserImport.prototype.removeFile = function (fname, callback) {
  var o = this;
  var gfs_conn = this.mongoose;

  var gfs = Grid (gfs_conn.db);

  gfs.remove ({ filename: fname }, function (err) {
    callback (err);
  });
}


UserImport.prototype.getMetas = function (callback) {
  query = this.model_meta.find ({});
  query.sort ('-timestamp');

  query.exec (callback);
};

UserImport.prototype.updateMeta = function (id, update, callback) {
  var conditions = { importid: id };
  var options = { multi: false };
  var forUpdate = { }

  if (update.status.processed != undefined)
    forUpdate["status.processed"] = update.status.processed;

  if (update.status.count != undefined)
    forUpdate["status.count"] = update.status.count;

  if (update.status.fail != undefined)
    forUpdate["status.fail"] = update.status.fail;

  if (update.status.imported != undefined)
    forUpdate["status.imported"] = update.status.imported;

  if (update.status.importing != undefined)
    forUpdate["status.importing"] = update.status.importing;

  console.log ('For update:', forUpdate);

  this.model_meta.update (conditions, forUpdate, options, callback);
};


UserImport.prototype.deleteMeta = function (id, callback) {
  var o = this;
  query = this.model_meta.find ({importid: id});
  query.exec (function (err, docs) {
    if (err) {
      callback (err);
    } else if (docs.length > 0) {
      docs.forEach (function (doc) {
        o.removeFile (doc.importid, function (err) {
          if (err) {
            callback (err);
            return;
          }

          doc.remove ();
          doc.save (function (err) {
            if (!err) {
              var usr = new User (o.config);
              var query = usr.query ();
              query.where ('importid').equals (id);
              query.exec (function (err, users) {
                if (err) {
                  callback (err);
                } else if (users.length == 0) { 
                  callback (null);
                } else {
                  var rs = new RadiusSync (o.config).instance ();
                  rs.setClientPersistent ();

                  function startSync (u) {
                    if (u.length == 0) {
                      rs.closeClient ();
                      callback (null);
                      return;
                    }

                    var d = u.shift ();
                    var ruser = new User (o.config);

                    rs.userSync (d.username, null, function (err) {
                      if (err) {
                        startSync (u);
                        return;
                      }

                      ruser.remove (d._id, function (err) {
                        startSync (u);
                      });
                    });
                  }

                  startSync (users);
                }
              });
            } else {
              callback (err);
            }
          });
        });
      });
    } else {
      callback (new Error ("No data"));
    }
  });
};

UserImport.prototype.csvProcess = function (stream, opts, response,
                                            callback) {
  var this_ = this;
  var fail = 0;
  var records = 0;
  var all = 0;
  var list = [];
  var description = "";
  var iteration = 0, header = [], buffer = "";
  var pattern = /(?:^|,)("(?:[^"]+)*"|[^,]*)/g;

  opts.importstart = opts.importstart == undefined ? false : opts.importstart;

  function formatVal (col, val) {
    switch (col) {
      case "username":
        return val.toLowerCase ();
        break;

      case "id":
        newval = val;
        s = val.search (":");
        if (s > 0) {
          type = val.substr (0, s);
          newval = val.substr (s + 1);

          if (type == 'P') {
            newval = "Passport No:" + newval;
          } else {
            newval = "Thai Personal ID:" + newval;
          } 
        } else {
          if (newval != "")
            newval = "Thai Personal ID:" + newval;
        }

        return newval;
        break;

      case "activated":
        var checkTrue = /(true|yes)/;
        var isTrue = checkTrue.test (val.toLowerCase ());
        return isTrue ? true : false;
        break;

      case "email":
        return val == "" ? "import-users@rahunas.org" : val;
        break;

      default:
        return val;
    }
  }

  function buildRecord (str) {
    var record = {};

    str.split (pattern).forEach (function (value, index) {
      var col = header[index].toLowerCase();

      if (header[index] != '')
        record[col] = formatVal (col, value.replace (/"/g, ''));

    });

    if (record["password"] == "") {
      record["password"] = record["id"].substr (record["id"].lastIndexOf (':') + 1);
      record["activated"] = false;
    }

    return record;
  }

  stream.addListener ('end', function (d) {
    if (fail < 0) {
      callback (new Error ('Invalid data'));
    } else if (opts.importstart) {
      callback (null, list);
    } else {
      if (opts.get == "fail" || opts.get == "all") {
        if (opts.get == "fail") {
          this_.importFailTest (list, response, opts.start)
            .then (function (result) {
              if (result.fail > 0)
                response.write (",");

              var meta = { count: all, fail: result.fail }

              response.write (JSON.stringify (meta));
              response.write ("]");
              callback (null);
            });
        } else {
          response.write ("]");
          callback (null);
        }
      }
    }
  });

  stream.addListener ('data', function (data) {
    buffer += data.toString ();
    var idx = buffer.lastIndexOf ('\n');
    var remain = idx == buffer.length - 1 ? "" : buffer.substr (idx + 1);
    var parts = buffer.substr (0, idx + 1).split ('\n');

    all += parts.length - 1;

    buffer = remain;

    try {
      parts.forEach (function (d, i) {
        if (i == parts.length-1)
          return;

        if (iteration == 0 && i == 0) {
          /* Description */
          all -= 1;
          d = d.replace (/"/g, '');
          desc = d.split (pattern);
  
          for (var idx = 0; idx < desc.length; idx++) {
            if (desc[idx] == "") {
              desc.slice (idx, 1);
            }
          }
  
          description = desc.join (" ").trim ();
          if (opts.get == "description") {
            stream.removeAllListeners ();
            delete stream;
            throw "GetDescription";
          }
        } else if (iteration == 1) {
          /* Header */
          all -= 1;
          d = d.replace (/"/g, '');
          header = d.split (pattern);

          if (!opts.importstart)
            response.write ("[");
        } else {
          var index = iteration - 1;

          if (opts.get == "fail" || opts.importstart) {
            rec = buildRecord (d);
            rec["index"] = index;

            records++;
            list.push (rec);
          } else {
            if (opts.start != undefined && index < opts.start) {
              iteration++;
              return;
            }

            rec = buildRecord (d);
            rec["index"] = index;

            if (records >= 100) {
              stream.removeAllListeners ();
              delete stream;
              throw "Limit exceeded"
            }

            if (records > 0)
              response.write (",");

            response.write (JSON.stringify (rec));
            records++;
          }
        }
  
        iteration++;
      });
    } catch (e) {
      if (e == "GetDescription") {
        callback (null, description);
      } else if (e == "Limit exceeded") {
        response.write ("]");
        callback (null);
      }
    }
  });
}

UserImport.prototype.importFailTest = function (records, response, start) {
  var df = Q.defer ();
  var usr = new User (this.config);
  var query = usr.query ();
  var usernamelist = [];
  var failcheck = 0;
  var validUsername = /^[a-z0-9\\._-]+$/;

  for (var i = 0; i < records.length; i++) {
    d = records[i];
    fields = Object.keys (d);

    if (fields.length < this.totalFields) {
      var fixrecord = this.recordsTpl;
      for (var i = 0; i < fields.length; i++) {
        fixrecord[fields[i]] = d[fields[i]];
      }

      records[i] = fixrecord;
      records[i].fail = "Invalid records";
      failcheck++;
    } else if (d.username.trim () == "" ||
               !validUsername.test (d.username.toLowerCase ())) {
      records[i].fail = "Invalid username";
      failcheck++;
    } else {
      usernamelist.push (d.username);
    }
  }

  function onlyFailFilter (e) {
    return e.fail != undefined;
  }

  query.in ('username', usernamelist);
  query.select ({ username: 1 });
  query.exec (function (err, docs) {
    var all_fail = docs.length;
    var fail_count = 0;

    if (all_fail > 0) {
      try {
        for (var i = 0; i < records.length; i++) {
          for (var j = 0; j < docs.length; j++) {
            if (records[i].username == docs[j].username) {
              records[i].fail = "Username exists";

              if (++fail_count > 99)
                throw "Limit exceeds";
            }
          }
        }
      } catch (e) {
      }
    }

    var fail_list = records.filter (onlyFailFilter);

    if (fail_list.length > 0) {
      var fstart = start == undefined ? 1 : start;

      for (var i = 0; i < fstart - 1; i++) {
        fail_list.shift ();
      }

      for (var i = 0; i < fail_list.length; i++) {
        if (i > 0)
          response.write (",");

        response.write (JSON.stringify (fail_list[i]));
      }
    }

    df.resolve ({fail: docs.length + failcheck});
  });

  return df.promise;
}

module.exports = UserImport;
