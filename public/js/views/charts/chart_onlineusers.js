window.ChartOnlineUsers = ChartsView.extend({
  options: {
    height: '250px',
  },

  highchart_options: {
    chart: {
      type: "spline",
    },
    title: {
      text: "Online Users",
    },
    xAxis: {
      type: "datetime",
      title: {
        text: null,
      },
    },
    yAxis: {
      title: {
        text: null,
      },
    },

    plotOptions: {
      spline: {
        lineWidth: 2,
        marker: {
          enabled: false,
          radius: 2,
        },
      },
    },

    legend: {
      enabled: false,
    },
  },

  onPlotted: function () {
    ChartsView.prototype.onPlotted.call (this);

    if (this.options.onlineCountRenderTo != undefined) {
      var countcontainer = $(this.options.onlineCountRenderTo);

      if (countcontainer.length > 0) {
        var s = this.highchart.series[0];
        var c = s.data[s.data.length - 1].y;

        countcontainer.html (c);
      }
    }
  },
});
