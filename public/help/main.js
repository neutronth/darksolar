window.DarkSolar = {};

window.Router = Backbone.Router.extend({
  routes: {
    '' : 'help',
    'register' : 'register',
    'password' : 'password',
  },

  initialize: function () {
  },

  help: function () {
    var m = new HelpMainView ();
    $('#content').html (m.render ().el);
  },

  goBackButton: function (dom) {
    dom.append ('<span class="glyphicon glyphicon-chevron-left"></span><span class="glyphicon glyphicon-chevron-left"></span><span class="glyphicon glyphicon-chevron-left"></span><a href="/help" class="btn btn-success" data-i18n="app:button.Go back" style="padding: 10;">Go back</a>');
  },

  password: function () {
    var pwdView = new PasswordFormView (); 
    $('#content').html ("");
    this.goBackButton ($('#content'));
    $('#content').append (pwdView.render ().el);

    $('#content').i18n();
  },

  register: function () {
    var regView = new RegisterFormView (); 
    $('#content').html ("");
    this.goBackButton ($('#content'));
    $('#content').append (regView.render ().el);

    $('#content').i18n();
  }
});

templateLoader.load([ 'HelpMainView', 'AlertMessageView' ],
  function () {
      app = new Router();
      Backbone.history.start();
  }
);

if (production) {
  Backbone.debug.off ();
} else {
  Backbone.debug.on ();
}

