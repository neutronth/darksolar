var mongoose = require ('mongoose');

var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

ManagementModels = function (mongoose_conn, schemas) {
  this.mongoose = mongoose_conn;
  this.schemas  = schemas;

  this.schemas.members = new Schema ({
    username: { type: String },
  });

  this.schemas.group = new Schema({
      groupname: { type: String, trim: true, index: { unique: true }},
      description: { type: String },
      groupstatus: { type: Boolean },
      members: [ this.schemas.members ],
    }, { safe: true, strict: true });

  this.mongoose.model ('group', this.schemas.group, 'managementgroups');
};

module.exports = exports = ManagementModels;
