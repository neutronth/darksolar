window.User = BackboneCustomModel.extend({
  urlRoot: "/api/user",
  bypassUserCheck: false,

  idAttribute: '_id',

  schema: {
    username: {
      type: 'Text',
      title: 'user:form.Username',
      validators: ['required'],
    },

    package: {
      type: 'Select',
      title: 'user:form.Package',
      options: PackageSelectInheritInstance,
      validators: ['required'],
    },

    description: {
      type: 'TextArea',
      title: 'user:form.Description',
    },


    roles: {
      type: 'List',
      title: 'user:form.Roles',
      itemType: 'Object',
      subSchema: {
        name: {
          type: 'Select',
          title: 'user:form.Roles',
          options: [ { val: 'Admin', label: 'Admin' } ],
        },
      },
      itemToString: function (role) {
        return role.name;
      },
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

    description: {
      type: 'TextArea',
      title: 'user:form.Description',
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

    expiration: {
      type: 'Object',
      title: 'user:form.Expiration',
      subSchema: {
        enabled: {
          type: 'Checkbox',
          title: 'user:form.Enable',
        },
        timestamp: {
          type: 'jqueryui.DateTime',
          title: '',
        },
      }
    },

    userstatus: {
      type: 'Checkbox',
      title: 'user:form.Active',
    },

    management: {
      type: 'Checkbox',
      title: 'user:form.Management User',
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

    if (attrs.password != undefined && attrs.password != '' &&
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

  defaults: {
    'userstatus' : true,
  },
});

window.UserImportMeta = BackboneCustomModel.extend({
  idAttribute: 'importid',
  urlRoot: "/api/user/import/meta"
});

window.UserImportMetaCollection = Backbone.Collection.extend({
  url: "/api/user/import/meta",
  model: UserImportMeta
});

window.UserImportUser = BackboneCustomModel.extend({
  idAttribute: 'index',
});

window.UserImportStart = BackboneCustomModel.extend({
  idAttribute: 'importid',
  id: 'xxx',

  url: function () {
    return "/api/user/import/meta/" + this.id + "/start";
  }
});

window.UserImportProgress = BackboneCustomModel.extend({
  idAttribute: 'importid',
  id: 'xxx',

  url: function () {
    return "/api/user/import/meta/" + this.id + "/progress";
  }
});

window.UserImportListCollection = Backbone.Collection.extend({
  importid: "xxx",
  getfail: false,
  model: UserImportUser,
  startIdx: 0,

  url: function () {
    var getfail_opt = "";
    var querystring = "";

    if (this.getfail) {
      getfail_opt = "/verify";
    }

    if (this.startIdx > 0) {
      querystring = "?start=" + this.startIdx;
    }

    return "/api/user/import/meta/" + this.importid + getfail_opt + querystring;
  },

  setImportID : function (id) {
    this.importid = id;
  },
  getFailItems : function (get) {
    this.getfail = get;
  },
  setStartIdx : function (idx) {
    this.startIdx = idx;
  },
  parse : function (response) {
    if (this.getfail) {
      debug.info ("parse", response);
      var meta = response[response.length - 1];
      this.importCount = meta.count;
      this.importFail = meta.fail;
      response.pop ();

      return response;
    }

    return response;
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
    perPage: 10,
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
