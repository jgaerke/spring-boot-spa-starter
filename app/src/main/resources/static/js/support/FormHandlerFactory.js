(function () {
    var FormHandlerFactory = Class.extend({
        init: function ($) {
            this.$ = $;
        },

        create: function (el, tag, settings) {
            var self, form;

            self = this;
            form = this.$(el, tag.root);

            return {
                $: this.$,

                tag: tag,

                form: form.form(this.settings(form, settings)),

                originalValues: null,

                get: function () {
                    return this.form;
                },

                values: function (values) {
                    if (values) {
                        var defaults = this.values();
                        this.each(function (input) {
                            input.value(values[input.name()]);
                        });
                        this.tag.update();
                        if(!this.originalValues) {
                            this.originalValues = this.$.extend(defaults, values);
                        }
                        return this;
                    }

                    values = {};
                    this.each(function (input) {
                        values[input.name()] = input.value();
                    });
                    this.tag.update();
                    return values;
                },

                errors: function(errors) {
                    this.form.form('add errors', errors);
                    this.tag.update();
                },

                rollback: function() {
                    if(!this.originalValues) {
                        return this;
                    }
                    this.values(this.originalValues);
                    this.tag.update();
                    return this;
                },

                commit: function() {
                    this.originalValues = this.values();
                    this.tag.update();
                    return this;
                },

                each: function(handler) {
                  self.each(this.form, handler);
                }
            };
        },

        constraints: function(form) {
            var self, constraints, entries;

            self = this;
            constraints = {
                type: {
                    email: ['email']
                },
                required: ['empty']
            };

            entries = {};

            this.each(form, function(input) {
                if(constraints.type[input.type] && self.$.inArray(input.value, constraints.type[input.type])) {
                    entries[input.name()] = entries[input.name()] || [];
                    entries[input.name()] = self.$.merge(entries[input.name()], constraints.type[input.type]);
                }
                if(input.required) {
                    entries[input.name()] = entries[input.name()] || [];
                    entries[input.name()] = self.$.merge(entries[input.name()], constraints.required);
                }
            });

            return entries;
        },

        each: function (form, handler) {
            var self = this;
            form.find('input[type!=button][type!=submit], select').each(function (index) {
                if(!this.name && !this.id) {
                    return;
                }
                handler.call(this, {
                    el: this,

                    position: index,

                    type: this.type,

                    required: self.$(this).prop('required'),

                    name: function () {
                        return this.el.name || this.id;
                    },

                    value: function (value) {
                        if (value != undefined) {
                            if (this.el.type == 'checkbox' || this.el.type == 'radio') {
                                if(this.el.value == value) {
                                    return self.$(this.el).prop('checked', true);
                                }
                                return;
                            }
                            self.$(this.el).val(value);
                            return this.el;
                        }

                        value = this.el.value;

                        if (this.el.type == 'checkbox' || this.el.type == 'radio') {
                            if(self.$(this.el).data('boolean') == 'true') {
                                value = this.el.checked;
                                return;
                            }
                            value = this.el.value;
                        }

                        return value;
                    }
                });
            });
        },

        settings: function(form, settings) {
            var fields, defaults;

            fields = this.constraints(form);
            defaults = {
                inline: form.find('.ui error message').lenth == 0,
            };

            if(!this.$.isEmptyObject(fields)) {
                defaults.fields = fields;
            }

            return this.$.extend(defaults, settings);
        },

    });


    app.service(
        'FormHandlerFactory',
        FormHandlerFactory,
        [
            '$'
        ]
    );

})();