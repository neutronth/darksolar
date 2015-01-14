var RadiusSync = function (config) {
  this.config = config;
  this.client = undefined;
  this.persistent = false;
}

RadiusSync.prototype.setClientPersistent = function () {
  this.persistent = true;
  this.instance_ = undefined;
}

RadiusSync.prototype.instance = function () {
  if (this.instance_ != undefined)
    return this.instance_;

  if (this.config.Ldap != undefined) {
    var ldapsync = require ("./ldap-postgresql.js");
    this.instance_ = new ldapsync (this.config);
  } else {
    var pgsync = require ("./postgresql.js");
    this.instance_ = new pgsync (this.config);
  }

  return this.instance_;
}

RadiusSync.prototype.prepare = function () {}

RadiusSync.prototype.initialize = function () {
  this.attrs_map = {
    simulteneous_use:    { type: 'check', op: ':=', map: 'Simultaneous-Use'   },
    session_timeout:     { type: 'reply', op: ':=', map: 'Session-Timeout'    },
    max_all_session:     { type: 'check', op: ':=', map: 'Max-All-Session'    },
    max_daily_session:   { type: 'check', op: ':=', map: 'Max-Daily-Session'  },
    max_monthly_session: { type: 'check', op: ':=', map: 'Max-Monthly-Session'},
    max_access_period:   { type: 'check', op: ':=', map: 'Max-Access-Period'  },
    password:            { type: 'check', op: '==', map: 'SSHA-Password'      },
    class_of_service:    { type: 'reply', op: ':=',
                           map: 'WISPr-Billing-Class-Of-Service' },
    bandwidth_max_up:    { type: 'reply', op: ':=',
                           map: 'WISPr-Bandwidth-Max-Up' },
    bandwidth_max_down:  { type: 'reply', op: ':=',
                           map: 'WISPr-Bandwidth-Max-Down' },
  };
}

RadiusSync.prototype.groupName = function (name) {
  this.groupName = name;
  return this;
}

RadiusSync.prototype.setUserName = function (name) {
  this.userName = name;
  return this;
}

RadiusSync.prototype.setAttrsData = function (attrsData) {
  this.attrsData = attrsData;
  return this;
}

RadiusSync.prototype.closeClient = function () {}

RadiusSync.prototype.groupSync = function (groupname, callback) {}
RadiusSync.prototype.userSync  = function (username, attrs, callback) {}

RadiusSync.prototype.countOnlineUser   = function (filter, callback) {}
RadiusSync.prototype.getOnlineUser     = function (filter, opts, callback) {}
RadiusSync.prototype.getOnlineUserById = function (id, filter, callback) {}
RadiusSync.prototype.updateAcct = function (acctid, terminatecause, callback) {}

module.exports = RadiusSync;
