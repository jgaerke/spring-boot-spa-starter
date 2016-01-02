(function () {
  var Container = Module.extend({
    init: function (errorHandler, account, router, $) {
      this.errorHandler = errorHandler;
      this.account = account;
      this.router = router;
      this.$ = $;
      this.onMount = this.onMount.bind(this);
      this.logout = this.logout.bind(this);
    },

    onMount: function(tag) {
      this.$('.ui.dropdown', tag.root).dropdown();
    },

    onLogoutSuccess: function () {
      this.router.go('/app');
    },

    onLogoutFailure: function (jqXHR, textStatus, errorThrown) {
      this.errorHandler.handle({
        source: 'Container',
        event: 'Logout',
        message: 'Logout failed',
        severity: 'CRITICAL',
        context: {
          jqXHR: jqXHR,
          textStatus: textStatus,
          errorThrown: errorThrown,
        }
      });
    },

    logout: function () {
      this.account.logout().done(this.onLogoutSuccess).fail(this.onLogoutFailure);
    }
  });

  app.component(
      'Container',
      Container,
      [
        'ErrorHandler',
        'Account',
        'Router',
          '$'
      ]
  );

})();
