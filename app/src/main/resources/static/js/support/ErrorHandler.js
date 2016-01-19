(function () {
  var ErrorHandler = Class.extend({
    init: function (router) {
      this.router = router;
    },

    handle: function (status, possibleErrors) {
      var handled, self;
      handled = false;
      self = this;

      for (statusKey in possibleErrors) {
        if(possibleErrors.hasOwnProperty(statusKey)) {
          var possibleError = possibleErrors[statusKey];
          if(!handled && statusKey.toString().length == 1 && status.toString().indexOf(statusKey.toString())
              || statusKey == status) {
            if(possibleError.form) {
              handled = true;
              return possibleError.form.form('add errors', possibleError.text);
            }
            if(possibleError.route) {
              handled = true;
              return self.router.go(possibleError.route);
            }
            throw new Error('All error handlers should either bind to a form or a route.');
          }
        }
      }

      return handled;
    }
  });

  app.service(
      'ErrorHandler',
      ErrorHandler,
      [
          'Router'
      ]
  );
})();