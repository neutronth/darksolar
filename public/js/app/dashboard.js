Router.prototype.dashboard_routesinit = function () {
   this.route('', 'dashboard');
   this.route('dashboard', 'dashboard');
   this.dashboard_init ();
};

Router.prototype.dashboard_init = function ()
{
  this.dashboardView = new DashboardView();
  this.dashboardView.render();

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
    this.dashboardView.delegateEvents();
  }

  $("#content").html(this.dashboardView.el);
  this.dashboardView.update();
};
