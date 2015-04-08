var inherits = require ('util').inherits;
var pg = require ('pg').native;
var Q = require ('q');
var DateFormat = require ('dateformatjs').DateFormat;
var RadiusSync = require ('./radiussync');
var validator = require ('validator');

var RadiusSyncPostgreSQL = function (config) {
  RadiusSyncPostgreSQL.super_.apply (this, config);
  RadiusSyncPostgreSQL.super_.prototype.initialize.apply (this);
  this.initialize ();

  this.connString = config.RadiusDb;
}

inherits (RadiusSyncPostgreSQL, RadiusSync);

RadiusSyncPostgreSQL.prototype.closeClient = function () {
  if (this.persistent) {
    console.log ("RadiusSyncPostgreSQL", "Close persistent client");

    if (this.client != undefined) {
      this.client.end ();
      this.client = undefined;
    }
  }
}

RadiusSyncPostgreSQL.prototype.initialize = function () {
  this.sqlTpl = {
    groupdelete: {
      check: 'DELETE FROM radgroupcheck WHERE groupname=$1',
      reply: 'DELETE FROM radgroupreply WHERE groupname=$1',
    },
    groupinsert: {
      check: 'INSERT INTO radgroupcheck(groupname,attribute,op,value) VALUES ($1,$2,$3,$4)',
      reply: 'INSERT INTO radgroupreply(groupname,attribute,op,value) VALUES ($1,$2,$3,$4)',
    },
    userdelete: {
      check: 'DELETE FROM radcheck WHERE username=$1',
      reply: 'DELETE FROM radreply WHERE username=$1',
    },
    usergroupdelete:
      'DELETE FROM radusergroup WHERE username=$1',
    userinsert: {
      check: 'INSERT INTO radcheck(username,attribute,op,value) VALUES ($1,$2,$3,$4)',
      reply: 'INSERT INTO radreply(username,attribute,op,value) VALUES ($1,$2,$3,$4)',
    },
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

RadiusSyncPostgreSQL.prototype.groupSync = function (groupname, callback) {
  var o = this;

  if (!this.groupName) {
    callback (new Error ('No group name'));
    return;
  }

  var client = new pg.Client (o.connString);
  var query;

  client.connect ();

  function clear () {
    var d = Q.defer ();
  
    client.query (o.sqlTpl.groupdelete.check, [ o.groupName ]);
    query = client.query (o.sqlTpl.groupdelete.reply, [ o.groupName ]);
  
    query.on ('end', function () {
      console.log ('Clear:', o.groupName);
      d.resolve ();
    });
  
    return d.promise;
  }

  function update () {
    var d = Q.defer ();

    if (!o.attrsData) {
      d.resolve ();
      return d.promise;
    }

    query = client.query (o.sqlTpl.groupinsert.check,
                          [ o.groupName, 'Auth-Type', ':=', 'PAP' ]);

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

      query = client.query (o.sqlTpl.groupinsert.check,
                            [ o.groupName, 'Expiration', ':=', expiration ]);
    }

    query = client.query (o.sqlTpl.groupinsert.check,
                          [ o.groupName, 'Auth-Type', ':=', 'PAP' ]);

    for (var key in o.attrsData.schema.paths) {
      var val = typeof o.attrsData[key] === 'string' ?
                  o.attrsData[key].split ('*')[0] : o.attrsData[key];

      if (val == 0)
        continue;

      var attr = o.attrs_map[key];
      if (attr != undefined) {
        var sql = o.sqlTpl.groupinsert[attr.type];
        var values = [ o.groupName, attr.map, attr.op, val ]; 
        query = client.query (sql, values);
      }
    }

    query.on ('end', function () {
      d.resolve ();
      client.end ();
      console.log ('Synced:', o.groupName);
    });

    return d.promise;
  }

  clear ()
    .then (update)
    .then (function () {
      callback (undefined, true);
    })
    .fail (function (error) {
      callback (error);
    });
};


RadiusSyncPostgreSQL.prototype.userSync = function (username, attrs, callback) {
  var o = this;

  if (!username) {
    callback (new Error ('No username'));
    return;
  }

  var client;

  if (this.persistent) {
    if (this.client == undefined) {
      this.client = new pg.Client (o.connString);
      this.client.connect ();
    }
    client = this.client;
  } else {
    client = new pg.Client (o.connString);
    client.connect ();
  }

  var query;

  function clear () {
    var d = Q.defer ();

    client.query (o.sqlTpl.usergroupdelete, [ username ]);
    client.query (o.sqlTpl.userdelete.check, [ username ]);
    query = client.query (o.sqlTpl.userdelete.reply, [ username ]);


    query.on ('end', function () {
      console.log ('Clear user:', username);
      d.resolve ();
    });

    return d.promise;
  }

  function update () {
    var d = Q.defer ();

    if (!attrs) {
      d.resolve ();
      return d.promise;
    }

    query = client.query (o.sqlTpl.usergroupinsert, [ username, attrs.package ]);

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

      query = client.query (o.sqlTpl.userinsert.check,
                            [ username, 'Expiration', ':=', expiration ]);
    }

    for (var key in attrs.schema.paths) {
      var attr = o.attrs_map[key];

      if (key == "password") {
        if (attrs[key].indexOf ('{SHA}') != -1) {
          attr = o.attrs_map['password_sha'];
          attrs[key] = attrs[key].substr (5);
        } else if (attrs[key].indexOf ('{SSHA}') != -1) {
          attrs[key] = attrs[key].substr (6);
        }
      }

      if (attr != undefined) {
        var sql = o.sqlTpl.userinsert[attr.type];
        var values = [ username, attr.map, attr.op, attrs[key] ];
        query = client.query (sql, values);
      }
    }

    query.on ('end', function () {
      d.resolve ();
      if (!o.persistent)
        client.end ();
      console.log ('Synced user:', username);
    });

    return d.promise;
  }

  clear ()
    .then (update)
    .then (function () {
      callback (undefined, true);
    })
    .fail (function (error) {
      callback (error);
    });
};

RadiusSyncPostgreSQL.prototype.countOnlineUser =
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

  pg.connect (this.connString, function (err, client, done) {
    function handler (err, result) {
      done ();

      if (err) {
        callback (err, undefined);
      } else {
        callback (err, result.rows[0].count);
      }
    }

    client.query (sql, handler);
  });
};

RadiusSyncPostgreSQL.prototype.getUnnameOnlineUser = function (callback) {
  var sql = this.sqlTpl.useronline.allunname;

  pg.connect (this.connString, function (err, client, done) {
    function handler (err, result) {
      done ();
      callback (err, result.rows);
    }

    client.query (sql, handler);
  });
}

RadiusSyncPostgreSQL.prototype.updateUnnameOnlineUser =
  function (docs, callback) {
  var sql = this.sqlTpl.useronline.updateuserinfo;

  if (docs.length == 0) {
    callback (null);
    return;
  }

  pg.connect (this.connString, function (err, client, done) {
    function process (docs) {
      if (docs.length == 0) {
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
}

RadiusSyncPostgreSQL.prototype.getOnlineUser = function (filter, opts, callback) {
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
      } else {
        callback (err, result.rows);
      }
    }

    client.query (sql, handler);
  });
};

RadiusSyncPostgreSQL.prototype.getOnlineUserById = function (id, filter, callback) {
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

RadiusSyncPostgreSQL.prototype.updateAcct = function (acctid, terminatecause, callback) {
  var sql = this.sqlTpl.useronline.updateacct;

  pg.connect (this.connString, function (err, client, done) {
    client.query (sql, [acctid, new Date, terminatecause], function (err, n) {
      done ();
      callback (err, n);
    });
  });

};

module.exports = RadiusSyncPostgreSQL;
