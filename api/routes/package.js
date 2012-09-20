var Package = require ('../package');
var RadiusSyncPg = require ('../radiussync/postgresql');
var Q = require ('q');

var PackageRoutes = function () {
};

PackageRoutes.prototype.initRoutes = function (app) {
  /* Tpl */
  app.get ('/api/package/template/selectlist',
             app.Perm.check, this.tplPreCheck,
             this.tplAccessFilter, this.getTplSelectList);
  app.get ('/api/package/template',
             app.Perm.check, this.tplPreCheck,
             this.tplAccessFilter, this.getTplAll);
  app.get ('/api/package/template/:id',
             app.Perm.check, this.tplPreCheck,
             this.tplAccessFilter, this.getTpl);
  app.post ('/api/package/template',
              app.Perm.check, this.tplPreCheck,
              this.tplAccessFilter, this.addTpl, this.replyclient);
  app.put ('/api/package/template/:id',
             app.Perm.check, this.tplPreCheck,
             this.tplAccessFilter, this.updateTpl, this.replyclient);
  app.delete ('/api/package/template/:id',
                app.Perm.check, this.tplPreCheck,
                this.tplAccessFilter, this.deleteTpl, this.replyclient);

  /* Inherit */
  app.get ('/api/package/inheritance/selectlist',
             app.Perm.check, this.inhPreCheck,
             this.inhAccessFilter, this.getInheritSelectList);
  app.get ('/api/package/inheritance',
             app.Perm.check, this.inhPreCheck,
             this.inhAccessFilter, this.getInheritAll);
  app.get ('/api/package/inheritance/:id',
             app.Perm.check, this.inhPreCheck,
             this.inhAccessFilter, this.getInherit);
  app.post ('/api/package/inheritance',
              app.Perm.check, this.inhPreCheck,
              this.inhAccessFilter, this.addInherit, this.radiusSync,
              this.replyclient);
  app.put ('/api/package/inheritance/:id',
              app.Perm.check, this.inhPreCheck,
              this.inhAccessFilter, this.updateInherit, this.radiusSync,
              this.replyclient);
  app.delete ('/api/package/inheritance/:id',
              app.Perm.check, this.inhPreCheck,
              this.inhAccessFilter, this.deleteInherit, this.radiusSync,
              this.replyclient);
};

/* Tpl */
PackageRoutes.prototype.tplPreCheck = function (req, res, next) {
  req.precondition = null;

  if (req.app.Perm.isRole (req.session, 'Admin') || 
      req.route.path == "/api/package/template/selectlist") {
    next ();
    return;
  } 

  if (req.method == 'GET') {
    next ();
  } else {
    res.send (403);
  }
};

PackageRoutes.prototype.tplAccessFilter = function (req, res, next) {
  if (!req.precondition) {
    next ();
    return;
  }

  next ();
};

PackageRoutes.prototype.getTplAll = function (req, res) {
  var pkg      = new Package (req.app.config, 'template');
  var callback = 'callback';
  var query = pkg.query ();

  if (req.query.$filter != undefined && req.query.$filter != '{}') {
    var filter = JSON.parse (req.query.$filter);
    for (var f in filter) {
      var ff = {};
      var re = new RegExp (filter[f], 'i');
      ff[f] = { $regex: re };
      query.or (ff);
      console.log (ff);
    }
  }

  query.asc ('name');
  query.skip (req.query.$skip ? req.query.$skip : 0);

  if (req.query.$top)
    query.limit (req.query.$top);

  if (req.query.callback)
    callback = req.query.callback;

  pkg.numRows (query, function (err, count) {
    if (!err) {
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

PackageRoutes.prototype.getTplSelectList = function (req, res) {
  var pkg      = new Package (req.app.config, 'template');
  var callback = 'callback';

  var query = pkg.query ();

  if (req.query.callback)
    callback = req.query.callback;

  query.asc ('name');

  if (!req.app.Perm.isRole (req.session, 'Admin')) {
    // Filter by mgs
    var mgs = req.session.perm.mgs;
    if (mgs && mgs.length > 0) {
      for (var i = 0; i < mgs.length; i++) {
        query.where ('management_group', mgs[i]);
      }
    } else {
      res.send (403);
      return;
    }
  }

  query.exec (function (err, docs) {
    if (!err) {
      var valpair = [];
      docs.forEach (function (doc) {
        var list = {};
        list['key'] = doc._id;
        list['label'] = doc.name + ': ' + doc.description;

        valpair.push (list);
      });

      res.json (valpair);
    } else {
      res.json (404);
    }
  });

};

PackageRoutes.prototype.getTpl = function (req, res) {
  var pkg      = new Package (req.app.config, 'template');

  pkg.getById (req.params.id, function (err, doc) {
    if (!err)
      if (req.app.Perm.isRole (req.session, 'Admin')) {
        res.json (doc);
      } else {
        if (!req.app.Perm.isNoManagementGroup (req.session)) {
          var allowed = false;

          if (doc) {
            var mgs = req.session.perm.mgs;
            for (var i = 0; i < mgs.length; i++) {
              if (doc.management_group == mgs[i]) {
                res.json (doc);
                allowed = true;
                break;
              }
            }

            if (!allowed) {
              res.send (403);
            }
          } else {
            res.send (404);
          }
        } else {
          res.send (403);
        }
      }
    else
      res.send (404);
  });
};

PackageRoutes.prototype.addTpl = function (req, res, next) {
  var pkg      = new Package (req.app.config, 'template');

  if (req.body.pkgtype != undefined && req.body.pkgtype != 'template') {
    res.send (400);
    return;
  }

  pkg.addNew (req.body, function (err) {
    if (!err) {
      console.log ('Success:' + pkg.proc_model);
      req.model = pkg.proc_model;
      next ();
    } else {
      console.log ('Failed');
      var test = new String(err);

      if (test.search ('duplicate') >= 0)
        res.send ('Save failed: Duplicate error', 404);
      else
        res.send ('Save failed: ' + err, 404);
    }
  });
};

PackageRoutes.prototype.updateTpl = function (req, res, next) {
  var pkg      = new Package (req.app.config, 'template');

  if (req.body.pkgtype != undefined && req.body.pkgtype != 'template') {
    res.send (400); 
    return;
  }

  pkg.update (req.params.id, req.body, function (err, numAffected, inherit) {
    if (!err) {
      console.log ('Update Success:', numAffected);

      if (inherit) {

        function syncAll (docs) {
          var d = Q.defer ();

          for (var key in docs) {
            sync (docs[key]);
          }

          d.resolve ();
          return d.promise;
        }

        function sync (doc) {
          var d = Q.defer ();
          var rspg = new RadiusSyncPg (req.app.config);
          rspg.groupName (doc.name).setAttrsData (doc);

          rspg.groupSync (doc.name, function (err, synced) {
            d.resolve ();
          });

          return d.promise;
        }

        syncAll (inherit)
          .then (function () {
          
          });

      }
      next ();
    } else {
      console.log ('Update Failed: ' + err);
      res.send ('Update failed', 404);
    }
  });
};

PackageRoutes.prototype.deleteTpl = function (req, res, next) {
  var pkg      = new Package (req.app.config, 'template');

  pkg.remove (req.params.id, function (err, deps) {
    if (err)
      res.send ('Delete failed', 404);

    if (deps) {
      var dependency = ' with packages ';
      var count = 0;
      deps.forEach (function (doc) {
        if (++count < 5) {
          dependency += ' "' + doc.name + '"';
        } else if (count == 5) {
          dependency += ' ... ';
        }
      });
      res.send ('Error dependency' + dependency, 404);
      return;
    }

    next ();
  });

};

/* Inherit */
PackageRoutes.prototype.inhPreCheck = function (req, res, next) {
  if (!req.app.Perm.isRole (req.session, 'Admin') &&
      req.app.Perm.isNoManagementGroup (req.session)) {
    res.send (403);
    return;
  }

  req.precondition = null;

  if (req.app.Perm.isRole (req.session, 'Admin')) {
    next ();
    return;
  }


  switch (req.method) {
    case 'POST':
    case 'PUT':
      req.precondition = {};
      req.precondition['pkgtype'] = 'inheritance'; 
      req.precondition['inherited'] = req.session.perm.mgs;
      break;
    case 'DELETE':
      req.precondition = {};
      req.precondition['predelete'] = { pkgtype: 'inheritance',
                                        inherited: req.session.perm.mgs,
                                      };
      break;
  }

  next ();
};

PackageRoutes.prototype.inhAccessFilter = function (req, res, next) {
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
      case 'pkgtype':
        if (data.pkgtype == chkval) {
          d.resolve (true);
        } else {
          d.reject (new Error ('Invalid package type'));
        }
        break;
      case 'inherited':
        var pkg = new Package (req.app.config, 'template');

        pkg.getById (data.inherited, function (err, p) {
          if (err) {
            d.reject (err);
            return;
          }

          if (!p) {
            d.reject (new Error ('No package template'));
            return;
          }
          
          for (var i = 0; i < chkval.length; i++) {
            if (p.management_group == chkval[i]) {
              d.resolve (true);
              return;
            }
          }

          d.reject (new Error ('No permission'));
        });
        break;
      case 'predelete':
        var pkg = new Package (req.app.config, 'inheritance');

        pkg.getById (req.params.id, function (err, p) {
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

PackageRoutes.prototype.getInheritSelectList = function (req, res) {
  var pkg      = new Package (req.app.config, 'inheritance');
  var callback = 'callback';

  var query = pkg.query ();

  if (req.query.callback)
    callback = req.query.callback;

  query.asc ('name');

  dataCallback = function (err, docs) {
    if (!err) {
      var valpair = [];
      docs.forEach (function (doc) {
        var list = {};
        list['key'] = doc.name;
        list['label'] = doc.name + ': ' + doc.description;

        valpair.push (list);
      });

      res.json (valpair);
    } else {
      res.json (404);
    }
  };

  if (!req.app.Perm.isRole (req.session, 'Admin')) {
    // Filter by mgs
    var mgs = req.session.perm.mgs;
    if (mgs && mgs.length > 0) {
      pkg.getByMgs (mgs, dataCallback);
    } else {
      res.send (403);
      return;
    }
  } else {
    query.exec (dataCallback);
  }
};

PackageRoutes.prototype.getInheritAll = function (req, res) {
  var pkg = new Package (req.app.config, 'inheritance');
  var callback = 'callback';
  var query = pkg.query ()

  if (req.query.$filter != undefined && req.query.$filter != '{}') {
    var filter = JSON.parse (req.query.$filter);
    for (var f in filter) {
      var ff = {};
      var re = new RegExp (filter[f], 'i');
      ff[f] = { $regex: re };
      query.or (ff);
    }
  }

  query.asc ('name');
  query.skip (req.query.$skip ? req.query.$skip : 0);

  if (req.query.$top)
    query.limit (req.query.$top);

  if (req.query.callback)
    callback = req.query.callback;

  if (!req.app.Perm.isRole (req.session, 'Admin')) {
    function getTpl () {
      var d = Q.defer ();
      var mgs = req.session.perm.mgs;
      var tplPkg = new Package (req.app.config, 'template');
      tplPkg.getByMgs (mgs, function (err, p) {
        if (err) {
          d.reject (err);
          return;
        }
        if (!p || p.length == 0) {
          d.reject (new Error ('No package'));
          return;
        }

        d.resolve (p);
      });

      return d.promise;
    }

    getTpl ()
      .then (function (pkgs) {
        var ids = [];
        for (var i = 0; i < pkgs.length; i++) {
          ids.push (pkgs[i]._id);
        }
        if (ids.length > 0) {
          query.where ('inherited').in (ids);
        }
      })
      .fail (function (error) {
        console.log (error);
        res.send (403);
        return;
      });
  }

  pkg.dataWithNumRows (query, function (err, docs, count) {
    if (!err) {
      if (!err) {
        res.send(callback + '({ "results" : ' + JSON.stringify (docs) +
                 ', "__count" : ' + count + ' });',
                 {'Content-Type' : 'text/javascript'}, 200);
      } else {
        res.json (404);
      }
    } else {
      res.json (404);
    }
  });
};

PackageRoutes.prototype.getInherit = function (req, res) {
  var pkg      = new Package (req.app.config, 'inheritance');

  pkg.getById (req.params.id, function (err, doc) {
    if (!err)
      res.json (doc);
    else
      res.send (404);
  });
};

PackageRoutes.prototype.addInherit = function (req, res, next) {
  var pkg      = new Package (req.app.config, 'inheritance');

  if (req.body.pkgtype != undefined && req.body.pkgtype != 'inheritance') {
    res.send (400);
    return;
  }

  pkg.addNew (req.body, function (err) {
    if (!err) {
      console.log ('Success:' + pkg.proc_model);
      req.model = pkg.proc_model;
      req.params.id = pkg.proc_model._id;
      next ();
    } else {
      console.log ('Failed', err);
      var test = new String (err);

      if (test.search ('duplicate') >= 0)
        res.send ('Save failed: Duplicate error', 404);
      else
        res.send ('Save failed: ' + err, 404);
    }
  });
};

PackageRoutes.prototype.updateInherit = function (req, res, next) {
  var pkg = new Package (req.app.config, 'inheritance');

  if (req.body.pkgtype != undefined && req.body.pkgtype != 'inheritance') {
    res.send (400); 
    return;
  }

  pkg.update (req.params.id, req.body,
                      function (err, numAffected, prevdoc) {
    if (err || numAffected <= 0) {
      console.log ('Update Failed: ' + err);
      res.send ('Update failed', 404);
    }

    req.prevDoc = prevdoc;
    console.log ('Update Success: ' + numAffected);
    next ();
  });
};

PackageRoutes.prototype.deleteInherit = function (req, res, next) {
  var pkg = new Package (req.app.config, 'inheritance');

  pkg.remove (req.params.id, function (err, deps, docname) {
    if (err)
      res.send ('Delete failed', 404);

    if (deps) {
      var dependency = ' with users ';
      var count = 0;
      deps.forEach (function (doc) {
        if (++count < 5) {
          dependency += ' "' + doc.username + '"';
        } else if (count == 5) {
          dependency += ' ... ';
        }
      });
      res.send ('Error dependency' + dependency, 404);
      return;
    }

    req.params.docname = docname;
    next ();
  });
};

PackageRoutes.prototype.radiusSync = function (req, res, next) {
  console.log ('Start Sync');

  function getData () {
    var df = Q.defer ();
    var pkg = new Package (req.app.config, 'inheritance');

    pkg.model.findOne ({ _id: req.params.id }, function (err, doc) {
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
 
    var name = doc ? doc.name : req.params.docname;

    rspg.groupName (name);
    if (doc)
      rspg.setAttrsData (doc);
    else
      rspg.setAttrsData (undefined);

    rspg.groupSync (name, function (err, synced) {
      df.resolve ();
    });

    return df.promise;
  }


  switch (req.method) {
    case 'POST':
    case 'PUT':
      var d = Q.defer ();

      Q.fcall(getData)
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

      Q.fcall(sync)
        .then (function () {
          next ();
          d.resolve ();
        })
        .fail (function (error) {
          d.reject (error);
        });

      return d.promise;

    default:
      res.send (400);
  }
};

PackageRoutes.prototype.replyclient = function (req, res) {
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

exports = module.exports = new PackageRoutes;
