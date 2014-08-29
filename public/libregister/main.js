window.DarkSolar = {};

window.Router = Backbone.Router.extend({
  routes: {
    '' : 'register',
  },

  initialize: function () {
  },

  register: function () {
    var userView = new UserFormView (); 
    $('#content').html (userView.render ().el);
  }
});

templateLoader.load([ 'AlertMessageView' ],
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
