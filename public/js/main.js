window.Router = Backbone.Router.extend({
  // routes should be defined in each route module
  routes: {},

  components: [
    'dashboard',
    'management',
    'package',
    'user',
    'logout',
  ],

  initialize: function () {
    var deferreds = [];
    var o = this;

    window.permission = new Perm ();

    function setupWebsocket () {
      clearInterval (window.tmpIntv);
      window.tmpIntvDelay += 5000;
      window.tmpIntvDelay = window.tmpIntvDelay > 30000 ? 30000 : window.tmpIntvDelay;
      window.tmpIntv = setInterval (setupWebsocket, window.tmpIntvDelay);

      permission.fetch ();
      if (window.sio_url != undefined) {
        clearInterval (window.tmpIntv);
        window.socket = io.connect (window.sio_url);

        window.socket.on ('updateperm', function (data) {
          console.log (data);
          permission.fetch ();
        });
      }
    };

    window.tmpIntvDelay = 1000;
    window.tmpIntv = setInterval (setupWebsocket, window.tmpIntvDelay);

    permission.fetch ({
      success: function () {
        for (var i = 0; i < o.components.length; i ++) {
          var func = o[o.components[i] + '_routesinit'];
          if (func) {
            func.call (o); 
          }
        }
        debug.info ('Components initialized');

        window.spinner = new DSSpinner ();
        $('#spinner-area').append (spinner.el);

        Backbone.history.start();
      },
    });
  },
});

templateLoader.load([ 'SubNavView', 'SubNavItemView',
                      'DashboardView', 'ManagementGroupView',
                      'ManagementGroupItemView',
                      'PackageTemplateView', 'PackageView',
                      'PackageTemplateItemView',
                      'PackageItemView', 'UserView', 'UserItemView',
                      'UserToolbarView', 'SearchToolbarView',
                      'AccessCodeView', 'AccessCodeItemView',
                      'RegisterTrackingView', 'RegisterTrackingItemView',
                      'RadiusOnlineUserView', 'RadiusOnlineUserItemView' ],
  function () {
      app = new Router();

      app.on ('all', navbarTrack);
  }
);

if (production) {
  Backbone.debug.off ();
} else {
  Backbone.debug.on ();
}
