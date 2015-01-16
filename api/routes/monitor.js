var walk = require ('walk');
var fs   = require ('fs');
var path = require ('path');

var MonitorRoutes = function () {

};

MonitorRoutes.prototype.initRoutes = function (app) {
  app.get  ('/api/monitor/hosts', app.Perm.check, this.getHosts);
};

MonitorRoutes.prototype.getHosts = function (req, res) {
  var data_path = 'public/data';
  var walker = walk.walk (data_path, { followLinks: false });
  var level = 0;
  var hosts_list = [];
  var networks_list = [];

  walker.on ("directories", function (root, fstat, next) {
    if (++level == 1 && fstat.length > 0) {
      fstat.forEach (function (d) {
        hosts_list.push (d.name);
      });
    }
    next ();
  });

  walker.on ("files", function (root, fstat, next) {
    if (/\/networks$/.test (root)) {
      fstat.forEach (function (d) {
        if (networks_list[root] == undefined)
          networks_list[root] = [];

        networks_list[root].push (d.name);
      });
    }
    next ();
  });

  walker.on ("errors", function () {
    res.status (404).end ();
  });

  walker.on ("end", function () {
    var hosts = {};

    hosts_list.forEach (function (d) {
      hosts[d] = [];

      var key = path.join (data_path, d, "networks");
      if (networks_list[key] != undefined)
        hosts[d] = networks_list[key];
    });

    console.log ("Hosts", hosts);
    res.status (200).json (hosts);
  });
};

module.exports = new MonitorRoutes;
