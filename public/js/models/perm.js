window.Perm = BackboneCustomModel.extend ({
  urlRoot: "/api/perm",

  isRole: function (role) {
    var roles = this.get ('roles');
    for (var i = 0; i < roles.length; i++) {
      if (roles[i] == role)
        return true;
    }

    return false;
  },

  isNoManagementGroup: function () {
    var mgs = this.get ('mgs');

    debug.log ('MGS', mgs);

    return mgs === undefined || mgs.length === 0;
  },

  getUsername: function () {
    return this.get ('username');
  },

  getFullname: function () {
    return this.get ('fullname');
  },
});
