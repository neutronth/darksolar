window.Router = Backbone.Router.extend({
  // routes should be defined in each route module
  routes: {},

  initialize: function () {
    this.dashboard_routesinit ();
    this.package_routesinit ();
    this.logout_routesinit ();
  },
});

templateLoader.load(['DashboardView', 'PackageTemplateView', 'PackageView',
                     'PackageItemView'],
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
