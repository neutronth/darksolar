window.SubNavView = Backbone.View.extend({
  initialize: function () {
    this.render ();
  },

  render: function () {
    $(this.el).html (this.template());
  },
});

window.SubNavItemView = Backbone.View.extend({
  tagName: 'li',

  initialize: function (opts) {
    $.extend (this, opts);
    this.render ();
  },

  render: function () {
    var cmp = this.data.link.split ('/#/');
    var fragment = cmp[1];
    if (fragment != undefined) {
      var curRoute = Backbone.history.fragment;
      if (curRoute == fragment) {
        this.$el.addClass ('active');
      }
    }

    $(this.el).html (this.template(this.data));
  },
});
