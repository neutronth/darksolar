window.MenuView = Backbone.View.extend({
  tagName: "ul",
  className: "sidebar-menu",
  menuList: {},
  iconList: [],

  initialize: function () {
    this.render ();
  },

  rendertreeview: function (path, data, parent_tree) {
    var data_type = typeof (data);

    if (data_type == "object") {
      for (var key in data) {
        var cur_data = data[key];
        var cur_data_type = typeof (cur_data);
        var cur_text = key;
        var cur_path = path + "/" + key;
        var cur_icon = "fa fa-folder-o";

        if (this.iconList.hasOwnProperty (cur_path)) {
          cur_icon = this.iconList[cur_path];
        }

        if (cur_data_type == "object") {
          var treeview = new MenuViewTreeView ({
            label: cur_text,
            path: cur_path,
            icon: cur_icon
          });
          parent_tree.append (treeview.el);
          this.rendertreeview (cur_path, cur_data, treeview.getTree ());
        } else if (cur_data_type == "string") {
          parent_tree.append ((new MenuViewMenuItem ({
            label: cur_text,
            link: cur_data,
            path: cur_path,
            icon: cur_icon
          })).el);
        }
      }
    }
  },

  rendermenu: function () {
    this.$el.html ("");
    for (var category in this.menuList) {
      var category_data = this.menuList[category];
      this.$el.append ("<li class='header'><span data-i18n='nav:" + category + "'>" + category + "</span></li>");
      this.rendertreeview (category, category_data, this.$el);
    }
  },

  render: function () {
    this.rendermenu ();

    $('#mainmenu').html ("");
    $('#mainmenu').append (this.$el);

    this.$el.i18n ();

    this.updatePageHeader (this.readCookie ("current-path"));

    if ($.AdminLTE !== undefined) {
      $.AdminLTE.tree ('.sidebar');
    }

    $(".menuitem", this.$el)
      .click ($.proxy (this.clickInvoked, this));
  },

  add: function (path, link, icon) {
    this.iconList[path] = icon;

    var path_sep = path.split ('/');
    var data = this.menuList;

    debug.log ("Path: ", path_sep);

    for (var i = 0; i < path_sep.length; i++) {
      var key = path_sep[i];
      if (!data.hasOwnProperty (key)) {
        data[key] = "";
      }

      if (i < path_sep.length - 1) {
        if (typeof (data[key]) == "string")
          data[key] = {};
      } else if (typeof (data[key]) != "object") {
        data[key] = link;
      }

      data = data[key];
    }

    this.render ();
  },

  clickInvoked: function (event) {
    var link = $(event.target);
    while (!link.hasClass ('menuitem'))
      link = link.parent ();

    var path = link.attr ("data-path");
    this.createCookie ("current-path", path, "");
    this.updatePageHeader (path);
  },

  updatePageHeader: function (path) {
    if (!path)
      return;

    var page_header = $("#page_header");
    var label = "<span data-i18n='nav:" + path + "'></span>";

    page_header.html (label);
    page_header.i18n ();

    this.updateBreadCrumb (path);
  },

  updateBreadCrumb: function (path) {
    if (!path)
      return;

    var path_split = path.split ('/');
    var breadcrumb_html = "";
    var cur_path = "";

    for (var i = 0; i < path_split.length; i++) {
      cur_path += path_split[i];

      var cur_icon = "fa fa-folder-o";
      if (this.iconList.hasOwnProperty (cur_path)) {
        cur_icon = this.iconList[cur_path];
      }

      var icon_html = "<span class='" + cur_icon + "' style='margin-right: 5px;'></span> ";
      var label_html = "<span data-i18n='nav:" + cur_path + "'></span>";

      breadcrumb_html += "<li>" + icon_html + label_html + "</li>";
      cur_path += "/";
    }

    var breadcrumb = $("#page_breadcrumb");
    breadcrumb.html (breadcrumb_html);
    breadcrumb.i18n ();
  },

  createCookie: function (name, value, days) {
    var expires = "";
    if (days) {
      var date = new Date ();
      date.setTime (date.getTime () + (days * 24 * 60 * 60 * 1000));
      expires = "; expires=" + date.toGMTString ();
    }

    document.cookie = name + "=" + value + expires + "; path=/";
  },

  readCookie : function (name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for(var i = 0; i < ca.length; i++) {
      var c = ca[i];
      while (c.charAt (0) == ' ') c = c.substring (1, c.length);

      if (c.indexOf (nameEQ) === 0)
        return c.substring (nameEQ.length, c.length);
    }

    return null;
  },

  eraseCookie: function (name) {
    this.createCookie (name, "", -1);
  }
});

window.MenuViewTreeView = Backbone.View.extend({
  tagName: "li",
  className: "treeview",
  label: "",

  initialize: function (opts) {
    $.extend (this, opts);
    return this.render ();
  },

  render: function () {
    var icon = "<span class='" + this.icon + "' style='font-size: 20px;margin-right: 8px;'></span> ";
    var label = "<span data-i18n='nav:" + this.path + "'>" + this.label + "</span>";
    this.$el.append ("<a href='#'>" + icon + label + "<i class='fa fa-angle-left pull-right'></i></a>");
    this.$el.append ("<ul class='treeview-menu'></ul>");
    return this;
  },

  getTree: function () {
    return $('ul', this.$el);
  }
});

window.MenuViewMenuItem = Backbone.View.extend({
  tagName: "li",
  icon: "",
  label: "",
  link: "",
  path: "",

  initialize: function (opts) {
    $.extend (this, opts);
    return this.render ();
  },

  render: function () {
    var icon  = "<span class='" + this.icon + "'></span> ";
    var label = "<span data-i18n='nav:" + this.path + "'>" + this.label + "</span>";
    this.$el.append ("<a href='" + this.link + "' class='menuitem' data-path='" + this.path + "'>" + icon + label + "</a>");

    return this;
  },
});
