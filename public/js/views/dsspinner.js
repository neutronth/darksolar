window.DSSpinner = Backbone.View.extend ({
  className: 'DSSpinner',
  spinner_html: "<span class='fa fa-spin fa-spinner'></span>",

  initialize: function (opts) {
    $.extend (this, opts);

    this.render ();
  },

  render: function () {
    $(this.el).html (this.spinner_html);
  },

  spin: function () {
    $(this.el).html (this.spinner_html);
  },

  stop: function () {
    setTimeout ($.proxy (function () {
      $(this.el).html ("");
    }, this), 100);
  },
});
