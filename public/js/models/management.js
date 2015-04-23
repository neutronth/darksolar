window.UserSelect = BackboneCustomModel.extend ({
  idAttribute: 'key',

  toString: function () {
    return this.attributes.label;
  },
});

window.UserSelectCollection = SelectCollection.extend ({
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
      title: 'management:form.Group name',
      validators: ['required'],
    },

    description: {
      type: 'Text',
      title: 'management:form.Description',
    },

    groupstatus: {
      type: 'Checkbox',
      title: 'management:form.Active',
    },

    members: {
      type: 'List',
      itemType: 'Object',
      title: 'management:form.Members',
      subSchema: {
        username: {
          type: 'Select',
          title: 'management:form.Username',
          options: UserSelectInstance,
        },
      },
      itemToString: function (user) {
        debug.log (user);
        return user.username;
      },
    },
  },

  validate: function (attrs) {
    var errs = {};
    if (!/^[a-zA-Z0-9 _-]+$/.test(attrs.groupname)) {
      errs.groupname = $.t('forms:validation.Value should be the alphanumeric');
    }

    if (!_.isEmpty (errs))
      return errs;
  },

  defaults: {
    'groupstatus': true,
  },
});

window.ManagementGroupCollection = BackboneCustomPaginator.extend({
  model: ManagementGroup,
  filter: '{}',

  paginator_core: {
    url: '/api/management/group',
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
