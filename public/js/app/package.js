Router.prototype.package_routesinit = function () {
  if (!permission.isRole ('Admin') && permission.isNoManagementGroup ())
    return; 

  this.route('package', 'package');
  this.route('package/:page', 'package');

  this.package_init ();
};

Router.prototype.package_init = function () {
  this.package_nav_init ();
};

Router.prototype.package_nav_init = function () {
  var navName = 'Package';
  var navIcon = 'custom-icon-package';
  var navUrl  = '/#/package';
  $('#top_nav').append ('<li><a href="' + navUrl + '">'
                        + '<div class="custom-icon ' + navIcon + '"></div>'
                        + '<span data-i18n="nav:package">'
                        + navName + '</span></a></li>');
};

Router.prototype.package = function (page) {
  if (page == "template") {
    if (permission.isRole ('Admin')) {
      this.package.template.call (this, page);
    }
  } else {
    this.package.inheritance.call (this, page);
  }
};

Router.prototype.package.template = function (page) {
  var pkgTemplateView  = new PackageTemplateView ();
  var formView = new PackageTemplateFormView ({ pkgtype: 'template' });
  var listView = new PackageListView ({ pkgtype: 'template',
                                        targetView: formView });

  formView.setTargetView (listView);

  $('#content').html (pkgTemplateView.render ().el);
  $('#package-header').html ('<h1>Policy</h1>');
  $('#package-list').html (listView.render ().el);
  $('#package-form').html (formView.render ().el);

  return this;
};

Router.prototype.package.inheritance = function (page) {
  var pkgTemplateView  = new PackageTemplateView ();
  var formView = new PackageInheritanceFormView ({ pkgtype: 'inheritance' });
  var listView = new PackageListView ({ pkgtype: 'inheritance',
                                        targetView: formView });

  formView.setTargetView (listView);

  $('#content').html (pkgTemplateView.render ().el);
  $('#package-header').html ('<h1>Package</h1>');
  $('#package-list').html (listView.render ().el);
  $('#package-form').html (formView.render ().el);

  return this;
};
