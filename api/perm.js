function Perm () {

};

Perm.prototype.check = function (req, res, next) {
  if (!req.loggedIn) {
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
