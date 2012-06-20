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

  initialize: function (opts) {
    this.searchTxt = '';

    $.extend (this, opts);

    this.model = new RadiusOnlineUserCollection ();
    this.initModel ();
    this.model.fetch ();

    this.initEvents ();

    this.setIntervalFetch ();

  },

  events: {
    'click button#kickConfirm': 'onKickConfirm',
    'click button#kickCancel': function () {
      $('#kickConfirm').modal ('hide');
    },
  },

  initModel: function () {
  },

  initEvents: function () {
    this.model.on ('add change reset', this.render, this);
    this.on ('search', this.search, this);
  },

  setIntervalFetch: function () {
    var _this = this;
  
    this.intervalFetch = setInterval (function () {
      _this.model.fetch ({
        success: function () {
          _this.render ();
        },
      })
    }, 60000);
  },

  clearIntervalFetch: function () {
    clearInterval (this.intervalFetch);
  },

  render: function () {
    var o = this;
    $(this.el).html ('<div id="toolbar-area" style="padding-bottom: 10px;">\
      </div><div id="list-area"></div>\
      <div class="modal" id="kickConfirm"></div>');

    var toolbararea = $('#toolbar-area', this.$el);
    this.toolbarView = new RadiusOnlineUserToolbarView ({ targetView: this,
                        searchTxt: this.searchTxt,
                      });

    toolbararea.html (this.toolbarView.render ().el);

    var listarea = $('#list-area', this.$el);

    listarea.html ('<table class="table table-bordered table-striped">\
      <thead><tr>\
        <th><input type="checkbox" id="user_selectall"></th>\
        <th>#</th><th>Username</th><th>Firstname</th>\
        <th>Surname</th><th>Package</th>\
        <th>IP</th><th>MAC Address</th>\
        <th>NAS IP</th>\
        <th>Start</th><th>Usage</th>\
      </tr></thead>\
      <tbody></tbody></table>');

    var table_body = $('tbody', listarea);
    var listno = (this.model.currentPage * this.model.perPage);

    _.each (this.model.models, function (ac) {
      debug.log ('data', ac);
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
        checkbox.attr ('checked', check);
        onCheck (checkbox);
      });
    });

    if (this.model.models.length <= 0 ||
        listno == (this.model.currentPage * this.model.perPage)) {
      if (this.model.currentPage != 0) {
        this.model.goTo (this.model.currentPage - 1);
      } else {
        table_body.append ('<td colspan="11" style="text-align: center">No data</td>');
      }
    }

    var kickConfirm = $('#kickConfirm', this.$el);
    kickConfirm.append ('<div class="modal-header"></header>');
    kickConfirm.append ('<div class="modal-body"></header>');
    kickConfirm.append ('<div class="modal-footer"></header>');

    var mhead   = $('.modal-header', kickConfirm);
    var mbody   = $('.modal-body', kickConfirm);
    var mfooter = $('.modal-footer', kickConfirm);

    mhead.append ('<h2>Are you sure ?</h2>');
    mbody.append ('<p>The "kick" operation could not be undone, please confirm your intention.</p>');
    mfooter.append ('<button class="btn btn-danger" id="kickConfirm"><i class="icon-fire icon-white"></i> Confirm</button>');
    mfooter.append ('<button class="btn btn-primary" id="kickCancel"><i class="icon-repeat icon-white"></i> Cancel</button>');

    kickConfirm.modal ({ backdrop: 'static' });
    kickConfirm.modal ('hide');
    kickConfirm.addClass ('fade');

    var Page = new RadiusOnlineUserListPaginator ({ model: this.model });
    $(this.el).append (Page.el);

    return this;
  },

  search: function (searchtxt) {
    this.searchTxt = searchtxt;

    if (!searchtxt) {
      this.model.filter = undefined;
      this.model.fetch ();
    } else {
      this.model.filter = this.getFilter (searchtxt);
      this.model.fetch ();
    }

    debug.log (this.model.filter);
    this.render ();
  },

  getFilter: function (searchtxt) {
    var filters = [];
    if (searchtxt != undefined) { 
      var tchk = searchtxt.split (/-/);
      var timestamp = new Date ('Invalid Date');

      if (tchk[2] != undefined) {
        tchk = searchtxt.split (/-| |\//);
        if (tchk[1] != undefined) {
          timestamp = new Date (searchtxt);
        }
      }

      if (timestamp.getDate () >= 0) {
        var filter = {};
        filter['timestamp'] = timestamp;
        filters.push (filter);
      } else {
        var s = searchtxt.split (' ');
        for (var i = 0; i < s.length; i++) {
          if (s[i] == '')
            continue;

          var filter = {};
          var acchk = s[i].split (/-|\//);
          if (acchk[2] != undefined) {
            filter['timestamp'] = new Date (acchk[1] + '/' + acchk[0] + '/' + acchk[2]);
          } else if (acchk[1] != undefined) {
            filter['accesscode'] = s[i];
          } else {
            filter['username']  = s[i];
            filter['firstname'] = s[i];
            filter['surname']   = s[i];
          }
          filters.push (filter);
        }
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

window.RadiusOnlineUserToolbarView = SearchToolbarView.extend ({
  render: function () {
    //SearchToolbarView.prototype.render.call (this);
    this.$el.html ('');
    this.$el.append ('<button class="btn btn-success" id="btnRefresh"><i class="icon-refresh icon-white"></i> Refresh</button> ');
    this.$el.append ('<button class="btn btn-danger" id="btnKick" disabled><i class="icon-off icon-white"></i> Kick</button>');

    return this;
  },

  events: {
    'click button#search': 'onClickSearch',
    'click button#btnKick': 'onClickKick',
    'click button#btnRefresh': 'onClickRefresh',
  },

  updateButton: function () {
    var kickBtn = $('#btnKick', this.$el);

    var listarea = $('#list-area');
    var table_body = $('tbody', listarea);
    var checked = $('input[type="checkbox"]:checked', table_body);

    if (checked.length > 0) {
      kickBtn.attr ('disabled', false);
    } else {
      kickBtn.attr ('disabled', true);
    }
  },

  onClickKick: function () {
    $('#kickConfirm').modal ('show');
  },

  onClickRefresh: function () {
    var view = this.targetView;
    view.model.fetch ({
      success: function () {
        view.render ();
      }
    })
  },
});
