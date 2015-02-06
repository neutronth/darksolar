Router.prototype.dashboard_routesinit = function () {
  if (permission.isRole ('Admin') || !permission.isNoManagementGroup ()) {
    this.route('', 'dashboard');
    this.route('dashboard', 'dashboard');
    this.dashboard_init ();
  } else {
    this.route('', 'dashboard_user');
    this.route('dashboard', 'dashboard_user');
    this.dashboard_user_init ();
  }
};

Router.prototype.dashboard_init = function ()
{
  this.dashboardView = new DashboardView();
  this.dashboardView.render();

  this.dashboard_nav_init ();
};

Router.prototype.dashboard_user_init = function ()
{
  this.dashboard_nav_init ();
};


Router.prototype.dashboard_nav_init = function () {
  var navName = 'Dashboard';
  var navIcon = 'custom-icon-dashboard';
  var navUrl  = '/#/dashboard';
  $('#top_nav').append ('<li><a href="' + navUrl + '">'
                        + '<div class="custom-icon ' + navIcon + '"></div>'
                        + '<span data-i18n="nav:dashboard">'
                        + navName + '</span></a></li>');
};

Router.prototype.dashboard = function () {
  if (!this.dashboardView) {
    this.dashboardView = new dashboardView();
    this.dashboardView.render();
  } else {
    $('#dssubnav').offcanvas ('hide');
    $('#dssubnav').offcanvas ('hide');
    $('#dssubnav ul').html ("");
    this.dashboardView.delegateEvents();
  }

  $('#dssubnav-toggle').hide ();

  $("#content").html(this.dashboardView.el);
  this.dashboardView.showFirstTab ();
};

Router.prototype.dashboard_user = function () {
  $('#dssubnav-toggle').hide ();
  var userSelfServiceFormView = new UserSelfServiceFormView ();

  $("#content").html(userSelfServiceFormView.render ().el);
  $("#content").append ("<br><br><br>");

  var userdata = new User ();
  userdata.schema.package = {
    type: 'Hidden',
  }

  userdata.set ({_id: permission.attributes['_id']}, {silent: true})
    .fetch ({ success: function () {
      userSelfServiceFormView.trigger ('userselected', userdata);
    }});
};
