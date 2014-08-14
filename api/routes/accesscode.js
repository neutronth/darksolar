var AccessCode = require ('../accesscode');
var User = require ('../user');
var Package = require ('../package');
var PDFCard = require ('../pdfcard');
var Q = require ('q');

var AccessCodeRoutes = function () {

};

AccessCodeRoutes.prototype.initRoutes = function (app) {
  app.get ('/api/accesscode/pdfcard/:id',
           app.Perm.check, this.preCheck, this.pdfAccessFilter,
           this.pdfCard);

  app.get ('/api/accesscode/meta',
           app.Perm.check, this.preCheck, this.accessFilter,
           this.metaGetAll);

  app.get ('/api/accesscode/code',
           app.Perm.check, this.preCheck, this.accessFilter,
           this.codeGetAll);


  app.post ('/api/accesscode/meta',
            app.Perm.check, this.preCheck, this.accessFilter,
            this.metaAdd, this.replyclient);

  app.put ('/api/accesscode/meta/:id',
            app.Perm.check, this.preCheck, this.accessFilter,
            this.metaUpdate, this.replyclient);

  app.delete ('/api/accesscode/meta/:id',
              app.Perm.check, this.preCheck, this.accessFilter,
              this.metaUpdate, this.replyclient);
};

AccessCodeRoutes.prototype.preCheck = function (req, res, next) {
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


  if (req.route.path == '/api/accesscode/pdfcard/:id') {
    req.precondition = {};
    req.precondition['package'] = req.session.perm.mgs;
    next ();
    return;
  }

  switch (req.method) {
    case 'POST':
    case 'PUT':
      if (req.body.amount < 1 || req.body.amount > 36) {
        res.send (403);
        return;
      }

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

AccessCodeRoutes.prototype.accessFilter = function (req, res, next) {
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

AccessCodeRoutes.prototype.pdfAccessFilter = function (req, res, next) {
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

  var ac = new AccessCode (req.app.config);

  ac.getById (req.params.id, function (err, doc) {
    if (err) {
      res.send (403);
      return;
    }

    checkAll (req.precondition, doc)
      .then (function (pass) {
        console.log ("Passed");
        next ();
      })
      .fail (function (fail) {
        console.log (fail);
        res.send (403);
      });
  });
};

AccessCodeRoutes.prototype.pdfCard = function (req, res) {
  var pdfcard = new PDFCard (req.app.config);
  var ac = new AccessCode (req.app.config);
  var codes = ac.getModel ('accesscode');


  var query = codes.find ({ meta: req.params.id });
  query.populate ('meta', ['id', 'expiration']);
  query.populate ('registered.to', ['username', 'firstname', 'surname']);
  query.sort ('serialno', 1);

  query.exec (function (err, acs) {
    if (err) {
      res.send (404);
      return;
    }

    res.header ('Content-Type', 'application/pdf; charset=utf-8');
    res.header('Cache-Control','no-cache, private, no-store, must-revalidate,\
      max-stale=0, post-check=0, pre-check=0');

    pdfcard.model (acs)
      .output (function (data) {
        res.end (data, 'binary');
      });
  });
};

AccessCodeRoutes.prototype.metaGetAll = function (req, res) {
  var ac   = new AccessCode (req.app.config);
  var callback = 'callback';
  var queryAll = ac.query ();
  var queryLimit = ac.query ();

  function querySetup (query) {
    if (req.query.$filter != undefined && req.query.$filter != '{}') {
      var filter = JSON.parse (req.query.$filter);
      for (var f in filter) {
        var ff = {};
        if (f == 'id' || f == 'amount') {
          if (parseInt (filter[f], 10) >= 0) {
            ff[f] = parseInt (filter[f], 10);
            query.or (ff);
          }
        } else {
          var ff = {};
          var re = new RegExp (filter[f], 'i');
          ff[f] = { $regex: re };
          query.or (ff);
        }
      }
    }

    query.sort ('id', -1);
  }

  querySetup (queryAll);
  querySetup (queryLimit);


  if (req.query.callback)
    callback = req.query.callback;

  var dataCallback = function (err, pkgs, isAdmin) {
    if (err) {
      callback (err);
      return;
    }

    if (!isAdmin && (!pkgs || pkgs.length == 0)) {
      callback (new Error ('No package'));
      return;
    }

    var pkgsname = [];
    for (var i = 0; i < pkgs.length; i++) {
      pkgsname.push (pkgs[i].name);
    }

    if (pkgsname.length > 0) {
      queryAll.where ('package').in (pkgsname);
      queryLimit.where ('package').in (pkgsname);
    }

    ac.numRows (queryAll, function (err, count) {
       if (!err) {
         if (req.query.$skip)
           queryLimit.skip (req.query.$skip);

         if (req.query.$top)
           queryLimit.limit (req.query.$top);

        queryLimit.exec (function (err, docs) {
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

AccessCodeRoutes.prototype.codeGetAll = function (req, res) {
  var ac   = new AccessCode (req.app.config);
  var callback = 'callback';
  var queryAll = ac.codeQuery ();
  var queryLimit = ac.codeQuery ();
  var extraMetaCondition = [];
  var extraUserCondition = [];

  function querySetup (query) {
    if (req.query.$filter != undefined && req.query.$filter != '{}') {
      var ft = JSON.parse (req.query.$filter);
      for (var i = 0; i < ft.length; i++) {
        var filter = ft[i];
        for (var f in filter) {
          console.log (f, filter[f]);
          var ff = {};
          var ffext = {};
          if (f == 'serialno') {
            if (parseInt (filter[f], 10) >= 0) {
              ff[f] = parseInt (filter[f], 10);
              query.or (ff);
            }
          } else if (f == 'timestamp') {
            var t = new Date (filter[f]);
            if (t.getDate () >= 0) {
              var tupper = {};
              if (t.getMinutes () != 0) {
               tupper = new Date (t.getTime () + (10 * 60 * 1000));
              } else {
               tupper = new Date (t.getTime () + (24 * 60 * 60 * 1000));
              }

              query.where ('registered.timestamp').$gt (t);
              query.where ('registered.timestamp').$lt (tupper);
            }
          } else if (f == 'accesscode') {
            var s = filter[f].split ('-');
            if (parseInt (s[0], 10) >= 0) {
              ffext['id'] = parseInt (s[0], 10);
              extraMetaCondition.push (ffext);
            }

            if (parseInt (s[1], 10) >= 0) {
              ff['serialno'] = parseInt (s[1], 10);
              query.or (ff);
            }
          } else if (f == 'username' || f == 'firstname' || f == 'surname') {
            var ffext = {};
            var re = new RegExp (filter[f], 'i');
            ffext[f] = { $regex: re };
            extraUserCondition.push (ffext);
          } else {
            var ff = {};
            var re = new RegExp (filter[f], 'i');
            ff[f] = { $regex: re };

            query.or (ff);
          }
        }
      }
    }

    query.sort ('registered.timestamp', -1);
    query.sort ('serialno', 1);
  }

  querySetup (queryAll);
  querySetup (queryLimit);


  if (req.query.callback)
    callback = req.query.callback;

  var dataCallback = function (err, pkgs, isAdmin) {
    var pkgsCondition = [];
    var metaCondition = {};
    var userCondition = {};
    var registeredCondtion = {};

    if (err) {
      callback (err);
      return;
    }

    if (!isAdmin && (!pkgs || pkgs.length == 0)) {
      callback (new Error ('No package'));
      return;
    }

    for (var i = 0; i < pkgs.length; i++) {
      pkgsCondition.push ({ package: pkgs[i].name });
    }

    var c = pkgsCondition.concat (extraMetaCondition);
    if (c.length > 0)
      metaCondition = { $or: c };

    if (extraUserCondition.length > 0)
      userCondition = { $or: extraUserCondition };

    function getUser (userCondition) {
      var d = Q.defer ();
      var user = new User (req.app.config);
      var query = user.model;

      query.find (userCondition, ['_id'], function (err, docs) {
        if (err) {
          d.resolve ({});
          return;
        }

        d.resolve (docs);
      });

      return d.promise;
    }

    function querySubSetup (query) {
      query.exists ('registered.to');
      query.populate ('meta', ['id', 'package'], metaCondition);
      query.populate ('registered.to', ['_id', 'username', 'firstname', 'surname', 'personid']);
    }

    querySubSetup (queryAll);
    querySubSetup (queryLimit);

    if (extraUserCondition.length > 0) {
      getUser (userCondition)
        .then (function (data) {
          var filterId = [];

          for (var i = 0; i < data.length; i++) {
            filterId.push (data[i]._id);
          }

          queryAll.where ('registered.to').in (filterId);
          queryLimit.where ('registered.to').in (filterId);

          sendData ();
        });
    } else {
      sendData ();
    }

    function sendData () {
      ac.numRows (queryAll, function (err, count) {
         if (!err) {
           if (req.query.$skip)
             queryLimit.skip (req.query.$skip);

           if (req.query.$top)
             queryLimit.limit (req.query.$top);

          queryLimit.exec (function (err, docs) {
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
    }
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
  }};

AccessCodeRoutes.prototype.metaAdd = function (req, res, next) {
  var ac = new AccessCode (req.app.config);

  ac.addNew (req.body, req.session, req.app.config.accesscodeKey, function (err, model) {
    if (err) {
      res.send ('Save failed: ' + err, 404);
      return;
    }

    req.model = model;
    req.params.id = model._id;
    next ();
  });
};

AccessCodeRoutes.prototype.metaUpdate = function (req, res, next) {
  var ac = new AccessCode (req.app.config);

  ac.update (req.params.id, req.body, function (err, numAffected) {
    if (err || numAffected <= 0) {
      console.log ('Update Failed:', err);
      res.send ('Update failed', 404);
      return;
    }

    console.log ('Update Success:', numAffected);
    next ();
  });
};

AccessCodeRoutes.prototype.replyclient = function (req, res) {
  switch (req.method) {
    case 'POST':
      res.json ({ _id: req.model._id,
                  id: req.model.id,
                  issued: req.model.issued,
                });
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

module.exports = new AccessCodeRoutes;
