/* UserUtils */
UserUtils = function () {
};

window.UserSubNavView = SubNavView.extend ({
  render: function () {
    SubNavView.prototype.render.call (this);

    var pill = $('.nav-pills', this.$el);

    pill.last ().append (new SubNavItemView ({
                   data: { link: '/#/user/radiusonlineuser',
                           label: 'Online' }
                 }).el);
    pill.last ().append (new SubNavItemView ({
                   data: { link: '/#/user', label: 'User' }
                 }).el);
    pill.last ().append (new SubNavItemView ({
                   data: { link: '/#/user/accesscode', label: 'Access Code' }
                 }).el);
    pill.last ().append (new SubNavItemView ({
                   data: { link: '/#/user/registertrack',
                           label: 'Register Tracking' }
                 }).el);
  },
});

UserUtils.prototype.getFormActions = function (name) {
  var action = '';
  action += '<div class="form-actions">';
  action += '  <button class="btn btn-primary" id="' + name + 'save"><i class="icon-ok icon-white"></i> Save changes</button>';
  action += '  <button class="btn" id="' + name + 'cancel"><i class="icon-remove"></i> Cancel</button>';
  action += '</div>';
  return action;
};

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
      { legend: 'Profile',
        fields: [ 'username', 'package', 'userstatus' ],
      },
      { legend: 'Contact',
        fields: [ 'firstname', 'surname', 'personid', 'email' ],
      },
      { legend: 'Authentication',
        fields: [ 'password', 'password_confirm' ],
      },
      { legend: 'Period Control',
        fields: [ 'expiration' ],
      }
    ];

    if (permission.isRole ('Admin')) {
      fieldsets.push ({
        legend: 'Management',
        fields: [ 'management', 'roles' ],
      });
    }

    this.form = new Backbone.Form({
      model: this.model,

      fieldsets: fieldsets,
    });

    debug.log (this.form);



    this.form.render ();

    if (!this.model.isNew ()) {
      var input = $('input[name="username"]', this.form.$el);
      input.parent().html ('\
        <span class="uneditable-input">' + input.val () + '</span>');
    }
  },

  render: function () {
    $(this.el).html ('');

    $(this.el).append (new UserFormToolbarView ({ targetView: this }).el);

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

    $(this.el).append (this.UserUtils.getFormActions ('user'));


    return this;
  },

  events: {
    "click #usersave" : "saveChanges",
    "click #usercancel" : "cancel",
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
          this.notify ('Nothing changes', 'warning');
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

  initialize: function (opts) {
    this.searchTxt = '';

    $.extend (this, opts);

    this.model = new UserCollection ();
    this.initModel ();
    this.model.fetch ();

    this.initEvents ();

  },

  initModel: function () {
  },

  initEvents: function () {
    this.model.on ('add change reset', this.render, this);
    this.model.on ('add change remove', function () {
      if (UserSelectInstance)
        UserSelectInstance.fetch ();
    });
    this.on ('userdeleted', this.render, this);
    this.on ('search', this.search, this);
  },

  render: function () {
    var o = this;
    $(this.el).html ('<div id="toolbar-area" style="padding-bottom: 10px;">\
      </div><div id="list-area"></div>');

    var toolbararea = $('#toolbar-area', this.$el);
    toolbararea.html (new UserToolbarView ({ targetView: this,
                                             searchTxt: this.searchTxt,
                                           }).render ().el);

    var listarea = $('#list-area', this.$el);

    listarea.html ('<table class="table table-bordered table-striped">\
      <thead><tr>\
        <th>&nbsp;</th><th>#</th><th>Username</th><th>Firstname</th><th>Surname</th>\
        <th>Package</th><th><center>Status</center></th>\
      </tr></thead>\
      <tbody></tbody></table>');

    var table_body = $('tbody', listarea);
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
          o.targetView.trigger ('userselected', o.model.models[i]);
          o.render ();
          break;
        }
      }
    });

    var Page = new UserListPaginator ({ model: this.model });
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

/* UserFormView */
window.UserFormToolbarView = Backbone.View.extend({
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

    toolbar.append ('<button class="btn" id="new"><i class="icon-file"></i> New</button>');
    toolbar.append ('<button class="btn btn-danger" id="delete"><i class="icon-trash icon-white"></i> Delete</button>');

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

    return this;
  },

  onClickNew: function () {
    this.targetView.trigger ('usernew');
  },

  onClickDelete: function () {
    if (this.targetView.model.isNew ()) {
      this.targetView.notify ('Nothing deleted', 'warning');
      return;
    }

    $('#deleteConfirm').modal ('show');
  },

  onDeleteConfirm: function () {
    $('#deleteConfirm').modal ('hide');
    this.targetView.trigger ('userdelete');
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

window.UserToolbarView = Backbone.View.extend({
  initialize: function (opts) {
    $.extend (this, opts);

    this.render ();
  },

  events: {
    'click button#search': 'onClickSearch',
  },

  render: function (opts) {
    $(this.el).html (this.template ());

    if (this.searchTxt) {
      var search = $('input[type="text"]', this.$el);
      search.val (this.searchTxt);
    }

    var search = $('input[type="text"]', this.$el);
    search.click (function (event) {
      this.select ();
    });

    search.keyup (function (event) {
      if (event.keyCode == 13) {
        $('#search', this.$el).click ();
      }
    });

    var listmodal = $('#list-modal', this.$el);
    listmodal.modal ({ backdrop: 'static' });
    listmodal.modal ('hide');

    return this;
  },

  onClickSearch: function () {
    var searchtxt = $('input[type="text"]', this.$el);
    debug.log ("Search", searchtxt.val ());
    this.targetView.trigger ('search', searchtxt.val ());
  },

  onClickDelete: function () {
    if (this.targetView.model.isNew ()) {
      this.targetView.notify ('Nothing deleted', 'warning');
      return;
    }

    $('#deleteConfirm').modal ('show');
  },

  onDeleteConfirm: function () {
    $('#deleteConfirm').modal ('hide');
    this.targetView.trigger ('userdelete');
  },
});
