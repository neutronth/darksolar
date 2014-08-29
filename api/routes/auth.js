var AuthRoutes = function () {

};

AuthRoutes.prototype.initRoutes = function (app) {
  var ea = app.auth.everyauth;
  app.get  ('/login', ea.password.middleware ('addRequestLocals'),
            this.loginPage);
  app.get  ('/logout', this.logout);
  app.get  ('/register', this.registerPage);
  app.post ('/login', ea.password.middleware ('addRequestLocals'),
            ea.password.middleware ('postLoginPath'), this.login);
};

AuthRoutes.prototype.loginPage = function (req, res, next) {
  if (!req.app.auth.loggedIn (req))
    res.render ('login');
  else
    res.redirect ("/");
};

AuthRoutes.prototype.logout = function (req, res, next) {
  req.app.auth.everyauth.logout (req);
  res.redirect ("/");
};

AuthRoutes.prototype.login = function (err, req, res, next) {
  if (req.app.auth.loggedIn (req)) {
    res.redirect ("/");
  } else {
    res.render ("login", { errors: err });
  }
};

AuthRoutes.prototype.registerPage = function (req, res, next) {
  res.render ("register");
};

module.exports = new AuthRoutes;
