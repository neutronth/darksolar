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
  DarkSolar.MainMenu.add ("User Management/Policy/Management Group",
                          "/#/management/group",
                          "fa fa-user-secret");
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
