var User = require ('./user');
var config = require ('../settings');
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
/*
    var model = u.getModel ('user'); 
    var m = new model ();

    m.set ('username', 'neutron');
    var current_date = (new Date ()).valueOf().toString();
    var random = Math.random().toString();
    m.set ('salt', crypto.createHash ('sha1').update (current_date + random).digest ('hex'));

    var hash = crypto.createHash ('sha1');
    hash.update ('test');
    hash.update (m.get ('salt'));
    var digest = hash.digest ();

    var ssha = new Buffer (digest + m.get ('salt'), 'binary').toString ('base64');
    m.set ('password', ssha);
    m.set ('personid', '3320300535602');
    m.set ('firstname', 'Neutron');
    m.set ('surname', 'Soutmun');
    m.set ('email', 'neo.neutron@gmail.com');
    m.save (function (err) {
      console.log (err);
    });
*/

    u.get (login, function (err, user) {
      if (err || !user || user.length <= 0) {
        errors.push ('User not found');
        return promise.fulfill (errors);
      }

      var hash = crypto.createHash ('sha1');
      hash.update (password);
      hash.update (user.salt);
      var ssha = new Buffer (hash.digest () + user.salt, 'binary').toString ('base64');

      if (user.password === ssha) {
        promise.fulfill (user);
      } else {
        errors.push ('Username or Password is invalid');
        promise.fulfill (errors);
      }
    });

    return promise;
  })
  .loginSuccessRedirect ('/')
  .getRegisterPath ('/register')
  .postRegisterPath ('/register')
  .registerView ('register')
  .validateRegistration (function (newUserAttributes) {

  })
  .registerUser (function (newUserAttributes) {

  })
  .registerSuccessRedirect ('/');

module.exports = a;
