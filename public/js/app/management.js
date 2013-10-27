Router.prototype.management_routesinit = function () {
  if (!permission.isRole ('Admin')) {
    return;
  }

  this.route('management', 'management_group');
  this.route('management/group', 'management_group');

  this.management_init ();
  debug.info ('Management initialized');
};

Router.prototype.management_init = function () {
  this.management_nav_init ();
};

Router.prototype.management_nav_init = function () {
  var navName = 'Management';
  var navIcon = 'custom-icon-management';
  var navUrl  = '/#/management/group';
  $('#top_nav').append ('<li><a href="' + navUrl + '">'
                        + '<div class="custom-icon ' + navIcon + '"></div>'
                        + '<span data-i18n="nav:management">'
                        + navName + '</span></a></li>');
};

Router.prototype.management_group = function (page) {
  var mGroupView = new ManagementGroupView ();
  var mGroupFormView = new ManagementGroupFormView ();
  var mGroupListView = new ManagementGroupListView ({ targetView: mGroupFormView });

  mGroupFormView.setTargetView (mGroupListView);

  $('#content').html (mGroupView.render ().el);
  $('#management-form').html (mGroupFormView.render ().el);
  $('#management-list').html (mGroupListView.render ().el);
};
