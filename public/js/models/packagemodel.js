window.PackageSelect = Backbone.Model.extend ({
  idAttribute: 'key',

  toString: function () {
    return this.attributes.label;
  },
});

window.PackageSelectCollection = Backbone.Collection.extend ({
  model: PackageSelect,

  url: '/api/package/template/selectlist',
});

window.PackageSelectInstance = new PackageSelectCollection ();

window.Package = Backbone.Model.extend({
  urlRoot: function () {
    var root = "/api/package";

    switch (this.pkgtype) {
      case 'template':
        return root + '/template';
      case 'inheritance':
        return root + '/inheritance';
    }
    return undefined; 
  },

  idAttribute: '_id',

  schema: {
    name: {
      type: 'Text',
      title: 'Name',
      validators: ['required']
    },

    description: {
      type: 'TextArea',
      title: 'Description',
    },

    pkgtype: {
      type: 'Hidden',
    },

    inherited: {
      type: 'Select',
      title: 'Template',
      options: PackageSelectInstance,
      validators: ['required'],
    },

    simulteneous_use: {
      type: 'ConcurrentSet',
      title: 'Concurrent login',
      validators: [
        function checkSimulteneousUse (value, formValues) {
          var err = {
            type: 'simulteneous_use',
            message: 'Must greater than 0',
          };

          if (value <= 0)
            return err;
        }
      ]
    },

    session_timeout: { 
      type: 'SessionSet', 
      title: 'Session timeout',
    },

    max_all_session: {
      type: 'SessionSet', 
      title: 'All usage',
    },

    max_daily_session: { 
      type: 'SessionSet', 
      title: 'Daily usage',
    },

    max_monthly_session: {
      type: 'SessionSet', 
      title: 'Monthly usage',
    },

    max_access_period: {
      type: 'SessionSet', 
      title: 'Access period',
    },
  }
});

window.PackageCollection = Backbone.Paginator.requestPager.extend({
  model: Package,

  initUrl: function (pkgtype) {
    var url = '/api/package';

    switch (pkgtype) {
      case 'template':
        url += '/template';
        break;
      case 'inheritance':
        url += '/inheritance';
        break;
      default:
        url = undefined;
    }

    this.paginator_core.url = url;
  },

  paginator_core: {
    url: undefined,
  },

  paginator_ui: {
    firstPage: 0,
    currentPage: 0,
    perPage: 8,
    totalPages: 1,
  },

  server_api: {
    '$filter': '',

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
