(function () {
  var Account = Module.extend({
    init: function (http, authenticated) {
      this.http = http;
      this.authenticated = authenticated;
    },

    getEncodedCredentials: function (credentials) {
      var str = [];
      for (var p in credentials)
        str.push(encodeURIComponent(p) + "=" + encodeURIComponent(credentials[p]));
      return str.join("&");
    },

    login: function (credentials) {
      return this.http.post(
          '/api/accounts/login',
          this.getEncodedCredentials(credentials),
          {'Content-Type': 'application/x-www-form-urlencoded'}
      );
    },

    logout: function () {
      return this.http.delete('/api/accounts/logout');
    },

    create: function (account) {
      delete account.passwordConfirm;
      return this.http.post('/api/accounts', account);
    },

    update: function(account) {
      delete account.password;
      delete account.passwordConfirm;
      return this.http.patch('/api/accounts', account)
    },

    changePassword: function(oldPassword, newPassword) {
      return this.http.post('/api/accounts/password/change', {
        oldPassword: oldPassword,
        newPassword: newPassword
      });
    },

    recoverPassword: function(email) {
      return this.http.post('/api/accounts/password/recover', {
        email: email
      });
    },

    resetPassword: function(token, password) {
      return this.http.post('/api/accounts/password/reset', {
        passwordResetToken: token,
        password: password
      });
    }
  });

  app.service(
      'Account',
      Account,
      [
        'Http',
        'authenticated'
      ]
  );
})();