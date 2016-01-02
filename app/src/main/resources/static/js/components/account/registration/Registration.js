(function () {
  var Registration = Module.extend({

    init: function ($, errorHandler, router, account) {
      this.$ = $;
      this.errorHandler = errorHandler;
      this.router = router;
      this.account = account;
    },

    onMount: function (tag) {
      this.tag = tag;
      this.form = this.$('form', tag.root).form({
        inline: false,
        fields: {
          email: ['email', 'empty'],
          password: ['minLength[6]', 'empty']
        }
      });
    },

    getInputs: function (form) {
      return {
        email: form.email.value,
        password: form.password.value,
        rememberMe: true
      }
    },

    submit: function (e) {
      if(!e.result) return;
      this.account
          .create(this.getInputs(e.target))
          .done(this.onSuccess)
          .fail(this.onError);
    },

    onSuccess: function () {
      this.router.go('Home');
    },

    onError: function (jqXHR, textStatus, errorThrown) {
      this.errorHandler.handle(jqXHR.status, {
        400: { form: this.form, text: 'Invalid request' },
        409: { form: this.form, text: 'Email address taken' }
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
        'Account'
      ]
  );

  app.routes.push({
    path: '/register',
    component: 'Registration',
    tag: 'registration'
  });

})()
