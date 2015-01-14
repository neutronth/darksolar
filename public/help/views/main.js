window.HelpMainView = Backbone.View.extend({
  render: function () {
    $(this.el).html ('');
    $(this.el).append (this.template());
    $(this.el).i18n ();

    return this;
  },
});
