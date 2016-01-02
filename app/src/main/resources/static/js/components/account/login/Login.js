(function () {
  var Login = Module.extend({

    init: function ($, errorHandler, router, account) {
      this.$ = $;
      this.errorHandler = errorHandler;
      this.router = router;
      this.account = account;
      this.data = {};
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
          email: ['email', 'empty'],
          password: ['empty']
        }
      });
    },

    getInputs: function (form) {
      return {
        email: form.email.value,
        password: form.password.value,
        //rememberMe: form.rememberMe.checked
        rememberMe: true
      }
    },

    onSuccess: function (data, status) {
      this.router.go('/app');
      this.tag.update();
    },

    onError: function (jqXHR, textStatus, errorThrown) {
      if (jqXHR.status.toString().indexOf('5') === 0) {
        this.errorHandler.handle({
          source: 'Login',
          event: 'Login',
          message: 'Login failed',
          severity: 'CRITICAL',
          context: {
            jqXHR: jqXHR,
            textStatus: textStatus,
            errorThrown: errorThrown
          }
        });
      }
      if(jqXHR.status == 401) {
        this.form.form('add errors', ['Email address or password invalid.']);
      }
      this.status = jqXHR.status;
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
    name: 'LOGIN',
    path: '/login',
    component: 'Login',
    tag: 'login'
  });

})();
