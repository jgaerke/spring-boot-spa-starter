(function () {
  var Registration = Module.extend({

    init: function ($, errorHandler, router, account) {
      this.$ = $;
      this.errorHandler = errorHandler;
      this.router = router;
      this.account = account;
      this.data = {};
      this.status = 200;

      this.onMount = this.onMount.bind(this);
      this.getInputs = this.getInputs.bind(this);
      this.submit = this.submit.bind(this);
      this.onSuccess = this.onSuccess.bind(this);
      this.onError = this.onError.bind(this);
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
      this.router.go('/app');
    },

    onError: function (jqXHR, textStatus, errorThrown) {
      if (jqXHR.status.toString().indexOf('5') === 0) {
        this.errorHandler.handle({
          source: 'Registration',
          event: 'Registration',
          message: 'Registration failed',
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
      if(jqXHR.status == 409) {
         this.form.form('add errors', ['Email address taken.']);
      }
      this.status = jqXHR.status;
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
    name: 'REGISTRATION',
    path: '/register',
    component: 'Registration',
    tag: 'registration'
  });

})()
