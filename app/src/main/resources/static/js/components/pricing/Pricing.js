(function () {
  var Pricing = Component.extend({
    init: function ($, plans) {
      this.$ = $;
      this.plans = plans;
    }
  });

  app.component(
      'Pricing',
      Pricing,
      [
        '$',
        'Plans'
      ]
  );

  app.routes.push({
    path: '/pricing',
    component: 'Pricing',
    tag: 'pricing'
  });
})();
