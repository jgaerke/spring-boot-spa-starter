describe('Login', function () {
  var login, $, errorHandler, router, account, form, formResult;

  beforeEach(function (done) {
    var Login = app.getType('Login');
    $ = {};
    errorHandler = {};
    router = {};
    account = {};
    login = new Login($, errorHandler, router, account);
    login.tag = {
      root: {},
      update: sinon.spy()
    };
    form = {
      email: {value: 'some-email@gmail.com'},
      password: {value: 'password'},
      rememberMe: {checked: true }
    };
    formResult = {
      email: 'some-email@gmail.com',
      password: 'password',
      rememberMe: true
    };

    done();
  });

  it('should wire up a validation upon mount', function(done) {
    //given
    var formSpy = sinon.spy();
    login.$ = sinon.spy(function() {
      return {
        form: formSpy
      }
    });
    var tag = { root: {} };

    //when
    login.onMount(tag);

    //then
    expect(login.$).to.have.been.calledWith('form', tag.root);
    expect(formSpy).to.have.been.called;

    done();
  });


  it('should get credential inputs from form and return as object', function (done) {
    //when
    var data = login.getInputs(form);

    //then
    expect(data).to.eql(formResult);

    done();
  });

  it('should route to /app on success', function (done) {
    //given
    login.router = {
      go: sinon.spy()
    };

    //when
    login.onSuccess();

    //then
    expect(login.router.go).to.have.been.calledWith('/app');

    done();
  });

  it('should set status and reset password on 400 series error', function (done) {
    //given
    var jqXHR = {status: 400};
    login.errorHandler.handle = sinon.spy();

    //when
    login.onError(jqXHR, "textStatus", {});

    //then
    expect(login.status).to.eq(400);

    done();
  });

  it('should delegate to error handler and exit on 500 series error', function (done) {
    //given
    var jqXHR = {status: 500};
    login.errorHandler.handle = sinon.spy();

    //when
    login.onError(jqXHR, "textStatus", {});

    //then
    expect(login.errorHandler.handle).to.be.called;

    done();
  });

  it('should submit credentials to server for login and wire handlers accordingly', function (done) {
    //given
    var e, account, onDone, onFail;
    e = { target: form };
    onFail = sinon.spy();
    onDone = sinon.spy(function() {
      return {
        fail: onFail
      }
    });
    account = {
      login: sinon.spy(function () {
        return {
          done: onDone
        }
      })
    };
    login.account = account;

    //when
    login.submit(e);

    //then
    expect(account.login).to.have.been.calledWithExactly(formResult);
    expect(onDone).to.have.been.calledWith(login.onSuccess);
    expect(onFail).to.have.been.calledWith(login.onError);

    done();
  });

});