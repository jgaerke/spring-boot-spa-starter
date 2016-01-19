(function () {
  var Plans = Component.extend({
    init: function ($) {
      this.isBasicVisible = true;
      this.isProVisible = true;
      this.isPremiumVisible = true;
      this.isReadOnly = false;
      this.$ = $;
    },

    onAfterUnMount: function () {
      this.reset();
      this.tag.update();
    },

    subscribe: function (e) {
      this.trigger('select', this.$(e.currentTarget).data());
    },

    reset: function() {
      this.isBasicVisible = true;
      this.isProVisible = true;
      this.isPremiumVisible = true;
      this.isReadOnly = false;
    }
  });

  app.component(
      'Plans',
      Plans,
      ['$']
  );
})();
