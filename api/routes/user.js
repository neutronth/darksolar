var User = require ('../user');

var UserRoutes = function () {

};

UserRoutes.prototype.initRoutes = function (app) {
  app.get ('/api/package/inheritance', this.getInheritAll);
};

module.exports = new UserRoutes;
