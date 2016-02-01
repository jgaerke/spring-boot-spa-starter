(function () {
    var Billing = Component.extend({

        init: function ($, errorHandler, router, account, window, formHandlerFactory) {
            this.$ = $;
            this.errorHandler = errorHandler;
            this.router = router;
            this.account = account;
            this.window = window;
            this.formHandlerFactory = formHandlerFactory
            this.editingPlan = false;
            this.submittingPlan = false;
            this.editingPaymentInfo = false;
            this.submittingPaymentInfo = false;
        },

        onAfterMount: function () {
            this.planFormHandler = this.formHandlerFactory.create('#planForm', this.tag);
            this.paymentInfoFormHandler = this.formHandlerFactory.create('#paymentInfoForm', this.tag);
            this.$('input[name=number]').payment('formatCardNumber');
            this.$('input[name=cvc]').payment('formatCardCVC');
            this.$('input[name=expiration]').payment('formatCardExpiry');
            this.loadStripe();
            this.account.getCurrent().done(this.onGetCurrentSuccess).fail(this.onGetCurrentError);
        },

        onAfterUnMount: function () {
            this.editingPlan = false;
            this.editingPaymentInfo = false;
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
            this.selectedPlan = this.profile.plan;
            this.planFormHandler.values(this.profile);
            this.paymentInfoFormHandler.values(this.profile);
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

        togglePlan: function (e) {
            this.editingPlan = e.target.checked;
            if (this.editingPlan) {
                this.submittingPlan = false;
            } else {
                this.selectedPlan = this.profile.plan;
                this.planFormHandler.rollback();
            }
        },

        onPlanChange: function (e) {
            this.selectedPlan = e.target.value;
            this.tag.update();
        },

        onUpdatePlanSuccess: function (profile, status) {
            this.editingPlan = false;
            this.submittingPlan = false;
            this.planFormHandler.commit();
        },

        onUpdatePlanError: function (jqXHR, textStatus, errorThrown) {
            //this.errorHandler.handle(jqXHR.status, {
            //  401: { form: this.form, text: 'Email address or password invalid.' }
            //});
            this.submittingPlan = false;
            this.profileFormHandler.commit();
        },

        onPlanSubmit: function (e) {
            this.submittingPlan = true;
            this.profile.plan = e.target.plan.value;
            this.account.update(this.profile).done(this.onUpdatePlanSuccess).fail(this.onUpdatePlanError);
        },

        togglePaymentInfo: function (e) {
            this.editingPaymentInfo = e.target.checked;
            if (this.editingPaymentInfo) {
                this.submittingPaymentInfo = false;
            } else {
                this.setFormattedCardNumber();
                this.paymentInfoFormHandler.rollback();
            }
        },

        onUpdatePaymentInfoSuccess: function (profile, status) {
            this.editingPaymentInfo = false;
            this.submittingPaymentInfo = false;
            this.setFormattedCardNumber();
        },

        onUpdatePaymentInfoError: function (jqXHR, textStatus, errorThrown) {
            //this.errorHandler.handle(jqXHR.status, {
            //  401: { form: this.form, text: 'Email address or password invalid.' }
            //});
            this.submittingPaymentInfo = false;
            this.tag.update();
        },

        onStripeResponse: function (status, response) {
            if (response.error) {
                this.paymentInfoFormHandler.form('add errors', [response.error.message]);
                return this.submittingPaymentInfo = false;
            }
            this.profile.paymentInfo = response;
            this.account.update(this.profile).done(this.onUpdatePaymentInfoSuccess).fail(this.onUpdatePaymentInfoError);
        },

        setFormattedCardNumber: function () {
            if (!this.profile || !this.profile.paymentInfo || !this.profile.paymentInfo.card) {
                return;
            }
            this.paymentInfoFormHandler.values({
                number: '•••• •••• •••• ' + this.profile.paymentInfo.card.last4
            });
        },

        onPaymentInfoSubmit: function () {
            this.submittingPaymentInfo = true;
            var values, errors, expiryVal, stripeRequest;
            values = this.paymentInfoFormHandler.values();
            expiryVal = this.$.payment.cardExpiryVal(values.expiration);
            stripeRequest = {
                number: values.number,
                cvc: values.cvc,
                exp_month: expiryVal.month,
                exp_year: expiryVal.year
            };
            errors = [];
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
                this.submittingPaymentInfo = false;
                this.paymentInfoFormHandler.errors(errors);
                return false;
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
            'FormHandlerFactory'
        ]
    );

    app.routes.push({
        path: '/settings/billing',
        component: 'Billing',
        tag: 'billing',
        authenticate: true
    });

})();
