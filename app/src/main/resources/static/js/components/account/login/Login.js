(function () {
    var Login = Component.extend({

        init: function ($, errorHandler, router, account, form) {
            this.$ = $;
            this.errorHandler = errorHandler;
            this.router = router;
            this.account = account;
            this.form = form;
            this.message = {};
        },

        onAfterMount: function () {
            this.message.displayPasswordResetSuccess = this.router.isCurrent('LoginAfterPasswordReset');
            this.loginForm = this.form.bind('#loginForm', this.tag);
        },

        onSuccess: function (data, status) {
            this.router.go('Home', null, true);
        },

        onError: function (jqXHR, textStatus, errorThrown) {
            this.errorHandler.handle(jqXHR.status, {
                401: {form: this.loginForm, text: 'Email address or password invalid.'}
            });
        },

        onSubmit: function (e) {
            if (!e.result) return;
            this.account.login(this.loginForm.values()).done(this.onSuccess).fail(this.onError);
        }
    });


    app.component(
        'Login',
        Login,
        [
            '$',
            'ErrorHandler',
            'Router',
            'Account',
            'Form'
        ]
    );

    app.routes.push({
        path: '/login',
        component: 'Login',
        tag: 'login'
    });

    app.routes.push({
        name: 'LoginAfterPasswordReset',
        path: '/login/password-reset-success',
        component: 'Login',
        tag: 'login'
    });

})();
