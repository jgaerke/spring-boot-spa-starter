(function () {
  var SettingsContainer = Module.extend({
    init: function (account, router, $) {
      this.account = account;
      this.router = router;
      this.$ = $;
      this.isProfileTabActive = true;
      this.isBillingTabActive = false;
      this.isOrganizationTabActive = false;
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
      'SettingsContainer',
      SettingsContainer,
      [
        'Account',
        'Router',
          '$'
      ],
      'settings-container'
  );

})();
