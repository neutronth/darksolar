var User = require ('../user');
var Package = require ('../package');
var RadiusSyncPg = require ('../radiussync/postgresql');
var AccessCode = require ('../accesscode');
var Q = require ('q');
var xmlrpc = require ('xmlrpc');

var UserRoutes = function () {

};

UserRoutes.prototype.initRoutes = function (app) {
  app.get  ('/api/user/management/selectlist',
              app.Perm.check, this.preCheck,
              this.accessFilter, this.getSelectList);

  app.get  ('/api/user/check/:username',
              this.delayRequest, this.getUserCheck);

  app.get ('/api/user/radius/online',
             app.Perm.check, this.getOnlineUsers);
  app.delete ('/api/user/radius/online/:id',
              app.Perm.check, this.kickOnlineUser, this.replyclient);

  app.get  ('/api/user',
              app.Perm.check, this.preCheck,
              this.accessFilter, this.getAll);

  app.get  ('/api/user/syncall',
              app.Perm.check, this.preCheck,
              this.accessFilter, this.radiusSyncAll);

  app.get  ('/api/user/:id',
              app.Perm.check, this.preCheck,
              this.accessFilter, this.get);

  app.post  ('/api/user/register',
                this.delayRequest, this.registerUser, this.add,
                this.registerUserUpdate, this.registerInc,
                this.radiusSync, this.replyclient);

  app.post  ('/api/user/changepassword',
                this.delayRequest, this.verifyPassword,
                this.update, this.radiusSync, this.replyclient);

  app.post ('/api/user',
              app.Perm.check, this.preCheck,
              this.accessFilter, this.add, this.radiusSync,
              app.Perm.emitUpdate, this.replyclient);
  app.put  ('/api/user/:id',
              app.Perm.check, this.preCheck,
              this.accessFilter, this.update, this.radiusSync,
              app.Perm.emitUpdate, this.replyclient);
  app.delete ('/api/user/:id',
                app.Perm.check, this.preCheck,
                this.accessFilter, this.delete, this.radiusSync,
                app.Perm.emitUpdate, this.replyclient);
};

UserRoutes.prototype.delayRequest = function (req, res, next) {
  if (req.app.Perm.isRole (req.session, 'Admin') ||
      !req.app.Perm.isNoManagementGroup (req.session)) {
    next ();
    return;
  }

  var now = new Date ().getTime ();

  if (req.session.attempts == undefined ||
        (now - req.session.lastAttempts) > 5000) {
    req.session.attempts = 0;
  } else {
    req.session.attempts++;
  }

  req.session.lastAttempts = now;

  setTimeout (next, req.session.attempts * 500);
};

UserRoutes.prototype.preCheck = function (req, res, next) {
  if (!req.app.Perm.isRole (req.session, 'Admin') &&
      req.app.Perm.isNoManagementGroup (req.session)) {
    res.status (403).end ();
    return;
  }

  req.precondition = null;

  if (req.app.Perm.isRole (req.session, 'Admin')) {
    next ();
    return;
  } else if (req.route.path == "/api/user/management/selectlist") {
    res.status (403).end ();
    return;
  }

  switch (req.method) {
    case 'POST':
    case 'PUT':
      req.precondition = {};
      req.precondition['package'] = req.session.perm.mgs;
      break;
    case 'DELETE':
      req.precondition = {};
      req.precondition['predelete'] = { package: req.session.perm.mgs };
      break;
  }

  next ();
};

UserRoutes.prototype.accessFilter = function (req, res, next) {
  if (!req.precondition) {
    next ();
    return;
  }

  function check (cond, chkval, data) {
    var d = Q.defer ();

    if (!chkval) {
      d.reject (new Error ('No value'));
      return d.promise;
    }

    switch (cond) {
      case 'package':
        var pkg = new Package (req.app.config, 'inheritance');

        pkg.getByMgs (chkval, function (err, p) {
          if (err) {
            d.reject (err);
            return;
          }

          if (!p) {
            d.reject (new Error ('No package template'));
            return;
          }

          for (var i = 0; i < p.length; i++) {
            if (p[i].name == data.package) {
              d.resolve (true);
              return;
            }
          }

          d.reject (new Error ('No permission'));
        });
        break;
      case 'predelete':
        var usr = new User (req.app.config);

        usr.getById (req.params.id, function (err, p) {
          if (err) {
            d.reject (err);
            return;
          }

          if (!p) {
            d.reject (new Error ('No package'));
            return;
          }

          checkAll (chkval, p)
            .then (function (pass) {
              d.resolve (true);
            })
            .fail (function (error) {
              d.reject (error);
            });
        });
        break;
      default:
        console.log ('No condition check for: ', cond, chkval);
        d.reject (false);
    }

    return d.promise;
  }

  function checkAll (precond, data) {
    var d = Q.defer ();

    var count = Object.keys (precond).length;

    for (var key in precond) {
      console.log ('Check:', key);
      check (key, precond[key], data)
        .then (function (pass) {
          if (--count <= 0)
            d.resolve (true);
        })
        .fail (function (fail) {
          d.reject (new Error ('Check failed'));
        })
    }

    return d.promise;
  }

  checkAll (req.precondition, req.body)
    .then (function (pass) {
      console.log ("Passed");
      next ();
    })
    .fail (function (fail) {
      console.log (fail);
      res.status (403).end ();
    });
};

UserRoutes.prototype.getUserCheck = function (req, res) {
  var usr = new User (req.app.config);

  usr.getByName (req.params.username, function (err, doc) {
    if (err) {
      res.status (404).end ();
      return;
    }

    if (!doc) {
      res.json ({});
      return;
    }

    res.json ({ username: doc.username });
  });
};

UserRoutes.prototype.getSelectList = function (req, res) {
  var usr = new User (req.app.config);
  var query = usr.query ();

  query.sort ('username', 1);
  query.where ('management', true);
  query.where ('userstatus', true);

  query.exec (function (err, docs) {
    if (!err) {
      var valpair = [];
      docs.forEach (function (doc) {
        var list = {};
        list['key'] = doc.username;
        list['label'] = doc.username + ': ' + doc.firstname + ' ' + doc.surname;

        valpair.push (list);
      });

      res.json (valpair);
    } else {
      res.json (404);
    }
  });
};

UserRoutes.prototype.getAll = function (req, res) {
  var usr   = new User (req.app.config);
  var callback = 'callback';
  var queryAll   = usr.query ();
  var queryLimit = usr.query ();

  function querySetup (query) {
    if (req.query.$filter != undefined && req.query.$filter != '{}') {
      var filter = JSON.parse (req.query.$filter);
      for (var f in filter) {
        var ff = {};
        var re = new RegExp (filter[f], 'i');
        ff[f] = { $regex: re };
        query.or (ff);
      }
    }

    query.sort ('management', -1);
    query.sort ('roles', -1);
    query.sort ('package', 1);
    query.sort ('firstname', 1);
    query.sort ('surname', 1);

    if (req.query.callback)
      callback = req.query.callback;

    query.select ({'password': 0, 'salt': 0});
  }

  querySetup (queryAll);
  querySetup (queryLimit);

  var dataCallback = function (err, pkgs, isAdmin) {
    if (err) {
      callback (err);
      return;
    }

    if (!isAdmin && (!pkgs || pkgs.length == 0)) {
      callback (new Error ('No package'));
      return;
    }

    var names = [];
    for (var i = 0; i < pkgs.length; i++) {
      names.push (pkgs[i].name);
    }
    if (names.length > 0) {
      queryAll.where ('package').in (names);
      queryLimit.where ('package').in (names);
    }


    usr.numRows (queryAll, function (err, count) {
      if (!err) {
         if (req.query.$top)
           queryLimit.limit (req.query.$top);
         else
           queryLimit.limit (10);

         if (req.query.$skip)
           queryLimit.skip (req.query.$skip ? req.query.$skip : 0);

        queryLimit.exec (function (err, docs) {
          if (!err) {
            var filtered_docs = [];
            if (!req.app.Perm.isRole (req.session, 'Admin')) {
              docs.forEach (function (doc) {
                if (doc.management) {
                  if (doc.username == req.session.perm.username)
                    filtered_docs.push(doc);
                } else {
                  filtered_docs.push(doc);
                }
              });
            } else {
              filtered_docs = docs;
            }

            res.status (200)
              .set ({'Content-Type' : 'text/javascript'})
              .send (callback + '({ "results" : ' +
                     JSON.stringify (filtered_docs) +
                     ', "__count" : ' + count + ' });');
          } else {
            res.status (404).end ();
          }
        });
      } else {
        res.status (404).end ();
      }
    });
  };

  if (req.app.Perm.isRole (req.session, 'Admin')) {
    dataCallback (null, [], true);
  } else {
    // Filter by mgs
    var mgs = req.session.perm.mgs;
    if (mgs && mgs.length > 0) {
      var pkg = new Package (req.app.config, 'inheritance');
      pkg.getByMgs (mgs, dataCallback);
    } else {
      res.status (403).end ();
      return;
    }
  }
};

UserRoutes.prototype.get = function (req, res) {
  var usr = new User (req.app.config);

  usr.getById (req.params.id, function (err, doc) {
    if (!err && doc) {
      var moddoc = JSON.parse (JSON.stringify (doc)); /* clone */
      delete moddoc.password;
      res.json (moddoc);
    } else {
      res.status (404).end ();
    }
  });
};

UserRoutes.prototype.registerUser = function (req, res, next) {
  var ac = new AccessCode (req.app.config);

  ac.verifyCode (req.body.accesscode, function (err, doc) {
    if (err) {
      res.status (404).send (err.message);
      return;
    }

    console.log (doc);
    req.body.package = doc.meta.package;
    req.body.userstatus = true;
    req.acmodel = doc;
    req.body.usertype = 'register';

    var filterList = ['roles', 'salt', 'expiration', 'management'];
    for (var i = 0; i < filterList.length; i++) {
      if (req.body[filterList[i]] != undefined)
        delete req.body[filterList[i]];
    }

    next ();
  });
};

UserRoutes.prototype.registerUserUpdate = function (req, res, next) {
  req.acmodel.set ('registered.to', req.model.get ('_id'));
  req.acmodel.set ('registered.timestamp', new Date ());

  req.acmodel.save (function (err) {
    if (err) {
      req.model.remove ();
      res.status (404).send ('Could not register');
      return;
    }

    next ();
  });
};

UserRoutes.prototype.registerInc = function (req, res, next) {
  var ac = new AccessCode (req.app.config);
  var acmodel = ac.getModel ('accesscodemeta');
  var conditions = { _id: req.acmodel.get ('meta._id') };
  var update = { $inc: { registered: 1 } };
  var options = { multi: true };

  acmodel.update (conditions, update, options, function (err, numAffected) {
    if (err) {
      req.model.remove ();
      res.status (404).send ('Could not register');
      return;
    }

    next ();
  });
};

UserRoutes.prototype.add = function (req, res, next) {
  var usr = new User (req.app.config);
  var data = JSON.parse (JSON.stringify (req.body));

  data.timestamp = {}
  data.timestamp.create = new Date;

  if (data.usertype == undefined) {
    data.usertype = 'manual';
  }

  usr.addNew (data, function (err) {
    if (err) {
      console.log ('Failed', err);
      console.log ('Failed', err.stack);
      res.status (404).send ('Save failed: ' + err);
      return;
    }

    console.log ('Success:' + usr.proc_model);
    req.model = usr.proc_model;
    req.params.id = usr.proc_model._id;
    next ();
  });
};

UserRoutes.prototype.update = function (req, res, next) {
  var usr = new User (req.app.config);
  req.body.timestamp = {};
  req.body.timestamp.update = new Date;

  usr.update (req.params.id, req.body, function (err, numAffected) {
    if (err || numAffected <= 0) {
      console.log ('Update Failed:', err);
      res.status (404).send ('Update failed');
      return;
    }

    console.log ('Update Success:', numAffected);
    next ();
  });
};

UserRoutes.prototype.delete = function (req, res, next) {
  var usr = new User (req.app.config);

  usr.remove (req.params.id, function (err, username) {
    if (err) {
      res.status (404).send ('Delete failed');
      return;
    }

    req.params.username = username;
    next ();
  });
};

UserRoutes.prototype.radiusSyncAll = function (req, res) {
  var rspg = new RadiusSyncPg (req.app.config);
  var process = 0;
  var count = 0;
  var fetch_end = false;
  rspg.setClientPersistent ();

  function sync (doc) {
    var df = Q.defer ();

    if (doc) {
      rspg.userSync (doc.username, doc, function (err, synced) {
        process++;
        if (fetch_end && process >= count) {
          rspg.closeClient ();
          console.log ("Finish User Sync (all) - %d records", process);
        }

        df.resolve (err, synced);
      });
    } else {
      df.reject ("No data to sync");
    }

    return df.promise;
  }

  var usr = new User (req.app.config);
  var stream = usr.getAll ();

  stream.on ('data', function (doc) {
    count++;
    sync (doc);
  }).on ('error', function (err) {
    console.log (err);
    fetch_end = true;
  }).on ('close', function () {
    fetch_end = true;
  });

  res.status (200).end ();
};

UserRoutes.prototype.radiusSync = function (req, res, next) {
  console.log ('Start Sync');

  function getData () {
    var df = Q.defer ();
    var usr = new User (req.app.config);

    usr.getById (req.params.id, function (err, doc) {
      if (err) {
        df.reject (err);
        return;
      }

      df.resolve (doc);
    });

    return df.promise;
  }

  function sync (doc) {
    var df = Q.defer ();
    var rspg = new RadiusSyncPg (req.app.config);

    var username = doc ? doc.username : req.params.username;
    var attrs = undefined;

    if (doc)
      attrs = doc;

    rspg.userSync (username, attrs, function (err, synced) {
      df.resolve (err, synced);
    });

    return df.promise;
  }


  switch (req.method) {
    case 'POST':
    case 'PUT':
      var d = Q.defer ();

      getData ()
        .then (sync)
        .then (function () {
          next ();
          d.resolve ();
        })
        .fail (function (error) {
          d.reject (error);
        });

      return d.promise;

    case 'DELETE':
      var d = Q.defer ();
      Q.fcall (sync)
        .then (function () {
          next ();
          d.resolve ();
        })
        .fail (function (error) {
          d.reject (error);
        });

      return d.promise;
  }
};

UserRoutes.prototype.getOnlineUsers = function (req, res) {
  var rspg = new RadiusSyncPg (req.app.config);
  var callback = 'callback';
  var queryopts = {
    offset: 0,
    limit: 100,
  }

  if (req.query.callback)
    callback = req.query.callback;

  if (req.query.$top)
    queryopts.limit = req.query.$top;

  if (req.query.$skip)
    queryopts.offset = req.query.$skip;

  function mapFullname (docs) {
    var usr = new User (req.app.config);
    var tasks = [];

    function getIdx (radacctid) {
      for (var i = 0; i < docs.length; i++) {
        if (docs[i].radacctid == radacctid)
          return i;
      }

      return null;
    }

    function getUser (username, radacctid) {
      var d = Q.defer ();

      usr.getByName (username, function (err, user) {
        if (!err) {
          var idx = getIdx (radacctid);

          if (idx != null && user != null) {
            docs[idx].firstname = user.firstname;
            docs[idx].surname   = user.surname;
          }
          d.resolve (docs[idx]);
        } else {
          d.resolve (docs[idx]);
        }
      });

      return d.promise;
    }

    for (var i = 0; i < docs.length; i++) {
      docs[i].firstname = '';
      docs[i].surname = '';
      tasks.push (getUser (docs[i].username, docs[i].radacctid));
    }

    return Q.allResolved (tasks);
  }

  function dataCallback (filter) {
    rspg.countOnlineUser (filter, function (err, count) {
      if (err) {
        res.status (404).end ();
        return;
      }

      rspg.getOnlineUser (filter, queryopts, function (err, docs) {
        if (err) {
          res.status (404).end ();
          return;
        }

        mapFullname (docs)
          .then (function (success) {
            res.status (200)
              .set ({'Content-Type' : 'text/javascript'})
              .send (callback + '({ "results" : ' + JSON.stringify (docs) +
                     ', "__count" : ' + count + ' });');
          })
          .fail (function (error) {
            res.status (404).end ();
          });
      });
    });
  }

  if (req.app.Perm.isRole (req.session, 'Admin')) {
    dataCallback (null);
  } else {
    // Filter by mgs
    var mgs = req.session.perm.mgs;
    if (mgs && mgs.length > 0) {
      var filter = "''";
      var pkg = new Package (req.app.config, 'inheritance');
      pkg.getByMgs (mgs, function (err, docs) {
        if (err) {
          res.status (403).end ();
          return;
        }

        for (var i = 0; i < docs.length; i++) {
          filter += ",'" + docs[i].name + "'";
        }
        dataCallback (filter);
      });
    } else {
      res.status (403).end ();
      return;
    }
  }
};

UserRoutes.prototype.kickOnlineUser = function (req, res, next) {
  var rspg = new RadiusSyncPg (req.app.config);

  function dataCallback (filter) {
    rspg.getOnlineUserById (req.params.id, filter, function (err, doc) {
      if (err || !doc) {
        res.status (403).end ();
        return;
      }

      var options = {
        host: '127.0.0.1',
        port: '8123',
        path: '/',
      };

      var rhmap = req.app.config.RahuNASMap;
      if (rhmap != undefined && rhmap[doc.nasipaddress] != undefined) {
        var mapcfg = rhmap[doc.nasipaddress];
        if (mapcfg.host != undefined)
          options.host = mapcfg.host;

        if (mapcfg.port != undefined)
          options.port = mapcfg.port;

        console.log ('got RahuNAS map', mapcfg);
      }

      var rh_request = xmlrpc.createClient (options);
      var reqstring = doc.nasportid + '|' + doc.framedipaddress  + '|' +
                      doc.callingstationid + '|' +
                      '6';

      rh_request.methodCall ('stopsession', [reqstring], function (err, value) {
        console.log (value);
        if (!err) {
          rspg.updateAcct (req.params.id, 'Admin-Reset', function (err, n) {
            next ();
          });
        }
      });
    });
  }

  if (req.app.Perm.isRole (req.session, 'Admin')) {
    dataCallback (null);
  } else {
    // Filter by mgs
    var mgs = req.session.perm.mgs;
    if (mgs && mgs.length > 0) {
      var filter = "''";
      var pkg = new Package (req.app.config, 'inheritance');
      pkg.getByMgs (mgs, function (err, docs) {
        if (err) {
          res.status (403).end ();
          return;
        }

        for (var i = 0; i < docs.length; i++) {
          filter += ",'" + docs[i].name + "'";
        }
        dataCallback (filter);
      });
    } else {
      res.status (403).end ();
      return;
    }
  }
};

UserRoutes.prototype.replyclient = function (req, res) {
  switch (req.method) {
    case 'POST':
      res.json ({ _id: req.model._id });
      break;

    case 'PUT':
      res.status (200).send ('true');
      break;

    case 'DELETE':
      res.status (200).send ('true');
      break;

    default:
      res.status (400).end ();
  }
};

UserRoutes.prototype.verifyPassword = function (req, res, next) {
  var usr = new User (req.app.config);
  usr.getByName (req.body.username, function (err, user) {
    if (err || !user || !usr.passwordMatch (req.body.current_password)) {
      res.status (404).end ("Password is invalid");
      return;
    }

    req.model = {};
    req.params.id = user._id;
    req.model._id = user._id;
    var pwd = req.body.password;
    req.body = { password: pwd };

    next ();
  });
};

module.exports = new UserRoutes;
