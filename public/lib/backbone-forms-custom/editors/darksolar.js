;(function() {
  var Form = Backbone.Form,
      Base = Form.editors.Base,
      createTemplate = Form.helpers.createTemplate,
      triggerCancellableEvent = Form.helpers.triggerCancellableEvent,
      exports = {};

  /* Prototype */
  var LockSet = Base.extend({
    className: 'bbf-lockset',

    lockvalue: 0,

    dataType: 'number',

    initialize: function (options) {
      Base.prototype.initialize.call(this, options);
    },

    events: {
      'click .bbf-lock-toggle': 'lockToggle',
      'click .bbf-lock-field' : 'onClick',
      'keypress .bbf-lock-field' : 'onKeyPress',
      'change .bbf-lock-field' : 'updateValue',
    },

    render: function () {
      this.$el.html ('<div class="input-append">\
        <input class="span2 bbf-lock-field" style="width: 45%" type="text">\
        </div>\
      ');

      var input = $('.input-append', this.$el); 
      if (this.schema.nolockbtn) {
        input.append ('\
          <button class "btn bbf-lock-toggle" style="visibility: hidden">\
          </button>\
          <span rel="tooltip" class="bbf-lock-toggle"><i class="icon-eye-open"></i></span>');
      } else {
        input.append ('\
          <button class="btn bbf-lock-toggle" type="button" rel="tooltip">\
          <i class="icon-eye-open"></i></button>');
      }

      var lock = $('button', this.$el);
      lock.tooltip ({
        title: 'This field of inherited packages is editable or locked'
      });

      this.data_field = $('.bbf-lock-field', this.$el);

      this.setValue (this.value);
      this.initValue ();

      return this;
    },

    initValue: function () {
      var input = $('input', this.$el);
      var val = this.dataType == 'number' ? this.getNumValue () :
                this.getStringValue ();

      input.val (val);
    },

    getValue: function () {
      return this.value;
    },

    getNumValue: function () {
      return parseInt (this.value);
    },

    getStringValue: function () {
      var val = this.value;
      var s = new String (val);
      var idx = s.indexOf ('*');
      var newval = '';

      if (idx >= 0) {
        for (var i = 0; i < idx; i++)
          newval += s[i];

        return newval;
      }

      return val;
    },

    setValue: function (value) {
      this.value = value;

      var test = new String(value);

      if (test.indexOf ('*') >= 0)
        this.lockvalue = 1;
    },

    onClick: function () {
      var input = $('input', this.$el);

      input.select ();
    },

    onKeyPress: function (event) {
      //Allow backspace
      if (event.charCode == 0) return;
    
      if (this.dataType == 'numeric') {  
        //Get the whole new value so that we can prevent things
        //like double decimals points etc.
        var newVal = this.data_field.val() +
                       String.fromCharCode(event.charCode);

        var numeric = /^[0-9]*\.?[0-9]*?$/.test(newVal);

        if (!numeric) event.preventDefault();
      } else {
        var newVal = String.fromCharCode(event.charCode);
        var asterisk = /\*/.test (newVal);

        if (asterisk) event.preventDefault ();
      }

      this.updateValue ();
    },

    updateValue: function () {
      var input = $('input', this.$el);
      var value = this.value;

      value = this.lockvalue ? value + '*' : value;
      this.setValue (value);
      this.updateLockIcon ();
    },

    lockToggle: function () {
      if (this.schema.nolockbtn)
        return;

      this.lockvalue = this.lockvalue == 1 ? 0 : 1

      this.updateLockIcon ();
      this.updateValue ();
    },

    updateLockIcon: function () {
      var lock = $('.bbf-lock-toggle', this.$el);
      var icon = $('i', lock);

      icon.removeClass ();

      if (this.lockvalue == 1) {
        icon.addClass ('icon-lock');

        if (this.schema.nolockbtn) {
          var textbox = $('.bbf-lock-field', this.$el);
          textbox.attr ('disabled', 'true');
        }
      } else {
        icon.addClass ('icon-eye-open');
      }

      
    },

  });

  exports.SessionSet = LockSet.extend({
    className: 'bbf-sessionset',

    defaultValue: 0,

    suffix_lookup: {
        "year"   : 60 * 60 * 24 * 365,
        "month"  : 60 * 60 * 24 * 30,
        "day"    : 60 * 60 * 24,
        "hour"   : 60 * 60,
        "minute" : 60,
    },

    initialize: function (options) {
      LockSet.prototype.initialize.call(this, options);
      $.extend (this.events, LockSet.prototype.events);

      if (!this.value)
        this.value = 0;

    },

    events: {
      'change .bbf-sessionset-suffix' : 'updateValue',
    },

    render: function () {
      LockSet.prototype.render.call (this);

      var lockbtn = $('button', this.$el);

      lockbtn.before ('\
      <select class="bbf-sessionset-suffix" style="width: 70px">\
      <option value="minute">Minute</option>\
      <option value="hour">Hour</option>\
      <option value="day">Day</option>\
      <option value="month">Month</option>\
      <option value="year">Year</option>\
      </select>\
      ');

      this.initValue ();
      this.updateValue ();

      return this;
    },

    initValue: function () {
      LockSet.prototype.initValue.call (this);

      var numval = this.getNumValue ();
      var input = $('input', this.$el);
      var suffix = $('select', this.$el);

      for (var i in this.suffix_lookup) {
        if (parseInt(numval / this.suffix_lookup[i]) > 0 &&
              (numval % this.suffix_lookup[i]) == 0) {
          suffix.val (i);
          input.val (numval / this.suffix_lookup[i]);
          break;
        }
      }
    },

    updateValue: function () {
      var input = $('input', this.$el);
      var suffix = $('select', this.$el);

      var value = input.val () == "Unlimit" || input.val () < 0 ? 0 :
                    input.val () * this.suffix_lookup[suffix.val()];

      this.value = value;

      LockSet.prototype.updateValue.call (this);

      if (input.val () == 0)
        input.val ('Unlimit');
    },

  });

  exports.BandwidthSet = exports.SessionSet.extend ({
    className: 'bbf-bandwidthset',

    defaultValue: 0,

    suffix_lookup: {
        "Mb" : 1024 * 1024,
        "kb" : 1024,
        "b"  : 1,
    },

    initialize: function (options) {
      LockSet.prototype.initialize.call(this, options);
      $.extend (this.events, LockSet.prototype.events);

      if (!this.value)
        this.value = 0;

    },

    events: {
      'change .bbf-bandwidthset-suffix' : 'updateValue',
    },

    render: function () {
      LockSet.prototype.render.call (this);

      var lockbtn = $('button', this.$el);

      lockbtn.before ('\
      <select class="bbf-bandwidthset-suffix" style="width: 70px">\
      <option value="Mb">Mb/s</option>\
      <option value="kb">kb/s</option>\
      <option value="b">b/s</option>\
      </select>\
      ');

      this.initValue ();
      this.updateValue ();

      return this;
    },
  });

  exports.ConcurrentSet = LockSet.extend({
    className: 'bbf-concurrentset',

    defaultValue: 1,

    initialize: function (options) {
      LockSet.prototype.initialize.call(this, options);

      if (!this.value)
        this.value = 1;
    },

    render: function () {
      LockSet.prototype.render.call (this);

      var lockbtn = $('button', this.$el);

      lockbtn.before ('\
      <span class="add-on" style="width: 60px">sessions</span>\
      ');

      this.updateValue ();

      return this;
    },

    updateValue: function () {
      var input = $('input', this.$el);
      this.value = input.val ();

      LockSet.prototype.updateValue.call (this);
    },

  });

  exports.TextSet = LockSet.extend({
    className: 'bbf-textset',

    defaultValue: 'default',

    dataType: 'string',

    initialize: function (options) {
      LockSet.prototype.initialize.call(this, options);

      if (!this.value)
        this.value = 1;
    },

    render: function () {
      LockSet.prototype.render.call (this);

      var input = $('input[type="text"]', this.$el);
      input.css ('width', '75%');

      this.updateValue ();

      return this;
    },

    updateValue: function () {
      var input = $('input', this.$el);
      this.value = input.val ();

      LockSet.prototype.updateValue.call (this);
    },

  });

  exports.IDInput = Base.extend({
    className: 'bbf-idinput',

    initialize: function (options) {
      Base.prototype.initialize.call(this, options);
    },

    events: {
      'click .bbf-idinput-field' : 'onClick',
      'keypress .bbf-idinput-field' : 'onKeyPress',
      'change .bbf-idinput-field' : 'updateValue',
    },

    render: function () {
      this.$el.html ('<div class="input-append">\
        <select class="bbf-idinput-type" style="width: 30%">\
        <option value="Thai Personal ID">Thai Personal ID</option>\
        <option value="Passport No">Passport No</option>\
        </select>\
        <input class="span2 bbf-idinput-field" style="width: 45%" type="text">\
        </div>\
      ');

      this.idinput_field = $('.bbf-idinput-field', this.$el);
      this.idinput_type = $('.bbf-idinput-type', this.$el);

      this.setValue.call(this, this.value);
      this.initValue ();

      return this;
    },

    initValue: function () {
      var val = this.getValue ();

      if (val == null)
        return;

      var s = val.split (':');

      if (s.length == 2) {
        this.idinput_type.val (s[0]);
        this.idinput_field.val (s[1]);
      } else {
        this.idinput_type.val ('Thai Personal ID');
        this.idinput_field.val (s[0]);
      }
    },

    getValue: function () {
      return this.value;
    },

    setValue: function (value) {
      this.value = value;
    },

    onClick: function () {
      this.idinput_field.select ();
    },

    onKeyPress: function (event) {
      //Allow backspace
      if (event.charCode == 0) return;
    
      if (this.idinput_type.val () == 'Thai Personal ID') {  

        //Get the whole new value so that we can prevent things
        //like double decimals points etc.
        var newVal = this.idinput_field.val() +
                       String.fromCharCode(event.charCode);

        var numeric = /^[0-9]*\.?[0-9]*?$/.test(newVal);

        if (!numeric) event.preventDefault();

        if (newVal.length > 13)
          event.preventDefault ();

      } else {
        var newVal = String.fromCharCode(event.charCode);
        var asterisk = /\*/.test (newVal);

        if (asterisk) event.preventDefault ();

        this.idinput_field.val (this.idinput_field.val ().toUpperCase ());
      }

      this.updateValue.call (this);
    },

    updateValue: function () {
      var value = this.idinput_type.val () + ':' + this.idinput_field.val ();

      this.setValue.call (this, value); 
    },
  });

  _.extend (Form.editors, exports);

})();
