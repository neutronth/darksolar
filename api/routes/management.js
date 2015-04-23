var Management = require ('../management');
var RadiusSyncPg = require ('../radiussync/postgresql');
var Q = require ('q');

var ManagementRoutes = function () {

};

ManagementRoutes.prototype.initRoutes = function (app) {
  app.get  ('/api/management/group/selectlist',
              app.Perm.check, this.groupAccessFilter, this.groupGetSelectList);
  app.get  ('/api/management/group',
              app.Perm.check, this.groupAccessFilter, this.groupGetAll);
  app.get  ('/api/management/group/:id',
              app.Perm.check, this.groupAccessFilter, this.groupGet);
  app.post ('/api/management/group',
              app.Perm.check, this.groupAccessFilter, this.groupAdd,
              app.Perm.emitUpdate, this.replyclient);
  app.put  ('/api/management/group/:id',
              app.Perm.check, this.groupAccessFilter, this.groupUpdate,
              app.Perm.emitUpdate, this.replyclient);
  app.delete ('/api/management/group/:id',
              app.Perm.check, this.groupAccessFilter, this.groupDelete,
              app.Perm.emitUpdate, this.replyclient);
};

ManagementRoutes.prototype.groupAccessFilter = function (req, res, next) {
  if (req.app.Perm.isRole (req.session, 'Admin')) {
    next ();
  } else {
    res.status (403).end ();
  }
};

ManagementRoutes.prototype.groupGetSelectList = function (req, res) {
  var mg = new Management (req.app.config);
  var query = mg.groupQuery ();

  query.sort ('groupname');

  query.exec (function (err, docs) {
    if (!err) {
      var valpair = [];
      docs.forEach (function (doc) {
        var list = {};
        list.key = doc._id;
        list.label = doc.groupname + ': ' + doc.description;

        valpair.push (list);
      });

      res.json (valpair);
    } else {
      res.status (404).json (null);
    }
  });
};

ManagementRoutes.prototype.groupGetAll = function (req, res) {
  var mg = new Management (req.app.config);
  var callback = 'callback';
  var query = mg.groupQuery ();

  if (req.query.$filter !== undefined && req.query.$filter != '{}') {
    var filter = JSON.parse (req.query.$filter);
    for (var f in filter) {
      var ff = {};
      var re = new RegExp (filter[f], 'i');
      ff[f] = { $regex: re };
      query.or (ff);
    }
  }

  query.sort ('groupname');

  if (req.query.callback)
    callback = req.query.callback;

  var queryAll = query;

  mg.numRows (query, function (err, count) {
    if (!err) {
      query.skip (req.query.$skip ? req.query.$skip : 0);

      if (req.query.$top)
        query.limit (req.query.$top);

      query.exec (function (err, docs) {
        if (!err) {
          res.status (200)
            .set ({'Content-Type' : 'text/javascript'})
            .send(callback + '({ "results" : ' + JSON.stringify (docs) +
                  ', "__count" : ' + count + ' });');
        } else {
          res.status (404).json (null);
        }
      });
    } else {
      res.status (404).json (null);
    }
  });
};

ManagementRoutes.prototype.groupGet = function (req, res) {
  var mg = new Management (req.app.config);

  mg.groupGetById (req.params.id, function (err, doc) {
    if (!err && doc) {
      res.json (doc);
    } else {
      res.status (404).end ();
    }
  });
};

ManagementRoutes.prototype.groupAdd = function (req, res, next) {
  var mg = new Management (req.app.config);

  console.log (req.body);

  mg.groupAddNew (req.body, function (err) {
    if (err) {
      console.log ('Failed', err);
      res.status (404).send ('Save failed: ' + err);
      return;
    }

    console.log ('Success:' + mg.proc_model);
    req.model = mg.proc_model;
    req.params.id = mg.proc_model._id;
    next ();
  });
};

ManagementRoutes.prototype.groupUpdate = function (req, res, next) {
  var mg = new Management (req.app.config);

  mg.groupUpdate (req.params.id, req.body, function (err, numAffected) {
    if (err || numAffected <= 0) {
      console.log ('Update Failed:', err);
      res.status (404).send ('Update failed');
      return;
    }

    console.log ('Update Success:', numAffected);
    next ();
  }); 
};

ManagementRoutes.prototype.groupDelete = function (req, res, next) {
  var mg = new Management (req.app.config);

  mg.groupRemove (req.params.id, function (err, deps) {
    if (err) {
      res.status (404).send ('Delete failed');
      return;
    }

    if (deps) {
      var dependency = ' with policies ';
      var count = 0;
      deps.forEach (function (doc) {
        if (++count < 5) {
          dependency += ' "' + doc.name + '"';
        } else if (count == 5) {
          dependency += ' ... ';
        }
      });
      res.status (404).send ('Error dependency' + dependency);
      return;
    }

    next ();
  });
};

ManagementRoutes.prototype.replyclient = function (req, res) {
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

module.exports = new ManagementRoutes ();
