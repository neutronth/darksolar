/* jshint shadow: true */

window.ChartsView = Backbone.View.extend({
  options: {
    name:    "default",
    height:  "250px",
    width:   "100%",
  },

  highchart:     undefined,
  highchart_options: {  },

  initialize: function (opts) {
    debug.info ('Initializing Charts');
    this.options = $.extend ({}, this.options, opts);
    this.options.title_prefix = this.options.title;
    this.options.chart_data_prefix = this.options.chart_data.replace (".json", "");
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
    if (this.highchart_options.chart === undefined) {
      this.highchart_options.chart = {};
    }

    this.highchart_options.title = { text: this.options.title };
    if (this.options.colors === undefined) {
      this.highchart_options.colors = [ '#EE7700', '#0088DD', '#1F3300', '#DDDF00', '#24CBE5', '#64E572', '#FF9655', '#FFF263', '#6AF9C4'];
    } else {
      this.highchart_options.colors = this.options.colors;
    }

    this.highchart_options.chart = $.extend (this.highchart_options.chart,
      { renderTo: this.options.name });

    if (this.highchart === undefined)
      this.highchart = new Highcharts.Chart (this.highchart_options);
    else
      this.highchart.redraw ();

    this.fetchData ();
  },

  fetchData: function () {
    var $this = this;

    $.ajax ({
      context: this,
      url: $this.options.chart_data,
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
          while (d.data[d.data.length - 1][0] === null) {
            d.data.pop ();
          }
        }

        for (var i = 0; i < series_cnt; i++) {
          var series = [];
          for (var j = 0; j < d.data.length; j++) {
            var serie = [ starttime + (j * step), d.data[j][i] ];
            series.push (serie);
          }

          $this.highchart.series[i].setData (series);
        }

        $this.onPlotted ();
      },
    });
  },

  onPlotted: function () {
    var $this = this;
    setTimeout(function () { $this.fetchData(); }, 60 * 1000);
  },

  formatter: function (value, decimals) {
    var ret;

    if (value > 1000000000000) { // use G abbreviation
      ret = (value / 1000000000000).toFixed(decimals) +'T';
    } else if (value > 1000000000) { // use G abbreviation
      ret = (value / 1000000000).toFixed(decimals) +'G';
    } else if (value > 1000000) { // use M abbreviation
      ret = (value / 1000000).toFixed(decimals) +'M';
    } else if (value > 1000) { // use k abbreviation
      ret = (value / 1000).toFixed(decimals) +'k';
    } else { // strings (categories) and small numbers
      ret = value.toFixed(decimals);
    }
    return ret;
  },
});
