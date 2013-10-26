window.SearchToolbarView = Backbone.View.extend({
  initialize: function (opts) {
    $.extend (this, opts);

    this.render ();
  },

  events: {
    'click button#search': 'onClickSearch',
  },

  render: function (opts) {
    $(this.el).html (this.template ());

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

    $(this.el).i18n();

    return this;
  },

  onClickSearch: function () {
    var searchtxt = $('input[type="text"]', this.$el);
    debug.log ("Search", searchtxt.val ());
    this.targetView.trigger ('search', searchtxt.val ());
  },
});
