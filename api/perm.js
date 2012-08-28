var Q = require ('q');

function Perm () {

};

Perm.prototype.check = function (req, res, next) {
  var sio = req.app.config.websockets;
  var clients = sio.sockets.clients ();

  if (!req.loggedIn) {
    var sio = req.app.config.websockets;
    var clients = sio.sockets.clients ();

    function emitForceLogout (client) {
      var d = Q.defer ();
      var hs = client.handshake;
      var sessionStore = req.app.sessionStore;

      sessionStore.get (hs.sessionID, function (err, session) {
        if (err || !session) {
          console.log ('Force Logout:', client);
          client.emit ('forcelogout', {});
          client.disconnect ('forcelogout');
        }

        d.resolve ();
      });

      return d.promise;
    }

    console.log ('CLIENTS:', clients.length);
    for (var i = 0; i < clients.length; i++) {
      emitForceLogout (clients[i]);

      /* Do not emit force logout more than 10 session, reduce the blocking time */
      if (i > 10)
        break;
    }

    res.send (403);
  } else {
    next (); 
  }
};

Perm.prototype.isRole = function (session, role) {
  if (!session.perm || !session.perm.roles)
    return false;

  var roles = session.perm.roles;
  for (var i = 0; i < roles.length; i++) {
    if (roles[i] == role) {
      return true;
    }
  }

  return false;
};


Perm.prototype.isNoManagementGroup = function (session) {
  var perm = session.perm;
  if (perm == undefined)
    return false;

  return perm.mgs == undefined || perm.mgs.length == 0;
};

Perm.prototype.emitUpdate = function (req, res, next) {
  var sio = req.app.config.websockets;
  sio.sockets.emit ('updateperm', {});

  next ();
};

module.exports = exports = Perm;
