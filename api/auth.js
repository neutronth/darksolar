var User = require ('./user');
var config = require ('../conf/app/settings');
var crypto = require ('crypto');

var auth = function () {
  this.everyauth = require ('everyauth');
};

var a = new auth ();

a.everyauth.password
  .getLoginPath ('/login')
  .postLoginPath ('/login')
  .loginView ('login')
  .authenticate (function (login, password) {
    var u = new User (config);
    var promise = this.Promise ();
    var errors = [];

    u.getByName (login, function (err, user) {
      console.log (user);
      if (err || !user || user.length <= 0 || user.management !== true) {
        errors.push ('app:login.User not found');
        return promise.fulfill (errors);
      }

      if (!user.userstatus) {
        errors.push ('app:login.User is disabled');
        return promise.fulfill (errors);
      }

      if (u.passwordMatch (password)) {
        promise.fulfill (user);
      } else {
        errors.push ('app:login.Username or Password is invalid');
        promise.fulfill (errors);
      }
    });

    return promise;
  })
  .loginSuccessRedirect ('/')
  .getRegisterPath ('/register')
  .postRegisterPath ('/register')
  .registerView ('register')
  .registerLayout ('register_layout')
  .validateRegistration (function (newUserAttributes) {

  })
  .registerUser (function (newUserAttributes) {

  })
  .registerSuccessRedirect ('/')
  .logoutPath ('/logout')
  .handleLogout (function (req, res) {
    req.logout();
    req.session.destroy ();
    this.redirect(res, this.logoutRedirectPath());
  });

module.exports = exports = a;
