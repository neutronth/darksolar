/* AccessCodeUtils */
AccessCodeUtils = function () {
};

AccessCodeUtils.prototype.getFormActions = function (name) {
  var action = '';
  action += '<div class="form-actions">';
  action += '  <button class="btn btn-primary" id="' + name + 'save"><i class="icon-ok icon-white"></i> <span data-i18n="app:button.save">Save changes</span></button>';
  action += '  <button class="btn" id="' + name + 'cancel"><i class="icon-remove"></i> <span data-i18n="app:button.cancel">Cancel</span></button>';
  action += '</div>';
  return action;
};

/* AccessCodeView */
window.AccessCodeView = Backbone.View.extend({
  initialize: function () {
      this.AccessCodeUtils = new AccessCodeUtils ();
  },

  render: function () {

    $(this.el).html ('');
    $(this.el).append (new UserSubNavView ().el);
    $(this.el).append (this.template ());

    return this;
  },
});


/* AccessCodeFormView */
window.AccessCodeFormView = Backbone.View.extend({
  initialize: function (opts) {
    $.extend (this, opts);

    this.AccessCodeUtils = new AccessCodeUtils ();

    if (!this.model)
      this.newModel ();

    this.initEvents ();
    this.initModel ();
  },

  initEvents: function () {
    this.on ('acselected', function (model) {
      this.model = model;
      this.initModel.call (this);
      this.isChanges = 0;
      this.render ();
    }, this);

    this.on ('acnew', function () {
      this.newModel ();
      this.render ();
    }, this);
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
      { legend: $.t('accesscode:form.Profile'),
        fields: [ 'package', 'purpose', 'amount', 'expiration' ],
      },
    ];

    this.form = new Backbone.Form({
      model: this.model,

      fieldsets: fieldsets,
    });

    debug.log (this.form);



    this.form.render ();

    if (!this.model.isNew ()) {
      var package = $('select[name="package"]', this.form.$el);
      package.addClass ('disabled');
      package.attr ('disabled', 'true');

      var purpose = $('textarea[name="purpose"]', this.form.$el);
      purpose.addClass ('disabled');
      purpose.attr ('disabled', 'true');

      var amount  = $('input[name="amount"]', this.form.$el);
      amount.parent().html ('\
        <span class="uneditable-input">' + amount.val () + '</span>');
    }
  },

  render: function () {
    $(this.el).html ('');

    $(this.el).append (new AccessCodeFormToolbarView ({ targetView: this }).el);

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

    $(this.el).append (this.AccessCodeUtils.getFormActions ('ac'));

    $(this.el).i18n();

    return this;
  },

  events: {
    "click #acsave" : "saveChanges",
    "click #accancel" : "cancel",
  },

  newModel: function () {
    if (this.model)
      delete this.model;

    this.model = new AccessCodeMeta ();
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
          this.notify ('Nothing changes', 'warning');
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

          o.notify ('Access Code has been saved', 'success');

          if (o.targetView) {
            o.targetView.model.add (o.model, { at: 0 });
          }
        },
        error: function (model, response) {
          debug.error (response.responseText);
          o.notify ('Access Code save failed: ' + response.responseText, 'error');
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

/* AccessCodeListView */
window.AccessCodeListView = Backbone.View.extend({

  initialize: function (opts) {
    this.searchTxt = '';

    $.extend (this, opts);

    this.model = new AccessCodeMetaCollection ();
    this.initModel ();
    this.initEvents ();
    this.fetch ();
  },

  initModel: function () {
  },

  initEvents: function () {
    this.model.on ('add change reset', this.render, this);
    this.model.on ('reset', function () {
      window.spinner.stop ();
    });
    this.model.on ('fetch:started', function () {
      window.spinner.spin ();
    });

    this.on ('acdeleted', this.render, this);
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
                      }).render ().el);

    var listarea = $('#list-area', this.$el);

    listarea.html ('<table class="table table-bordered table-striped">\
      <thead><tr>\
        <th data-i18n="accesscode:title.ID">ID</th>\
        <th data-i18n="accesscode:title.Package">Package</th>\
        <th data-i18n="accesscode:title.Amount">Amount</th>\
        <th data-i18n="accesscode:title.Purpose">Purpose</th>\
        <th data-i18n="accesscode:title.Issued">Issued</th>\
        <th data-i18n="accesscode:title.Action"><center>Action</center></th>\
      </tr></thead>\
      <tbody></tbody></table>');

    var table_body = $('tbody', listarea);

    if (options && options.fail) {
      table_body.append ('<td colspan="6" style="text-align: center"><div class="alert alert-block alert-error fade in" data-i18n="app:message.Could not get data">Could not get data</div></td>');
      $(this.el).i18n();
      return this;
    }

    var listno = (this.model.currentPage * this.model.perPage);

    _.each (this.model.models, function (ac) {
      ac.attributes['issued_timestamp'] = new Date (ac.get ('issued').timestamp).format ('d mmm yyyy HH:MM');
      ac.attributes['expired_icon'] = '';

      var expire_data = ac.attributes['expiration'];
      if (expire_data != undefined) {
        if (expire_data.enabled == true) {
          var now = new Date;
          var exp = new Date (expire_data.timestamp);
          if (now > exp) {
            ac.attributes['expired_icon'] = 'time';
          }
        }
      }

      if (ac.attributes['registered'] == undefined) {
        ac.attributes['registered'] = 0;
      }

      ac.attributes['register_all_icon'] = '';
      if (ac.attributes['registered'] == ac.attributes['amount']) {
        ac.attributes['register_all_icon'] = 'check';
      }

      var item = new AccessCodeItemView ({ model: ac });
      table_body.append (item.el);
      item.$el.attr ('id', ac.attributes['_id']);

      var print = $('#btnprint' + ac.attributes['_id'] , this.$el);
      print.click (function (event) {
        var id = $(event.target).attr ('data-id');
        if (id == undefined) {
          id = $(event.target).parent().attr ('data-id');
        }

        window.open ('/api/accesscode/pdfcard/' + id, '_blank');
      });
    });

    if (this.model.models.length <= 0) {
      if (this.model.currentPage != 0) {
        this.model.goTo (this.model.currentPage - 1);
      } else {
        table_body.append ('<td colspan="7" style="text-align: center">No data</td>');
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
          o.targetView.trigger ('acselected', o.model.models[i]);
          o.render ();
          break;
        }
      }
    });

    var Page = new AccessCodeListPaginator ({ model: this.model });
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
        filter['id']  = s[i];
        filter['package'] = s[i];
        filter['purpose']   = s[i];
        filter['amount']   = s[i];
      }
    }

    debug.log (JSON.stringify (filter));

    return JSON.stringify (filter);
  },
});

/* AccessCodeFormView */
window.AccessCodeFormToolbarView = Backbone.View.extend({
  initialize: function (opts) {
    $.extend (this, opts);

    this.render ();
  },

  events: {
    'click button#new'   : 'onClickNew',
  },

  render: function (opts) {
    $(this.el).html ('\
     <div class="modal" id="deleteConfirm"></div>\
     <div class="btn-group"></div>');

    var toolbar = $('.btn-group', this.$el);

    toolbar.append ('<button class="btn" id="new"><i class="icon-file"></i> <span data-i18n="app:button.new">New</span></button>');

    var confirm = $('.modal', this.$el);
    confirm.append ('<div class="modal-header"></header>');
    confirm.append ('<div class="modal-body"></header>');
    confirm.append ('<div class="modal-footer"></header>');

    var mhead   = $('.modal-header', confirm);
    var mbody   = $('.modal-body', confirm);
    var mfooter = $('.modal-footer', confirm);

    mhead.append ('<h2>Are you sure ?</h2>');
    mbody.append ('<p>The "delete" operation could not be undone, please confirm your intention.</p>');
    mfooter.append ('<button class="btn btn-danger" id="deleteConfirm"><i class="icon-fire icon-white"></i> Confirm</button>');
    mfooter.append ('<button class="btn btn-primary" id="deleteCancel"><i class="icon-repeat icon-white"></i> Cancel</button>');

    confirm.modal ({ backdrop: 'static' });
    confirm.modal ('hide');
    confirm.addClass ('fade');

    $(this.el).i18n();

    return this;
  },

  onClickNew: function () {
    this.targetView.trigger ('acnew');
  },
});

/* AccessCodeItemView */
window.AccessCodeItemView = Backbone.View.extend ({
  tagName: 'tr',

  className: 'ac-item',

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

/* AccessCodeListPaginator */
window.AccessCodeListPaginator = Paginator.extend({
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
