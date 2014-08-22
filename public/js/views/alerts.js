window.AlertMessageView = Backbone.View.extend({
  type: 'error',

  icon_lookup: {
    success: 'icon-ok-sign',
    error:   'icon-fire',
    warning: 'icon-exclamation-sign',
    info: 'icon-info-sign',
    'default': 'icon-info-sign',
  },

  icon: 'icon-info-sign',

  initialize: function (opts) {
    $.extend (this, opts);
    this.render ();
  },

  render: function () {
    this.type = this.type == "error" ? "danger" : this.type;
    this.icon = this.icon_lookup[this.type] ?
                  this.icon_lookup[this.type] : this.icon_lookup['default'];
    $(this.el).html (this.template (this));
    $(this.el).i18n ();

    var msg = $('.alert', this.$el);
    msg.addClass ('alert-' + this.type);
    msg.alert ();

    var timeoutId = setTimeout (function () {
      msg.alert ('close');
    }, 3000);
  },
});

window.AlertView = Backbone.View.extend({
  serverity: 'warning',
  data_i18n: '',
  message: '',

  initialize: function (opts) {
    $.extend (this, opts);
    this.render ();
  },

  render: function (opts) {
    $(this.el).html ('<div class="alert alert-' + this.serverity + '" ' +
                     'style="text-align: center; margin: 10px;" data-i18n="' +
                     this.data_i18n + '">' + this.message + '</div>');
    $(this.el).i18n ();
    return this;
  },
});

window.AlertNoDataView = AlertView.extend({
  initialize: function () {
    this.serverity = 'warning';
    this.data_i18n = 'app:message.No data';
    this.message   = 'No data';
    this.render ();
  },
});

window.AlertCouldNotGetDataView = AlertView.extend({
  initialize: function () {
    this.serverity = 'danger';
    this.data_i18n = 'app:message.Could not get data';
    this.message   = 'Could not get data';
    this.render ();
  },
});

window.AlertErrorFocus = function (el) {
  $('p.help-block[data-error]', el).each (function (index) {
    var $this = $(this);
    if ($this.html () != "") {
      var $input = $(':input', $this.parent ());

      if ($input)
        $input.focus ();

      return false;
    }
  });
};
