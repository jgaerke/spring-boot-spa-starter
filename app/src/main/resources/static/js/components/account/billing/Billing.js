(function () {
  var Billing = Module.extend({

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
      'Billing',
      Billing,
      [
        '$',
        'ErrorHandler',
        'Router',
        'Account'
      ]
  );

  app.routes.push({
    path: '/settings/billing',
    component: 'Billing',
    tag: 'billing',
    authenticate: true
  });

  app.routes.push({
    templateName: 'billingEdit',
    path: '/settings/billing/edit',
    component: 'Billing',
    tag: 'billing-edit',
    authenticate: true
  });

})();
