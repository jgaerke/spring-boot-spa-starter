(function () {
  var ErrorHandler = Module.extend({
    init: function ($) {
      this.$ = $;
    },

    handle: function (error) {
      console.log(error);
    }
  });

  app.service(
      'ErrorHandler',
      ErrorHandler,
      [
        '$'
      ]
  );
})();