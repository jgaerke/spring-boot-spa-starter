(function () {
    var Registration = Component.extend({

        init: function ($, errorHandler, router, account, form) {
            this.$ = $;
            this.errorHandler = errorHandler;
            this.router = router;
            this.account = account;
            this.form = form;
        },

        onAfterMount: function () {
            this.registrationForm = this.form.bind('#registrationForm', this.tag);
        },

        onSubmit: function (e) {
            if (!e.result) return;
            this.account
                .create(this.registrationForm.values())
                .done(this.onSuccess)
                .fail(this.onError);
        },

        onSuccess: function () {
            this.router.go('Home', null, true);
        },

        onError: function (jqXHR, textStatus, errorThrown) {
            this.errorHandler.handle(jqXHR.status, {
                400: {form: this.registrationForm, text: 'Invalid request'},
                409: {form: this.registrationForm, text: 'Email address taken'}
            });
            this.tag.update();
        }
    });

    app.component(
        'Registration',
        Registration,
        [
            '$',
            'ErrorHandler',
            'Router',
            'Account',
            'Form'
        ]
    );

    app.routes.push({
        path: '/register',
        component: 'Registration',
        tag: 'registration'
    });

})()
