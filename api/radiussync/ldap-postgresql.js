var inherits = require ('util').inherits;
var pg = require ('pg').native;
var Q = require ('q');
var DateFormat = require ('dateformatjs').DateFormat;
var RadiusSync = require ('./radiussync');
var ldap = require ('ldapjs');

var RadiusSyncLDAPPostgreSQL = function (config) {
  RadiusSyncLDAPPostgreSQL.super_.apply (this, config);
  RadiusSyncLDAPPostgreSQL.super_.prototype.initialize.apply (this);
  this.initialize ();

  this.connString = config.RadiusDb;
  this.config = config;
}

inherits (RadiusSyncLDAPPostgreSQL, RadiusSync);

RadiusSyncLDAPPostgreSQL.prototype.prepare = function () {
  var o = this;
  var config_ = o.config.Ldap;
  var client = ldap.createClient (config_);

  var profiles = config_.profiles + "," + config_.base;
  var users    = config_.users + "," + config_.base;
  var macauth  = config_.macauth + "," + config_.base;

  function bind () {
    var d = Q.defer ();

    client.bind (config_.bindDN, config_.bindCredentials, function (err) {
      if (err)
        d.reject (new Error (err));
      else
        d.resolve ();
    });

    return d.promise;
  }

  function addOu (dn, ou_name) {
    var d = Q.defer ();

    var entry = {
      objectClass: ['organizationalUnit', 'top'],
      ou: ou_name
    };

    client.add (dn, entry, function (err) {
      console.log ("RadiusSyncLDAPPostgreSQL", "Prepare OU", dn);
      d.resolve ();
    });

    return d.promise;
  }

  bind ()
    .then (function () {
      return Q.all([
        addOu (profiles, "profiles"),
        addOu (users,    "users"),
        addOu (macauth,  "macauth")
      ]).then (function () {
        client.unbind ();
      });
    })
    .fail (function (err) {
      console.error ("RadiusSyncLDAPPostgreSQL init failed", err.message);
    });
}

RadiusSyncLDAPPostgreSQL.prototype.closeClient = function () {
  if (this.persistent) {
    console.log ("RadiusSyncLDAPPostgreSQL", "Close persistent client");

    if  (this.client != undefined) {
      this.client.end ();
      this.client = undefined;
    }

    if (this.ldapclient != undefined) {
      this.ldapclient.unbind ();
      this.ldapclient = undefined;
    }
  }
}

RadiusSyncLDAPPostgreSQL.prototype.initialize = function () {
  this.sqlTpl = {
    usergroupdelete:
      'DELETE FROM radusergroup WHERE username=$1',
    usergroupinsert:
      'INSERT INTO radusergroup(username,groupname) VALUES ($1,$2)',

    useronline: {
      all: 'SELECT radacctid, acctsessionid, username, groupname, realm, nasipaddress, nasportid, acctstarttime, framedipaddress, callingstationid, calledstationid FROM radacct WHERE acctterminatecause IS NULL',
      allcount: 'SELECT COUNT(radacctid) FROM radacct WHERE acctterminatecause IS NULL',
      updateacct: 'UPDATE radacct SET acctstoptime=$2,acctterminatecause=$3 WHERE radacctid=$1 AND acctstoptime IS NULL',
    },
  };
};

RadiusSyncLDAPPostgreSQL.prototype.groupSync = function (groupname, callback) {
  var o = this;

  if (!this.groupName) {
    callback (new Error ('No group name'));
    return;
  }

  var config_ = o.config.Ldap;
  var client = ldap.createClient (config_);

  var cn = "cn=" + groupname;
  var basesearch = config_.profiles + "," + config_.base;
  var dn = cn + "," + basesearch;

  function bind () {
    var d = Q.defer ();

    client.bind (config_.bindDN, config_.bindCredentials, function (err) {
      if (err)
        d.reject (new Error (err));
      else
        d.resolve ();
    });

    return d.promise;
  }

  function clear () {
    var d = Q.defer ();

    client.del (dn, function (err) {
      /* Ignore not existing */
      if (err && err.code != 32) {
        d.reject (new Error (err));
      } else {
        d.resolve ();
        console.log ('Clear:', dn);
      }
    });

    return d.promise;
  }

  function getNewEntry () {
    var newEntry = {
      objectClass: ['groupOfNames', 'radiusprofile', 'top'],
      cn: groupname,
      member: '',
      radiusAuthType: 'LDAP'
    };

    var radiusCheckItem = [];
    var radiusReplyItem = [];

    var expire_data = o.attrsData.expiration != undefined ?
                      o.attrsData.expiration : { enabled: false };

    if (o.attrsData.packagestatus == false || expire_data.enabled == true) {
      var df = new DateFormat ("MMMM d yyyy HH:mmzzz");
      var expiration;

      if (o.attrsData.packagestatus == false) {
        expiration = df.format (new Date (1982, 0, 1));
      } else if (expire_data.enabled === true) {
        expiration = df.format (expire_data.timestamp);
      }

      radiusCheckItem.push ("Expiration := " + expiration);
    }

    for (var key in o.attrsData.schema.paths) {
      var val = typeof o.attrsData[key] === 'string' ?
                  o.attrsData[key].split ('*')[0] : o.attrsData[key];

      if (val == 0)
        continue;

      var attr = o.attrs_map[key];
      if (attr != undefined) {
        if (attr.type == 'check') {
          radiusCheckItem.push (attr.map + " " + attr.op + " " + val);
        } else {
          radiusReplyItem.push (attr.map + " " + attr.op + " " + val);
        }
      }
    }

    if (radiusCheckItem.length > 0) {
      newEntry.radiusCheckItem = radiusCheckItem;
    }

    if (radiusReplyItem.length > 0) {
      newEntry.radiusReplyItem = radiusReplyItem;
    }

    return newEntry;
  }

  function update () {
    var d = Q.defer ();

    if (!o.attrsData) {
      d.resolve ();
      return d.promise;
    }

    client.add (dn, getNewEntry (), function (err) {
      if (err) {
        d.reject (new Error (err));
      } else {
        console.log ("Update:", dn);
        d.resolve ();
      }
    });

    return d.promise;
  }

  bind ()
    .then (clear)
    .then (update)
    .then (function () {
      callback (undefined, true);
      client.unbind ();
    })
    .fail (function (error) {
      console.error ("Error: " + error.message);
      callback (error);
      client.unbind ();
    });
};


RadiusSyncLDAPPostgreSQL.prototype.userSync = function (username, attrs, callback) {
  var o = this;

  if (!username) {
    callback (new Error ('No username'));
    return;
  }

  var config_ = o.config.Ldap;
  var client;
  var bindRequire = true;

  if (o.persistent) {
    if (o.ldapclient == undefined) {
      o.ldapclient = ldap.createClient (config_);
    } else {
      bindRequire = false;
    }

    if (o.client == undefined) {
      o.client = new pg.Client (o.connString);
      o.client.connect ();
    }

    client = o.ldapclient;
  } else {
    client = ldap.createClient (config_);
  }

  var uid = "uid=" + username;
  var basesearch  = config_.users + "," + config_.base;
  var dn = uid + "," + basesearch;
  var profile = attrs ? ("cn=" + attrs.package + "," + config_.profiles + "," +
                config_.base) : "";

  function bind () {
    var d = Q.defer ();

    if (!bindRequire) {
      d.resolve ();
      return d.promise;
    }

    client.bind (config_.bindDN, config_.bindCredentials, function (err) {
      if (err)
        d.reject (new Error (err));
      else
        d.resolve ();
    });

    return d.promise;
  }

  function clear () {
    var d = Q.defer ();

    client.del (dn, function (err) {
      /* Ignore not existing */
      if (err && err.code != 32) {
        d.reject (new Error (err));
      } else {
        console.log ('Group remove user', username);
        pg.connect (o.connString, function (err, client, done ) {
          client.query (o.sqlTpl.usergroupdelete, [ username ],
            function (err, result) {
               done ();
               if (err) {
                 d.resolve ();
               } else {
                 d.resolve ();
               }
            });
        });
      }
    });

    return d.promise;
  }

  function getNewEntry () {
    var newEntry = {
      objectClass: ['inetOrgPerson', 'organizationalPerson', 'person',
                    'radiusprofile', 'simpleSecurityObject', 'top' ],
      uid: username,
      cn: username,
      sn: username,
      radiusProfileDn: profile
    };

    var radiusCheckItem = [];
    var radiusReplyItem = [];

    var expire_data = attrs.expiration != undefined ?
                      attrs.expiration : { enabled: false };

    if (attrs.userstatus == false || expire_data.enabled == true) {
      var df = new DateFormat ("MMMM d yyyy HH:mmzzz");
      var expiration;

      if (attrs.userstatus == false) {
        expiration = df.format (new Date (1982, 0, 1));
      } else if (expire_data.enabled === true) {
        expiration = df.format (expire_data.timestamp);
      }

      radiusCheckItem.push ("Expiration := " + expiration);
    }

    for (var key in attrs.schema.paths) {
      var val = typeof attrs[key] === 'string' ?
                  attrs[key].split ('*')[0] : attrs[key];

      if (key == "password") {
        newEntry.userPassword = "{SSHA}" + val;
        continue;
      }

      if (val == 0)
        continue;

      var attr = o.attrs_map[key];
      if (attr != undefined) {
        if (attr.type == 'check') {
          radiusCheckItem.push (attr.map + " " + attr.op + " " + val);
        } else {
          radiusReplyItem.push (attr.map + " " + attr.op + " " + val);
        }
      }
    }

    if (radiusCheckItem.length > 0) {
      newEntry.radiusCheckItem = radiusCheckItem;
    }

    if (radiusReplyItem.length > 0) {
      newEntry.radiusReplyItem = radiusReplyItem;
    }

    return newEntry;
  }

  function update () {
    var d = Q.defer ();

    if (!attrs) {
      d.resolve ();
      return d.promise;
    }

    client.add (dn, getNewEntry (), function (err) {
      if (err) {
        d.reject (new Error (err));
      } else {
        pg.connect (o.connString, function (err, client, done ) {
          client.query (o.sqlTpl.usergroupinsert, [ username, attrs.package ],
            function (err, result) {
               done ();
               if (err) {
                 d.resolve ();
               } else {
                 d.resolve ();
               }

               console.log ("Update:", dn);
            });
        });
      }
    });

    return d.promise;
  }

  function clientEnd () {
    if (!o.persistent) {
      console.log ("RadiusSyncLDAPPostgreSQL", "End client");
      client.unbind ();
    }
  }

  bind ()
    .then (clear)
    .then (update)
    .then (function () {
      callback (undefined, true);
      clientEnd ();
    })
    .fail (function (error) {
      console.error ("Error: " + error.message);
      callback (error);
      clientEnd ();
    });
};

RadiusSyncLDAPPostgreSQL.prototype.countOnlineUser = function (filter, callback) {
  var sql = filter ? this.sqlTpl.useronline.allcount +
                       ' AND rg.groupname IN (' + filter + ')' :
                     this.sqlTpl.useronline.allcount;

  pg.connect (this.connString, function (err, client, done) {
    function handler (err, result) {
      done ();

      if (err) {
        callback (err, undefined);
      }

      callback (err, result.rows[0].count);
    }

    client.query (sql, handler);
  });
};

RadiusSyncLDAPPostgreSQL.prototype.getOnlineUser = function (filter, opts, callback) {
  var sql = filter ? this.sqlTpl.useronline.all +
                       ' AND rg.groupname IN (' + filter + ')' :
                     this.sqlTpl.useronline.all;

  sql += ' ORDER BY acctstarttime DESC';

  if (opts) {
    if (opts.limit != undefined) {
      sql += ' LIMIT ' + parseInt (opts.limit);
    }

    if (opts.offset != undefined) {
      sql += ' OFFSET ' + parseInt (opts.offset);
    }
  }

  pg.connect (this.connString, function (err, client, done) {
    function handler (err, result) {
      done ();

      if (err) {
        callback (err, undefined);
      }

      callback (err, result.rows);
    }

    client.query (sql, handler);
  });
};

RadiusSyncLDAPPostgreSQL.prototype.getOnlineUserById = function (id, filter, callback) {
  var sql = filter ? this.sqlTpl.useronline.all +
                       ' AND rg.groupname IN (' + filter + ')' :
                     this.sqlTpl.useronline.all;

  sql += ' AND radacctid=\'' + id + '\'';
  sql += ' ORDER BY acctstarttime DESC';

  pg.connect (this.connString, function (err, client, done) {
    function handler (err, result) {
      done ();

      if (err) {
        callback (err, undefined);
        return;
      }

      if (result.rows.length > 0) {
        callback (err, result.rows[0]);
      } else {
        callback (err, undefined);
      }
    }

    client.query (sql, handler);
  });
};

RadiusSyncLDAPPostgreSQL.prototype.updateAcct = function (acctid, terminatecause, callback) {
  var sql = this.sqlTpl.useronline.updateacct;

  pg.connect (this.connString, function (err, client, done) {
    client.query (sql, [acctid, new Date, terminatecause], function (err, n) {
      done ();
      callback (err, n);
    });
  });

};

module.exports = RadiusSyncLDAPPostgreSQL;