var mongoose = require ('mongoose');

var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

PackageModels = function (mongoose_conn, schemas) {
  this.mongoose = mongoose_conn;
  this.schemas  = schemas;

  this.schemas.package = new Schema({
    name: { type: String, trim: true, index: { unique: true }},
    description: String,
    pkgtype: { type: String, index: true},
    inherited: ObjectId,
    management_group: { type: ObjectId },
    simulteneous_use: String,
    session_timeout: String,
    max_all_session: String,
    max_daily_session: String,
    max_monthly_session: String,
    max_access_period: String,
    class_of_service: String,
    expiration: {
      enabled: Boolean,
      timestamp: Date,
    },
    packagestatus: Boolean,
  }, { safe: true, strict: true });

  this.mongoose.model ('package', this.schemas.package, 'packages');

  return this;
};

module.exports = exports = PackageModels;
