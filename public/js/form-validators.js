/* prepare the translation text */
DarkSolar.formValidatorsTranslation = function () {
  Backbone.Form.validators.errMessages.required =
    $.t("forms:validation.Required");
  Backbone.Form.validators.errMessages.regexp =
    $.t("forms:validation.Invalid");
  Backbone.Form.validators.errMessages.email =
    $.t("forms:validation.Invalid email address");
  Backbone.Form.validators.errMessages.match =
    _.template($.t('forms:validation.Must match field') + ' "<%= field %>"',
               null, Backbone.Form.templateSettings);
};
