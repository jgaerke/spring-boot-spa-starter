(function () {
  var Organization = Component.extend({

    init: function ($, errorHandler, router, account) {
      this.$ = $;
      this.errorHandler = errorHandler;
      this.router = router;
      this.account = account;
    },
  });


  app.component(
      'Organization',
      Organization,
      [
        '$',
        'ErrorHandler',
        'Router',
        'Account'
      ]
  );

  app.routes.push({
    path: '/settings/organization',
    component: 'Organization',
    tag: 'organization',
    authenticate: true
  });

})();
