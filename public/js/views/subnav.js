window.SubNavView = Backbone.View.extend({
  zindex: 0,

  initialize: function () {
    this.render ();
  },

  render: function () {
    $(this.el).html ("");

    $('#dssubnav-toggle').show ();

    if (this.zindex === 0) {
      this.zindex = parseInt ($('#dssubnav').css ('z-index'));
    }

    var this_ = this;

    $('#mainnav #top_nav').children ().on ('click', function (e) {
      e.stopPropagation ();
    });

    $('#dssubnav').children ().on ('click', function (e) {
      e.stopPropagation ();
    });
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
    if (fragment !== undefined) {
      var curRoute = Backbone.history.fragment;
      if (curRoute == fragment) {
        this.$el.addClass ('active');
      }

      var split = cmp[1].split ('/');
      if (split[0] !== undefined)
        this.data.i18n_name = "nav:" + split[0];

      if (split[1] !== undefined)
        this.data.i18n_name += "_" + split[1];
    }


    $(this.el).html (this.template(this.data));
    $(this.el).i18n();
  },
});
