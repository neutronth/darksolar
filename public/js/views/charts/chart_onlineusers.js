window.ChartOnlineUsers = ChartsView.extend({
  options: {
    height: '250px',
  },

  highchart_options: {
    chart: {
      type: "spline",
      zoomType: "x",
    },
    xAxis: {
      type: "datetime",
      title: {
        text: null,
      },
    },
    yAxis: {
      min: 0,
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
    var serie = this.highchart.series[0];
    for (i = 0; i < serie.data.length; i++) {
      this.highchart.series[0].data[i].y = Math.round (serie.data[i].y);
    }

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
