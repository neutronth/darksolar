window.Register = BackboneCustomModel.extend({
  urlRoot: "/api/user/register",
  bypassUserCheck: false,

  idAttribute: '_id',

  schema: {
    accesscode: {
      type: 'Text',
      title: 'user:form.Access Code',
      validators: ['required'],
    },

    username: {
      type: 'Text',
      title: 'user:form.Username',
      validators: ['required'],
    },

    firstname: {
      type: 'Text',
      title: 'user:form.Firstname',
      validators: ['required'],
    },

    surname: {
      type: 'Text',
      title: 'user:form.Surname',
      validators: ['required'],
    },

    personid: {
      type: 'IDInput',
      title: 'user:form.ID',
      validators: ['required'],
    },

    email: {
      dataType: 'email',
      title: 'user:form.Email',
      validators: ['required', 'email'],
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
      var usrErr = $.t('forms:validation.Username has been taken');

      if (_this.bypassUserCheck || _this.get ('_id') != undefined) {
        return;
      }

      $.ajax ({
        url: "/api/user/check/" + value,
        dataType: 'json',
        async: false,
        success: function (data) {
          if (data.username != undefined) {
            errs.username = usrErr;
          }
        },
        error: function (error) {
          errs.username = usrErr;
        },
      });
    }

    userFetch (attrs.username, errs);

    /* Person ID check */
    function checkThaiID (id) {
      if (id.length != 13)
        return false;

      for (i = 0, sum = 0; i < 12; i++) {
        sum += parseInt (id.charAt (i) * (13 - i));
      }

      var chkDigit = (11 - (sum % 11)) % 10;
      return chkDigit === parseInt (id.charAt (12)) ? true : false;
    }

    if (attrs.personid != undefined) {
      var s = attrs.personid.split (':');
      if (s.length != 2) {
        errs.personid = $.t('forms:validation.Invalid');
      } else {
        var idtype = s[0];
        var id = s[1];

        switch (idtype) {
          case 'Thai Personal ID':
            if (!checkThaiID (id)) {
              errs.personid = $.t('forms:validation.Invalid Thai Personal ID');
            }
            break;
          default:
            if (id.length < 5) {
              errs.personid = $.t('forms:validation.Invalid');
            }
        }
      }
    } else {
      errs.personid = $.t('forms:validation.Invalid');
    }

    if (!/^[a-z0-9\\._-]+$/.test(attrs.username)) {
      errs.username = $.t('forms:validation.Value should be the alphanumeric');
    }

    if (!_.isEmpty (errs))
      return errs
  },
});
