window.DSSpinner = Backbone.View.extend ({
  className: 'DSSpinner',

  opts: {
    lines: 10,
    radius: 5,
    length: 5,
    width: 3,
    color: '#ffffff',
    shadow: true,
    left: 1 
  },

  initialize: function (opts) {
    $.extend (this, opts);

    this.render ();
  },

  render: function () {
    this.spinner = new Spinner(this.opts).stop ();
    $(this.el).html (this.spinner.el);
  },

  spin: function () {
    debug.log ("Start spinner");
    this.spinner.spin ();
    $(this.el).html (this.spinner.el);
  },

  stop: function () {
    debug.log ("Stop spinner");
    this.spinner.stop ();
  },
});
