Router.prototype.logout_routesinit = function () {
  this.logout_init ();
};

Router.prototype.logout_init = function () {
  this.logout_nav_init ();
};

Router.prototype.logout_nav_init = function () {
  var navName = 'Logout';
  var navUrl  = '/logout';
  $('#top_nav').append ('<li><a href="' + navUrl + '">'
                        + navName + '</a></li>');
};
