exports = module.exports = function (everyauth) {
  var password = everyauth.password =
  everyauth.everymodule.submodule('password')
  .configurable({
      loginFormFieldName: 'the name of the login field. Same as what you ' +
        'put in your login form - e.g., if <input type="text" ' +
        'name="username" />, then loginFormFieldName should be set to ' +
        '"username".'
    , passwordFormFieldName: 'the name of the login field. Same as what ' +
        'you put in your login form - e.g., if <input type="password" ' +
        'name="pswd" />, then passwordFormFieldName should be set to "pswd".'
  })

  .loginFormFieldName('login')
  .passwordFormFieldName('password')

  .get('addRequestLocals', "the login page's uri path.")
    .step('doAddRequestLocals')
      .accepts('req res next')
      .promises(null)

  .post ('postLoginPath', 'the uri path that the login POSTs to.')
    .step('extractLoginPassword')
      .accepts('req res next')
      .promises('login password')
    .step('authenticate')
      .accepts('login password')
      .promises('userOrErrors')
    .step('interpretUserOrErrors')
      .description('Pipes the output of the step `authenticate` into ' +
        'either the `user` or `errors` param')
      .accepts('userOrErrors')
      .promises('user errors')
    .step('getSession')
      .description('Retrieves the session of the incoming request and ' +
        'returns in')
      .accepts('req')
      .promises('session')
    .step('addToSession')
      .description('Adds the user to the session')
      .accepts('session user errors')
      .promises(null)
    .step('processRespond')
      .description('Process respond by next handlers')
      .accepts('next errors')
      .promises(null)

  .doAddRequestLocals(function (req, res, next) {
    if (res.locals) {
      res.locals.everyauth.password = {}; 
      res.locals.everyauth.password.loginFormFieldName =
        this.loginFormFieldName();
      res.locals.everyauth.password.passwordFormFieldName =
        this.passwordFormFieldName();
    }

    return next();
  })

  .extractLoginPassword(function (req, res) {
    return [req.body[this.loginFormFieldName()],
            req.body[this.passwordFormFieldName()]];
  })

  .interpretUserOrErrors(function (userOrErrors) {
    if (Array.isArray(userOrErrors)) {
      return [null, userOrErrors]; // We have an array of errors
    } else {
      return [userOrErrors, []]; // We have a user
    }
  })

  .getSession(function (req) {
    return req.session;
  })

  .addToSession(function (sess, user, errors) {
    var _auth = sess.auth || (sess.auth = {});
    if (user) {
      _auth.userId = user[this._userPkey];
      if (user.username)
        _auth.user = user.username;
    }
    _auth.loggedIn = !!user;
  })

  .processRespond(function (next, errors) {
    next (errors);
  })

  ;
}
