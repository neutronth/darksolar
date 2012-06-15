var User = require ('../user');
var Package = require ('../package');
var RadiusSyncPg = require ('../radiussync/postgresql');
var AccessCode = require ('../accesscode');
var Q = require ('q');

var UserRoutes = function () {

};

UserRoutes.prototype.initRoutes = function (app) {
  app.get  ('/api/user/management/selectlist',
              app.Perm.check, this.preCheck,
              this.accessFilter, this.getSelectList);

  app.get  ('/api/user/check/:username',
              this.delayRequest, this.getUserCheck);


  app.get  ('/api/user', 
              app.Perm.check, this.preCheck,
              this.accessFilter, this.getAll);
  app.get  ('/api/user/:id', 
              app.Perm.check, this.preCheck,
              this.accessFilter, this.get);

  app.post  ('/api/user/register',
                this.delayRequest, this.registerUser, this.add,
                this.registerUserUpdate, this.registerInc, this.replyclient);

  app.post ('/api/user', 
              app.Perm.check, this.preCheck,
              this.accessFilter, this.add, this.radiusSync, this.replyclient);
  app.put  ('/api/user/:id', 
              app.Perm.check, this.preCheck,
              this.accessFilter, this.update, this.radiusSync, this.replyclient);
  app.delete ('/api/user/:id', 
                app.Perm.check, this.preCheck,
                this.accessFilter, this.delete, this.radiusSync, this.replyclient);

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
    res.send (403);
    return;
  }

  req.precondition = null;

  if (req.app.Perm.isRole (req.session, 'Admin')) {
    next ();
    return;
  } else if (req.route.path == "/api/user/management/selectlist") {
    res.send (403);
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
      res.send (403);
    });
};

UserRoutes.prototype.getUserCheck = function (req, res) {
  var usr = new User (req.app.config);

  usr.getByName (req.params.username, function (err, doc) {
    if (err) {
      res.send (404);
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

  query.asc ('username');
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
  var query = usr.query ();

  if (req.query.$filter != undefined && req.query.$filter != '{}') {
    var filter = JSON.parse (req.query.$filter);
    for (var f in filter) {
      var ff = {};
      var re = new RegExp (filter[f], 'i');
      ff[f] = { $regex: re };
      query.or (ff);
    }
  }

  query.desc ('roles');
  query.desc ('management');
  query.asc ('package');
  query.asc ('firstname');
  query.asc ('surname');


  if (req.query.callback)
    callback = req.query.callback;

  query.exclude ('password');
  query.exclude ('salt');

  var dataCallback = function (err, pkgs, isAdmin) {
    if (err) {
      callback (err);
      return;
    }

    if (!isAdmin && (!pkgs || pkgs.length == 0)) {
      callback (new Error ('No package'));
      return;
    }

    for (var i = 0; i < pkgs.length; i++) {
      query.where ('package', pkgs[i].name);
    }

    usr.numRows (query, function (err, count) {
      if (!err) {
         if (req.query.$top)
           query.limit (req.query.$top);

         if (req.query.$skip)
           query.skip (req.query.$skip ? req.query.$skip : 0);

        query.exec (function (err, docs) {
          if (!err) {
            res.send(callback + '({ "results" : ' + JSON.stringify (docs) +
                     ', "__count" : ' + count + ' });',
                     {'Content-Type' : 'text/javascript'}, 200);
          } else {
            res.json (404);
          }
        });
      } else {
        res.json (404);
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
      res.send (403);
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
      res.send (404);
    }
  });
};

UserRoutes.prototype.registerUser = function (req, res, next) {
  var ac = new AccessCode (req.app.config);
  
  ac.verifyCode (req.body.accesscode, function (err, doc) {
    if (err) {
      res.send (err.message, 404);
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
      res.send ('Could not register', 404);
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
      res.send ('Could not register', 404);
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
      res.send ('Save failed: ' + err, 404);
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
      res.send ('Update failed', 404);
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
      res.send ('Delete failed', 404);
      return;
    }

    req.params.username = username;
    next ();
  });
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

    rspg.userName (username);
    if (doc)
      rspg.attrsData (doc);
    else
      rspg.attrsData (undefined);

    rspg.userSync (username, function (err, synced) {
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

UserRoutes.prototype.replyclient = function (req, res) {
  switch (req.method) {
    case 'POST':
      res.json ({ _id: req.model._id });
      break;

    case 'PUT':
      res.send ('true', 200);
      break;

    case 'DELETE':
      res.send ('true', 200);
      break;

    default:
      res.send (400);
  }
};

module.exports = new UserRoutes;
