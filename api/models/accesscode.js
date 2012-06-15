var mongoose = require ('mongoose');

var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

AccessCodeModels = function (mongoose_conn, schemas) {
  this.mongoose = mongoose_conn;
  this.schemas  = schemas;

  this.schemas.code = new Schema ({
    meta: { type: Schema.ObjectId, ref: 'accesscodemeta' },
    serialno: { type: Number },
    registered: {
      to: { type: Schema.ObjectId, ref: 'user' },
      timestamp: { type: Date },
    },
    code: { type: String, index: { unique: true }},
  }, { safe: true, strict: true });

  this.schemas.meta = new Schema({
    id: { type: Number, index: { unique: true }},
    package: { type: String },
    issued: { timestamp: Date,
              by: String,
            },
    amount: { type: Number, min: 1, max: 1000 },
    registered: { type: Number },
    purpose: { type: String },
    expiration: {
      enabled: Boolean,
      timestamp: Date,
    },
    codes: [{ type: Schema.ObjectId, ref: 'accesscode'}],
  }, { safe: true, strict: true });

  this.mongoose.model ('accesscodemeta', this.schemas.meta, 'accesscodemetas');
  this.mongoose.model ('accesscode', this.schemas.code, 'accesscodes');

  return this;
};

module.exports = exports = AccessCodeModels;
