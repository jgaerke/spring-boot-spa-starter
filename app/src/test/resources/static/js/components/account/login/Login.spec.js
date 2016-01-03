describe('Login', function () {
  var login, $, errorHandler, router, account, form, formResult;

  beforeEach(function (done) {
    var Login = app.getType('Login');
    $ = {};
    errorHandler = { handle: sinon.spy() };
    router = { isCurrent: sinon.spy() };
    account = {};
    login = new Login($, errorHandler, router, account);
    login.tag = {
      root: {},
      update: sinon.spy()
    };
    form = {
      email: {value: 'some-email@gmail.com'},
      password: {value: 'password'}
    };
    formResult = {
      email: 'some-email@gmail.com',
      password: 'password',
      rememberMe: true
    };

    done();
  });

  it('should wire up form validation upon mount', function(done) {
    //given
    var formSpy = sinon.spy();
    login.$ = sinon.spy(function() {
      return {
        form: formSpy
      }
    });

    //when
    login.onMount(login.tag);

    //then
    expect(login.$).to.have.been.calledWith('form', login.tag.root);
    expect(login.router.isCurrent).to.have.been.calledWith('LoginAfterPasswordReset');
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

  it('should route to Home on success', function (done) {
    //given
    login.router = {
      go: sinon.spy()
    };

    //when
    login.onSuccess();

    //then
    expect(login.router.go).to.have.been.calledWith('Home');

    done();
  });

  it('should handle error', function (done) {
    //given
    var jqXHR = {status: 400};
    login.errorHandler.handle = sinon.spy();

    //when
    login.onError(jqXHR, "textStatus", {});

    //then
    expect(login.errorHandler.handle).to.have.been.called;
    expect(login.tag.update).to.have.been.called;

    done();
  });

  it('should short circuit submit to server if input is in invalid state', function(done) {
    //given
    var e;
    e = { target: form, result: false };
    login.account.create = sinon.spy();

    //when
    login.submit(e);

    //then
    expect(login.account.create).to.not.have.been.called;

    done();
  });

  it('should submit credentials to server for login and wire handlers accordingly', function (done) {
    //given
    var e, callbacks;
    e = { target: form, result: true };
    callbacks = spyOnFuncAndCallbacks(login.account, 'login');

    //when
    login.submit(e);

    //then
    expect(login.account.login).to.have.been.calledWithExactly(formResult);
    expect(callbacks.successHandler).to.have.been.calledWith(login.onSuccess);
    expect(callbacks.errorHandler).to.have.been.calledWith(login.onError);

    done();
  });

});