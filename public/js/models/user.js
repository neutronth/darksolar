window.User = BackboneCustomModel.extend({
  urlRoot: "/api/user",
  bypassUserCheck: false,

  idAttribute: '_id',

  schema: {
    username: {
      type: 'Text',
      title: 'Username',
      validators: ['required'],
    },

    package: {
      type: 'Select',
      title: 'Package',
      options: PackageSelectInheritInstance,
      validators: ['required'],
    },

    roles: {
      type: 'List',
      title: 'Roles',
      itemType: 'Object',
      subSchema: {
        name: {
          type: 'Select',
          options: [ { val: 'Admin', label: 'Admin' } ],
        },
      },
      itemToString: function (role) {
        return role.name;
      },
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

    description: {
      type: 'TextArea',
      title: 'Description',
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

    expiration: {
      type: 'Object',
      title: 'Expiration',
      subSchema: {
        enabled: {
          type: 'Checkbox',
          title: 'Enable',
        },
        timestamp: {
          type: 'jqueryui.DateTime',
          title: '',
        },
      }
    },

    userstatus: {
      type: 'Checkbox',
      title: 'Active',
    },

    management: {
      type: 'Checkbox',
      title: 'Management User',
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

  defaults: {
    'userstatus' : true,
  },
});

window.UserCollection = BackboneCustomPaginator.extend({
  model: User,
  filter: '{}',

  paginator_core: {
    url: '/api/user',
  },

  paginator_ui: {
    firstPage: 0,
    currentPage: 0,
    perPage: 20,
    totalPages: 1,
  },

  server_api: {
    '$filter': function () {
      return this.filter != undefined ? this.filter : '{}';
    },

    '$top': function () {
      return this.perPage;
    },

    '$skip': function () {
      return this.currentPage * this.perPage;
    },

    '$inlinecount': 'allpages',
    '$callback': 'callback',
  },

  parse: function (response) {
    var packages = response.results;

    this.totalPages = Math.ceil (response.__count / this.perPage);

    debug.info (packages);

    return packages;
  },
});
