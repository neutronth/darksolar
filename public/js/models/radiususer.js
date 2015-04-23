window.RadiusOnlineUser = BackboneCustomModel.extend({
  urlRoot: '/api/user/radius/online',
  idAttribute: 'radacctid',
});

window.RadiusOnlineUserCollection = BackboneCustomPaginator.extend({
  model: RadiusOnlineUser,
  filter: '{}',

  paginator_core: {
    url: '/api/user/radius/online',
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
