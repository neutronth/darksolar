window.KeyValSelect = BackboneCustomModel.extend ({
  idAttribute: 'key',

  toString: function () {
    return this.attributes.label;
  },
});

window.SelectCollection = Backbone.Collection.extend ({
  model: KeyValSelect,
  deferred: null,

  deferredFetch: function (callback) {
    var _this = this;

    if (!this.deferred) {
      this.deferred = $.Deferred (function (d) {
        _this.fetch ({
          success: function () {
            d.resolve ();
          },
          error: function (err) {
            d.reject (err);
          }
        });
      });
    }

    return this.deferred.done (callback);
  },

  deferredReset: function () {
    this.deferred = null;
  }
});


window.PackageSelectCollection = SelectCollection.extend ({
  url: '/api/package/template/selectlist',
});

window.PackageSelectInheritCollection = SelectCollection.extend ({
  url: '/api/package/inheritance/selectlist',
});

window.ManagementGroupSelectCollection = SelectCollection.extend ({
  url: '/api/management/group/selectlist',

  getById: function (id, callback) {
    var ret = 'Unknown';
    var _this = this;

    for (var i = 0; i < _this.models.length; i++) {
      var model = _this.models[i];
      if (id == model.get ('key')) {
        ret = model.get ('label');
      }
    }

    return ret;
  }
});

window.PackageSelectInstance = new PackageSelectCollection ();
window.PackageSelectInheritInstance = new PackageSelectInheritCollection ();
window.ManagementGroupSelectInstance = new ManagementGroupSelectCollection ();

window.Package = BackboneCustomModel.extend({
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
      title: 'package:form.Name',
      validators: ['required']
    },

    description: {
      type: 'TextArea',
      title: 'package:form.Description',
    },

    pkgtype: {
      type: 'Hidden',
      template: 'Hidden',
    },

    inherited: {
      type: 'Select',
      title: 'package:form.Policy',
      options: PackageSelectInstance,
      validators: ['required'],
    },

    management_group: {
      type: 'Select',
      title: 'package:form.Management Group',
      options: ManagementGroupSelectInstance,
      validators: ['required'],
    },

    simulteneous_use: {
      type: 'ConcurrentSet',
      title: 'package:form.Concurrent login',
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
      title: 'package:form.Session timeout',
    },

    max_all_session: {
      type: 'SessionSet', 
      title: 'package:form.All usage',
    },

    max_daily_session: { 
      type: 'SessionSet', 
      title: 'package:form.Daily usage',
    },

    max_monthly_session: {
      type: 'SessionSet', 
      title: 'package:form.Monthly usage',
    },

    max_access_period: {
      type: 'SessionSet', 
      title: 'package:form.Access period',
    },

    bandwidth_max_up: {
      type: 'BandwidthSet',
      title: 'package:form.Upload',
    },

    bandwidth_max_down: {
      type: 'BandwidthSet',
      title: 'package:form.Download',
    },

    expiration: {
      type: 'Object',
      title: 'package:form.Expiration',
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

    class_of_service: {
      type: 'TextSet',
      title: 'package:form.Class of Service',
    },

    packagestatus: {
      type: 'Checkbox',
      title: 'package:form.Active',
    },
  },

  validate: function (attrs) {
    var errs = {};
    if (/[^a-zA-Z0-9 _-]/.test(attrs.name)) {
      errs.name = "Value should be the alphanumeric";
    }

    if (!_.isEmpty (errs))
      return errs;
  },

  defaults: {
    packagestatus: true,
  },
});

window.PackageCollection = BackboneCustomPaginator.extend({
  model: Package,
  filter: '{}',

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
