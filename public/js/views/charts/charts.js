window.ChartsView = Backbone.View.extend({
  options: {
    name:    "default",
    height:  "250px",
    width:   "100%",
  },

  highchart:     undefined,
  highchart_options: {},

  initialize: function (opts) {
    debug.info ('Initializing Charts');
    this.options = $.extend (this.options, opts);
  },

  events: {
  },

  render: function () {
    $(this.el).html("<div id=" + this.options.name +"></div>");
    var c = $('#' + this.options.name, $(this.el));

    c.css ('height', this.options.height);
    c.css ('min-width', this.options.width);

    return this;
  },

  plot: function () {
    if (this.highchart_options.chart == undefined) {
      this.highchart_options.chart = {};
    }

    this.highchart_options.chart = $.extend (this.highchart_options.chart,
      { renderTo: this.options.name });

    if (this.highchart == undefined)
      this.highchart = new Highcharts.Chart (this.highchart_options);
    else
      this.highchart.redraw ();

    this.fetchData ();

  },

  fetchData: function () {
    var $this = this;

    $.ajax ({
      url: "/data/test.xjson",
      dataType: 'json',
      success: function (d) {
        var starttime  = (d.meta.start -
                           (new Date().getTimezoneOffset() * 60)) * 1000;
        var step       = d.meta.step * 1000;
        var series_cnt = d.meta.legend.length;

        if ($this.highchart.series.length != series_cnt) {
          while ($this.highchart.series.length > 0) {
            $this.highchart.series.pop ();
          }

          for (var i = 0; i < series_cnt; i++) {
            var serie_opts = {
              name: d.meta.legend[i],
            };

            $this.highchart.addSeries (serie_opts);
          }
        }

        if (d.data.length > 0) {
          while (d.data[d.data.length - 1][0] == null) {
            d.data.pop ();
          }
        }

        var series = [];
        for (var i = 0; i < d.data.length; i++) {
          var serie = [ starttime + (i * step), d.data[i][0] ];
          series.push (serie);
        }

        $this.highchart.series[0].setData (series);

        $this.onPlotted ();
      },
    });
  },

  onPlotted: function () {
    var $this = this;
    setTimeout(function () { $this.fetchData() }, 60 * 1000);
  },
});
