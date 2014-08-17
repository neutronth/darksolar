window.KeyValSelect = BackboneCustomModel.extend ({
  idAttribute: 'key',

  toString: function () {
    return this.attributes.label;
  },
});

window.SelectCollection = Backbone.Collection.extend ({
  model: KeyValSelect,
  deferred: null,

  deferredFetch: function (callback) {
    var _this = this;

    if (!this.deferred) {
      this.deferred = $.Deferred (function (d) {
        _this.fetch ({
          success: function () {
            d.resolve ();
          },
          error: function (err) {
            d.reject (err);
          }
        });
      });
    }

    return this.deferred.done (callback);
  },

  deferredReset: function () {
    this.deferred = null;
  }
});
