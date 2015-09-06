var mongoose = require ('mongoose');

var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;
var Entities = require ('html-entities').AllHtmlEntities;

GenUsersModels = function (mongoose_conn, schemas) {
  var safe = { j: 1, w: 1, wtimeout: 10000 };

  this.mongoose = mongoose_conn;
  this.schemas  = schemas;

  this.schemas.code = new Schema ({
    meta: { type: Schema.ObjectId, ref: 'genusersmeta' },
    username: { type: String, index: { unique: true }},
    password: { type: String },
  }, { safe: safe, strict: true });

  this.schemas.meta = new Schema({
    prefix: { type: String, index: { unique: true }},
    package: { type: String },
    issued: { timestamp: Date,
              by: String,
            },
    amount: { type: Number, min: 1, max: 1000 },
    purpose: { type: String },
    info: { type: String },
    users: [{ type: Schema.ObjectId, ref: 'genusers'}],
  }, { safe: safe, strict: true });

  this.mongoose.model ('genusersmeta', this.schemas.meta, 'genusersmetas');
  this.mongoose.model ('genusers', this.schemas.code, 'genusers');

  return this;
};

module.exports = exports = GenUsersModels;
