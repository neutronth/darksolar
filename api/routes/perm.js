var User = require ('../user');
var Management = require ('../management');
var Q = require ('q');

var PermRoutes = function () {

};

PermRoutes.prototype.initRoutes = function (app) {
  app.get ('/api/perm', app.Perm.check, this.get);
};

PermRoutes.prototype.get = function (req, res) {
  function getUser (id) {
    var d = Q.defer ();
    var usr = new User (req.app.config);

    usr.getById (id, function (err, user) {
      if (err) {
        d.reject (err);
        return;
      }

      if (!user.username) {
        d.reject (new Error ('No user'));
        return;
      }

      var data = {};
      data['username'] = user.username;
      data['fullname'] = user.firstname + ' ' + user.surname;

      if (user.roles) {
        data['roles'] = [];
        for (var i = 0; i < user.roles.length; i++) {
          data['roles'].push (user.roles[i].name);
        }
      }

      d.resolve (data);
    });

    return d.promise;
  }

  function getMg (data) {
    var d = Q.defer ();
    var mg = new Management (req.app.config);
    var query = mg.groupQuery ();

    query.where ('members.username', data.username);
    query.exec (function (err, mgs) {
      data['mgs'] = [];

      for (var i = 0; i < mgs.length; i++) {
        if (mgs[i].groupstatus == false)
          continue;

        data['mgs'].push (mgs[i]._id); 
      }

      d.resolve (data);
    });

    return d.promise;
  }

  var curtime = new Date().getTime ();

  if (!req.session.perm || curtime > req.session.perm_rechecktime) {
    getUser (req.session.auth.userId)
      .then (getMg)
      .then (function (data) {
        console.log ('Fetch permission:', data.username);
        req.session.perm = data;
        req.session.perm_rechecktime = curtime + 60000;
        res.json (data);
      })
      .fail (function (error) {
        res.send (404);
      });
  } else {
    res.json (req.session.perm);
  }
};

module.exports = exports = new PermRoutes;
