var mongoose = require ('mongoose');

var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

UserModels = function (mongoose_conn, schemas) {
  this.mongoose = mongoose_conn;
  this.schemas  = schemas;

  this.schemas.roles = new Schema ({
    name: String,
  });

  this.schemas.user = new Schema({
    username: { type: String, trim: true, index: { unique: true }},
    usertype: { type: String, enum: ['manual', 'register'] }, 
    package: { type: String, required: true, index: true },
    firstname: { type: String, index: true },
    surname: { type: String, index: true },
    personid: { type: String, index: true },
    email: { type: String, index: true },
    salt: { type: String },
    password: { type: String },
    roles: [ this.schemas.roles ],
    expiration: {
      enabled: Boolean,
      timestamp: Date,
    },
    userstatus: { type: Boolean },
    management: { type: Boolean },
    timestamp: {
      create: Date,
      update: Date,
      remove: Date,
    },
  }, { safe: true, strict: true });

  this.mongoose.model ('user', this.schemas.user, 'users');
  this.mongoose.model ('archiveduser', this.schemas.user, 'archivedusers');
};

module.exports = exports = UserModels;
