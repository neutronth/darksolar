window.Activate = BackboneCustomModel.extend({
  urlRoot: "/api/user/activate",
  bypassUserCheck: false,

  idAttribute: '_id',

  schema: {
    username: {
      type: 'Text',
      title: 'user:form.Username',
      validators: ['required'],
    },

    personid: {
      type: 'Text',
      title: 'user:form.ID',
      validators: ['required']
    },

    password: {
      type: 'Password',
      title: 'user:form.Password',
      validators: [{
        type: 'match',
        field: 'password_confirm',
        message: function () {
          return $.t ("forms:validation.Passwords must match!");
        }
      }],
    },

    password_confirm: {
      type: 'Password',
      title: 'user:form.Confirm',
    },
  },

  validate: function (attrs) {
    var errs = {};
    var _this = this;

    if (this.valid_)
      return;

    /* Password Check */
    if (this.isNew ()) {
      if (attrs.password == '')
        errs.password = $.t('forms:validation.Required');
    }

    if (attrs.password != '' &&
          attrs.password.length < 6) {
      errs.password = $.t('forms:validation.At least 6 characters length');
    }

    /* Username taken check */
    function userFetch (value, errs) {
      var usrErr = $.t('forms:validation.Username does not exist');

      if (_this.bypassUserCheck || _this.get ('_id') != undefined) {
        return;
      }

      $.ajax ({
        url: "/api/user/check/" + value,
        dataType: 'json',
        async: false,
        success: function (data) {
          if (data.username == undefined) {
            errs.username = usrErr;
          } else {
            errs.return_info = data.firstname + ' ' + data.surname;
          }
        },
        error: function (error) {
          errs.username = usrErr;
        },
      });
    }

    userFetch (attrs.username, errs);

    /* check id */
    function idFetch (username, value, errs) {
      var usrErr = $.t('forms:validation.Username does not exist');

      if (_this.bypassUserCheck || _this.get ('_id') != undefined) {
        return;
      }

      $.ajax ({
        url: "/api/user/check/" + username + "/" + value,
        dataType: 'json',
        async: false,
        success: function (data) {
        },
        error: function (error) {
          errs.personid = usrErr;
        },
      });
    }

    idFetch (attrs.username, attrs.personid, errs);

    if (!_.isEmpty (errs))
      return errs
  },
});
