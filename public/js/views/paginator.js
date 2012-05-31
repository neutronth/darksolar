window.Paginator = Backbone.View.extend({

  className: 'btn-group',
  pageName: 'paging',

  initialize:function (opts) {
      $.extend (this, opts);

      this.model.bind('reset', this.render, this);
      this.render();
  },

  events: {
    "click button" : "onClick",
  },

  render: function () {

      var collection = this.model;

      $(this.el).html('<div class="btn-group" id="pagination"></div>');

      for (var i=0; i < collection.totalPages; i++) {
        var active = collection.currentPage == i ? 'btn-primary' : '';

        $('#pagination', this.$el).append ('\
          <button class="btn ' + active + '" id="' + this.pageName + '_'
          + (i+1) + '">' + (i+1) + '</button>');
      }

      return this;
  },

  onClick: function (event) {
    $('button', event.delegateTarget).removeClass ('btn-primary');
    $(event.target, event.delegateTarget).addClass ('btn-primary');
  },
});
