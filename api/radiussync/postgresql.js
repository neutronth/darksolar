var pg = require ('pg').native;
var Q = require ('q');
var DateFormat = require ('dateformatjs').DateFormat;

var RadiusSyncPostgreSQL = function (config) {
  this.connString = config.RadiusDb;

  this.initialize ();
  this.client = undefined;
  this.persistent = false;
}

RadiusSyncPostgreSQL.prototype.setClientPersistent = function () {
  this.persistent = true;
}

RadiusSyncPostgreSQL.prototype.closeClient = function () {
  if (this.persistent && this.client != undefined)
    this.client.end ();
}

RadiusSyncPostgreSQL.prototype.initialize = function () {
  this.attrs_map = {
    simulteneous_use:    { type: 'check', op: ':=', map: 'Simultaneous-Use'   },
    session_timeout:     { type: 'reply', op: ':=', map: 'Session-Timeout'    },
    max_all_session:     { type: 'check', op: ':=', map: 'Max-All-Session'    },
    max_daily_session:   { type: 'check', op: ':=', map: 'Max-Daily-Session'  },
    max_monthly_session: { type: 'check', op: ':=', map: 'Max-Monthly-Session'},
    max_access_period:   { type: 'check', op: ':=', map: 'Max-Access-Period'  },
    password:            { type: 'check', op: ':=', map: 'SSHA-Password'      },
    class_of_service:    { type: 'reply', op: ':=',
                           map: 'WISPr-Billing-Class-Of-Service' },
    bandwidth_max_up:    { type: 'reply', op: ':=',
                           map: 'WISPr-Bandwidth-Max-Up' },
    bandwidth_max_down:  { type: 'reply', op: ':=',
                           map: 'WISPr-Bandwidth-Max-Down' },
  };

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
      all: 'SELECT ra.radacctid, ra.acctsessionid, ra.username, rg.groupname, ra.realm, ra.nasipaddress, ra.nasportid, ra.acctstarttime, ra.framedipaddress, ra.callingstationid, ra.calledstationid FROM radacct ra LEFT JOIN radusergroup rg ON (ra.username = rg.username) WHERE acctterminatecause IS NULL',
      allcount: 'SELECT COUNT(ra.radacctid) FROM radacct ra LEFT JOIN radusergroup rg ON (ra.username = rg.username) WHERE acctterminatecause IS NULL',
      updateacct: 'UPDATE radacct SET acctstoptime=$2,acctterminatecause=$3 WHERE radacctid=$1 AND acctstoptime IS NULL',
    },
  };
};

RadiusSyncPostgreSQL.prototype.groupName = function (name) {
  this.groupName = name;
  return this;
};

RadiusSyncPostgreSQL.prototype.setUserName = function (name) {
  this.userName = name;
  return this;
};

RadiusSyncPostgreSQL.prototype.setAttrsData = function (attrsData) {
  this.attrsData = attrsData;
  return this;
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

RadiusSyncPostgreSQL.prototype.countOnlineUser = function (filter, callback) {
  var sql = filter ? this.sqlTpl.useronline.allcount +
                       ' AND rg.groupname IN (' + filter + ')' :
                     this.sqlTpl.useronline.allcount;

  pg.connect (this.connString, function (err, client) {
    function handler (err, result) {
      if (err) {
        callback (err, undefined);
      }

      callback (err, result.rows[0].count);
    }

    client.query (sql, handler);
  });
};

RadiusSyncPostgreSQL.prototype.getOnlineUser = function (filter, opts, callback) {
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

  pg.connect (this.connString, function (err, client) {
    function handler (err, result) {
      if (err) {
        callback (err, undefined);
      }

      callback (err, result.rows);
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

  pg.connect (this.connString, function (err, client) {
    function handler (err, result) {
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

  pg.connect (this.connString, function (err, client) {
    client.query (sql, [acctid, new Date, terminatecause], function (err, n) {
      callback (err, n);
    });
  });

};

module.exports = RadiusSyncPostgreSQL;
