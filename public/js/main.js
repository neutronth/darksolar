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

    window.tmpIntvDelay  = 1000;
    window.permission    = new Perm ();
    window.oldpermission = "";

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
          if ($('#forcelogout_modal').length > 0) {
            $('#forcelogout_modal').html ('');
          } else {
            $('#content').append ('<div id="forcelogout_modal" class="modal fade" data-backdrop="static" data-keyboard="false"></div>');
          }

          $('#forcelogout_modal').append ('<div class="modal-header"><h3>Session Timeout</h3>');
          $('#forcelogout_modal').append ('<div class="modal-body">The current session is expired. Please login!</div>');
          $('#forcelogout_modal').append ('<div class="modal-footer"><a href="/logout" class="btn"><i class="icon-remove"></i>Close</a></div>');
          $('#forcelogout_modal').modal ();
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
