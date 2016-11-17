var inherits = require ('util').inherits;
var pg = require ('pg').native;
var Q = require ('q');
var DateFormat = require ('dateformatjs').DateFormat;
var RadiusSync = require ('./radiussync');
var ldap = require ('ldapjs');
var validator = require ('validator');
var User = require ('../user');

var RadiusSyncLDAPPostgreSQL = function (config) {
  RadiusSyncLDAPPostgreSQL.super_.apply (this, config);
  RadiusSyncLDAPPostgreSQL.super_.prototype.initialize.apply (this);
  this.initialize ();

  this.connString = config.RadiusDb;
  this.config = config;
};

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
};

RadiusSyncLDAPPostgreSQL.prototype.closeClient = function () {
  if (this.persistent) {
    console.log ("RadiusSyncLDAPPostgreSQL", "Close persistent client");

    if  (this.client !== undefined) {
      this.client.end ();
      this.client = undefined;
    }

    if (this.ldapclient !== undefined) {
      this.ldapclient.unbind ();
      this.ldapclient = undefined;
    }
  }
};

RadiusSyncLDAPPostgreSQL.prototype.initialize = function () {
  this.sqlTpl = {
    usergroupdelete:
      'DELETE FROM radusergroup WHERE username=$1',
    usergroupinsert:
      'INSERT INTO radusergroup(username,groupname) VALUES ($1,$2)',

    useronline: {
      all: 'SELECT radacctid, acctsessionid, username, groupname, realm, nasipaddress, nasportid, acctstarttime, framedipaddress, callingstationid, calledstationid, firstname, surname FROM radacct WHERE acctterminatecause IS NULL',
      allunname: 'SELECT radacctid, acctsessionid, username, groupname, realm, nasipaddress, nasportid, acctstarttime, framedipaddress, callingstationid, calledstationid, firstname, surname FROM radacct WHERE acctterminatecause IS NULL AND firstname IS NULL',
      allcount: 'SELECT COUNT(radacctid) FROM radacct WHERE acctterminatecause IS NULL',
      updateacct: 'UPDATE radacct SET acctstoptime=$2,acctterminatecause=$3 WHERE radacctid=$1 AND acctstoptime IS NULL',
      updateuserinfo: 'UPDATE radacct SET firstname=$2,surname=$3 WHERE radacctid=$1 AND acctstoptime IS NULL',
    },
  };
};

RadiusSyncLDAPPostgreSQL.prototype.groupSync = function (groupname, callback,
                                                         opts) {
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

    var expire_data = o.attrsData.expiration !== undefined ?
                      o.attrsData.expiration : { enabled: false };

    if (o.attrsData.packagestatus === false || expire_data.enabled === true) {
      var df = new DateFormat ("MMMM d yyyy HH:mmzzz");
      var expiration;

      if (o.attrsData.packagestatus === false) {
        expiration = df.format (new Date (1982, 0, 1));
      } else if (expire_data.enabled === true) {
        expiration = df.format (expire_data.timestamp);
      }

      radiusCheckItem.push ("Expiration := " + expiration);
    }

    for (var key in o.attrsData.schema.paths) {
      var val = typeof o.attrsData[key] === 'string' ?
                  o.attrsData[key].split ('*')[0] : o.attrsData[key];

      if (parseInt (val) === 0)
        continue;

      var attr = o.attrs_map[key];
      if (attr !== undefined) {
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

  if (opts && opts.unsync) {
    bind ()
      .then (clear)
      .then (function () {
        callback (undefined, true);
        client.unbind ();
      })
      .fail (function (error) {
        console.error ("Error: " + error.message);
        callback (error);
        client.unbind ();
      });
  } else {
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
  }
};


RadiusSyncLDAPPostgreSQL.prototype.userSync = function (username, attrs,
                                                        callback, opts) {
  var o = this;

  if (!username) {
    callback (new Error ('No username'));
    return;
  }

  var config_ = o.config.Ldap;
  var client;
  var bindRequire = true;

  if (o.persistent) {
    if (o.ldapclient === undefined) {
      o.ldapclient = ldap.createClient (config_);
    } else {
      bindRequire = false;
    }

    if (o.client === undefined) {
      o.client = new pg.Client (o.connString);
      o.client.connect ();
    }

    client = o.ldapclient;
  } else {
    client = ldap.createClient (config_);
  }

  var uid = "uid=" + username;
  var basesearch  = config_.users + "," + config_.base;
  var macauth_basesearch = config_.macauth + "," + config_.base;
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

  function clearMacAuth () {
    var d = Q.defer ();
    var opts = {
      filter: "(&(objectClass=radiusprofile)" +
              "(radiusReplyItem=User-Name := " + username + "))",
      scope: 'sub'
    };

    client.search (macauth_basesearch, opts, function (err, res) {
      var count = 0;
      if (err) {
        d.reject (err);
        return;
      }

      res.on ('searchEntry', function (entry) {
        count++;
        client.del (entry.dn, function (err) {
          console.log ("Remove:", entry.dn);

          if (--count <= 0)
            d.resolve ();
        });
      });

      res.on ('error', function (err) {
        console.error ('Error:', err.message);
      });

      res.on ('end', function (result) {
        if (--count <= 0)
          d.resolve ();
      });
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

    var expire_data = attrs.expiration !== undefined ?
                      attrs.expiration : { enabled: false };

    if (attrs.userstatus === false || expire_data.enabled === true) {
      var df = new DateFormat ("MMMM d yyyy HH:mmzzz");
      var expiration;

      if (attrs.userstatus === false) {
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
        if (val.indexOf ("{SSHA}") != -1 || val.indexOf ("{SHA}") != -1) {
          newEntry.userPassword = val;
        } else if (val.indexOf ("{MD5}") != -1) {
          hash = val.substr (5);
          newEntry.userPassword = "{MD5}" +
                                    (new Buffer(hash).toString ("base64"));
        } else {
          newEntry.userPassword = "{SSHA}" + val;
        }
        continue;
      }

      if (val === 0)
        continue;

      var attr = o.attrs_map[key];
      if (attr !== undefined) {
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

  function getNewMacEntry (mac) {
    var newEntry = {
      objectClass: ['inetOrgPerson', 'organizationalPerson', 'person',
                    'radiusprofile', 'simpleSecurityObject', 'top' ],
      uid: mac,
      cn: mac,
      sn: mac,
      radiusProfileDn: profile
    };

    var radiusCheckItem = [];
    var radiusReplyItem = [];

    radiusCheckItem.push ("Auth-Type := Call-Check");
    radiusReplyItem.push ("User-Name := " + username);

    var user = new User (o.config);
    user.salt = attrs.salt;
    newEntry.userPassword = "{SSHA}" + user.setHashPassword (mac);

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

  function updateMacAuth () {
    var d = Q.defer ();

    if (!attrs || !attrs.macs_binding || attrs.macs_binding.length === 0) {
      d.resolve ();
      return d.promise;
    }

    var count = attrs.macs_binding.length;

    attrs.macs_binding.forEach (function (macobj) {
      var mac = macobj.mac.toLowerCase ();
      var macdn = "uid=" + mac + "," + macauth_basesearch;
      client.add (macdn, getNewMacEntry (mac), function (err) {
        if (err) {
          console.log ("Error", err);
        } else {
          console.log ("Update:", macdn);
          if (--count <= 0)
            d.resolve ();
        }
      });
    });

    return d.promise;
  }


  function clientEnd () {
    if (!o.persistent) {
      console.log ("RadiusSyncLDAPPostgreSQL", "End client");
      client.unbind ();
    }
  }

  if (opts && opts.unsync) {
    bind ()
      .then (clear)
      .then (clearMacAuth)
      .then (function () {
        callback (undefined, true);
        clientEnd ();
      })
      .fail (function (error) {
        console.error ("Error: " + error.message);
        callback (error);
        clientEnd ();
      });
  } else {
    bind ()
      .then (clear)
      .then (clearMacAuth)
      .then (update)
      .then (updateMacAuth)
      .then (function () {
        callback (undefined, true);
        clientEnd ();
      })
      .fail (function (error) {
        console.error ("Error: " + error.message);
        callback (error);
        clientEnd ();
      });
  }
};

RadiusSyncLDAPPostgreSQL.prototype.countOnlineUser =
  function (filter, opts, callback) {
  var sql = filter ? this.sqlTpl.useronline.allcount +
                       ' AND rg.groupname IN (' + filter + ')' :
                     this.sqlTpl.useronline.allcount;

  var sql_filterlist = [];

  if (opts.filter) {
    for (var i = 0; i < opts.filter.length; i++) {
      var d = opts.filter[i].toLowerCase ();
      var mac_check = /([0-9a-f]{2}[:-]){5}([0-9a-f]{2})/;

      if (validator.isIP (d) && !mac_check.test (d)) {
        sql_filterlist.push ("framedipaddress='" + d + "'");
      } else {
        sql_filterlist.push ("LOWER(username) LIKE '%" + d + "%'");
        sql_filterlist.push ("LOWER(groupname) LIKE '%" + d + "%'");
        sql_filterlist.push ("LOWER(firstname) LIKE '%" + d + "%'");
        sql_filterlist.push ("LOWER(surname) LIKE '%" + d + "%'");
        sql_filterlist.push ("LOWER(callingstationid) LIKE '%" + d + "%'");
      }
    }
  }

  if (sql_filterlist.length > 0) {
    sql += " AND (" + sql_filterlist.join (" OR ") + ")";
  }

  console.log ("SQL(count):", sql);

  pg.connect (this.connString, function (err, client, done) {
    function handler (err, result) {
      done ();

      if (err) {
        callback (err, 0);
      } else {
        callback (null, result.rows[0].count);
      }
    }

    client.query (sql, handler);
  });
};

RadiusSyncLDAPPostgreSQL.prototype.getUnnameOnlineUser = function (callback) {
  var sql = this.sqlTpl.useronline.allunname;

  pg.connect (this.connString, function (err, client, done) {
    function handler (err, result) {
      done ();
      callback (err, result.rows);
    }

    client.query (sql, handler);
  });
};

RadiusSyncLDAPPostgreSQL.prototype.updateUnnameOnlineUser =
  function (docs, callback) {
  var sql = this.sqlTpl.useronline.updateuserinfo;

  if (docs.length === 0) {
    callback (null);
    return;
  }

  pg.connect (this.connString, function (err, client, done) {
    function process (docs) {
      if (docs.length === 0) {
        done ();
        callback (null);
        return;
      }


      var doc = docs[0];
      client.query (sql, [ doc.radacctid, doc.firstname, doc.surname ],
                    function (err, n) {
        console.log ("Update Accounting:", doc.radacctid, doc.firstname, doc.surname);
        docs.shift ();
        process (docs);
      });
    }

    process (docs);
  });
};

RadiusSyncLDAPPostgreSQL.prototype.getOnlineUser = function (filter, opts, callback) {
  var sql = filter ? this.sqlTpl.useronline.all +
                       ' AND rg.groupname IN (' + filter + ')' :
                     this.sqlTpl.useronline.all;

  var sql_filterlist = [];

  if (opts.filter) {
    for (var i = 0; i < opts.filter.length; i++) {
      var d = opts.filter[i].toLowerCase ();
      var mac_check = /([0-9a-f]{2}[:-]){5}([0-9a-f]{2})/;

      if (validator.isIP (d) && !mac_check.test (d)) {
        sql_filterlist.push ("framedipaddress='" + d + "'");
      } else {
        sql_filterlist.push ("LOWER(username) LIKE '%" + d + "%'");
        sql_filterlist.push ("LOWER(groupname) LIKE '%" + d + "%'");
        sql_filterlist.push ("LOWER(firstname) LIKE '%" + d + "%'");
        sql_filterlist.push ("LOWER(surname) LIKE '%" + d + "%'");
        sql_filterlist.push ("LOWER(callingstationid) LIKE '%" + d + "%'");
      }
    }
  }

  if (sql_filterlist.length > 0) {
    sql += " AND (" + sql_filterlist.join (" OR ") + ")";
  }

  sql += ' ORDER BY acctstarttime DESC';

  if (opts) {
    if (opts.limit !== undefined) {
      sql += ' LIMIT ' + parseInt (opts.limit);
    }

    if (opts.offset !== undefined) {
      sql += ' OFFSET ' + parseInt (opts.offset);
    }
  }

  pg.connect (this.connString, function (err, client, done) {
    function handler (err, result) {
      done ();

      if (err) {
        callback (err, undefined);
      } else {
        callback (err, result.rows);
      }
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
    client.query (sql, [acctid, new Date (), terminatecause], function (err, n) {
      done ();
      callback (err, n);
    });
  });

};

module.exports = RadiusSyncLDAPPostgreSQL;
