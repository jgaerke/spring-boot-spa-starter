describe('RecoverPassword', function () {
  var recoverPassword, $, errorHandler, router, account, form, formResult;

  beforeEach(function (done) {
    var RecoverPassword = app.getType('RecoverPassword');
    $ = {};
    errorHandler = { handle: sinon.spy() };
    router = {};
    account = {};
    recoverPassword = new RecoverPassword($, errorHandler, router, account);
    recoverPassword.tag = {
      root: {},
      update: sinon.spy()
    };
    form = {
      email: {value: 'some-email@gmail.com'}
    };
    formResult = {
      email: 'some-email@gmail.com'
    };

    done();
  });

  it('should wire up a validation upon mount', function(done) {
    //given
    var formSpy = sinon.spy();
    recoverPassword.$ = sinon.spy(function() {
      return {
        form: formSpy
      }
    });
    var tag = { root: {} };

    //when
    recoverPassword.onMount(tag);

    //then
    expect(recoverPassword.$).to.have.been.calledWith('form', tag.root);
    expect(formSpy).to.have.been.called;

    done();
  });


  it('should get email input from form and return as object', function (done) {
    //when
    var data = recoverPassword.getInputs(form);

    //then
    expect(data).to.eql(formResult);

    done();
  });

  it('should route to PasswordResetInstructionsSent on success', function (done) {
    //given
    recoverPassword.router = {
      go: sinon.spy()
    };

    //when
    recoverPassword.onSuccess();

    //then
    expect(recoverPassword.router.go).to.have.been.calledWith('PasswordResetInstructionsSent');

    done();
  });

  it('should handle error', function (done) {
    //given
    var jqXHR = {status: 400};
    recoverPassword.errorHandler.handle = sinon.spy();

    //when
    recoverPassword.onError(jqXHR, "textStatus", {});

    //then
    expect(recoverPassword.errorHandler.handle).to.have.been.called;
    expect(recoverPassword.tag.update).to.have.been.called;

    done();
  });

  it('should short circuit submit to server if input is in invalid state', function(done) {
    //given
    var e;
    e = { target: form, result: false };
    recoverPassword.account.recoverPassword = sinon.spy();

    //when
    recoverPassword.submit(e);

    //then
    expect(recoverPassword.account.recoverPassword).to.not.have.been.called;

    done();
  });

  it('should submit credentials to server for recoverPassword and wire handlers accordingly', function (done) {
    //given
    var e, account, callbacks;
    e = { target: form, result: true };
    callbacks = spyOnFuncAndCallbacks(recoverPassword.account, 'recoverPassword');

    //when
    recoverPassword.submit(e);

    //then
    expect(recoverPassword.account.recoverPassword).to.have.been.calledWithExactly(formResult.email);
    expect(callbacks.successHandler).to.have.been.calledWith(recoverPassword.onSuccess);
    expect(callbacks.errorHandler).to.have.been.calledWith(recoverPassword.onError);

    done();
  });

});