(function () {
    var RecoverPassword = Component.extend({

        init: function ($, errorHandler, router, account, form) {
            this.$ = $;
            this.errorHandler = errorHandler;
            this.router = router;
            this.account = account;
            this.form = form;
        },

        onAfterMount: function () {
            this.recoverPasswordForm = this.form.bind('#recoverPassword', this.tag);
        },

        onSuccess: function () {
            this.router.go('PasswordResetInstructionsSent');
        },

        onError: function (jqXHR, textStatus, errorThrown) {
            this.errorHandler.handle(jqXHR.status, {
                400: {form: this.recoverPasswordForm, text: 'Invalid request'},
                404: {form: this.recoverPasswordForm, text: 'Email address not found'}
            });
        },

        onSubmit: function (e) {
            if (!e.result) return;
            this.account.recoverPassword(this.value('email')).done(this.onSuccess).fail(this.onError);
        }
    });


    app.component(
        'RecoverPassword',
        RecoverPassword,
        [
            '$',
            'ErrorHandler',
            'Router',
            'Account',
            'Form'
        ]
    );

    app.routes.push({
        path: '/recover-password',
        component: 'RecoverPassword',
        tag: 'recover-password'
    });

})();
