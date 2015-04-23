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
  DarkSolar.MainMenu.add ("Monitor",
                          "",
                          "fa fa-users");
  DarkSolar.MainMenu.add ("Monitor/Dashboard",
                          "/#/dashboard",
                          "fa fa-dashboard");
};

Router.prototype.dashboard = function () {
  if (!this.dashboardView) {
    this.dashboardView = new dashboardView();
    this.dashboardView.render();
  } else {
    this.dashboardView.delegateEvents();
  }

  $("#content").html(this.dashboardView.el);
  this.dashboardView.showFirstTab ();
};

Router.prototype.dashboard_user = function () {
  var userSelfServiceFormView = new UserSelfServiceFormView ();

  $("#content").html(userSelfServiceFormView.render ().el);
  $("#content").append ("<br><br><br>");

  var userdata = new User ();
  userdata.schema.package = {
    type: 'Hidden',
  };

  userdata.set ({_id: permission.attributes._id}, {silent: true})
    .fetch ({ success: function () {
      userSelfServiceFormView.trigger ('userselected', userdata);
    }});
};
