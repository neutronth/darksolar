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

    this.on ('save', this.saveChanges, this);
    this.on ('cancel', this.cancel, this);
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

    $('input', this.form.$el).iCheck(window.icheck_settings);

    var expiration = $('[name="expiration"]', this.form.$el);
    expiration.css ('border', '0px');
  },

  render: function () {
    $(this.el).html ('');
    $(this.el).append (new AccessCodeToolbarView ({ targetView: this }).el);
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
    var notify = new AlertMessageView ({ message: msg, type: type });
    area.append (notify.el);
  },
});

/* AccessCodeListView */
window.AccessCodeListView = Backbone.View.extend({
  firstrun: true,

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
    this.model.on ('add change sync reset', this.render, this);
    this.model.on ('sync reset', function () {
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
    toolbararea.html (new AccessCodeSearchToolbarView ({ targetView: this,
                        targetFormView: this.targetView,
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
      table_body.append ('<td colspan="6">' +
                         new AlertCouldNotGetDataView().$el.html () +
                         '</td>');
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

window.AccessCodeSearchToolbarView = SearchToolbarView.extend({
  initialize: function (opts) {
    $.extend (this, opts);

    this.defaultSettings ({
      idPrefix: 'ac',
      searchable: true,
      btnNew: true,
    });

    this.render ();
  },
});

window.AccessCodeToolbarView = MainToolbarView.extend({
  initialize: function (opts) {
    $.extend (this, opts);

    this.defaultSettings ({
      idPrefix: 'ac',
      btnSave: true,
      btnCancel: true,
    });

    this.render ();
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
