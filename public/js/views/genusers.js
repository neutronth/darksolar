/* GenUsersUtils */
GenUsersUtils = function () {
};

GenUsersUtils.prototype.getFormActions = function (name) {
  var action = '';
  action += '<div class="form-actions">';
  action += '  <button class="btn btn-primary" id="' + name + 'save"><i class="icon-ok icon-white"></i> <span data-i18n="app:button.save">Save changes</span></button>';
  action += '  <button class="btn" id="' + name + 'cancel"><i class="icon-remove"></i> <span data-i18n="app:button.cancel">Cancel</span></button>';
  action += '</div>';
  return action;
};

/* GenUsersView */
window.GenUsersView = Backbone.View.extend({
  initialize: function () {
      this.GenUsersUtils = new GenUsersUtils ();
  },

  events: {
    'click a#goback-btn' : 'gobackPane'
  },

  render: function () {
    $(this.el).html ('');
    $(this.el).append (this.template ());
    this.$el.i18n ();

    return this;
  },

  gobackPane: function () {
    $(".tab-pane", this.$el).removeClass ("in active");
    var active_pane = $(".tab-pane:first", this.$el);

    active_pane.addClass ("in active")
      .children ().trigger ('active_pane');
  }
});


/* GenUsersFormView */
window.GenUsersFormView = Backbone.View.extend({
  initialize: function (opts) {
    $.extend (this, opts);

    this.GenUsersUtils = new GenUsersUtils ();

    if (!this.model)
      this.newModel ();

    this.initEvents ();
    this.initModel ();
  },

  initEvents: function () {
    this.on ('guselected', function (model) {
      this.model = model;
      this.initModel.call (this);
      this.isChanges = 0;
      this.render ();
    }, this);

    this.on ('gumodify', function (model) {
      this.model = model;
      this.initModel.call (this);
      this.isChanges = 0;
      this.render ();
      this.activateFormPane.call (this);
    }, this);

    this.on ('gunew', function () {
      this.newModel ();
      this.render ();
      this.activateFormPane.call (this);
    }, this);

    this.on ('gudelete', function () {
      var o = this;

      this.model.destroy ({
        wait: true,

        success: function (model, response) {
          debug.info ("Success: Deleted");
          o.targetView.trigger ('gudeleted');
          o.notify ($.t('user:message.User has been deleted'), 'success');
        },
        error: function (model, response) {
          debug.error ("Failed Delete: ", response.responseText);
          o.notify ($.t ('user:message.Could not delete user') + ': ' +
                    response.responseText, 'error');
        },
      });

    }, this);

    this.on ('save', this.saveChanges, this);
    this.on ('cancel', this.cancel, this);
  },

  activateFormPane: function () {
    var parents = this.$el.parentsUntil (".tab-content-root");
    var cur_pane = this.$el.parentsUntil (".tab-content");

    $(".tab-pane", parents).removeClass ("in active");
    $(cur_pane).addClass ("in active");
  },

  initModel: function () {
    var o = this;

    this.model.on ('change', function () {
      o.isChanges = 1;
    });

    if (!permission.isRole ('Admin')) {
      this.model.amountMax = 36;
    }
  },

  setTargetView: function (view) {
    this.targetView = view;
  },

  createForm: function () {

    var fieldsets = [
      { legend: $.t('genusers:form.Profile'),
        fields: [ 'prefix', 'package', 'purpose', 'info', 'amount' ],
      },
    ];

    this.form = new Backbone.Form({
      model: this.model,

      fieldsets: fieldsets,
    });

    debug.log (this.form);

    this.form.render ();

    if (!this.model.isNew ()) {
      var prefix = $('input[name="prefix"]', this.form.$el);
      prefix.parent().html ('\
        <span class="uneditable-input" style="margin-top: 5px; display: block;">' + prefix.val () + '</span>');

      var package = $('select[name="package"]', this.form.$el);
      package.addClass ('disabled');
      package.attr ('disabled', 'true');

      var purpose = $('textarea[name="purpose"]', this.form.$el);
      purpose.addClass ('disabled');
      purpose.attr ('disabled', 'true');

      var amount  = $('input[name="amount"]', this.form.$el);
      amount.parent().html ('\
        <span class="uneditable-input" style="margin-top: 5px; display: block;">' + amount.val () + '</span>');
    }

    var info = $('textarea[name="info"]', this.form.$el);
    info.css ('height', 100);
    decoded_val = $('<div/>').html (this.model.get ("info")).text ();
    info.val (decoded_val);

    $('input', this.form.$el).iCheck(window.icheck_settings);
  },

  render: function () {
    $(this.el).html ('');
    $(this.el).append (new GenUsersToolbarView ({ targetView: this }).el);
    this.createForm ();
    $(this.el).append ('<div class="form-area"></div>');
    var form = $('.form-area', this.$el);
    form.html (this.form.el);

    $(this.el).i18n();

    return this;
  },

  newModel: function () {
    if (this.model)
      delete this.model;

    this.model = new GenUsersMeta ();
    this.initModel ();
    this.isChanges = 0;

    if (this.targetView)
      this.targetView.render ();
  },

  saveChanges: function () {
    var form = this.form;
    var m = this.model;
    var saveData = {};

    err = this.form.commit ({validate: true});

    if (!err) {
      debug.info ('New: %i', this.model.isNew ());

      if (!this.model.isNew ()) {
        if (!this.isChanges) {
          this.notify ($.t('app:message.Nothing changes'), 'warning');
          return this;
        }
      }

      var o = this;
      this.model.save (saveData, {
        wait: true,
        success: function (model, response) {
          debug.info ("Success: Saved");
          o.render ();
          o.isChanges = 0;

          o.notify ($.t('genusers:message.Generated Users have been saved'),
                    'success');

          if (o.targetView) {
            o.targetView.model.add (o.model, { at: 0 });
          }
        },
        error: function (model, response) {
          debug.error (response.responseText);
          o.notify ($.t('genusers:message.Generated Users save failed') + ': ' +
                    response.responseText, 'error');
        }
       });
     } else {
       this.notify ($.t('app:message.Invalid data'), 'error');
       AlertErrorFocus (this.form.$el);
     }
  },

  cancel: function () {
    if (this.model.isNew ()) {
      delete this.model;
      this.newModel ();

      this.render ();

      return this;
    }

    var v = this;

    this.model.fetch ({
      success: function () {
        v.render ();
      }
    });
  },

  notify: function (msg, type) {
    var area = $('.notification-area');
    var notify = new AlertMessageView ({ message: msg, type: type });
    area.append (notify.el);
  },
});

/* GenUsersListView */
window.GenUsersListView = Backbone.View.extend({
  firstrun: true,

  initialize: function (opts) {
    this.searchTxt = '';

    $.extend (this, opts);

    this.model = new GenUsersMetaCollection ();
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

    this.on ('gudeleted', this.render, this);
    this.on ('search', this.search, this);
  },

  events: {
    'active_pane' : 'fetch'
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
    toolbararea.html (new GenUsersSearchToolbarView ({ targetView: this,
                        targetFormView: this.targetView,
                        searchTxt: this.searchTxt,
                      }).render ().el);

    var listarea = $('#list-area', this.$el);

    listarea.html (new GenUsersItemHeaderView ().el);

    var table_body = $('tbody', listarea);

    if (options && options.fail) {
      table_body.append ('<td colspan="6">' +
                         new AlertCouldNotGetDataView().$el.html () +
                         '</td>');
      $(this.el).i18n();
      return this;
    }

    var listno = (this.model.currentPage * this.model.perPage);

    _.each (this.model.models, function (gu) {
      gu.attributes.issued_timestamp = new Date (gu.get ('issued').timestamp).format ('d mmm yyyy HH:MM');
      gu.attributes.expired_icon = '';

      var expire_data = gu.attributes.expiration;
      if (expire_data !== undefined) {
        if (expire_data.enabled === true) {
          var now = new Date ();
          var exp = new Date (expire_data.timestamp);
          if (now > exp) {
            gu.attributes.expired_icon = 'time';
          }
        }
      }

      if (gu.attributes.registered === undefined) {
        gu.attributes.registered = 0;
      }

      gu.attributes.register_all_icon = '';
      if (gu.attributes.registered == gu.attributes.amount) {
        gu.attributes.register_all_icon = 'check';
      }

      var item = new GenUsersItemView ({ model: gu });
      table_body.append (item.el);
      item.$el.attr ('id', gu.attributes._id);

      var print = $('#btnprint' + gu.attributes._id , this.$el);
      print.click (function (event) {
        var id = $(event.target).attr ('data-id');
        if (id === undefined) {
          id = $(event.target).parent().attr ('data-id');
        }

        window.open ('/api/genusers/pdfcard/' + id, '_blank');
      });

      var edit = $('#btnedit' + gu.attributes._id , this.$el);
      edit.click (function (event) {
        var id = $(event.target).attr ('data-id');
        if (id === undefined) {
          id = $(event.target).parent().attr ('data-id');
        }

        for (var i = 0; i < o.model.models.length; i++) {
          if (o.model.models[i].attributes._id == id) {
            o.targetView.trigger ('gumodify', o.model.models[i]);
            break;
          }
        }
      });
    });

    if (this.model.models.length <= 0) {
      if (this.model.currentPage !== 0) {
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

    var tviewModelId = o.targetView.model.get ('_id');
    if (tviewModelId) {
      var row = $('tr[id='+tviewModelId+']', this.$el);
      row.children ().css ('background', '#ccccff');
      row.css ('color', '#3366cc');
    }

    $('tr', this.$el).click ($.proxy (function (event) {
      for (var i = 0; i < this.model.models.length; i++) {
        if (this.model.models[i].attributes._id == event.delegateTarget.id) {
          this.targetView.trigger ('guselected', this.model.models[i]);
          this.render ();
          break;
        }
      }
    }, this));

    var Page = new GenUsersListPaginator ({ model: this.model });
    $(this.el).append (Page.el);

    $(this.el).i18n();

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
    var filter = {};
    if (searchtxt !== undefined) {
      var s = searchtxt.split (' ');
      for (var i = 0; i < s.length; i++) {
        filter.prefix  = s[i];
        filter.package = s[i];
        filter.purpose   = s[i];
        filter.amount   = s[i];
      }
    }

    debug.log (JSON.stringify (filter));

    return JSON.stringify (filter);
  },
});

window.GenUsersSearchToolbarView = SearchToolbarView.extend({
  initialize: function (opts) {
    $.extend (this, opts);

    this.defaultSettings ({
      idPrefix: 'gu',
      searchable: true,
      btnNew: true,
      btnDelete: true,
    });

    this.render ();
  },
});

window.GenUsersToolbarView = MainToolbarView.extend({
  initialize: function (opts) {
    $.extend (this, opts);

    this.defaultSettings ({
      idPrefix: 'gu',
      btnSave: true,
      btnCancel: true,
    });

    this.render ();
  },
});

/* GenUsersItemView */
window.GenUsersItemView = Backbone.View.extend ({
  tagName: 'tr',

  className: 'gu-item',

  initialize: function () {
    this.model.bind ('change', this.render, this);
    this.model.bind ('destroy', this.close, this);

    this.render ();
  },

  render: function () {
    $(this.el).html (this.template (this.model.toJSON ()));
    var maxlength = 15;
    $(this.el).each (function() {
      $(".autotrim", this).each (function () {
        if ($(this).html ().length > maxlength)
          $(this).html($(this).html().substr (0, maxlength) + " ..");
      });
    });

    return this;
  },
});

/* GenUsersListPaginator */
window.GenUsersListPaginator = Paginator.extend({
  pageName: 'gulist',

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

window.GenUsersItemHeaderView = Backbone.View.extend ({
  initialize: function () {
    this.render ();
  },

  render: function () {
    $(this.el).html (this.template (this));

    return this;
  },
});