// The Template Loader. Used to asynchronously load templates located in separate .html files
window.templateLoader = {
  load: function(views, callback) {
    var deferreds = [];
    $.each(views, function(index, view) {
      if (window[view]) {
        deferreds.push($.get('tpl/' + view + '.html', function(data) {
          window[view].prototype.template = _.template(data);
        }, 'html'));
      } else {
        alert(view + " not found");
      }
    });

    $.when.apply(null, deferreds).done(callback);
  }
};

window.debug = {
  level: {
    error:   "Error",
    warning: "Warning",
    info:    "Info",
    success: "Success",
  },

  log:    !production ? console.log   : function () {},
  info:   !production ? console.info   : function () {},
  warn:   !production ? console.warn   : function () {},
  error:  !production ? console.error  : function () {},
  assert: !production ? console.assert : function () {},
};
