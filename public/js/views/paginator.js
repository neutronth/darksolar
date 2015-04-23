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

      $(this.el).html('<div class="btn-group" id="pagination" style="margin-top: 10px"></div>');

      var page = Math.floor (collection.currentPage / this.perPage);
      var pstart = page * this.perPage;
      var pend   = pstart + this.perPage;
      pend = pend > collection.totalPages ? collection.totalPages : pend;

      if (pstart > 0) {
        $('#pagination', this.$el).append ('\
          <button class="btn btn-default" id="skip_first_' + this.pageName + '"><span class="fa fa-angle-double-left"></span></button>');
        $('#pagination', this.$el).append ('\
          <button class="btn btn-default" id="skip_prev_' + this.pageName + '"><span class="fa fa-angle-left"></span></button>');
      }

      for (var i = pstart; i < pend; i++) {
        var active = collection.currentPage == i ? 'btn-primary' : 'btn-default';

        $('#pagination', this.$el).append ('\
          <button class="btn ' + active + '" id="' + this.pageName + '_' + (i+1) + '">' + (i+1) + '</button>');
      }

      if (pend < collection.totalPages) {
        $('#pagination', this.$el).append ('\
          <button class="btn btn-default" id="skip_next_' + this.pageName + '"><span class="fa fa-angle-right"></span></button>');
        $('#pagination', this.$el).append ('\
          <button class="btn btn-default" id="skip_last_' + this.pageName + '"><span class="fa fa-angle-double-right"></span></button>');
      }

      $('#pagination', this.$el).find ('button')
        .css ('padding-left', '12px')
        .css ('padding-right', '12px')
        .css ('padding-top', '7px')
        .css ('padding-bottom', '7px');

      var _this = this;

      $('#pagination', this.$el).find ('button[id^="skip"]')
        .css ('padding-left', '12px')
        .css ('padding-right', '12px')
        .css ('padding-top', '7px')
        .css ('padding-bottom', '7px')
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
