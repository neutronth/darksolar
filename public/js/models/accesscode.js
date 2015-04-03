window.AccessCodeMeta = BackboneCustomModel.extend({
  urlRoot: "/api/accesscode/meta",
  amountMax: 1000,

  idAttribute: '_id',

  schema: {
    id: {
      type: 'Hidden',
      title: '',
    },

    amount: {
      type: 'Number',
      title: 'accesscode:form.Amount',
      validators: ['required']
    },

    package: {
      type: 'Select',
      title: 'accesscode:form.Group',
      options: PackageSelectInheritInstance,
      validators: ['required'],
    },

    purpose: {
      type: 'TextArea',
      title: 'accesscode:form.Purpose',
      validators: ['required'],
    },

    info: {
      type: 'TextArea',
      title: 'accesscode:form.Description',
    },

    expiration: {
      type: 'Object',
      title: 'accesscode:form.Expiration',
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
  },

  validate: function (attrs) {
    var errs = {};

    if (attrs.amount == '' || attrs.amount < 1 ||
      attrs.amount > this.amountMax) {
      errs.amount = $.t("forms:validation.Value should be in range of 1 to ")
                    + this.amountMax;
    }

    if (!_.isEmpty (errs))
      return errs;
  },

  defaults: {
    info: 'ป้อนรหัสนี้ในหน้าลงทะเบียน เพื่อขอรับรหัสผ่าน\n' +
          'Apply this code in the register page and ' +
          'request for new password'
  }
});

window.AccessCodeMetaCollection = BackboneCustomPaginator.extend({
  model: AccessCodeMeta,
  filter: '{}',

  paginator_core: {
    url: '/api/accesscode/meta',
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


window.AccessCode = BackboneCustomModel.extend({
});

window.AccessCodeCollection = BackboneCustomPaginator.extend({
  model: AccessCodeMeta,
  filter: '{}',

  paginator_core: {
    url: '/api/accesscode/code',
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
