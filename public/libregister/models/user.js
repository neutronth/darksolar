window.User = BackboneCustomModel.extend({
  urlRoot: "/api/user/register",
  bypassUserCheck: false,

  idAttribute: '_id',

  schema: {
    accesscode: {
      type: 'Text',
      title: 'Access Code',
      validators: ['required'],
    },

    username: {
      type: 'Text',
      title: 'Username',
      validators: ['required'],
    },

    firstname: {
      type: 'Text',
      title: 'Firstname',
      validators: ['required'],
    },

    surname: {
      type: 'Text',
      title: 'Surname',
      validators: ['required'],
    },

    personid: {
      type: 'IDInput',
      title: 'ID',
      validators: ['required'],
    },

    email: {
      dataType: 'email',
      title: 'Email',
      validators: ['required', 'email'],
    },

    password: {
      type: 'Password',
      title: 'Password',
      validators: [{
        type: 'match',
        field: 'password_confirm',
        message: 'Passwords must match!',
      }],
    },

    password_confirm: {
      type: 'Password',
      title: 'Confirm',
    },
  },

  validate: function (attrs) {
    var errs = {};
    var _this = this;

    /* Password Check */
    if (this.isNew ()) {
      if (attrs.password == '')
        errs.password = 'Required';
    }

    if (attrs.password != '' &&
          attrs.password.length < 6) {
      errs.password = 'At least 6 characters length';
    }

    if (attrs.username != '' &&
          attrs.username.length < 4) {
      errs.username = 'At least 4 characters length';
    }

    /* Username taken check */
    function userFetch (value, errs) {
      var usrErr = 'Username has been taken';

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
        errs.personid = 'Invalid';
      } else {
        var idtype = s[0];
        var id = s[1];

        switch (idtype) {
          case 'Thai Personal ID':
            if (!checkThaiID (id)) {
              errs.personid = 'Invalid Thai Personal ID';
            }
            break;
          default:
            if (id.length < 5) {
              errs.personid = 'Invalid';
            }
        }
      }
    } else {
      errs.personid = 'Invalid';
    }

    if (!_.isEmpty (errs))
      return errs
  },
});
