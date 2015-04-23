var HelpRoutes = function () {

};

HelpRoutes.prototype.initRoutes = function (app) {
  app.get  ('/help', this.helpPage);
};

HelpRoutes.prototype.helpPage = function (req, res) {
  res.render ("help");
};

module.exports = new HelpRoutes ();
