window.DashboardView = Backbone.View.extend({
  initialize: function () {
    debug.info ('Initializing Dashboard View');
  },

  events: {
  },

  render: function () {
    $(this.el).html(this.template());
    $('#dssubnav').offcanvas ({toggle: false});
    $('#dssubnav').offcanvas ('hide');
    return this;
  },

  update: function () {

    var c_onlineusers = new ChartOnlineUsers ({
      title: "Online Users",
      name: "dash-onlineuserschart",
      chart_data: "/data/onlineusers-summary.json",
      onlineCountRenderTo: "#dash-onlineusers-count",
      colors: [ "#008800" ],
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

    $('#dash-period').change (function () {
      var $this = $(this);
      var val = $this.val ();
      var text = $this.find ('option:selected').text ();

      text = text == "Day" ? "" : " - " + text;

      c_onlineusers.options.chart_data = "/data/onlineusers-summary" + val + ".json";
      c_onlineusers.highchart.setTitle ({text:  "Online Users" + text});
      c_onlineusers.plot ();

      c_traffic_wan.options.chart_data = "/data/traffic-wan" + val + ".json";
      c_traffic_wan.highchart.setTitle ({text:  "Traffic - WAN" + text});
      c_traffic_wan.plot ();

      c_traffic_lan.options.chart_data = "/data/traffic-lan" + val + ".json";
      c_traffic_lan.highchart.setTitle ({text:  "Traffic - LAN" + text});
      c_traffic_lan.plot ();
    });

  },
});
