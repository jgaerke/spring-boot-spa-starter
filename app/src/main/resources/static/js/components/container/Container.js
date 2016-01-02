(function () {
  var Container = Module.extend({
    init: function (account, router, $) {
      this.account = account;
      this.router = router;
      this.$ = $;
    },

    onMount: function(tag) {
      this.$('.ui.dropdown', tag.root).dropdown();
    },

    onLogoutSuccess: function () {
      this.router.go('Home');
    },

    onLogoutFailure: function (jqXHR, textStatus, errorThrown) {
      this.router.go('LogoutError');
    },

    logout: function () {
      this.account.logout().done(this.onLogoutSuccess).fail(this.onLogoutFailure);
    }
  });

  app.component(
      'Container',
      Container,
      [
        'Account',
        'Router',
          '$'
      ]
  );

})();
