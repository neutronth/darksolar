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
    var c_onlineusers = new ChartOnlineUsers ({
      title: "Online Users",
      name: "dash-onlineuserschart",
      chart_data: "/data/onlineusers-summary.json",
      onlineCountRenderTo: "#dash-onlineusers-count",
    });

    $('#dash-onlineuserschart-container').html (c_onlineusers.render ().el);
    c_onlineusers.plot ();

    var c_traffic_wan = new ChartTrafficView ({
      title: "Traffic - WAN",
      name: "dash-trafficwan",
      chart_data: "/data/traffic-wan.json",
    });
    $('#dash-trafficwan-container').html (c_traffic_wan.render ().el);
    c_traffic_wan.plot ();

    var c_traffic_lan = new ChartTrafficView ({
      title: "Traffic - LAN",
      name: "dash-trafficlan",
      chart_data: "/data/traffic-lan.json",
    });
    $('#dash-trafficlan-container').html (c_traffic_lan.render ().el);
    c_traffic_lan.plot ();
  },
});
