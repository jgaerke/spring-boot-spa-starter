(function () {
  var Profile = Component.extend({

    init: function ($, errorHandler, router, account) {
      this.$ = $;
      this.errorHandler = errorHandler;
      this.router = router;
      this.account = account;
      this.profile = {};
      this.editing = false;
    },

    onAfterMount: function () {
      this.form = this.$('form', this.tag.root).form({
        inline: false,
        fields: {
          email: ['email', 'empty']
        }
      });

      this.account.getCurrent().done(this.onGetCurrentSuccess).fail(this.onGetCurrentError);
    },

    onAfterUnMount: function () {
      this.reset();
    },

    onGetCurrentSuccess: function (profile, status) {
      this.profile = profile;
      this.tag.update();
    },

    onGetCurrentError: function (jqXHR, textStatus, errorThrown) {
      //this.errorHandler.handle(jqXHR.status, {
      //  401: { form: this.form, text: 'Email address or password invalid.' }
      //});
      //this.tag.update();
      console.log(jqXHR);
      this.tag.update();
    },

    onUpdateAccountSuccess: function (profile, status) {
      console.log('success');
      this.editing = false;
      this.tag.update();
    },

    onUpdateAccountError: function (jqXHR, textStatus, errorThrown) {
      //this.errorHandler.handle(jqXHR.status, {
      //  401: { form: this.form, text: 'Email address or password invalid.' }
      //});
      //this.tag.update();
      this.tag.update();
    },

    toggle: function (e) {
      this.editing = e.target.checked;
      if(this.editing) {
        this.originalProfile = this.$.extend({}, this.profile);
      } else {
        this.profile = this.$.extend(this.profile, this.getInputs(e.target.form));
        this.tag.update();
      }
    },

    reset: function() {
      this.editing = false;
      this.profile = this.originalProfile || this.profile;
      this.tag.update();
    },

    getInputs: function (form) {
      return {
        email: form[1].value,
        first: form[2].value,
        last: form[3].value
      }
    },

    submit: function (e) {
      this.account.update(this.getInputs(e.target)).done(this.onUpdateAccountSuccess).fail(this.onUpdateAccountError);
    }
  });


  app.component(
      'Profile',
      Profile,
      [
        '$',
        'ErrorHandler',
        'Router',
        'Account'
      ]
  );

  app.routes.push({
    path: '/settings/profile',
    component: 'Profile',
    tag: 'profile',
    authenticate: true
  });

  app.routes.push({
    templateName: 'profileEdit',
    path: '/settings/profile/edit',
    component: 'Profile',
    tag: 'profile-edit',
    authenticate: true
  });

})();
