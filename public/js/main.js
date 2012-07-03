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

    setInterval (function () {
      permission.fetch ();
    }, 300000);

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
