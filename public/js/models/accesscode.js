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
      title: 'Amount',
      validators: ['required']
    },

    package: {
      type: 'Select',
      title: 'Package',
      options: PackageSelectInheritInstance,
      validators: ['required'],
    },

    purpose: {
      type: 'TextArea',
      title: 'Purpose',
      validators: ['required'],
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
  },

  validate: function (attrs) {
    var errs = {};

    if (attrs.amount == '' || attrs.amount < 1 ||
      attrs.amount > this.amountMax) {
      errs.amount = "Value should be in range of 1 to " + this.amountMax;
    }

    if (!_.isEmpty (errs))
      return errs;
  },
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
