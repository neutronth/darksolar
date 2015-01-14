Router.prototype.user_routesinit = function () {
  if (!permission.isRole ('Admin') && permission.isNoManagementGroup ())
    return; 

  this.route('user', 'user');
  this.route('user/import', 'userimport');
  this.route('user/accesscode', 'accesscode');
  this.route('user/registertrack', 'registertrack');
  this.route('user/radiusonlineuser', 'radiusonlineuser');

  this.user_init ();
};

Router.prototype.user_init = function () {
  this.user_nav_init ();
};

Router.prototype.user_nav_init = function () {
  var navName = 'User';
  var navIcon = 'custom-icon-user';
  var navUrl  = '/#/user';
  $('#top_nav').append ('<li><a href="' + navUrl + '">'
                        + '<div class="custom-icon ' + navIcon + '"></div>'
                        + '<span data-i18n="nav:user">'
                        + navName + '</span></a></li>');
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
