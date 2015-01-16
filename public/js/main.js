window.DarkSolar = {};
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

    window.permission    = new Perm ();
    window.oldpermission = "";
    window.forcelogout_modal = null;

    function setupWebsocket () {
      if (window.sio_url != undefined) {
        window.socket = io (window.sio_url);

        window.socket.on ('probe', function () {
          socket.emit ('ack', {});
        });

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

    window.permission.fetch ({
      success: function () {
        window.oldpermission = JSON.stringify (window.permission);
        setupWebsocket ();

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

templateLoader.load([ 'SubNavItemView',
                      'DashboardView',
                      'MonitorHostView', 'MonitorNetworkView',
                      'ManagementGroupView',
                      'ManagementGroupItemView',
                      'ManagementGroupItemHeaderView',
                      'PackageTemplateView', 'PackageView',
                      'PackageTemplateItemView',
                      'PackageTemplateItemHeaderView',
                      'PackageItemView', 'PackageItemHeaderView',
                      'UserView', 'UserItemView', 'UserItemHeaderView',
                      'UserImportView', 'UserImportListItemView',
                      'UserImportItemHeaderView', 'UserImportItemView',
                      'SearchToolbarView',
                      'AccessCodeView', 'AccessCodeItemView',
                      'AccessCodeItemHeaderView',
                      'RegisterTrackingView', 'RegisterTrackingItemView',
                      'RegisterTrackingItemHeaderView',
                      'RadiusOnlineUserView', 'RadiusOnlineUserItemView',
                      'RadiusOnlineUserItemHeaderView','OnlineUserToolbarView',
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
