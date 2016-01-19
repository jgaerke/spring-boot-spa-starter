(function () {
  var Home = Component.extend({
    init: function($) {
      this.$ = $;
    },

    onAfterMount: function() {
      this.$('.ui.dropdown', this.tag.root).dropdown();
    }
  });

  app.component(
      'Home',
      Home,
      ['$']
  );

  app.routes.push({
    path: '/',
    component: 'Home',
    tag: 'home',
    authenticate: true
  });
})();
