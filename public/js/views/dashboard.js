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

  update: function () {
//    var c_traffic = new ChartTrafficView ({ name: "dash-trafficchart" });
//    $('#dash-trafficchart-container').html (c_traffic.render ().el);
//    c_traffic.plot ();

    var c_onlineusers = new ChartOnlineUsers ({
      name: "dash-onlineuserschart",
      onlineCountRenderTo: "#dash-onlineusers-count",
    });

    $('#dash-onlineuserschart-container').html (c_onlineusers.render ().el);
    c_onlineusers.plot ();
  },
});
