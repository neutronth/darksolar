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

    if ($.AdminLTE != undefined) {
      $.AdminLTE.tree ('.sidebar');
    }
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
    this.$el.append ("<a href='" + this.link + "'>" + icon + label + "</a>");
    return this;
  },
});
