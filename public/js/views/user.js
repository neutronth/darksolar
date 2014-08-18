/* UserUtils */
UserUtils = function () {
};

window.UserSubNavView = SubNavView.extend ({
  render: function () {
    SubNavView.prototype.render.call (this);

    var pill = $('.nav-pills', this.$el);

    pill.last ().append (new SubNavItemView ({
                   data: { link: '/#/user/radiusonlineuser',
                           label: 'Online',
                           icon: 'custom-icon-user-online' }
                 }).el);
    pill.last ().append (new SubNavItemView ({
                   data: { link: '/#/user', label: 'User',
                           icon: 'custom-icon-user-user' }
                 }).el);
    pill.last ().append (new SubNavItemView ({
                   data: { link: '/#/user/accesscode', label: 'Access Code',
                           icon: 'custom-icon-user-accesscode' }
                 }).el);
    pill.last ().append (new SubNavItemView ({
                   data: { link: '/#/user/registertrack',
                           label: 'Register Tracking',
                           icon: 'custom-icon-user-registertrack' }
                 }).el);
  },
});

/* UserView */
window.UserView = Backbone.View.extend({
  initialize: function () {
      this.UserUtils = new UserUtils ();
  },

  render: function () {

    $(this.el).html ('');
    $(this.el).append (new UserSubNavView ().el);
    $(this.el).append (this.template ());

    return this;
  },
});


/* UserFormView */
window.UserFormView = Backbone.View.extend({
  initialize: function (opts) {
    $.extend (this, opts);

    this.UserUtils = new UserUtils ();

    if (!this.model)
      this.newModel ();

    this.initEvents ();
    this.initModel ();
  },

  initEvents: function () {
    this.on ('userselected', function (model) {
      this.model = model;
      this.initModel.call (this);
      this.isChanges = 0;
      this.render ();
    }, this);

    this.on ('usernew', function () {
      this.newModel ();
      this.render ();
    }, this);

    this.on ('userdelete', function () {
      var o = this;

      this.model.destroy ({
        wait: true,

        success: function (model, response) {
          debug.info ("Success: Deleted");
          o.targetView.trigger ('userdeleted');
          o.trigger ('usernew');
          o.notify ('User has been deleted', 'success');
        },
        error: function (model, response) {
          debug.error ("Failed Delete: ", response.responseText);
          o.notify ('Could not delete user: ' + response.responseText, 'error');
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

    var fieldsets = [
      { legend: $.t('user:form.Profile'),
        fields: [ 'username', 'package', 'userstatus' ],
      },
      { legend: $.t('user:form.Contact'),
        fields: [ 'firstname', 'surname', 'personid', 'email' ],
      },
      { legend: $.t('user:form.Authentication'),
        fields: [ 'password', 'password_confirm' ],
      },
      { legend: $.t('user:form.Period Control'),
        fields: [ 'expiration' ],
      }
    ];

    if (permission.isRole ('Admin')) {
      fieldsets.push ({
        legend: $.t('user:form.Management'),
        fields: [ 'management', 'roles' ],
      });
    }

    this.form = new Backbone.Form({
      model: this.model,

      fieldsets: fieldsets,
    });

    debug.log (this.form);



    this.form.render ();

    var expiration = $('[name="expiration"]', this.form.$el);
    expiration.css ('border', '0px');

    $('input', this.form.$el).iCheck(window.icheck_settings);

    if (!this.model.isNew ()) {
      var input = $('input[name="username"]', this.form.$el);
      input.parent().html ('\
        <span class="uneditable-input">' + input.val () + '</span>');
    }
  },

  render: function () {
    $(this.el).html (new UserToolbarView ({ targetView: this }).el);

    this.createForm ();
    $(this.el).append ('<div class="form-area"></div>');
    var form = $('.form-area', this.$el);
    form.html (this.form.el);

    var roles_add_btn = $('button.btn.bbf-add', this.$el);
    roles_add_btn.click (function () {
      var timeout = [200, 500, 1000];
      for (var i = 0; i < timeout.length; i++) {
         setTimeout (function () {
          $('.modal', $('body')).i18n ();
        }, timeout[i]);
      }
    });

    $(this.el).i18n();

    return this;
  },

  events: {
    "keypress [id$=username]" : "usernameCheck",
  },

  newModel: function () {
    if (this.model)
      delete this.model;

    this.model = new User ();
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
      this.model.bypassUserCheck = true;

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
          var input = $('input[name="username"]', form.$el);
          input.parent().html ('\
            <span class="uneditable-input">' + input.val () + '</span>');
          o.isChanges = 0;

          o.notify ('User has been saved', 'success');
          o.model.bypassUserCheck = false;

          if (o.targetView) {
            o.targetView.model.add (o.model, { at: 0 });
          }
        },
        error: function (model, response) {
          debug.error (response.responseText);
          o.notify ('User save failed: ' + response.responseText, 'error');
          o.model.bypassUserCheck = false;
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

  usernameCheck: function (event) {
    // Allow backspace
    if (event.charCode == 0) return;

    var alphanum = /[a-z0-9_-]/;

    var check = String.fromCharCode (event.charCode);

    if (!alphanum.test (check))
      event.preventDefault ();
  },
});

/* UserListView */
window.UserListView = Backbone.View.extend({
  firstrun: true,

  initialize: function (opts) {
    this.searchTxt = '';

    $.extend (this, opts);

    this.model = new UserCollection ();
    this.initModel ();
    this.initEvents ();
    this.fetch ();
  },

  initModel: function () {
  },

  initEvents: function () {
    var _this = this;

    this.model.on ('add change sync reset', this.render, this);
    this.model.on ('add change remove', function () {
      if (UserSelectInstance)
        UserSelectInstance.deferredFetch (function () {
          UserSelectInstance.deferredReset ();
        });
    });

    this.model.on ('sync reset', function () {
      window.spinner.stop ();
    });
    this.model.on ('fetch:started', function () {
      window.spinner.spin ();
    });

    this.on ('userdeleted', this.render, this);
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
    toolbararea.html (new UserSearchToolbarView ({ targetView: this,
                        targetFormView: this.targetView,
                        searchTxt: this.searchTxt,
                      }).el);

    var listarea = $('#list-area', this.$el);

    listarea.html (new UserItemHeaderView ().el);

    var table_body = $('tbody', listarea);

    if (options && options.fail) {
      table_body.append ('<td colspan="5">' +
                         new AlertCouldNotGetDataView().$el.html () +
                         '</td>');
      $(this.el).i18n();
      return this;
    }

    var listno = (this.model.currentPage * this.model.perPage);

    _.each (this.model.models, function (user) {
      user.attributes['listno'] = ++listno; 
      user.attributes['userstatus_icon'] =
        user.attributes['userstatus'] ? 'ok' : 'lock';

      user.attributes['registered_icon'] =
        user.attributes['usertype'] == 'register' ? 'barcode' : '';

      user.attributes['expired_icon'] = '';

      var expire_data = user.attributes['expiration'];
      if (expire_data != undefined) {
        if (expire_data.enabled == true) {
          var now = new Date;
          var exp = new Date (expire_data.timestamp);
          if (now > exp) {
            user.attributes['expired_icon'] = 'time';
          }
        }
      }

      user.attributes['usermanagement_icon'] =
        user.attributes['management'] ? 'star' : '';
      if (user.attributes['roles'] != undefined &&
            user.attributes['roles'].length > 0) {
        user.attributes['useradmin_icon'] = '';

        for (var i = 0; i < user.attributes['roles'].length; i++) {
          if (user.attributes['roles'][i]['name'] == 'Admin') {
            user.attributes['useradmin_icon'] = 'flag';
          }
        }
      } else {
        user.attributes['useradmin_icon'] = '';
      }

      var item = new UserItemView ({ model: user });
      table_body.append (item.el);
      item.$el.attr ('id', user.attributes['_id']);
    });

    $('input[type="checkbox"]', table_body).attr ('checked',
                                                  function (index, attr) {
      var id = $(this).parent ().parent ().attr ('id');
      var model = o.model.get (id);
      return model.check ? true : false;
    });

    $('input[type="checkbox"]', table_body).click (function (event) {
      var id = $(this).parent ().parent ().attr ('id');

      if (id) {
        var model = o.model.get (id);
        var check = $(this).is (':checked');
        model.check = check;
      }
    });

    if (this.model.models.length <= 0) {
      if (this.model.currentPage != 0) {
        this.model.goTo (this.model.currentPage - 1);
      } else {
        if (!this.firstrun) {
          table_body.append ('<td colspan="5">' +
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
          o.targetView.trigger ('userselected', o.model.models[i]);
          o.render ();
          break;
        }
      }
    });

    var Page = new UserListPaginator ({ model: this.model });
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
        filter['username']  = s[i];
        filter['firstname'] = s[i];
        filter['surname']   = s[i];
        filter['package']   = s[i];
      }
    }

    debug.log (JSON.stringify (filter));

    return JSON.stringify (filter);
  },
});

/* UserItemView */
window.UserItemView = Backbone.View.extend ({
  tagName: 'tr',

  className: 'user-item',

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

/* UserListPaginator */
window.UserListPaginator = Paginator.extend({
  pageName: 'userlist',

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

window.UserSearchToolbarView = SearchToolbarView.extend({
  initialize: function (opts) {
    $.extend (this, opts);

    this.defaultSettings ({
      idPrefix: 'user',
      searchable: true,
      btnNew: true,
      btnDelete: true,
    });

    this.render ();
  },
});

window.UserToolbarView = MainToolbarView.extend({
  initialize: function (opts) {
    $.extend (this, opts);

    this.defaultSettings ({
      idPrefix: 'user',
      btnSave: true,
      btnCancel: true,
    });

    this.render ();
  },
});

window.UserItemHeaderView = Backbone.View.extend ({
  initialize: function () {
    this.render ();
  },

  render: function () {
    $(this.el).html (this.template (this));

    return this;
  },
});
