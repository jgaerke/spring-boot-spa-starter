(function () {
  var ResetPassword = Component.extend({

    init: function ($, errorHandler, router, account, form) {
      this.$ = $;
      this.errorHandler = errorHandler;
      this.router = router;
      this.account = account;
      this.form = form;
    },

    onAfterMount: function () {
      this.resetPasswordForm = this.form.bind('#resetPassword', this.tag);
    },

    onSuccess: function () {
      this.router.go('LoginAfterPasswordReset');
      this.tag.update();
    },

    onError: function (jqXHR, textStatus, errorThrown) {
      this.errorHandler.handle(jqXHR.status, {
        400: { form: this.resetPasswordForm, text: 'Invalid request' },
        404: { route: 'ResetPasswordTokenNotFound' }
      });
    },

    submit: function (e) {
      if(!e.result) return;
      var values = this.resetPasswordForm.values();
      if(values.password != values.passwordConfirmation) {
        return this.form.errors(['Password must match.']);
      }
      this.account.resetPassword(this.ctx.params.token, values.passwordConfirmation).done(this.onSuccess).fail(this.onError);
    }
  });


  app.component(
      'ResetPassword',
      ResetPassword,
      [
        '$',
        'ErrorHandler',
        'Router',
        'Account'
      ]
  );

  app.routes.push({
    path: '/reset-password/:token',
    component: 'ResetPassword',
    tag: 'reset-password'
  });

})();
