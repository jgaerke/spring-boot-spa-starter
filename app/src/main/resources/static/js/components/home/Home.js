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
    name: 'HOME',
    path: '/',
    component: 'Home',
    tag: 'home',
    authenticate: true
  });
})();
