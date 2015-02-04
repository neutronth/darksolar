/* ManagementUtils */
ManagementUtils = function () {
};

window.ManagementSubNavView = SubNavView.extend ({
  render: function () {
    SubNavView.prototype.render.call (this);

    var pill = $('.nav-pills', $('#dssubnav')).html ("");

    pill.last ().append (new SubNavItemView ({
                   data: { link: '/#/management/group', label: 'Group',
                           icon: 'custom-icon-management-group' }
                 }).el);
  },
});

/* ManagementGroupView */
window.ManagementGroupView = Backbone.View.extend({
  initialize: function () {
      this.ManagementUtils = new ManagementUtils ();
  },

  render: function () {

    $(this.el).html ('');
    $(this.el).append (new ManagementSubNavView ().el);
    $(this.el).append (this.template ());

    return this;
  },
});


/* ManagementGroupFormView */
window.ManagementGroupFormView = Backbone.View.extend({
  initialize: function (opts) {
    $.extend (this, opts);

    this.ManagementUtils = new ManagementUtils ();

    if (!this.model)
      this.newModel ();

    this.initEvents ();
    this.initModel ();
  },

  initEvents: function () {
    this.on ('mgselected', function (model) {
      this.model = model;
      this.initModel.call (this);
      this.isChanges = 0;
      this.render ();
    }, this);

    this.on ('mgnew', function () {
      this.newModel ();
      this.render ();
    }, this);

    this.on ('mgdelete', function () {
      var o = this;

      this.model.destroy ({
        wait: true,

        success: function (model, response) {
          debug.info ("Success: Deleted");
          o.targetView.trigger ('mgdeleted');
          o.trigger ('mgnew');
          o.notify ($.t('management:message.Management has been deleted'), 'success');
        },
        error: function (model, response) {
          debug.error ("Failed Delete: ", response.responseText);
          o.notify ($.t('management:message.Could not delete management group') + ": " + response.responseText, 'error');
        },
      });
    }, this);

    this.on ('save', this.saveChanges, this);
    this.on ('cancel', this.cancel, this);
  },

  initModel: function () {
    var o = this;

    this.model.on ('change', function () {
      o.isChanges = 1;
    });
  },

  setTargetView: function (view) {
    this.targetView = view;
  },

  createForm: function () {
    this.form = new Backbone.Form({
      model: this.model,

      fieldsets: [
        { legend: $.t('management:form.Profile'),
          fields: [ 'groupname', 'description', 'groupstatus' ],
        },
        { legend: $.t('management:form.Members'),
          fields: [ 'members' ],
        },
      ],
    }).render ();

    if (!this.model.isNew ()) {
      var input = $('input[name="groupname"]', this.form.$el);
      input.parent().html ('\
        <span class="uneditable-input">' + input.val () + '</span>');
    }
  },

  render: function () {
    $(this.el).html ('');
    $(this.el).append (new ManagementGroupToolbarView ({ targetView: this }).el);

    this.createForm ();
    $(this.el).append ('<div class="form-area"></div>');
    var form = $('.form-area', this.$el);
    form.html (this.form.el);

    $('input', this.form.$el).iCheck(window.icheck_settings);

    $(this.el).i18n();

    $("form", this.$el).on ('click', this.updateModalI18n);

    return this;
  },

  updateModalI18n: function (event) {
    if (!$(event.target).hasClass ("bbf-add") &&
        !$(event.target).hasClass ("bbf-list-modal")) {
      return;
    }

    var timeout = [200, 500, 1000];
    for (var i = 0; i < timeout.length; i++) {
      setTimeout (function () {
        $('.modal', $('body')).i18n ();
      }, timeout[i]);
    }
  },


  events: {
    "keypress [id$=groupname]" : "groupnameCheck",
  },

  groupnameCheck: function (event) {
    // Allow backspace
    if (event.charCode == 0) return;

    var alphanum = /[ a-zA-Z0-9_-]/;

    var check = String.fromCharCode (event.charCode);

    if (!alphanum.test (check))
      event.preventDefault ();
  },

  newModel: function () {
    if (this.model)
      delete this.model;

    this.model = new ManagementGroup ();
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
          var input = $('input[name="groupname"]', form.$el);
          input.parent().html ('\
            <span class="uneditable-input">' + input.val () + '</span>');
          o.isChanges = 0;

          o.notify ($.t('management:message.Group has been saved'), 'success');

          if (o.targetView) {
            o.targetView.model.add (o.model, { at: 0 });
          }
        },
        error: function (model, response) {
          debug.error (response.responseText);
          o.notify ($.t('management:message.Group save failed'), 'error');
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
    var area = $('.notification-area', this.$el);
    var notify = new AlertMessageView ({ message: msg, type: type });
    area.append (notify.el);
  },
});

/* ManagementGroupListView */
window.ManagementGroupListView = Backbone.View.extend({
  firstrun: true,

  initialize: function (opts) {
    this.searchTxt = '';

    $.extend (this, opts);

    this.model = new ManagementGroupCollection ();
    this.initModel ();
    this.initEvents ();
    this.fetch ();
  },

  initModel: function () {
  },

  initEvents: function () {
    this.model.on ('add change sync reset', this.render, this);
    this.model.on ('add change remove', function () {
      if (ManagementGroupSelectInstance)
        ManagementGroupSelectInstance.deferredFetch (function () {
          ManagementGroupSelectInstance.deferredReset ();
        });
    }, this);
    this.model.on ('sync reset', function () {
      window.spinner.stop ();
    });
    this.model.on ('fetch:started', function () {
      window.spinner.spin ();
    });

    this.on ('mgdeleted', this.render, this);
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
    toolbararea.html (new ManagementGroupSearchToolbarView ({
                        targetView: this,
                        targetFormView: this.targetView,
                        searchTxt: this.searchTxt,
                      }).el);

    var listarea = $('#list-area', this.$el);

    listarea.html (new ManagementGroupItemHeaderView ().el);
    var table_body = $('tbody', listarea);

    if (options && options.fail) {
      table_body.append ('<td colspan="4">' +
                         new AlertCouldNotGetDataView ().$el.html () +
                         '</td>');
      $(this.el).i18n();
      return this;
    }

    var listno = (this.model.currentPage * this.model.perPage);

    _.each (this.model.models, function (mg) {
      mg.attributes['listno'] = ++listno; 
      mg.attributes['groupstatus_icon'] =
        mg.attributes['groupstatus'] ? 'ok' : 'lock';

      var item = new ManagementGroupItemView ({ model: mg });
      table_body.append (item.el);
      item.$el.attr ('id', mg.attributes['_id']);
    });

    if (this.model.models.length <= 0) {
      if (this.model.currentPage != 0) {
        this.model.goTo (this.model.currentPage - 1);
      } else {
        if (!this.firstrun) {
          table_body.append ('<td colspan="4">' +
                             new AlertNoDataView ().$el.html () +
                             '</td>');
        } else {
          this.firstrun = true;
        }
      }
    }

    var tviewModelId = o.targetView.model.get ('_id');
    if (tviewModelId) {
      var row = $('tr[id='+tviewModelId+']', this.$el);
      row.children ().css ('background', '#ccccff');
      row.css ('color', '#3366cc');
    }

    $('tr', this.$el).click (function (event) {
      for (var i = 0; i < o.model.models.length; i++) {
        if (o.model.models[i].attributes['_id'] == event.delegateTarget.id) {
          o.targetView.trigger ('mgselected', o.model.models[i]);
          o.render ();
          break;
        }
      }
    });

    var Page = new ManagementGroupListPaginator ({ model: this.model });
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
    var filter = {};
    if (searchtxt != undefined) { 
      var s = searchtxt.split (' ');
      for (var i = 0; i < s.length; i++) {
        filter['groupname']  = s[i];
        filter['description'] = s[i];
      }
    }

    return JSON.stringify (filter);
  },
});

window.ManagementGroupSearchToolbarView = SearchToolbarView.extend({
  initialize: function (opts) {
    $.extend (this, opts);

    this.defaultSettings ({
      idPrefix: 'mg',
      searchable: true,
      btnNew: true,
      btnDelete: true,
    });

    this.render ();
  },
});

window.ManagementGroupToolbarView = MainToolbarView.extend({
  initialize: function (opts) {
    $.extend (this, opts);

    this.defaultSettings ({
      idPrefix: 'mg',
      btnSave: true,
      btnCancel: true,
    });

    this.render ();
  },
});

/* ManagementGroupItemView */
window.ManagementGroupItemView = Backbone.View.extend ({
  tagName: 'tr',

  className: 'mg-item',

  initialize: function () {
    this.model.bind ('change', this.render, this);
    this.model.bind ('destroy', this.close, this);

    this.render ();
  },

  render: function () {
    $(this.el).html (this.template (this.model.toJSON ()));  

    return this;
  },
});

/* ManagementGroupListPaginator */
window.ManagementGroupListPaginator = Paginator.extend({
  pageName: 'mglist',

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

window.ManagementGroupItemHeaderView = Backbone.View.extend ({
  initialize: function () {
    this.render ();
  },

  render: function () {
    $(this.el).html (this.template (this));

    return this;
  },
});
