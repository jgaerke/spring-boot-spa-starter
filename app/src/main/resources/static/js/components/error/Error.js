(function () {
  app.routes.push({
    path: '/reset-password-token-not-found',
    templateName: 'ResetPasswordTokenNotFound',
    tag: 'reset-password-token-not-found'
  });
  app.routes.push({
    path: '*',
    templateName: 'NotFound',
    tag: 'notfound',
    index: 10000
  });
})();
