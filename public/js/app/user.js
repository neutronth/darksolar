Router.prototype.user_routesinit = function () {
  if (!permission.isRole ('Admin') && permission.isNoManagementGroup ())
    return;

  this.route('user', 'user');
  this.route('user/import', 'userimport');
  this.route('user/genusers', 'genusers');
  this.route('user/accesscode', 'accesscode');
  this.route('user/registertrack', 'registertrack');
  this.route('user/radiusonlineuser', 'radiusonlineuser');

  this.user_init ();
};

Router.prototype.user_init = function () {
  this.user_nav_init ();
};

Router.prototype.user_nav_init = function () {
  DarkSolar.MainMenu.add ("User Management/User",
                          "",
                          "fa fa-user");

  DarkSolar.MainMenu.add ("User Management/User/Online",
                          "/#/user/radiusonlineuser",
                          "fa fa-wifi");

  DarkSolar.MainMenu.add ("User Management/User/User",
                          "/#/user",
                          "fa fa-user");

  DarkSolar.MainMenu.add ("User Management/User/Generate Users",
                          "/#/user/genusers",
                          "fa fa-user-plus");

  DarkSolar.MainMenu.add ("User Management/User/Import",
                          "/#/user/import",
                          "fa fa-cloud-upload");

  DarkSolar.MainMenu.add ("User Management/User/Access Code",
                          "/#/user/accesscode",
                          "fa fa-barcode");

  DarkSolar.MainMenu.add ("User Management/User/Register Tracking",
                          "/#/user/registertrack",
                          "fa fa-list-ul");
};

Router.prototype.user = function () {
  var usrView = new UserView ();
  var usrFormView = new UserFormView ();
  var usrListView = new UserListView ({ targetView: usrFormView });

  usrFormView.setTargetView (usrListView);

  $('#content').html (usrView.render ().el);
  $('#user-form').html (usrFormView.render ().el);
  $('#user-list').html (usrListView.render ().el);
};

Router.prototype.genusers = function () {
  var guView = new GenUsersView ();
  var guFormView = new GenUsersFormView ();
  var guListView = new GenUsersListView ({ targetView: guFormView });

  guFormView.setTargetView (guListView);

  $('#content').html (guView.render ().el);
  $('#genusers-form').html (guFormView.render ().el);
  $('#genusers-list').html (guListView.render ().el);
};

Router.prototype.userimport = function () {
  var usrImportView = new UserImportView ();

  $('#content').html (usrImportView.render ().el);
};

Router.prototype.accesscode = function () {
  var acView = new AccessCodeView ();
  var acFormView = new AccessCodeFormView ();
  var acListView = new AccessCodeListView ({ targetView: acFormView });

  acFormView.setTargetView (acListView);

  $('#content').html (acView.render ().el);
  $('#accesscode-form').html (acFormView.render ().el);
  $('#accesscode-list').html (acListView.render ().el);
};

Router.prototype.registertrack = function () {
  var rtView = new RegisterTrackingView ();
  var rtListView = new RegisterTrackingListView ();


  $('#content').html (rtView.render ().el);
  $('#regtrack-list').html (rtListView.render ().el);
};

Router.prototype.radiusonlineuser = function () {
  var rouView = new RadiusOnlineUserView ();
  var rouListView = new RadiusOnlineUserListView ();


  $('#content').html (rouView.render ().el);
  $('#radonlineuser-list').html (rouListView.render ().el);
};
