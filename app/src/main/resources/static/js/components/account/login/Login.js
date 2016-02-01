(function () {
    var Login = Component.extend({

        init: function ($, errorHandler, router, account, formHandlerFactory) {
            this.$ = $;
            this.errorHandler = errorHandler;
            this.router = router;
            this.account = account;
            this.formHandlerFactory = formHandlerFactory;
            this.message = {};
        },

        onAfterMount: function () {
            this.message.displayPasswordResetSuccess = this.router.isCurrent('LoginAfterPasswordReset');
            this.loginFormHandler = this.formHandlerFactory.create('#loginForm', this.tag);
        },

        onSuccess: function (data, status) {
            this.router.go('Home', null, true);
        },

        onError: function (jqXHR, textStatus, errorThrown) {
            this.errorHandler.handle(jqXHR.status, {
                401: {form: this.loginFormHandler.form, text: 'Email address or password invalid.'}
            });
        },

        submit: function (e) {
            if (!e.result) return;
            this.account.login(this.loginFormHandler.values()).done(this.onSuccess).fail(this.onError);
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
            'FormHandlerFactory'
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
