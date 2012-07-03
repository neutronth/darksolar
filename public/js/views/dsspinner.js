window.DSSpinner = Backbone.View.extend ({
  className: 'DSSpinner',

  opts: {
    lines: 10,
    radius: 5,
    length: 5,
    width: 3,
    color: '#ffffff',
  },

  initialize: function (opts) {
    $.extend (this, opts);

    this.render ();
  },

  render: function () {
    this.spinner = new Spinner(this.opts).stop ();
  },

  spin: function () {
    this.spinner = new Spinner(this.opts).spin ();
    $(this.el).html (this.spinner.el);
    this.$el.css ('padding-top', '10px');
    this.$el.css ('padding-left', '3px');
  },

  stop: function () {
    this.spinner.stop ();
  },
});
