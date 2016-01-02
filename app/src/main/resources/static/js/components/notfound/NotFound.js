
(function () {
  var NotFound = Module.extend({
    init: function() {
    }
  });

  app.component(
      'NotFound',
      NotFound,
      []
  );

  app.routes.push({
    name: 'NOTFOUND',
    path: '*',
    component: 'NotFound',
    tag: 'notfound'
  });
})();
