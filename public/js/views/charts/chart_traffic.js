window.ChartTrafficView = ChartsView.extend({
  options: {
    height: '250px',
  },

  highchart_options: {
    chart: {
      type: "areaspline",
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
        text: "Speed",
      },


      labels: {
        formatter: function () {
          return ChartsView.prototype.formatter (this.value, 0) + 'b/s';
        }
      },

    },

    plotOptions: {
      areaspline: {
        lineWidth: 2,
        marker: {
          enabled: false,
          radius: 2,
        },
      },
    },

    tooltip: {
      shared: true,
      formatter: function() {
         var s = '<span style="font-size: x-small;">' +
                 Highcharts.dateFormat('%e %b %Y, %H:%M',this.x) + '</span>';
         $.each (this.points, function (i, point) {
           s += '<br/>';
           s += '<span style="color: ' + point.series.color + ';">' + point.series.name + '</span>: ';
           s += '<b>' + ChartsView.prototype.formatter (point.y, 2) + 'b/s</b>';
         });
         return s;
      },
    },

    credits: {
      enabled: false,
    },
    legend: {
      floating: true,
      backgroundColor: "#ffffff",
      shadow: true,
      verticalAlign: "top",
      align: "left",
      x: 90,
      y: 35,
    },
  },
});
