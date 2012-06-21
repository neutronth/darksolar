window.UserSelect = BackboneCustomModel.extend ({
  idAttribute: 'key',

  toString: function () {
    return this.attributes.label;
  },
});

window.UserSelectCollection = Backbone.Collection.extend ({
  model: UserSelect,
  url: '/api/user/management/selectlist',
});

window.UserSelectInstance = new UserSelectCollection ();

window.ManagementGroup = BackboneCustomModel.extend({
  urlRoot: "/api/management/group",

  idAttribute: '_id',

  schema: {
    groupname: {
      type: 'Text',
      title: 'Group name',
      validators: ['required'],
    },

    description: {
      type: 'Text',
      title: 'Description',
    },

    groupstatus: {
      type: 'Checkbox',
      title: 'Active',
    },

    members: {
      type: 'List',
      itemType: 'Object',
      title: 'Members',
      subSchema: {
        username: {
          type: 'Select',
          options: UserSelectInstance,
        },
      },
      itemToString: function (user) {
        debug.log (user);
        return user.username;
      },
    },
  },

  defaults: {
    'groupstatus': true,
  },
});

window.ManagementGroupCollection = Backbone.Paginator.requestPager.extend({
  model: ManagementGroup,
  filter: '{}',

  paginator_core: {
    url: '/api/management/group',
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