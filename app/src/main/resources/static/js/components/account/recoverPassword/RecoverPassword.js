(function () {
  var RecoverPassword = Component.extend({

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
          email: ['email', 'empty']
        }
      });
    },

    getInputs: function (form) {
      return {
        email: form.email.value
      }
    },

    onSuccess: function () {
      this.router.go('PasswordResetInstructionsSent');
      this.tag.update();
    },

    onError: function (jqXHR, textStatus, errorThrown) {
      this.errorHandler.handle(jqXHR.status, {
        400: { form: this.form, text: 'Invalid request' },
        404: { form: this.form, text: 'Email address not found' }
      });
      this.tag.update();
    },

    submit: function (e) {
      if(!e.result) return;
      this.account.recoverPassword(this.getInputs(e.target).email).done(this.onSuccess).fail(this.onError);
    }
  });


  app.component(
      'RecoverPassword',
      RecoverPassword,
      [
        '$',
        'ErrorHandler',
        'Router',
        'Account'
      ]
  );

  app.routes.push({
    path: '/recover-password',
    component: 'RecoverPassword',
    tag: 'recover-password'
  });

})();
