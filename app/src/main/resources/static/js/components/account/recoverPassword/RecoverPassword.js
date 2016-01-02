(function () {
  var RecoverPassword = Module.extend({

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
      this.router.go('/app');
      this.tag.update();
    },

    onError: function (jqXHR, textStatus, errorThrown) {
      if (jqXHR.status.toString().indexOf('5') === 0) {
        this.errorHandler.handle({
          source: 'RecoverPassword',
          event: 'RecoverPassword',
          message: 'RecoverPassword failed',
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
    name: 'RECOVERPASSWORD',
    path: '/recover-password',
    component: 'RecoverPassword',
    tag: 'recover-password'
  });

})();
