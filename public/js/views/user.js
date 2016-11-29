/* jshint loopfunc: true */

/* UserUtils */
UserUtils = function () {
};

/* UserView */
window.UserView = Backbone.View.extend({
  initialize: function () {
      this.UserUtils = new UserUtils ();
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

/* UserImportListItemView */
window.UserImportListItemView = Backbone.View.extend({
  importing: false,

  initialize: function () {
    this.on ("remove_confirm", this.onRemoveConfirm, this);
    this.render ();
  },

  render: function (active) {
    if (active === undefined)
      active = false;

    $(this.el).html ('');
    $(this.el).append (this.template (this.model.toJSON ()));

    $('.import-list').removeClass ('active');

    if (active)
      $('.import-list', $(this.el)).addClass ('active');

    if (this.model.attributes.status &&
          !this.model.attributes.status.imported &&
          this.model.attributes.status.importing) {
      this.importProgress ();
    }

    $(this.el).i18n ();

    return this;
  },

  events: {
    "click" : "loadData",
    "mouseenter" : "showButtons",
    "mouseleave" : "hideButtons",
    "click [class$=import-remove]" : "removeImportInvoke",
    "click [id$=import-start]" : "startImport"
  },

  loadData: function (event, callback) {
    var o = this;

    if ((this.importing && event != 'force'))
      return;

    if ($('.import-list', $(this.el)).hasClass ('active') &&
        this.model.attributes.status.processed &&
        event != "force") {
      return;
    }

    $('#ImportContent').html ("");

    var List = new UserImportListCollection ();
    var ListFail = new UserImportListCollection ();

    List.setImportID (this.model.attributes.importid);

    ListFail.setImportID (this.model.attributes.importid);
    ListFail.getFailItems (true);

    function renderList (list, type) {
      var HeaderTpl = {};
      var ItemTpl   = {};

      if (type == "success") {
        HeaderTpl = UserImportItemHeaderView;
        ItemTpl   = UserImportItemView;
      } else if (type == "fail") {
        HeaderTpl = UserImportItemHeaderView;
        ItemTpl   = UserImportItemView;
      }

      header = new HeaderTpl ().render ();
      importContent = $('#ImportContent');
      importContent.html ("<div class='in fade' id='loader'></div>");
      importContent.append (header.el);
      importContent.i18n ();

      table_body = $('tbody', importContent);
      container = $('#user-list');
      iteration = 0;

      $("#loader", importContent).css ('width', container.width ())
        .css ('position', 'absolute')
        .css ('top', container.offset ().top)
        .css ('height', container.height ())
        .css ('z-index', 900);

      function renderRows () {
        for (var i = 0; i < list.models.length; i++) {
          var item = list.models[i];
          if (!list.models[i].attributes.hasOwnProperty ("fail"))
            list.models[i].attributes.fail = undefined;

          var import_item = new ItemTpl ({model: item});

          table_body.append (import_item.el);
        }
      }

      var $doc = $(document);
      renderRows ();
      $doc.scrollTop (0);
      iteration++;
      toggle = false;
      stop   = false;
      size = list.models.length;

      function loadRemainData () {
        list.setStartIdx ((iteration * size) + 1);
        function hideLoader () {
          $('#loader').hide ();
          toggle = false;
        }

        list.fetch ({ success: function () {
          hideLoader ();
          if (list.length === 0) {
            stop = true;
            return;
          }

          renderRows ();
          iteration++;
        },
        error: function () {
          hideLoader ();
        }
        });
      }

      var $importListContent = $('#ImportListContent');

      $doc.scroll (function () {
        if (stop)
          return;

        threshold = table_body.prop ('scrollHeight') -
                      $importListContent.height () -
                      table_body.offset ().top - 200;

        if ($doc.scrollTop () > threshold) {
          if (!toggle) {
            $('#loader').css ('height', $doc.height () + 50).show ();
            toggle = true;
            loadRemainData ();
          }
        } else {
          toggle = false;
        }
      });
    }

    if (this.model.attributes.status &&
          this.model.attributes.status.imported) {
      o.render (true);
      List.fetch ({ success : function () {
        renderList (List, "success");
      }});
    } else if (this.model.attributes.status &&
                 this.model.attributes.status.importing) {
      o.render (true);
      List.fetch ({ success : function () {
        renderList (List, "success");
      }});
    } else {
      ListFail.fetch ({ success : function () {
        var count = ListFail.importCount;
        var fail = ListFail.importFail;

        o.model.set ({ status: { processed: true, count: count, fail: fail}});
        o.model.save ({}, {
          wait: true,
          success: function (model, response) {
            if (callback !== undefined)
              callback (fail);
            else
              o.render (true);
          },
          error: function () {
          }
        });

        if (fail === 0) {
          List.fetch ({ success : function () {
            renderList (List, "success");
          }});
        } else {
          renderList (ListFail, "fail");
        }
      }});
    }
  },

  showButtons: function () {
    if (this.importing)
      return;

    $('.import-list-command', $(this.el)).removeClass ('hide');
  },

  hideButtons: function () {
    $('.import-list-command', $(this.el)).addClass ('hide');
  },

  removeImportInvoke: function (event) {
    event.stopPropagation ();

    if (this.model.attributes.status !== undefined &&
        this.model.attributes.status.imported) {
      this.remove_confirm_modal = new ConfirmModalView ({
        modal_id: 'remove' + this.model.attributes.importid,
        confirm_trigger: 'remove_confirm',
        targetView: this,
        modal_body: '<p><span data-i18n="app:message.Remove the import data will reverts all related imported users">Remove the import data will reverts all related imported users</span></p><p><span data-i18n="app:message.please confirm your intention">please confirm your intention.</span></p>'
      });

      $('#modal-area-confirmation').html (this.remove_confirm_modal.el);
      $(this.remove_confirm_modal.el).i18n ();
      this.remove_confirm_modal.show ();
    } else {
      this.removeImport ();
    }
  },

  onRemoveConfirm: function () {
    this.removeImport ();
  },

  removeImport: function () {
    var o = this;
    this.model.destroy ({
      wait: true,
      success: function () {
        $('#ImportContent').html ("");
        $(o.el).hide ();
      },
      error: function (model, response) {
        o.notify ($.t ('app:message.Nothing deleted'), 'error');
      }
    });
  },

  setImporting: function (flag) {
    this.importing = flag;
  },

  importProgress: function () {
    if (!this.progress) {
      this.progress = new UserImportProgress ();
      this.progress.id = this.model.attributes.importid;
      this.progress_timeout = 600;
    }

    var progress = this.progress;
    var progress_timeout = this.progress_timeout;

    progress.fetch ({ success: $.proxy (function () {
      var pgbar = $('.progress .progress-bar');
      var pgtext = $('#percent-progress', $(this.el));
      var pg = progress.attributes.progress;
      debug.log ("Progress:", pg + "%");
      pgbar.css ('width', pg + "%").addClass ('progress-bar-success');
      pgtext.html (pg + "%");

      if (pg < 100 && --progress_timeout > 0) {
        setTimeout ($.proxy (function () {
          this.importProgress ();
        }, this), 1000);
      } else {
        var s = this.model.get ("status");
        s.imported = true;
        this.model.set ({ status: s});
        this.model.save ({}, {
          wait: true,
          success: $.proxy (function () {
            this.render (true);
          }, this) });

        this.setImporting (false);

        setTimeout (function () {
          pgbar.css ('width', 0).removeClass ('progress-bar-success');
        }, 2000);
      }
    }, this) });
  },

  startImport: function (event) {
    var this_ = this;
    this.setImporting (true);
    this.hideButtons ();

    $('#import-start', this.$el).hide ();
    event.stopPropagation ();
    this.loadData ("force", $.proxy (function (fail) {
      if (fail > 0)
        return;

      var start = new UserImportStart ();
      start.id = this.model.attributes.importid;

      this.importProgress ();

      start.save ({}, {
        success: function () {
        }
      });
    }, this));
  },

  notify: function (msg, type) {
    var area = $('.notification-area');
    var notify = new AlertMessageView ({ message: msg, type: type });
    area.append (notify.el);
  }
});

window.UserImportListView = Backbone.View.extend({
  setTarget: function (target) {
    this.target = target;
  },

  render: function () {
    var listContainer = this.target;

    $(this.el).html ('');
    listContainer.html ('');

    var metas = new UserImportMetaCollection ();
    metas.fetch ({
      success : function () {
        var count = 0;
        _.each (metas.models, function (meta) {
          var col = count % 4;
          var row = Math.floor (count / 4);

          if (col === 0) {
            addRow = "<div class='row' id='row" + row + "'></div>";
            listContainer.append (addRow);
          }

          rowContainer = $('#row' + row, listContainer);

          meta.attributes.id = meta.attributes.importid.substr (0, 16);

          locale = $.i18n.lng ();
          topts = { day: 'numeric', month: 'long', year: 'numeric',
                    hour: 'numeric', minute: 'numeric' };
          meta.attributes.timestamp = new Intl.DateTimeFormat(locale, topts).format(new Date (meta.attributes.timestamp));

          var item = new UserImportListItemView ({model: meta});
          rowContainer.append (item.el);

          count++;
        });
      }
    });

    return this;
  }
});

/* UserImportItemHeaderView */
window.UserImportItemHeaderView = Backbone.View.extend({
  render: function () {
    $(this.el).html ('');
    $(this.el).append (this.template ());

    return this;
  },
});

/* UserImportItemView */
window.UserImportItemView = Backbone.View.extend({
  tagName: 'tr',
  className: 'import-item',

  initialize: function () {
    this.render ();
  },

  render: function () {
    $(this.el).html (this.template (this.model.toJSON ()));

    var maxlength = 40;
    $(this.el).each (function() {
      $(".autotrim", this).each (function () {
        if ($(this).html ().length > maxlength)
          $(this).html($(this).html().substr (0, maxlength) + " ..");
      });
    });

    return this;
  },
});

/* UserImportView */
window.UserImportView = UserView.extend({
  render: function () {
    var o = this;
    var $this = $(this.el);

    $this.html ('');
    $this.append (this.template ());

    var pgbar = $('.progress .progress-bar', $(this.el));

    function stopProgress (type) {
      setTimeout (function () {
        pgbar.css ('width', 0);
        setTimeout (function () {
          pgbar.removeClass ('progress-bar-' + type);
        }, 2000);
      }, 3000);
    }

    function checkFileType (f) {
      t = f.substr (f.length - 4, f.length).toLowerCase ();
      t = t.replace ('.', '');

      if (t == 'csv')
        return true;
      else
        return false;
    }

    $('#fileupload', $this).fileupload ({
      dataType: 'json',
    }).on ('fileuploadprogressall', function (e, data) {
      var progress = parseInt (data.loaded / data.total * 100, 10);
      pgbar.addClass ('progress-bar-success').css ('width', progress + '%');
    }).on ('fileuploaddone', function (e, data) {
      if (data.result.success) {
        o.ImportListView.render ();
        o.notify ($.t ('user:message.Upload success'), 'success');
        stopProgress ('success');
      } else {
        pgbar.addClass ('progress-bar-danger');
        o.notify ($.t ('user:message.Upload fail_invalid data'), 'error');
        stopProgress ('danger');
      }
    }).on ('fileuploadfail', function (e, data) {
      pgbar.addClass ('progress-bar-danger');
      o.notify ($.t ('user:message.Upload fail'), 'error');
      stopProgress ('danger');
    }).on ('fileuploadadd', function (e, data) {
      var fname = data.files[0].name;
      if (!checkFileType (fname)) {
        pgbar.addClass ('progress-bar-danger').css ('width', '100%');
        stopProgress ('danger');
        o.notify ($.t ('user:message.Invalid file extension_csv'), 'error');
        return false;
      }

      data.submit ();
    });

    var usrImportList = new UserImportListView ();
    usrImportList.setTarget ($('#ImportListContent', $(this.el)));
    usrImportList.render ();

    this.ImportListView = usrImportList;

    this.$el.i18n ();

    return this;
  },

  events: {
    "hidden.bs.collapse [id$=ImportList]" : "updateTable"
  },

  updateTable: function () {
  },

  notify: function (msg, type) {
    var area = $('.notification-area');
    var notify = new AlertMessageView ({ message: msg, type: type });
    area.append (notify.el);
  }
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

    this.on ('usermodify', function (model) {
      this.model = model;
      this.initModel.call (this);
      this.isChanges = 0;
      this.render ();
      this.activateFormPane.call (this);
    }, this);

    this.on ('usernew', function () {
      this.newModel ();
      this.render ();
      this.activateFormPane.call (this);
    }, this);

    this.on ('userdelete', function () {
      var o = this;

      function userDestroy (del_model) {
        del_model.destroy ({
          wait: true,

          success: function (model, response) {
            debug.info ("Success: Deleted");
            o.targetView.trigger ('userdeleted');
            o.notify ($.t('user:message.User has been deleted'), 'success');
          },
          error: function (model, response) {
            debug.error ("Failed Delete: ", response.responseText);
            o.notify ($.t ('user:message.Could not delete user') + ': ' +
                      response.responseText, 'error');
          },
        });
      }

      for (var i = 0; i < this.models.length; i++) {
        if (this.models[i].check) {
          userDestroy (this.models[i]);
        }
      }
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
  },

  setTargetView: function (view) {
    this.targetView = view;
  },

  createForm: function () {

    var fieldsets = [
      { legend: $.t('user:form.Profile'),
        fields: [ 'username', 'package', 'description', 'userstatus' ],
      },
      { legend: $.t('user:form.Contact'),
        fields: [ 'firstname', 'surname', 'personid', 'email' ],
      },
      { legend: $.t('user:form.Authentication'),
        fields: [ 'password', 'password_confirm' ],
      },
      { legend: $.t('user:form.Authentication (Optional)'),
        fields: [ 'macs_binding' ],
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

    $(this.el).i18n();

    $("form", this.$el).on ('click', this.updateModalI18n);

    return this;
  },

  events: {
    "keypress [id$=username]" : "usernameCheck",
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
        $('.modal #mac', $('body')).attr ('placeholder', 'aa:bb:cc:dd:ee:ff')
          .focus ();
      }, timeout[i]);
    }
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

    err = this.form.commit ({validate: true});

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

          o.notify ($.t ('user:message.User has been saved'), 'success');
          o.model.bypassUserCheck = false;

          if (o.targetView) {
            o.targetView.model.add (o.model, { at: 0 });
          }
        },
        error: function (model, response) {
          debug.error (response.responseText);
          o.notify ($.t ('user:message.User save failed') + ': ' +
                    response.responseText, 'error');
          o.model.bypassUserCheck = false;
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

  usernameCheck: function (event) {
    // Allow backspace
    if (event.charCode === 0) return;

    var uppercase = /[A-Z]/;
    var alphanum = /[a-z0-9\\._-]/;
    var check = String.fromCharCode (event.charCode);

    if (uppercase.test (check)) {
      var this_ = $('input', this.$el)[0];
      $(this_).val (function (_, val) {
        return (val + check).toLowerCase ();
      });
    }

    if (!alphanum.test (check))
      event.preventDefault ();
  },
});

/* UserSelfServiceFormView */
window.UserSelfServiceFormView = Backbone.View.extend({
  initialize: function (opts) {
    $.extend (this, opts);

    this.UserUtils = new UserUtils ();

    this.initEvents ();
  },

  initEvents: function () {
    this.on ('userselected', function (model) {
      this.model = model;
      this.initModel.call (this);
      this.isChanges = 0;
      this.render ();
    }, this);

    this.on ('save', this.saveChanges, this);
    this.on ('cancel', this.cancel, this);
  },

  initModel: function () {
    var o = this;

    this.model.on ('change', function () {
      o.isChanges = 0;
      $.each (this.changed, function (field, value) {
        switch (field) {
          case "package":
          case "password":
          case "password_confirm":
            if (value === "")
              return;
            break;
          case "userstatus":
            return;
        }

        o.isChanges = 1;
      });
    });
  },

  createForm: function () {

    var fieldsets = [
      { legend: $.t('user:form.Profile'),
        fields: [ 'username' ],
      },
      { legend: $.t('user:form.Contact'),
        fields: [ 'firstname', 'surname', 'personid', 'email' ],
      },
      { legend: $.t('user:form.Authentication'),
        fields: [ 'password', 'password_confirm' ],
      },
      { legend: $.t('user:form.Authentication (Optional)'),
        fields: [ 'macs_binding' ],
      }
    ];

    this.form = new Backbone.Form({
      model: this.model,

      fieldsets: fieldsets,
    });

    this.form.render ();
    this.form.$el.i18n ();

    $('input', this.form.$el).iCheck(window.icheck_settings);

    var disable_filter = [ 'username', 'firstname', 'surname', 'email' ];
    for (var i = 0; i < disable_filter.length; i++) {
      var field = disable_filter[i];
      var input = $('input[name="' + field + '"]', this.form.$el);
      input.parent ().html ("<span class='form-control uneditable-input'>" + input.val () + "</span>");
    }

    var personid = $('div[name="personid"]', this.form.$el);
    var personid_val  = $('input', personid).val ();
    var personid_type = $('select option:selected', personid).text ();
    personid.html ("<span class='form-control uneditable-input'>" + personid_type + " - " +  personid_val + "</span>");
    personid.html ();

    $('.uneditable-input', this.form.$el).css ('border', '0px');
  },

  render: function () {
    $(this.el).html (new UserToolbarView ({ targetView: this }).el);

    this.createForm ();
    $(this.el).append ('<div class="form-area"></div>');
    var form = $('.form-area', this.$el);
    form.html (this.form.el);

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
        $('.modal #mac', $('body')).attr ('placeholder', 'aa:bb:cc:dd:ee:ff')
          .focus ();
      }, timeout[i]);
    }
  },

  saveChanges: function () {
    var form = this.form;
    var m = this.model;
    var saveData = {};

    err = this.form.commit ({validate: true});

    if (!err) {
      debug.info ('New: %i', this.model.isNew ());
      this.model.bypassUserCheck = true;

      if (!this.isChanges) {
        this.notify ($.t('app:message.Nothing changes'), 'warning');
        return this;
      }

      var o = this;
      this.model.save (saveData, {
        wait: true,
        success: function (model, response) {
          debug.info ("Success: Saved");
          o.isChanges = 0;

          o.notify ($.t ('user:message.User has been saved'), 'success');
          o.model.bypassUserCheck = false;
        },
        error: function (model, response) {
          debug.error (response.responseText);
          o.notify ($.t ('user:message.User save failed') + ': ' +
                    response.responseText, 'error');
          o.model.bypassUserCheck = false;
        }
       });
     } else {
       this.notify ($.t('app:message.Invalid data'), 'error');
       AlertErrorFocus (this.form.$el);
     }
  },

  cancel: function () {
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


/* UserListView */
window.UserListView = Backbone.View.extend({
  firstrun: true,
  rendering: false,

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

    function doDeferRender (o) {
      if (o.rendering) {
        return false;
      }

      function deferRender () {
        o.render ();
        o.rendering = false;
      }

      o.rendering = true;
      setTimeout ($.proxy (deferRender, o), 200);
    }

    this.model.on ('add change sync reset', function () {
      doDeferRender (this);
    }, this);

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

    this.on ('userdeleted', function () {
      doDeferRender (this);
    }, this);
    this.on ('search', this.search, this);
  },

  events: {
    'active_pane' : 'render'
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
    this.toolbarView = new UserSearchToolbarView ({ targetView: this,
                         targetFormView: this.targetView,
                         searchTxt: this.searchTxt,
                       });
    toolbararea.html (this.toolbarView.render().el);

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
      user.attributes.listno = ++listno;
      user.attributes.userid = user.attributes._id;
      user.attributes.userstatus_icon =
        user.attributes.userstatus ? 'ok' : 'lock';

      user.attributes.usertype_icon = "none";
      user.attributes.usertype_title = "";

      if (user.attributes.usertype == 'register') {
        user.attributes.usertype_icon = "barcode";
        user.attributes.usertype_title = "Register User";
      } else if (user.attributes.usertype == 'import') {
        user.attributes.usertype_icon = "import";
        user.attributes.usertype_title = "Import User";
      } else if (user.attributes.usertype == 'generate') {
        user.attributes.usertype_icon = "list-alt";
        user.attributes.usertype_title = "Generate User";
      }

      user.attributes.expired_icon = "none";

      var expire_data = user.attributes.expiration;
      if (expire_data !== undefined) {
        if (expire_data.enabled === true) {
          var now = new Date ();
          var exp = new Date (expire_data.timestamp);
          if (now > exp) {
            user.attributes.expired_icon = 'time';
          }
        }
      }

      user.attributes.usermanagement_icon =
        user.attributes.management ? 'star' : 'none';
      if (user.attributes.roles !== undefined &&
            user.attributes.roles.length > 0) {
        user.attributes.useradmin_icon = '';

        for (var i = 0; i < user.attributes.roles.length; i++) {
          if (user.attributes.roles[i].name == 'Admin') {
            user.attributes.useradmin_icon = 'flag';
          }
        }
      } else {
        user.attributes.useradmin_icon = '';
      }

      var item = new UserItemView ({ model: user });
      table_body.append (item.el);
      item.$el.attr ('id', user.attributes._id);
    });

    $('input[type="checkbox"]', table_body).attr ('checked',
                                                  function (index, attr) {
      var id = $(this).parent ().parent ().attr ('id');
      var model = o.model.get (id);
      return model.check ? true : false;
    });

    function onCheck (elem) {
      var check_parents = elem.parentsUntil ("tbody");
      var row = $(check_parents[check_parents.length - 1]);
      var id = row.attr ('id');

      if (id) {
        var model = o.model.get (id);
        var checkbox = elem;
        var check = checkbox.is (':checked');
        model.check = check;

        if (check) {
          if (row.attr('data-oldbackground') === undefined)
            row.attr ('data-oldbackground', row.children (':first-child').css ('background'));

          if (row.attr('data-oldcolor') === undefined)
            row.attr ('data-oldcolor', row.css ('color'));

          row.children ().css ('background', '#ccccff');
          row.css ('color', '#3366cc');

          o.targetView.itemsSelected = true;
        } else {
          row.children ().css ('background', row.attr ('data-oldbackground'));
          row.css ('color', row.attr ('data-oldcolor'));
        }
      }
    }

    var user_selectall = $('#user_selectall', this.$el);
    var users_check = $('input[type="checkbox"]', table_body);

    this.targetView.itemsSelected = false;
    this.targetView.models = this.model.models;
    users_check.each (function (index) {
      onCheck ($(this));
    });

    users_check.on ("ifChecked", function (event) {
      var checked_all = true;
      users_check.each (function (index) {
        var check = $(this).is (':checked');
        if (!check) {
          checked_all = false;
          return false;
        }
      });

      if (checked_all)
        user_selectall.iCheck ('check');
    });

    users_check.on ("ifUnchecked", function (event) {
      user_selectall.partial_checked = true;
      user_selectall.iCheck ('uncheck');
    });

    users_check.on ("ifChanged", function (event) {
      onCheck ($(this));
    });

    user_selectall.on ("ifChanged", function (event) {
      var check = $(this).is (':checked');

      if (check) {
        users_check.iCheck ("check");
        user_selectall.partial_checked = false;
      } else {
        if (!user_selectall.partial_checked)
          users_check.iCheck ("uncheck");
      }
    });

    $('tr', this.$el).click ($.proxy (function (event) {
      var user_check = $('input[type="checkbox"]', event.delegateTarget);
      if (user_check.is (':checked')) {
        user_check.iCheck("uncheck");
      } else {
        user_check.iCheck("check");
      }

      onCheck (user_check);
    }, this));

    $('tr', this.$el).each (function (index) {
      $('.item-edit', $(this)).click ($.proxy (function (event) {
        event.stopPropagation ();
        for (var i = 0; i < o.model.models.length; i++) {
          if (o.model.models[i].attributes._id == this.id) {
            o.targetView.trigger ('usermodify', o.model.models[i]);
            break;
          }
        }
      }, this));
    });

    if (this.model.models.length <= 0) {
      if (this.model.currentPage !== 0) {
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

    var Page = new UserListPaginator ({ model: this.model });
    $(this.el).append (Page.el);

    $(this.el).i18n();

    $('input', this.$el).iCheck(window.icheck_settings);

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
        filter.username  = s[i];
        filter.firstname = s[i];
        filter.surname   = s[i];
        filter.package   = s[i];
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
