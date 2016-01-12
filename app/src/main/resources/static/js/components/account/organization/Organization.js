(function () {
  var Organization = Module.extend({

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
    path: '/organization',
    component: 'Organization',
    tag: 'organization',
    authenticate: true
  });

  app.routes.push({
    templateName: 'organizationEdit',
    path: '/organization/edit',
    component: 'Organization',
    tag: 'organization-edit',
    authenticate: true
  });

})();
