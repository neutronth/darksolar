var Package = require ('../package');
var RadiusSyncPg = require ('../radiussync/postgresql');
var Q = require ('q');

var PackageRoutes = function () {
};

PackageRoutes.prototype.initRoutes = function (app) {
  /* Tpl */
  app.get ('/api/package/template/selectlist', this.getTplSelectList);
  app.get ('/api/package/template', this.getTplAll);
  app.get ('/api/package/template/:id', this.getTpl);
  app.post ('/api/package/template', this.addTpl,
                                     this.replyclient);
  app.put ('/api/package/template/:id', this.updateTpl,
                                        this.replyclient);
  app.delete ('/api/package/template/:id', this.deleteTpl,
                                           this.replyclient);

  /* Inherit */
  app.get ('/api/package/inheritance', this.getInheritAll);
  app.get ('/api/package/inheritance/:id', this.getInherit);
  app.post ('/api/package/inheritance', this.addInherit,
                                        this.radiusSync,
                                        this.replyclient);
  app.put ('/api/package/inheritance/:id', this.updateInherit,
                                           this.radiusSync,
                                           this.replyclient);
  app.delete ('/api/package/inheritance/:id', this.deleteInherit,
                                              this.radiusSync,
                                              this.replyclient);
};


/* Tpl */
PackageRoutes.prototype.getTplAll = function (req, res) {
  var pkg      = new Package (req.app.config, 'template');
  var query = pkg.query ();
  var callback = 'callback';

  query.asc ('name');
  query.skip (req.query.$skip ? req.query.$skip : 0);

  if (req.query.$top)
    query.limit (req.query.$top);

  if (req.query.callback)
    callback = req.query.callback;

  pkg.numRows (function (err, count) {
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
      res.json (doc);
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
          rspg.groupName (doc.name).attrsData (doc);

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
      var dependency = '';
      deps.forEach (function (doc) {
        dependency += ' "' + doc.name + '"';
      });
      res.send ('Error dependency' + dependency, 404);
      return;
    }

    next ();
  });

};

/* Inherit */
PackageRoutes.prototype.getInheritAll = function (req, res) {
  var pkg = new Package (req.app.config, 'inheritance');
  var query = pkg.query ()
  var callback = 'callback';

  query.asc ('name');
  query.skip (req.query.$skip ? req.query.$skip : 0);

  if (req.query.$top)
    query.limit (req.query.$top);

  if (req.query.callback)
    callback = req.query.callback;

  pkg.numRows (function (err, count) {
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
      console.log ('Failed');
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
      var dependency = '';
      deps.forEach (function (doc) {
        dependency += ' "' + doc.name + '"';
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
      rspg.attrsData (doc);
    else
      rspg.attrsData (undefined);

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
        })

      return d.promise;

    case 'DELETE':
      var d = Q.defer ();

      Q.fcall(sync)
        .then (function () {
          next ();
        })

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
