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
    usertype: { type: String, enum: ['manual', 'register', 'import'] },
    package: { type: String, required: true, index: true },
    firstname: { type: String, index: true },
    surname: { type: String, index: true },
    personid: { type: String, index: true },
    email: { type: String, index: true },
    salt: { type: String },
    password: { type: String },
    description: { type: String },
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
      activate: Date
    },
    importid: { type: String }
  }, { safe: true, strict: true });

  this.schemas.archiveduser = new Schema({
    username: { type: String, trim: true, index: true},
    usertype: { type: String, enum: ['manual', 'register', 'import'] },
    package: { type: String, required: true },
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

  this.schemas.userimport_meta = new Schema({
    importid: { type: String, index: true },
    timestamp: { type: Date, index: true },
    description: { type: String },
    status: {
      processed: Boolean,
      imported: Boolean,
      fail: Number,
      count: Number
    },
    by: { type: String }
  }, { safe: true, strict: true });

  this.schemas.userimport = new Schema({
    importid: { type: String, index: true },
    username: { type: String, trim: true },
    package: { type: String },
    firstname: { type: String },
    surname: { type: String },
    personid: { type: String },
    email: { type: String, index: true },
    salt: { type: String },
    password: { type: String },
    roles: [ this.schemas.roles ],
    userstatus: { type: Boolean },
  }, { safe: true, strict: true });

  this.mongoose.model ('user', this.schemas.user, 'users');
  this.mongoose.model ('archiveduser', this.schemas.archiveduser, 'archivedusers');
  this.mongoose.model ('userimport_meta', this.schemas.userimport_meta, 'usersimport_meta');
  this.mongoose.model ('userimport', this.schemas.userimport, 'usersimport');
};

module.exports = exports = UserModels;
