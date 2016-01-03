(function () {
  var Login = Module.extend({

    init: function ($, errorHandler, router, account) {
      this.$ = $;
      this.errorHandler = errorHandler;
      this.router = router;
      this.account = account;
      this.message = {};
    },

    onMount: function (tag) {
      this.message.displayPasswordResetSuccess = this.router.isCurrent('LoginAfterPasswordReset');
      this.tag = tag;
      this.form = this.$('form', tag.root).form({
        inline: false,
        fields: {
          email: ['email', 'empty'],
          password: ['empty']
        }
      });
      this.tag.update();
    },

    getInputs: function (form) {
      return {
        email: form.email.value,
        password: form.password.value,
        rememberMe: true
      }
    },

    onSuccess: function (data, status) {
      this.router.go('Home', null, true);
      this.tag.update();
    },

    onError: function (jqXHR, textStatus, errorThrown) {
      this.errorHandler.handle(jqXHR.status, {
        401: { form: this.form, text: 'Email address or password invalid.' }
      });
      this.tag.update();
    },

    submit: function (e) {
      if(!e.result) return;
      this.account.login(this.getInputs(e.target)).done(this.onSuccess).fail(this.onError);
    }
  });


  app.component(
      'Login',
      Login,
      [
        '$',
        'ErrorHandler',
        'Router',
        'Account'
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
