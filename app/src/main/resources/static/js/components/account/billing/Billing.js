(function () {
    var Billing = Component.extend({

        init: function ($, errorHandler, router, account, window, form) {
            this.$ = $;
            this.errorHandler = errorHandler;
            this.router = router;
            this.account = account;
            this.window = window;
            this.form = form
            this.editing = false;
            this.submitting = false;
        },

        onAfterMount: function () {
            this.paymentInfoForm = this.form.bind('#paymentInfo', this.tag);
            this.$('input[name=number]').payment('formatCardNumber');
            this.$('input[name=cvc]').payment('formatCardCVC');
            this.$('input[name=expiration]').payment('formatCardExpiry');
            this.loadStripe();
            this.account.getCurrent().done(this.onGetCurrentSuccess).fail(this.onGetCurrentError);
        },

        onAfterUnMount: function () {
            this.editing = false;
            delete this.profile;
        },

        loadStripe: function () {
            var self = this;
            if (this.window.Stripe) {
                return;
            }
            this.$.getScript("https://js.stripe.com/v2/", function () {
                self.window.Stripe.setPublishableKey('################################');
            });
        },

        onGetCurrentSuccess: function (profile, status) {
            this.profile = profile;
            this.editing = profile.plan == undefined || !this.profile.paymentInfo || !this.profile.paymentInfo.card;
            this.paymentInfoForm.values(this.profile);
            this.setFormattedCardNumber();
        },

        onGetCurrentError: function (jqXHR, textStatus, errorThrown) {
            //TODO:: Handle error properly.
            //this.errorHandler.handle(jqXHR.status, {
            //  401: { form: this.form, text: 'Email address or password invalid.' }
            //});
            //this.tag.update();
            console.log(jqXHR);
            this.tag.update();
        },

        toggle: function (e) {
            this.editing = e.target.checked;
            if (this.editing) {
                this.submitting = false;
            } else {
                this.setFormattedCardNumber();
                this.paymentInfoForm.rollback();
            }
        },

        onUpdatePaymentInfoSuccess: function (profile, status) {
            this.editing = false;
            this.submitting = false;
            this.setFormattedCardNumber();
        },

        onUpdatePaymentInfoError: function (jqXHR, textStatus, errorThrown) {
            //this.errorHandler.handle(jqXHR.status, {
            //  401: { form: this.form, text: 'Email address or password invalid.' }
            //});
            this.submitting = false;
            this.tag.update();
        },

        onStripeResponse: function (status, response) {
            if (response.error) {
                this.paymentInfoForm.errors([response.error.message]);
                return this.submitting = false;
            }
            this.profile.paymentInfo = response;
            this.account.update(this.profile).done(this.onUpdatePaymentInfoSuccess).fail(this.onUpdatePaymentInfoError);
        },

        setFormattedCardNumber: function () {
            if (!this.profile || !this.profile.paymentInfo || !this.profile.paymentInfo.card) {
                return;
            }
            this.paymentInfoForm.values({
                number: '•••• •••• •••• ' + this.profile.paymentInfo.card.last4
            });
        },

        onSubmit: function () {
            this.submitting = true;
            this.paymentInfoForm.validate();
            var values, errors, expiryVal, stripeRequest;
            values = this.paymentInfoForm.values();
            expiryVal = this.$.payment.cardExpiryVal(values.expiration || '');
            stripeRequest = {
                number: values.number,
                cvc: values.cvc,
                exp_month: expiryVal.month,
                exp_year: expiryVal.year
            };
            errors = [];
            this.profile.plan = values.plan;
            if (!this.$.payment.validateCardNumber(stripeRequest.number)) {
                errors.push('Valid card number required');
            }
            if (!this.$.payment.validateCardCVC(stripeRequest.cvc)) {
                errors.push('Valid card CVC required');
            }
            if (!this.$.payment.validateCardExpiry(stripeRequest.exp_month, stripeRequest.exp_year)) {
                errors.push('Valid card expiration (MM/YYYY) required');
            }
            if (errors.length) {
                this.submitting = false;
                this.paymentInfoForm.errors(errors);
                return;
            }
            this.window.Stripe.card.createToken(stripeRequest, this.onStripeResponse);
        }

    });


    app.component(
        'Billing',
        Billing,
        [
            '$',
            'ErrorHandler',
            'Router',
            'Account',
            'window',
            'Form'
        ]
    );

    app.routes.push({
        path: '/settings/billing',
        component: 'Billing',
        tag: 'billing',
        authenticate: true
    });

})();
