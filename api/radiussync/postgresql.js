var pg = require ('pg').native;
var Q = require ('q');

var RadiusSyncPostgreSQL = function (config) {
  this.connString = config.RadiusDb;

  this.initialize ();
}

RadiusSyncPostgreSQL.prototype.initialize = function () {
  this.attrs_map = {
    simulteneous_use:    { type: 'check', op: ':=', map: 'Simultaneous-Use'   },
    session_timeout:     { type: 'reply', op: ':=', map: 'Session-Timeout'    },
    max_all_session:     { type: 'check', op: ':=', map: 'Max-All-Session'    },
    max_daily_session:   { type: 'check', op: ':=', map: 'Max-Daily-Session'  },
    max_monthly_session: { type: 'check', op: ':=', map: 'Max-Monthly-Session'},
    max_access_perios:   { type: 'check', op: ':=', map: 'Max-Access-Period'  },
    password:            { type: 'check', op: ':=', map: 'SSHA-Password'      },
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

  };
};

RadiusSyncPostgreSQL.prototype.groupName = function (name) {
  this.groupName = name;
  return this;
};

RadiusSyncPostgreSQL.prototype.userName = function (name) {
  this.userName = name;
  return this;
};

RadiusSyncPostgreSQL.prototype.attrsData = function (attrsData) {
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
  
    client.query ("DELETE FROM radgroupcheck WHERE groupname=$1",
                  [ o.groupName ]);
    query = client.query ("DELETE FROM radgroupreply WHERE groupname=$1",
                  [ o.groupName ]);
  
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
}

module.exports = RadiusSyncPostgreSQL;
