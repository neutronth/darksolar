window.MonitorHostView = Backbone.View.extend({
  netlist: [],

  initialize: function (opts) {
    $.extend (this, opts);
    this.render ();
  },

  events: {
    "shown.bs.tab [data-toggle='tab']" : "tabChange"
  },

  tabChange: function (e) {
    var target = $(e.target).attr ("aria-controls");
    var network = target.replace ("mon_net_", "");
    var netmon = this.netlist[network];

    if (netmon != undefined) {
      netmon.updateGraph ();
    }
  },

  render: function () {
    $(this.el).html (this.template (this));

    _.each (this.networks, $.proxy (function (network) {
      var container = $('#mon_net_' + this.host + '_' + network, this.$el);
      var n = this.host + '_' + network;
      var netmon = new MonitorNetworkView ({
        name: n,
        host: this.host,
        network: network
      });
      this.netlist[n] = netmon;
      container.html (this.netlist[n].el);
    }, this));

    return this;
  },
});

window.MonitorNetworkView = Backbone.View.extend({
  summary_network: false,

  initialize: function (opts) {
    $.extend (this, opts);
    if (this.network == 'summary') {
      this.summary_network = true;
    }
    this.render ();
  },

  render: function () {
    $(this.el).html (this.template (this));
    return this;
  },

  updateGraph: function () {
    var host_data = "/data/" + this.host;
    var iface_split = this.network.lastIndexOf ('-');
    var stripped_network = iface_split > 0 ?
                             this.network.substr (0, iface_split) :
                             this.network;
    var iface_lan = iface_split > 0 ?
                      this.network.substr (iface_split + 1) : "LAN";

    var c_onlineusers = new ChartOnlineUsers ({
      title: "Online Users - " + stripped_network.toUpperCase (),
      name: this.name + "_dash-onlineuserschart",
      chart_data: host_data + "/onlineusers-" + stripped_network + ".json",
      onlineCountRenderTo: '#' + this.name + "_dash-onlineusers-count",
      colors: [ "#008800" ],
    });

    container = $("#" + this.name + "_dash-onlineuserschart-container", this.$el);
    container.html (c_onlineusers.render ().el);
    c_onlineusers.plot ();

    if (!this.summary_network) {
      var c_traffic_lan = new ChartTrafficView ({
        title: "Traffic - " + iface_lan.toUpperCase (),
        name: this.name + "_dash-trafficlan",
        chart_data: host_data + "/traffic-" + stripped_network + ".json",
      });

      container = $("#" + this.name + "_dash-trafficlan-container", this.$el);
      container.html (c_traffic_lan.render ().el);
      c_traffic_lan.plot ();
    } else {
      var c_traffic_wan = new ChartTrafficView ({
        title: "Traffic - WAN",
        name: this.name + "_dash-trafficwan",
        chart_data: host_data + "/traffic-wan.json",
      });

      container = $("#" + this.name + "_dash-trafficwan-container", this.$el);
      container.html (c_traffic_wan.render ().el);
      c_traffic_wan.plot ();

      var c_traffic_lan = new ChartTrafficView ({
        title: "Traffic - LAN",
        name: this.name + "_dash-trafficlan",
        chart_data: host_data + "/traffic-lan.json",
      });

      container = $("#" + this.name + "_dash-trafficlan-container", this.$el);
      container.html (c_traffic_lan.render ().el);
      c_traffic_lan.plot ();
    }

    var summary_network_ = this.summary_network;

    $('#' + this.name + '_dash-period').change (function () {
      var $this = $(this);
      var val = $this.val ();
      var text = $this.find ('option:selected').text ();

      text = text == "Day" ? "" : " - " + text;

      c_onlineusers.options.chart_data = c_onlineusers.options.chart_data_prefix + val + ".json";
      c_onlineusers.highchart.setTitle ({text:  c_onlineusers.options.title_prefix + text});
      c_onlineusers.plot ();

      if (summary_network_) {
        c_traffic_wan.options.chart_data = c_traffic_wan.options.chart_data_prefix + val + ".json";
        c_traffic_wan.highchart.setTitle ({text:  c_traffic_wan.options.prefix + text});
        c_traffic_wan.plot ();
      }

      c_traffic_lan.options.chart_data = c_traffic_lan.options.chart_data_prefix + val + ".json";
      c_traffic_lan.highchart.setTitle ({text:  c_traffic_lan.options.title_prefix + text});
      c_traffic_lan.plot ();
    });
  },
});

window.MonitorHostContentView = Backbone.View.extend({
  host: 'host',
  networks: [],

  initialize: function (opts) {
    $.extend (this, opts);
    this.render ();
  },

  render: function () {
    $(this.el).html (_.template ("<div role='tabpanel' class='tab-pane' id='host_content_<%= host %>'></div>", this));

    var content = $('#host_content_' + this.host, this.$el);
    var host_mon = new MonitorHostView ({
      host: this.host,
      networks: this.networks
    });

    content.append (host_mon.el);

    return this;
  },

  showFirstTab: function () {
    $('#mon_net_' + this.host + '_tabpanel a:first').tab ('show');
  },
});

window.DashboardView = Backbone.View.extend({
  hostlist: [],

  initialize: function () {
    debug.info ('Initializing Dashboard View');
  },

  events: {
    "shown.bs.tab [data-toggle='tab']" : "tabChange",
  },

  tabChange: function (e) {
    var host = $(e.target).attr ("aria-controls");
  },

  render: function () {
    $(this.el).html(this.template({ hosts : [] }));

    $.ajax ({
      url: "/api/monitor/hosts"
    })
    .done ($.proxy (function (hosts) {
      $(this.el).html(this.template({ hosts : Object.keys (hosts) }));

      for (var host in hosts) {
        var h = new MonitorHostContentView ({
          host: host,
          networks: [ 'summary' ].concat (hosts[host])
        });

        this.hostlist.push (h);
        $('#' + host, this.$el).append (h.el);
      }

      this.showFirstTab ();
    }, this));

    return this;
  },

  showFirstTab: function () {
    $('#dash_tabpanel a:first').tab ('show');
    for (var i = this.hostlist.length - 1; i >= 0; i--) {
      this.hostlist[i].showFirstTab ();
    }
  },
});
