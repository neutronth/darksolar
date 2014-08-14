window.Router = Backbone.Router.extend({
  // routes should be defined in each route module
  routes: {},

  components: [
    'dashboard',
    'package',
    'user',
    'management',
    'logout',
  ],

  initialize: function () {
    var deferreds = [];
    var o = this;

    window.tmpIntvDelay  = 1000;
    window.permission    = new Perm ();
    window.oldpermission = "";
    window.forcelogout_modal = null;

    function setupWebsocket () {
      clearInterval (window.tmpIntv);
      window.tmpIntvDelay += 5000;
      window.tmpIntvDelay = window.tmpIntvDelay > 30000 ? 30000 : window.tmpIntvDelay;
      window.tmpIntv = setInterval (setupWebsocket, window.tmpIntvDelay);

      window.permission.fetch ();
      if (window.sio_url != undefined) {
        clearInterval (window.tmpIntv);
        window.socket = io.connect (window.sio_url);

        window.socket.on ('forcelogout', function (data) {
          if (!window.forcelogout_modal) {
            window.forcelogout_modal = new ForceLogoutModalView ();
            $('#content').append (window.forcelogout_modal.el);
          }

          window.forcelogout_modal.show ();
        });

        window.socket.on ('updateperm', function (data) {
          console.log (data);

          window.permission.fetch ({
            success: function () {
              if (JSON.stringify (window.permission) != window.oldpermission) {
                document.location.reload (true);
              }

              window.oldpermission = JSON.stringify (window.permission);
            },
          });
        });
      }
    };

    window.tmpIntv = setInterval (setupWebsocket, window.tmpIntvDelay);

    window.permission.fetch ({
      success: function () {
        window.oldpermission = JSON.stringify (window.permission);

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

        $('#nav-home-username').html(window.permission.getUsername());
        $('#nav-home-fullname').html(window.permission.getFullname());
        $('body').i18n();
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
                      'SearchToolbarView',
                      'AccessCodeView', 'AccessCodeItemView',
                      'RegisterTrackingView', 'RegisterTrackingItemView',
                      'RadiusOnlineUserView', 'RadiusOnlineUserItemView',
                      'OnlineUserToolbarView',
                      'MainToolbarView', 'ConfirmModalView',
                      'ForceLogoutModalView', 'AlertMessageView' ],
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
