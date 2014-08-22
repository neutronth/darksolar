window.TableBody = {
  apply : function (el) {
    var viewport_w = $(window).width ();
    if (viewport_w > 960) {
      var $tbc = $('tbody', el);
      var $tbh = $('thead', el);
      var $pg  = $('#pagination', el);
      var $btb = $('#bottomtoolbar');
      var viewport_h = $(window).height ();
      var tbc_top    = $tbc.offset().top - $(window).scrollTop();
      var tbh_w      = $tbh.width ();
      var bottomtoolbar_h = $btb != undefined ? $btb.height () : 0;
      var pagination_h    = $pg.height () + 30;
      var tbc_h = viewport_h - tbc_top - bottomtoolbar_h - pagination_h; 

      $('tbody', this.$el)
        .css ('height', tbc_h)
        .css ('width', tbh_w - 10);

      $pg.css ('padding-top', tbc_h + 5);
    }
  }
};
