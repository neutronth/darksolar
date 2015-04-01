/* RegisterTrackingUtils */
RegisterTrackingUtils = function () {
};

/* RegisterTrackingView */
window.RegisterTrackingView = Backbone.View.extend({
  initialize: function () {
      this.RegisterTrackingUtils = new RegisterTrackingUtils ();

  },

  render: function () {
    $(this.el).html ('');
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
    this.initEvents ();
    this.fetch ();
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
      </div><div id="list-area"></div>');

    var toolbararea = $('#toolbar-area', this.$el);
    toolbararea.html (new RegisterTrackingSearchToolbarView ({
                        targetView: this,
                        searchTxt: this.searchTxt,
                      }).render ().el);

    var listarea = $('#list-area', this.$el);

    listarea.html (new RegisterTrackingItemHeaderView ().el);

    var table_body = $('tbody', listarea);

    if (options && options.fail) {
      table_body.append ('<td colspan="8">' +
                         new AlertCouldNotGetDataView ().$el.html () +
                         '</td>');
      $(this.el).i18n();
      return this;
    }

    var listno = (this.model.currentPage * this.model.perPage);

    debug.log (this.model.models);

    var thaipersonalid_label = "<span class='label label-primary'>T</span>";
    var passportid_label = "<span class='label label-primary'>P</span>";

    _.each (this.model.models, function (ac) {
      if (ac.attributes['meta'] != undefined &&
            ac.attributes['registered'].to != undefined) {
        ac.attributes['listno'] = ++listno; 

        locale = $.i18n.lng ();
        topts = { day: 'numeric', month: 'long', year: 'numeric',
                  hour: 'numeric', minute: 'numeric' };
        ac.attributes['timestamp'] = new Intl.DateTimeFormat(locale, topts).format(new Date (ac.get ('registered').timestamp));
        ac.attributes['serialpadded'] = ((1e15 + ac.get ('serialno') + "").slice(-4));

        var personid = ac.attributes['registered'].to.personid;
        var sep = personid.lastIndexOf (':');
        var id_type = personid.substr (0, sep);
        var id_text = personid.substr (sep+1);
        var id_label = id_type == "Thai Personal ID" ? "T" : "P";
        var id_label_title = id_label == "T" ? $.t("user:form.Thai Personal ID") : $.t("user:form.Passport No");
        ac.attributes['personid_label_title'] = id_label_title;
        ac.attributes['personid_label'] = id_label;
        ac.attributes['personid'] = id_text;

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
        table_body.append ('<td colspan="8">' +
                           new AlertNoDataView ().$el.html () +
                           '</td>');
      }
    }

    var Page = new RegisterTrackingListPaginator ({ model: this.model });
    $(this.el).append (Page.el);

    $(this.el).i18n();

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

window.RegisterTrackingSearchToolbarView = SearchToolbarView.extend({
  initialize: function (opts) {
    $.extend (this, opts);

    this.defaultSettings ({
      idPrefix: 'user',
      searchable: true,
    });

    this.render ();
  },
});

window.RegisterTrackingItemHeaderView = Backbone.View.extend ({
  initialize: function () {
    this.render ();
  },

  render: function () {
    $(this.el).html (this.template (this));

    return this;
  },
});
