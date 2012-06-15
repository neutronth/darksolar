/* RegisterTrackingUtils */
RegisterTrackingUtils = function () {
};

RegisterTrackingUtils.prototype.getFormActions = function (name) {
  var action = '';
  action += '<div class="form-actions">';
  action += '  <button class="btn btn-primary" id="' + name + 'save"><i class="icon-ok icon-white"></i> Save changes</button>';
  action += '  <button class="btn" id="' + name + 'cancel"><i class="icon-remove"></i> Cancel</button>';
  action += '</div>';
  return action;
};

/* RegisterTrackingView */
window.RegisterTrackingView = Backbone.View.extend({
  initialize: function () {
      this.RegisterTrackingUtils = new RegisterTrackingUtils ();

  },

  render: function () {

    $(this.el).html ('');
    $(this.el).append (new UserSubNavView ().el);
    $(this.el).append (this.template ());

    return this;
  },
});

/* RegisterTrackingListView */
window.RegisterTrackingListView = Backbone.View.extend({

  initialize: function (opts) {
    this.searchTxt = '';

    $.extend (this, opts);

    this.model = new AccessCodeCollection ();
    this.initModel ();
    this.model.fetch ();

    this.initEvents ();
  },

  initModel: function () {
  },

  initEvents: function () {
    this.model.on ('add change reset', this.render, this);
    this.on ('search', this.search, this);
  },

  render: function () {
    var o = this;
    $(this.el).html ('<div id="toolbar-area" style="padding-bottom: 10px;">\
      </div><div id="list-area"></div>');

    var toolbararea = $('#toolbar-area', this.$el);
    toolbararea.html (new SearchToolbarView ({ targetView: this,
                        searchTxt: this.searchTxt,
                      }).render ().el);

    var listarea = $('#list-area', this.$el);

    listarea.html ('<table class="table table-bordered table-striped">\
      <thead><tr>\
        <th>#</th><th>Timestamp</th><th>Username</th><th>Firstname</th>\
        <th>Surname</th><th>ID</th><th>Access Code</th><th>Package</th>\
      </tr></thead>\
      <tbody></tbody></table>');

    var table_body = $('tbody', listarea);
    var listno = (this.model.currentPage * this.model.perPage);

    debug.log (this.model.models);

    _.each (this.model.models, function (ac) {
      if (ac.attributes['meta'] != undefined &&
            ac.attributes['registered'].to != undefined) {
        ac.attributes['listno'] = ++listno; 
        ac.attributes['timestamp'] = new Date (ac.get ('registered').timestamp).format ('d mmm yyyy HH:MM');
        ac.attributes['serialpadded'] = ((1e15 + ac.get ('serialno') + "").slice(-4));
        
        debug.log (ac);
  
        var item = new RegisterTrackingItemView ({ model: ac });
        table_body.append (item.el);
        item.$el.attr ('id', ac.attributes['_id']);
      }
    });

    if (this.model.models.length <= 0 ||
        listno == (this.model.currentPage * this.model.perPage)) {
      if (this.model.currentPage != 0) {
        this.model.goTo (this.model.currentPage - 1);
      } else {
        table_body.append ('<td colspan="8" style="text-align: center">No data</td>');
      }
    }

    var Page = new RegisterTrackingListPaginator ({ model: this.model });
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
});

/* RegisterTrackingItemView */
window.RegisterTrackingItemView = Backbone.View.extend ({
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

/* RegisterTrackingListPaginator */
window.RegisterTrackingListPaginator = Paginator.extend({
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
