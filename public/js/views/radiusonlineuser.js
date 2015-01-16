/* RadiusOnlineUserView */
window.RadiusOnlineUserView = Backbone.View.extend({
  initialize: function () {
  },

  render: function () {

    $(this.el).html ('');
    $(this.el).append (new UserSubNavView ().el);
    $(this.el).append (this.template ());

    return this;
  },
});

/* RadiusOnlineUserListView */
window.RadiusOnlineUserListView = Backbone.View.extend({
  firstrun: true,

  initialize: function (opts) {
    this.searchTxt = '';

    $.extend (this, opts);

    this.model = new RadiusOnlineUserCollection ();
    this.initModel ();
    this.initEvents ();
    this.fetch ();

    this.setIntervalFetch ();
  },

  initModel: function () {
  },

  initEvents: function () {
    this.model.on ('add change sync reset', this.render, this);
    this.model.on ('sync reset', function () {
      window.spinner.stop ();
    });
    this.model.on ('fetch:started', function () {
      window.spinner.spin ();
    });

    this.on ('search', this.search, this);

    this.on ('kick_confirm', this.onKickConfirm, this);
  },

  setIntervalFetch: function () {
    var _this = this;

    if (window.intervalFetch['onlineuser'] != undefined) {
      clearInterval (window.intervalFetch['onlineuser']);
    }
  
    window.intervalFetch['onlineuser'] = setInterval (function () {
      var active = $('#radonlineuser-content');

      if (active.length > 0) {
        _this.fetch ();
      } else {
        _this.clearIntervalFetch ();
      }
    }, 60000);
  },

  clearIntervalFetch: function () {
    clearInterval (window.intervalFetch['onlineuser']);
  },

  fetch: function () {
    var _this = this;

    this.model.fetch ({
      error: function (err) {
        debug.log ('Failed', err);
        window.spinner.stop ();
        _this.render ({fail: true});
      },
    });
  },

  render: function (options) {
    var o = this;
    $(this.el).html ('<div id="toolbar-area" style="padding-bottom: 10px;">\
      </div><div id="list-area"></div>\
      <div class="modal" id="kickConfirm"></div>');

    var toolbararea = $('#toolbar-area', this.$el);
    this.toolbarView = new OnlineUserToolbarView ({ targetView: this,
                        searchTxt: this.searchTxt,
                      });

    toolbararea.html (this.toolbarView.render ().el);

    var listarea = $('#list-area', this.$el);

    listarea.html (new RadiusOnlineUserItemHeaderView ().el);

    var table_body = $('tbody', listarea);

    if (options && options.fail) {
      table_body.append ('<td colspan="7">' +
                         new AlertCouldNotGetDataView ().$el.html () +
                         '</td>');
      var kickConfirm = $('#kickConfirm', this.$el);
      kickConfirm.modal ({ backdrop: 'static' });
      kickConfirm.modal ('hide');
      this.$el.i18n();

      return this;
    }

    var listno = (this.model.currentPage * this.model.perPage);

    _.each (this.model.models, function (ac) {
      debug.log ('data', ac);
      ac.attributes['title_description'] = $.t("onlineusers:title.Description");
      ac.attributes['title_macaddress'] = $.t("onlineusers:title.MAC Address");
      ac.attributes['title_nasip'] = $.t("onlineusers:title.NAS IP");
      ac.attributes['title_start'] = $.t("onlineusers:title.Start");
      ac.attributes['listno'] = ++listno; 
      ac.attributes['starttime'] = new Date (ac.get ('acctstarttime')).format ('d mmm yyyy HH:MM');

      function secstotime (secs) {
        var t = new Date (1970,0,1);
        t.setSeconds (secs);
        var s = t.toTimeString ().substr (0,8);
        if(secs > 86399)
          s = Math.floor ((t - Date.parse ("1/1/70")) / 3600000) + s.substr (2);

        return s;
      }

      ac.attributes['usage'] = secstotime ((new Date ().getTime () - new Date (ac.get ('acctstarttime')).getTime ())/1000);
        
      var item = new RadiusOnlineUserItemView ({ model: ac });
      table_body.append (item.el);
      item.$el.attr ('id', ac.attributes['radacctid']);
    });

    $('input[type="checkbox"]', table_body).attr ('checked',
                                                  function (index, attr) {
      var id = $(this).parent ().parent ().attr ('id');
      var model = o.model.get (id);
      return model.check ? true : false;
    });

    function onCheck (elem) {
      var id = elem.attr ('id');

      if (id) {
        var model = o.model.get (id);
        var checkbox = elem;
        var check = checkbox.is (':checked');
        model.check = check;

        var row = elem.parent ().parent ();
        if (check) {
          $
          row.attr ('data-oldbackground', row.children (':first-child').css ('background'));
          row.attr ('data-oldcolor', row.css ('color'));

          row.children ().css ('background', '#ccccff');
          row.css ('color', '#3366cc');

          o.clearIntervalFetch ();
        } else {
          row.children ().css ('background', row.attr ('data-oldbackground'));
          row.css ('color', row.attr ('data-oldcolor'));
        }
      }

      o.toolbarView.updateButton ();
    }

    $('input[type="checkbox"]', table_body).click (function (event) {
      onCheck ($(this));
    });

    $('#user_selectall', this.$el).click (function (event) {
      var check = $(this).is (':checked');

      $('input[type="checkbox"]', table_body).each (function (index) {
        var checkbox = $(this);
        checkbox.prop ('checked', check);
        onCheck (checkbox);
      });
    });

    if (this.model.models.length <= 0 ||
        listno == (this.model.currentPage * this.model.perPage)) {
      if (this.model.currentPage != 0) {
        this.model.goTo (this.model.currentPage - 1);
      } else {
        if (!this.firstrun) {
          table_body.append ('<td colspan="7">' +
                             new AlertNoDataView ().$el.html () +
                             '</td>');
        } else {
          this.firstrun = false;
        }
      }
    }

    var Page = new RadiusOnlineUserListPaginator ({ model: this.model });
    $(this.el).append (Page.el);

    $(this.el).i18n();
    $('.rh-popover', this.$el).popover ({
      trigger: 'hover',
      placement: 'bottom',
      html: true
    });

    TableBody.apply (this.$el);
    return this;
  },

  search: function (searchtxt) {
    this.searchTxt = searchtxt;

    if (!searchtxt) {
      this.model.filter = undefined;
      this.fetch ();
    } else {
      this.model.filter = this.getFilter (searchtxt);
      this.fetch ();
    }

    debug.log (this.model.filter);
  },

  getFilter: function (searchtxt) {
    var filters = [];
    if (searchtxt != undefined) { 
      var s = searchtxt.split (' ');
      for (var i = 0; i < s.length; i++) {
        if (s[i] == '')
          continue;

        filters.push (s[i]);
      }
    }

    debug.log (JSON.stringify (filters));

    return JSON.stringify (filters);
  },

  onKickConfirm: function () {
    var _this = this;
    var listarea = $('#list-area');
    var table_body = $('tbody', listarea);
      
    $('input[type="checkbox"]', table_body).each (function (index) {
      var checkbox = $(this);
      var check = checkbox.is (':checked');

      if (check) {
        var id = checkbox.attr ('id');
        var model = _this.model.get (id);

        if (model) {
          model.destroy ({
            success: function () {
              _this.render ();
            },
          });
        }
      }
    });

    $('#kickConfirm').modal ('hide');
  },
});

/* RadiusOnlineUserItemView */
window.RadiusOnlineUserItemView = Backbone.View.extend ({
  tagName: 'tr',

  className: 'ac-item',

  initialize: function () {
    this.render ();
  },

  render: function () {
    $(this.el).html (this.template (this.model.toJSON ()));  

    return this;
  },
});

/* RadiusOnlineUserListPaginator */
window.RadiusOnlineUserListPaginator = Paginator.extend({
  pageName: 'aclist',

  initialize: function (opts) {
    Paginator.prototype.initialize.call (this);
  },

  onClick: function (event) {
    var btnname = $(event.target, event.delegateTarget).text ();
    var page = parseInt(btnname);
    var modelPageOffset = 1;
  
    this.model.goTo (page - modelPageOffset);

    Paginator.prototype.onClick (event); 
  },

});

window.OnlineUserSearchToolbarView = SearchToolbarView.extend({
  initialize: function (opts) {
    $.extend (this, opts);

    this.defaultSettings ({
      idPrefix: 'user',
      searchable: true,
      btnNew: false,
      btnDelete: false,
    });

    this.render ();
  },
});

window.OnlineUserToolbarView = Backbone.View.extend ({
  searchable: true,
  kick_confirm_modal: {},

  initialize: function (opts) {
    $.extend (this, opts);
    this.initEvents ();
  },

  initEvents: function () {
    var o = this;
    this.listenTo (this.targetView.model, 'sync reset',
      function () {
        o.updateButton ();
      });

    this.on ('kick_confirm', this.onKickConfirm, this);
  },

  render: function () {
    this.$el.html (this.template (this));
    var searchToolbarView = new OnlineUserSearchToolbarView ({
                              targetView: this.targetView,
                              searchTxt: this.searchTxt }).el;

    var search_container = $('#search_toolbar', this.$el);
    search_container.append (searchToolbarView);

    var modal_body = 
      '<p><span data-i18n="app:message.The kick operation could not be undone">The "kick" operation could not be undone</span></p><p><span data-i18n="app:message.please confirm your intention">please confirm your intention.</span></p>';

    this.kick_confirm_modal = new ConfirmModalView ({ modal_id: 'kick',
      confirm_trigger: 'kick_confirm',
      modal_body: modal_body,
      targetView: this });

    this.kick_confirm_modal.$el.i18n ();

    this.$el.i18n ();

    return this;
  },

  events: {
    'click button#btnKick': 'onClickKick',
    'click button#btnRefresh': 'onClickRefresh',
  },

  updateButton: function () {
    var kickBtn = $('#btnKick');
    var listarea = $('#list-area');
    var table_body = $('tbody', listarea);
    var checked = $('input[type="checkbox"]:checked', table_body);

    if (checked.length > 0) {
      kickBtn.prop ('disabled', false);
    } else {
      kickBtn.prop ('disabled', true);
    }
  },

  onClickKick: function () {
    $('#modal-area-confirmation').html (this.kick_confirm_modal.el);
    this.kick_confirm_modal.show ();
  },

  onClickRefresh: function () {
    var view = this.targetView;
    view.fetch ();
  },

  onKickConfirm: function () {
    this.targetView.trigger ('kick_confirm');
  },
});

window.RadiusOnlineUserItemHeaderView = Backbone.View.extend ({
  initialize: function () {
    this.render ();
  },

  render: function () {
    $(this.el).html (this.template (this));

    return this;
  },
});
