window.KeyValSelect = BackboneCustomModel.extend ({
  idAttribute: 'key',

  toString: function () {
    return this.attributes.label;
  },
});

window.PackageSelectCollection = Backbone.Collection.extend ({
  model: KeyValSelect,

  url: '/api/package/template/selectlist',
});

window.PackageSelectInheritCollection = Backbone.Collection.extend ({
  model: KeyValSelect,

  url: '/api/package/inheritance/selectlist',
});

window.ManagementGroupSelectCollection = Backbone.Collection.extend ({
  model: KeyValSelect,
  url: '/api/management/group/selectlist',

  getById: function (id, callback) {
    var deferreds = [];
    var _this = this;
    var ret = 'Unknown';

    function tryFetch () { 
      if (_this.models.length == 0) {
        deferreds.push (_this.fetch ());
      } else {
        deferreds.push (function () {});
      }
  
      var d = $.Deferred (); 
  
      $.when.apply (null, deferreds).done (function () {
        for (var i = 0; i < _this.models.length; i++) {
          var model = _this.models[i];
          if (id == model.get ('key')) {
            ret = model.get ('label');
          }
        }
      });

      return d.promise ();
    }

    tryFetch ();

    return ret;

  },
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
      title: 'Name',
      validators: ['required']
    },

    description: {
      type: 'TextArea',
      title: 'Description',
    },

    pkgtype: {
      type: 'Hidden',
      template: 'Hidden',
    },

    inherited: {
      type: 'Select',
      title: 'Template',
      options: PackageSelectInstance,
      validators: ['required'],
    },

    management_group: {
      type: 'Select',
      title: 'Management Group',
      options: ManagementGroupSelectInstance,
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

    bandwidth_max_up: {
      type: 'BandwidthSet',
      title: 'Upload',
    },

    bandwidth_max_down: {
      type: 'BandwidthSet',
      title: 'Download',
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

    class_of_service: {
      type: 'TextSet',
      title: 'Class of Service',
    },

    packagestatus: {
      type: 'Checkbox',
      title: 'Active',
    },
  },

  defaults: {
    packagestatus: true,
  },
});

window.PackageCollection = Backbone.Paginator.requestPager.extend({
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
    perPage: 8,
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
