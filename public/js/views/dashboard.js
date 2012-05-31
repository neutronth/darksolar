window.DashboardView = Backbone.View.extend({
  initialize: function () {
    debug.info ('Initializing Dashboard View');
  },

  events: {
  },

  render: function () {
    $(this.el).html(this.template());
    return this;
  },
});
