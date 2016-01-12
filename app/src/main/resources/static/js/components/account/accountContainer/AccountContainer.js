(function () {
  var AccountContainer = Module.extend({
    init: function (account, router, $) {
      this.account = account;
      this.router = router;
      this.$ = $;
    },

    onMount: function(tag) {
      this.tag = tag;
      this.isProfileTabActive = this.router.isCurrent('Profile');
      this.isBillingTabActive = this.router.isCurrent('Billing');
      this.isOrganizationTabActive = this.router.isCurrent('Organization');
      this.tag.update();
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
