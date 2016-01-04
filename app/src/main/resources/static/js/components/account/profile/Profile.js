(function () {
  var Profile = Module.extend({

    init: function ($, errorHandler, router, account) {
      this.$ = $;
      this.errorHandler = errorHandler;
      this.router = router;
      this.account = account;
    },

    onMount: function (tag) {
      this.tag = tag;
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
    path: '/profile',
    component: 'Profile',
    tag: 'profile',
    authenticate: true
  });

  app.routes.push({
    templateName: 'profileEdit',
    path: '/profile/edit',
    component: 'Profile',
    tag: 'profile-edit',
    authenticate: true
  });

})();
