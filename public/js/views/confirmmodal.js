window.ConfirmModalView = Backbone.View.extend ({
  modal_id: 'modal',
  modal_header: '',
  modal_body: '',

  initialize: function (opts) {
    this.modal_header =
      '<h2 data-i18n="app:message.Are you sure ?">Are you sure ?</h2>';
    this.modal_body =
      '<p><span data-i18n="app:message.The delete operation could not be undone">The "delete" operation could not be undone</span></p><p><span data-i18n="app:message.please confirm your intention">please confirm your intention.</span></p>';

    $.extend (this, opts);
    this.render ();
  },

  events: {
    'click button#modalCancel' : 'onClickCancel',
    'click button#modalConfirm' : 'onClickConfirm',
  },

  render: function () {
    $(this.el).html (this.template (this));
    $(this.el).i18n ();

    this.$el.modal ({ show: false, backdrop: 'static' });

    return this;
  },

  show: function () {
    $('#confirmmodal_' + this.modal_id).modal ('show');
  },

  onClickCancel: function () {
    $('#confirmmodal_' + this.modal_id).modal ('hide');
  },

  onClickConfirm: function () {
    $('#confirmmodal_' + this.modal_id).modal ('hide');
    $('body').removeClass('modal-open');
    $('.modal-backdrop').remove ();
    this.targetView.trigger (this.confirm_trigger);
  },
});
