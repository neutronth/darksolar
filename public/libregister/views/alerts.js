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
