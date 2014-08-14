window.MainToolbarView = Backbone.View.extend ({
  tagName: 'div',
  className: 'main-toolbar',

  initialize: function (opts) {
    $.extend (this, opts);
    this.defaultSettings ();
  },

  defaultSettings: function (settings) {
    this.settings = {
      idPrefix: '',
      btnSave: false,
      btnCancel: false,
    };

    if (settings)
      $.extend (this.settings, settings);
  },

  events: {
    "click button#save" : "onClickSave",
    "click button#cancel" : "onClickCancel",
  },

  render: function () {
    $(this.el).html (this.template (this.settings));
    $(this.el).i18n ();
    return this;
  },

  onClickSave: function () {
    this.targetView.trigger ('save');
  },

  onClickCancel: function () {
    this.targetView.trigger ('cancel');
  },
});
