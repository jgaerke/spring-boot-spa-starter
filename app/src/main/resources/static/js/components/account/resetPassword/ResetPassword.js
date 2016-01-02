(function () {
  var ResetPassword = Module.extend({

    init: function ($, errorHandler, router, account) {
      this.$ = $;
      this.errorHandler = errorHandler;
      this.router = router;
      this.account = account;
      this.status = 200;

      this.onMount = this.onMount.bind(this);
      this.onError = this.onError.bind(this);
      this.onSuccess = this.onSuccess.bind(this);
      this.submit = this.submit.bind(this);

    },

    onMount: function (tag) {
      this.tag = tag;
      this.form = this.$('form', tag.root).form({
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
      this.router.go('/app');
      this.tag.update();
    },

    onError: function (jqXHR, textStatus, errorThrown) {
      if (jqXHR.status.toString().indexOf('5') === 0) {
        this.errorHandler.handle({
          source: 'ResetPassword',
          event: 'ResetPassword',
          message: 'ResetPassword failed',
          severity: 'CRITICAL',
          context: {
            jqXHR: jqXHR,
            textStatus: textStatus,
            errorThrown: errorThrown
          }
        });
      }
      if(jqXHR.status == 400) {
        this.form.form('add errors', ['Invalid request.']);
      }
      if(jqXHR.status == 404) {
        this.form.form('add errors', ['Email address not found.']);
      }
      this.status = jqXHR.status;
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
    name: 'CHANGEPASSWORD',
    path: '/reset-password/:token',
    component: 'ResetPassword',
    tag: 'reset-password'
  });

})();
