window.ForceLogoutModalView = Backbone.View.extend ({
  initialize: function (opts) {
    $.extend (this, opts);
    this.render ();
  },

  events: {
    'click button#modalConfirm' : 'onClickConfirm',
  },

  render: function () {
    $(this.el).html (this.template (this));
    $(this.el).i18n ();

    this.$el.modal ({ show: false, backdrop: 'static' });

    return this;
  },

  show: function () {
    $('#forcelogout_modal').modal ('show');
  },

  onClickConfirm: function () {
    window.location = '/logout';
  },
});
