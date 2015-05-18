window.GenUsersMeta = BackboneCustomModel.extend({
  urlRoot: "/api/genusers/meta",
  amountMax: 1000,

  idAttribute: '_id',

  schema: {
    prefix: {
      type: 'Text',
      title: 'genusers:form.Username Prefix',
      validators: ['required'],
    },

    purpose: {
      type: 'TextArea',
      title: 'genusers:form.Purpose',
      validators: ['required'],
    },

    info: {
      type: 'TextArea',
      title: 'genusers:form.Description',
    },

    amount: {
      type: 'Number',
      title: 'genusers:form.Amount',
      validators: ['required']
    },

    package: {
      type: 'Select',
      title: 'genusers:form.Group',
      options: PackageSelectInheritInstance,
      validators: ['required'],
    },
  },

  validate: function (attrs) {
    var errs = {};

    if (attrs.amount === '' || attrs.amount < 1 ||
      attrs.amount > this.amountMax) {
      errs.amount = $.t("forms:validation.Value should be in range of 1 to ") +
                    this.amountMax;
    }

    if (!_.isEmpty (errs))
      return errs;
  },
});

window.GenUsersMetaCollection = BackboneCustomPaginator.extend({
  model: GenUsersMeta,
  filter: '{}',

  paginator_core: {
    url: '/api/genusers/meta',
  },

  paginator_ui: {
    firstPage: 0,
    currentPage: 0,
    perPage: 10,
    totalPages: 1,
  },

  server_api: {
    '$filter': function () {
      return this.filter !== undefined ? this.filter : '{}';
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


window.GenUsers = BackboneCustomModel.extend({
});

window.GenUsersCollection = BackboneCustomPaginator.extend({
  model: GenUsersMeta,
  filter: '{}',

  paginator_core: {
    url: '/api/genusers/code',
  },

  paginator_ui: {
    firstPage: 0,
    currentPage: 0,
    perPage: 20,
    totalPages: 1,
  },

  server_api: {
    '$filter': function () {
      return this.filter !== undefined ? this.filter : '{}';
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
