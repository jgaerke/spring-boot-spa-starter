(function () {
  var ResetPassword = Component.extend({

    init: function ($, errorHandler, router, account) {
      this.$ = $;
      this.errorHandler = errorHandler;
      this.router = router;
      this.account = account;
    },

    onAfterMount: function () {
      this.form = this.$('form', this.tag.root).form({
        inline: false,
        fields: {
          password: ['empty'],
          passwordConfirmation: ['empty']
        }
      });
    },

    getInputs: function (form) {
      return {
        password: form.password.value,
        passwordConfirmation: form.passwordConfirmation.value
      }
    },

    onSuccess: function () {
      this.router.go('LoginAfterPasswordReset');
      this.tag.update();
    },

    onError: function (jqXHR, textStatus, errorThrown) {
      this.errorHandler.handle(jqXHR.status, {
        400: { form: this.form, text: 'Invalid request' },
        404: { route: 'ResetPasswordTokenNotFound' }
      });
      this.tag.update();
    },

    submit: function (e) {
      if(!e.result) return;
      var inputs = this.getInputs(e.target);
      if(inputs.password != inputs.passwordConfirmation) {
        return this.form.form('add errors', ['Password must match.']);
      }
      this.account.resetPassword(this.ctx.params.token, inputs.passwordConfirmation).done(this.onSuccess).fail(this.onError);
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
