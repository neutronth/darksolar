/* UserFormView */
window.UserFormView = Backbone.View.extend({
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
      { legend: 'Register',
        fields: [ 'accesscode', 'username' ],
      },
      { legend: 'Profile',
        fields: [ 'firstname', 'surname', 'personid', 'email' ],
      },
      { legend: 'New Password',
        fields: [ 'password', 'password_confirm' ],
      },


    ];

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

    this.createForm ();
    $(this.el).append ('<div class="form-area"></div>');
    var form = $('.form-area', this.$el);
    form.html (this.form.el);

    $(this.el).append ('\
      <div class="notification-area"></div>\
    ');

    $(this.el).append ('\
      <div class="form-actions">\
        <button class="btn btn-primary" id="registersave"><i class="icon-ok icon-white"></i> Register</button>\
      </div>');

    return this;
  },

  events: {
    "click #registersave" : "saveChanges",
    "click #gotologin"    : function () {
      $(location).attr ('href', darksolar_settings.portalUrl);
    },
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
    var o = this;

    if (!this.model.isNew ()) {
      o.notify ('Could not change any data', 'error');
      return this;
    }

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

          $('#registersave').attr ('disabled', true);
          var formactions = $('.form-actions');
          formactions.append ('<button class="btn btn-success" id="gotologin"><i class="icon-user icon-white"></i> Goto login page</button>');
        },
        error: function (model, response) {
          debug.error (response);
          debug.error (response.responseText);
          o.notify ('User save failed: ' + response.responseText, 'error');
          o.model.bypassUserCheck = false;
        }
       });
     }
  },

  notify: function (msg, type) {
    var area = $('.notification-area', this.$el);
    var icon_lookup = {
      success: 'icon-ok-sign',
      error:   'icon-fire',
      warning: 'icon-exclamation-sign',
      info: 'icon-info-sign',
      default: 'icon-info-sign',
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
