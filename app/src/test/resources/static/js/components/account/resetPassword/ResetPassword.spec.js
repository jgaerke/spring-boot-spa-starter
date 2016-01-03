describe('ResetPassword', function () {
  var resetPassword, $, errorHandler, router, account, form, formResult;

  beforeEach(function (done) {
    var ResetPassword = app.getType('ResetPassword');
    $ = {};
    errorHandler = { handle: sinon.spy() };
    router = {};
    account = {};
    resetPassword = new ResetPassword($, errorHandler, router, account);
    resetPassword.tag = {
      root: {},
      update: sinon.spy()
    };
    form = {
      password: {value: 'password'},
      passwordConfirmation: {value: 'password'}
    };
    formResult = {
      password: 'password',
      passwordConfirmation: 'password'
    };

    done();
  });

  it('should wire up a validation upon mount', function(done) {
    //given
    var formSpy = sinon.spy();
    resetPassword.$ = sinon.spy(function() {
      return {
        form: formSpy
      }
    });
    var tag = { root: {} };

    //when
    resetPassword.onMount(tag);

    //then
    expect(resetPassword.$).to.have.been.calledWith('form', tag.root);
    expect(formSpy).to.have.been.called;

    done();
  });


  it('should get inputs from form and return as object', function (done) {
    //when
    var data = resetPassword.getInputs(form);

    //then
    expect(data).to.eql(formResult);

    done();
  });

  it('should route to Login on success', function (done) {
    //given
    resetPassword.router = {
      go: sinon.spy()
    };

    //when
    resetPassword.onSuccess();

    //then
    expect(resetPassword.router.go).to.have.been.calledWith('Login');

    done();
  });

  it('should handle error', function (done) {
    //given
    var jqXHR = {status: 400};
    resetPassword.errorHandler.handle = sinon.spy();

    //when
    resetPassword.onError(jqXHR, "textStatus", {});

    //then
    expect(resetPassword.errorHandler.handle).to.have.been.called;
    expect(resetPassword.tag.update).to.have.been.called;

    done();
  });

  it('should short circuit submit to server if input is in invalid state', function(done) {
    //given
    var e;
    e = { target: form, result: false };
    resetPassword.account.create = sinon.spy();

    //when
    resetPassword.submit(e);

    //then
    expect(resetPassword.account.create).to.not.have.been.called;

    done();
  });

  it('should submit credentials to server for resetPassword and wire handlers accordingly', function (done) {
    //given
    var e, callbacks;
    e = { target: form, result: true };
    callbacks = spyOnFuncAndCallbacks(resetPassword.account, 'resetPassword');
    resetPassword.ctx = { params: { token: '123' } };

    //when
    resetPassword.submit(e);

    //then
    expect(resetPassword.account.resetPassword).to.have.been.calledWithExactly('123', 'password');
    expect(callbacks.successHandler).to.have.been.calledWith(resetPassword.onSuccess);
    expect(callbacks.errorHandler).to.have.been.calledWith(resetPassword.onError);

    done();
  });

});