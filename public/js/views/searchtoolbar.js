window.SearchToolbarView = Backbone.View.extend({
  delete_confirm_modal: {},

  initialize: function (opts) {
    $.extend (this, opts);
    this.defaultSettings ();
  },

  defaultSettings: function (settings) {
    this.settings = {
      idPrefix: '',
      searchable: false,
      btnNew: false, 
      btnDelete: false, 
    };

    if (settings)
      $.extend (this.settings, settings);

    this.initEvents ();
  },

  initEvents: function () {
    this.on ("delete_confirm", this.onDeleteConfirm, this);
  },

  events: {
    'click button#search': 'onClickSearch',
    'click button#reset': 'onClickReset',
    'click button#new': 'onClickNew',
    'click button#delete': 'onClickDelete',
  },

  render: function (opts) {
    $(this.el).html (this.template (this.settings));

    if (this.searchTxt) {
      var search = $('input[type="text"]', this.$el);
      search.val (this.searchTxt);
    }

    var search = $('input[type="text"]', this.$el);
    search.click (function (event) {
      this.select ();
    });

    search.keyup (function (event) {
      if (event.keyCode == 13) {
        $('#search', this.$el).click ();
      }
    });

    this.delete_confirm_modal = new ConfirmModalView ({ modal_id: 'delete',
      confirm_trigger: 'delete_confirm',
      targetView: this });

    $('#modal-area-confirmation').html (this.delete_confirm_modal.el);
    $(this.el).i18n();

    return this;
  },

  onClickSearch: function () {
    var searchtxt = $('input[type="text"]', this.$el);
    debug.log ("Search", searchtxt.val ());
    this.targetView.trigger ('search', searchtxt.val ());
  },

  onClickReset: function () {
    var searchtxt = $('input[type="text"]', this.$el);
    searchtxt.val ("");
    debug.log ("Reset");
    this.targetView.trigger ('search', searchtxt.val ());
  },

  onClickNew: function () {
    this.targetFormView.trigger (this.settings.idPrefix + 'new');
  },

  onClickDelete: function () {
    if (this.targetFormView.model.isNew ()) {
      this.targetFormView.notify ($.t('app:message.Nothing deleted'), 'warning');
      return;
    }

    this.delete_confirm_modal.show ();
  },

  onDeleteConfirm: function () {
    this.targetFormView.trigger (this.settings.idPrefix + 'delete');
  },
});
