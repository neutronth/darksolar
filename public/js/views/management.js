/* ManagementUtils */
ManagementUtils = function () {
};

window.ManagementSubNavView = SubNavView.extend ({
  render: function () {
    SubNavView.prototype.render.call (this);

    var pill = $('.nav-pills', this.$el);

    pill.last ().append (new SubNavItemView ({
                   data: { link: '/#/management/group', label: 'Group' }
                 }).el);
  },
});

ManagementUtils.prototype.getFormActions = function (name) {
  var action = '';
  action += '<div class="form-actions">';
  action += '  <button class="btn btn-primary" id="' + name + 'save"><i class="icon-ok icon-white"></i> <span data-i18n="app:button.save">Save changes</span></button>';
  action += '  <button class="btn" id="' + name + 'cancel"><i class="icon-remove"></i> <span data-i18n="app:button.cancel">Cancel</span></button>';
  action += '</div>';
  return action;
};

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

    $(this.el).append (new ManagementGroupFormToolbarView ({
                         targetView: this }).el);

    $(this.el).append ('\
      <div style="padding-top: 5px"><div class="notification-area"></div></div>\
    ');

    this.createForm ();
    $(this.el).append ('<div class="form-area"></div>');
    var form = $('.form-area', this.$el);
    form.html (this.form.el);

    $(this.el).append ('\
      <div class="notification-area"></div>\
    ');

    $(this.el).append (this.ManagementUtils.getFormActions ('mg'));

    $(this.el).i18n();

    return this;
  },

  events: {
    "click #mgsave" : "saveChanges",
    "click #mgcancel" : "cancel",
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

    err = this.form.commit ();

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
    var icon_lookup = {
      success: 'icon-ok-sign',
      error:   'icon-fire',
      warning: 'icon-exclamation-sign',
      info: 'icon-info-sign',
      'default': 'icon-info-sign',
    }; 
    var icon = icon_lookup[type] ? icon_lookup[type] : icon_lookup['default'];

    area.append ('<div class="alert fade in"><i class="' + icon + '"></i> ' + msg + '</div>');

    var msg = $('.alert', area);
    msg.addClass ('alert-' + type);
    msg.alert ();

    var timeoutId = setTimeout (function () {
      msg.alert ('close');
    }, 3000);
  },
});

/* ManagementGroupListView */
window.ManagementGroupListView = Backbone.View.extend({

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
    this.model.on ('add change reset', this.render, this);
    this.model.on ('add change remove', function () {
      if (ManagementGroupSelectInstance)
        ManagementGroupSelectInstance.fetch ();

    }, this);
    this.model.on ('reset', function () {
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
    toolbararea.html (new SearchToolbarView ({ targetView: this,
                        searchTxt: this.searchTxt,
                      }).el);

    var listarea = $('#list-area', this.$el);

    listarea.html ('<table class="table table-bordered table-striped">\
      <thead><tr>\
        <th>#</th>\
        <th data-i18n="management:title.group">Group</th>\
        <th data-i18n="management:title.description">Description</th>\
        <th><center data-i18n="management:title.status">Status</center></th>\
      </tr></thead>\
      <tbody></tbody></table>');

    var table_body = $('tbody', listarea);

    if (options && options.fail) {
      table_body.append ('<td colspan="4" style="text-align: center"><div class="alert alert-block alert-error fade in" data-i18n="app:message.Could not get data">Could not get data</div></td>');
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
        table_body.append ('<td colspan="4" style="text-align: center" data-i18n="app:message.No data">No data</td>');
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

/* ManagementGroupFormView */
window.ManagementGroupFormToolbarView = Backbone.View.extend({
  initialize: function (opts) {
    $.extend (this, opts);

    this.render ();
  },

  events: {
    'click button#new'   : 'onClickNew',
    'click button#delete': 'onClickDelete',
    'click button#deleteConfirm' : 'onDeleteConfirm',
    'click button#deleteCancel'  : function () {
      $('#deleteConfirm').modal ('hide');
    },
  },

  render: function (opts) {
    $(this.el).html ('\
     <div class="modal" id="deleteConfirm"></div>\
     <div class="btn-group"></div>');

    var toolbar = $('.btn-group', this.$el);

    toolbar.append ('<button class="btn" id="new"><i class="icon-file"></i> <span data-i18n="app:button.new">New</span></button>');
    toolbar.append ('<button class="btn btn-danger" id="delete"><i class="icon-trash icon-white"></i> <span data-i18n="app:button.delete">Delete</span></button>');

    var confirm = $('.modal', this.$el);
    confirm.append ('<div class="modal-header"></header>');
    confirm.append ('<div class="modal-body"></header>');
    confirm.append ('<div class="modal-footer"></header>');

    var mhead   = $('.modal-header', confirm);
    var mbody   = $('.modal-body', confirm);
    var mfooter = $('.modal-footer', confirm);

    mhead.append ('<h2 data-i18n="app:message.Are you sure ?">Are you sure ?</h2>');
    mbody.append ('<p><span data-i18n="app:message.The delete operation could not be undone">The "delete" operation could not be undone,</span> <span data-i18n="app:message.please confirm your intention">please confirm your intention.</span></p>');
    mfooter.append ('<button class="btn btn-danger" id="deleteConfirm"><i class="icon-fire icon-white"></i> <span data-i18n="app:button.confirm">Confirm</span></button>');
    mfooter.append ('<button class="btn btn-primary" id="deleteCancel"><i class="icon-repeat icon-white"></i> <span data-i18n="app:button.cancel">Cancel</span></button>');

    confirm.modal ({ backdrop: 'static' });
    confirm.modal ('hide');
    confirm.addClass ('fade');

    $(this.el).i18n();

    return this;
  },

  onClickNew: function () {
    this.targetView.trigger ('mgnew');
  },

  onClickDelete: function () {
    if (this.targetView.model.isNew ()) {
      this.targetView.notify ($.t('app:message.Nothing deleted'), 'warning');
      return;
    }

    $('#deleteConfirm').modal ('show');
  },

  onDeleteConfirm: function () {
    $('#deleteConfirm').modal ('hide');
    this.targetView.trigger ('mgdelete');
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
