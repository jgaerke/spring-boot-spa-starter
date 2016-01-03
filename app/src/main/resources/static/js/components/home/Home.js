(function () {
  var Home = Module.extend({
    init: function($) {
      this.$ = $;
      this.onMount = this.onMount.bind(this);
    },

    onMount: function(tag) {
      this.$('.ui.dropdown', tag.root).dropdown();
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
    tag: 'static.js.components.confirmation.home.home',
    authenticate: true
  });
})();
