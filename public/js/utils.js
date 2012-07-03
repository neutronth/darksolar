var consoleOff = function () {
  this.log    = function () {};
  this.info   = function () {};
  this.warn   = function () {};
  this.error  = function () {};
  this.assert = function () {};
}

window.debug = !production ? console : new consoleOff;

// The Template Loader. Used to asynchronously load templates located in separate .html files
window.templateLoader = {
  load: function(views, callback) {
    var deferreds = [];
    $.each(views, function(index, view) {
      if (window[view]) {
        deferreds.push($.get('tpl/' + view + '.html', function(data) {
          window[view].prototype.template = _.template(data);
        }, 'html'));
      } else {
        debug.warn (view + " not found");
      }
    });

    $.when.apply(null, deferreds).done(callback);
  }
};

window.BackboneCustomModel = Backbone.Model.extend({
  get: function (attr) {
    var html;
    if (html = this._escapedAttributes[attr]) return html;
    var val = this.attributes[attr];

    if (val == undefined)
      return val;

    if (typeof val == 'string') {
      return this._escapedAttributes[attr] = _.escape(val == null ? '' : '' + val);
    } else {
      return this._escapedAttributes[attr] = val;
    }
  },

  htmlEscape: function (attrs) {
   for (var i in attrs) {
      if (typeof attrs[i] == 'string') {
        var val = attrs[i];
        attrs[i] = _.escape(val == null ? '' : '' + val);
      } else if (typeof attrs[i] == 'object') {
        this.htmlEscape (attrs[i]);
      }
    }
  },

  toJSON: function (options) {
    this._escapedAttributes = _.clone (this.attributes);
    this.htmlEscape (this._escapedAttributes);
    return _.clone (this._escapedAttributes);
  },
});

window.BackboneCustomPaginator = Backbone.Paginator.requestPager.extend({
  fetch: function (options) {
    this.trigger ('fetch:started');
    Backbone.Collection.prototype.fetch.call (this, options);
  },
});

window.navbarTrack = function (route, router) {
  var navbar = $('.navbar.navbar-fixed-top');
  var s = Backbone.history.fragment.split ('\/');
  var fragment = s[0];

  if (fragment != undefined) {
    var menu = $('li', navbar);
    var curRoute = fragment.split ('/')[0];

    menu.each (function (index, value) {
      var list = $(value);
      var link = $(list.children ()[0]);
      var mainLink = link.attr ('href').split (/\/#\/|\//)[1];

      debug.log (mainLink, curRoute);

      if (mainLink == curRoute) {
        list.addClass ('active');
      } else {
        list.removeClass ('active');
      }
    });
  }
};
