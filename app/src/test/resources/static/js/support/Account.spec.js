describe('Account', function () {
  var Account, http, authenticated, account;

  beforeEach(function (done) {
    Account = app.getType('Account');
    http = {};
    authenticated = false;
    account = new Account(http, authenticated);
    done();
  });
  
  it('should encode credentials', function(done) {
    //given
    var credentials, encodedCredentials;
    credentials = {
      email: 'some-email@gmail.com',
      password: 'password'
    }
    //when
    encodedCredentials = account.getEncodedCredentials(credentials);

    //then
    expect(encodedCredentials).to.eq('email=jgaerke%40gmail.com&password=password');

    done();
  });

  it('should login', function(done) {
    //given
    var credentials, encodedCredentials;
    credentials = {};
    encodedCredentials = 'encoded';
    account.getEncodedCredentials = sinon.spy(function() {
      return encodedCredentials;
    });
    account.http.post = sinon.spy();

    //when
    account.login(credentials);

    //then
    expect(account.getEncodedCredentials).to.have.been.calledWith(credentials);
    expect(account.http.post).to.have.been.calledWith(
        '/api/accounts/login',
        encodedCredentials,
        {'Content-Type': 'application/x-www-form-urlencoded'}
    );

    done();
  });

  it('should logout', function (done) {
    //given
    account.http.delete = sinon.spy();

    //when
    account.logout();

    //then
    expect(account.http.delete).to.have.been.calledWith('/api/accounts/logout');

    done();
  });

  it('should create account', function (done) {
    //given
    var info = {
      passwordConfirm: 'passwordConfirm'
    };
    account.http.post = sinon.spy();

    //when
    account.create(info);

    //then
    expect(account.http.post).to.have.been.calledWith('/api/accounts', info);
    expect(info.passwordConfirm).to.be.undefined;

    done();
  });

  it('should update account info', function (done) {
    //given
    var info = {
      first: 'jeremy'
    };
    account.http.patch = sinon.spy();

    //when
    account.update(info);

    //then
    expect(account.http.patch).to.have.been.calledWith('/api/accounts', info);

    done();
  });

  it('should change password', function (done) {
    //given
    var expectedBody = {
      oldPassword: 'oldPassword',
      newPassword: 'newPassword'
    };
    account.http.post = sinon.spy();

    //when
    account.changePassword('oldPassword', 'newPassword');

    //then
    expect(account.http.post).to.have.been.calledWith('/api/accounts/password/change', expectedBody);

    done();
  });

  it('should handle recover password', function (done) {
    //given
    var expectedBody = {
      email: 'some-email@gmail.com'
    };
    account.http.post = sinon.spy();

    //when
    account.recoverPassword('some-email@gmail.com');

    //then
    expect(account.http.post).to.have.been.calledWith('/api/accounts/password/recover', expectedBody);

    done();
  });

  it('should reset password', function (done) {
    //given
    var expectedBody = {
      token: '123',
      password: 'password'
    };
    account.http.post = sinon.spy();

    //when
    account.resetPassword('123', 'password');

    //then
    expect(account.http.post).to.have.been.calledWith('/api/accounts/password/reset', expectedBody);

    done();
  });

});