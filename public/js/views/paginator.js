window.Paginator = Backbone.View.extend({

  className: 'btn-group',
  pageName: 'paging',
  perPage: 10,

  initialize:function (opts) {
      $.extend (this, opts);

      this.model.bind('reset', this.render, this);
      this.render();
  },

  events: {
    "click button[class!='btn btn-primary']" : "onClick",
  },

  render: function () {

      var collection = this.model;

      $(this.el).html('<div class="btn-group" id="pagination"></div>');

      var page = Math.floor (collection.currentPage / this.perPage);
      var pstart = page * this.perPage;
      var pend   = pstart + this.perPage;
      pend = pend > collection.totalPages ? collection.totalPages : pend;

      if (pstart > 0) {
        $('#pagination', this.$el).append ('\
          <span class="btn" id="skip_first_' + this.pageName + '">&laquo;</span>');
        $('#pagination', this.$el).append ('\
          <span class="btn" id="skip_prev_' + this.pageName + '">&lsaquo;</span>');
      }

      for (var i = pstart; i < pend; i++) {
        var active = collection.currentPage == i ? 'btn-primary' : '';

        $('#pagination', this.$el).append ('\
          <button class="btn ' + active + '" id="' + this.pageName + '_'
          + (i+1) + '">' + (i+1) + '</button>');
      }

      if (pend < collection.totalPages) {
        $('#pagination', this.$el).append ('\
          <span class="btn" id="skip_next_' + this.pageName + '">&rsaquo;</span>');
        $('#pagination', this.$el).append ('\
          <span class="btn" id="skip_last_' + this.pageName + '">&raquo;</span>');
      }

      $('#pagination', this.$el).find ('button')
        .css ('padding-left', '12px')
        .css ('padding-right', '12px')
        .css ('padding-top', '7px')
        .css ('padding-bottom', '7px');

      var _this = this;

      $('#pagination', this.$el).find ('span[id^="skip"]')
        .css ('padding-left', '12px')
        .css ('padding-right', '12px')
        .css ('padding-top', '7px')
        .css ('padding-bottom', '7px')
        .css ('font-size', '12pt')
        .click (function (event) {
          var btn = $(event.target, event.delegateTarget);
          var next  = /next/;
          var prev  = /prev/;
          var first = /first/;
          var last  = /last/;
          var id    = btn.attr ('id');

          if (next.test (id)) {
            btn.text (pend + 1);
          } else if (prev.test (id)) {
            btn.text (pstart);
          } else if (last.test (id)) {
            btn.text (collection.totalPages);
          } else {
            btn.text ('1');
          }

          _this.onClick (event);
        });

      return this;
  },

  onClick: function (event) {
    $('button', event.delegateTarget).removeClass ('btn-primary');
    $(event.target, event.delegateTarget).addClass ('btn-primary');
  },
});
