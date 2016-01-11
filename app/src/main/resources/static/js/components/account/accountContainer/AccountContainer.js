(function () {
  var AccountContainer = Module.extend({
    init: function (account, router, $) {
      this.account = account;
      this.router = router;
      this.$ = $;
    },

    onMount: function(tag) {

    }
  });

  app.component(
      'AccountContainer',
      AccountContainer,
      [
        'Account',
        'Router',
          '$'
      ],
      'account-container'
  );

})();
