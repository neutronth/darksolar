/* ActivateFormView */
window.ActivateFormView = Backbone.View.extend({
  initialize: function (opts) {
    $.extend (this, opts);

    if (!this.model)
      this.newModel ();

    this.initEvents ();
    this.initModel ();
  },

  initEvents: function () {
  },

  initModel: function () {
    var o = this;

    this.model.on ('change', function () {
      o.isChanges = 1;
    });
  },

  createForm: function () {

    var fieldsets = [
      { legend: $.t('user:form.Profile'),
        fields: [ 'username', 'personid' ]
      },
      { legend: $.t('user:form.New Password'),
        fields: [ 'password', 'password_confirm' ]
      }
    ];

    this.form = new Backbone.Form({
      model: this.model,

      fieldsets: fieldsets,
    });

    debug.log (this.form);

    this.form.render ();

    $(this.form.fieldsets[1].el).hide ();

    if (!this.model.isNew ()) {
      var input = $('input[name="username"]', this.form.$el);
      input.parent().html ('\
        <span class="uneditable-input">' + input.val () + '</span>');
    }
  },

  render: function () {
    $(this.el).html ('');

    this.createForm ();
    $(this.el).append ('<div class="form-area"></div>');
    var form = $('.form-area', this.$el);
    form.html (this.form.el);

    $(this.el).append ('\
      <div class="notification-area h4"></div>\
    ');

    $(this.el).append ('\
      <div class="form-actions">\
        <button class="btn btn-primary" id="registersave"><span class="glyphicon glyphicon-ok"></span> <span data-i18n="app:button.ok">OK</span></button>\
      </div>');

    this.$el.i18n ();
    return this;
  },

  events: {
    "click #registersave" : "saveChanges",
    "click #gotologin"    : function () {
      $(location).attr ('href', darksolar_settings.portalUrl);
    },
    "keypress [id$=username]" : "usernameCheck",
    "keypress [id$=accesscode]" : "accessCodeCheck",
    "blur [id$=accesscode]" : "accessCodeAdjust",
  },

  newModel: function () {
    if (this.model)
      delete this.model;

    this.model = new Activate ();
    this.initModel ();
    this.isChanges = 0;

    if (this.targetView)
      this.targetView.render ();
  },

  saveChanges: function () {
    var form = this.form;
    var m = this.model;
    var saveData = {};
    var o = this;

    if (!this.model.isNew ()) {
      o.notify ('Could not change any data', 'error');
      return this;
    }

    err = this.form.commit ({validate: true});

    if (err) {
       if (err.personid == undefined) {
         var userInfo = err._others[0].return_info;
         $(this.form.fieldsets[1].el).show ();

         if (this.userInfo != userInfo) {
           this.showUserInfo (userInfo);
           this.userInfo = userInfo;
         }

         if (err.password == undefined) {
           err = undefined;
           this.form.commit ({validate: false});
           this.model.valid_ = true;
         }
       }

       if (err) {
         this.notify ($.t('app:message.Invalid data'), 'error');
         AlertErrorFocus (this.form.$el);
       }
     }

    debug.log ("Err", err);

    if (!err) {
      debug.info ('New: %i', this.model.isNew ());
      this.model.bypassUserCheck = true;

      if (!this.model.isNew ()) {
        if (!this.isChanges) {
          this.notify ('Nothing changes', 'warning');
          return this;
        }
      }

      this.model.save (saveData, {
        wait: true,
        success: function (model, response) {
          debug.info ("Success: Saved");
          var input = $('input[name="username"]', form.$el);
          input.parent().html ('\
            <span class="uneditable-input">' + input.val () + '</span>');
          o.isChanges = 0;

          o.notify ($.t('user:message.User has been saved'), 'success');
          o.model.bypassUserCheck = false;

          $('#registersave').attr ('disabled', true);
          var formactions = $('.form-actions');
          formactions.append ('<button class="btn btn-success" id="gotologin"><span class="glyphicon glyphicon-user icon-white"></span> <span data-i18n="app:button.Goto login page">Goto login page</span></button>');
          formactions.i18n ();
        },
        error: function (model, response) {
          debug.error (response);
          debug.error (response.responseText);
          o.notify ($.t ('user:message.User save failed:') + ' ' +
                    response.responseText, 'error');
          o.model.bypassUserCheck = false;
        }
       });
     }
  },

  showUserInfo: function (text) {
    var t = "<span style='text-align: right;'><h3>" + text + "<h3></span>"
    $(this.form.fieldsets[0].el).prepend (t);
  },

  notify: function (msg, type) {
    var area = $('.notification-area', this.$el);
    var notify = new AlertMessageView ({message: msg, type: type});
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
