var User = require ('./user');
var config = require ('../conf/app/settings');
var crypto = require ('crypto');

var auth = function () {
  var ea = this.everyauth = require ('everyauth');
  ea.use (require ('everyauth-password'));

  ea.everymodule.findUserById(function (req, id, callback) {
    callback(null, req.session.auth ? req.session.auth.user : "");
  });
};

var a = new auth ();

a.everyauth.password
  .authenticate (function (login, password) {
    var u = new User (config);
    var p = this.Promise ();
    var errors = [];

    u.getByName (login, function (err, user) {
      console.log (user);
      if (err || !user || user.length <= 0 || user.management !== true) {
        errors.push ('app:login.User not found');
        return p.fulfill (errors);
      }

      if (!user.userstatus) {
        errors.push ('app:login.User is disabled');
        return p.fulfill (errors);
      }

      if (u.passwordMatch (password)) {
        return p.fulfill (user);
      } else {
        errors.push ('app:login.Username or Password is invalid');
        return p.fulfill (errors);
      }
    });

    return p;
  });

a.loggedIn = function (req) {
  return this.everyauth.loggedIn (req);
}

module.exports = exports = a;
