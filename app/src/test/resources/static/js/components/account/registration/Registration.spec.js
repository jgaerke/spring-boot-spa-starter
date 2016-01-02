describe('Registration', function () {
  var registration, $, errorHandler, router, account, form, formResult;

  beforeEach(function (done) {
    var Registration = app.getType('Registration');
    $ = {};
    errorHandler = { handle: sinon.spy() };
    router = {};
    account = {};

    registration = new Registration($, errorHandler, router, account);
    registration.tag = {
      root: {},
      update: sinon.spy()
    };

    form = {
      email: {value: 'some-email@gmail.com'},
      password: {value: 'password'},
      passwordConfirm: {value: 'password'}
      //rememberMe: {checked: true}
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
    registration.$ = sinon.spy(function() {
      return {
        form: formSpy
      }
    });
    var tag = { root: {} };

    //when
    registration.onMount(tag);

    //then
    expect(registration.$).to.have.been.calledWith('form', tag.root);
    expect(formSpy).to.have.been.called;

    done();
  });


  it('should get account inputs from form and return as object', function (done) {
    //when
    var data = registration.getInputs(form);

    //then
    expect(data).to.eql(formResult);

    done();
  });

  it('should route to /app on success', function (done) {
    //given
    registration.router = {
      go: sinon.spy()
    };

    //when
    registration.onSuccess();

    //then
    expect(registration.router.go).to.have.been.calledWith('/app');

    done();
  });

  it('should handle error', function (done) {
    //given
    var jqXHR = {status: 400};

    //when
    registration.onError(jqXHR);

    //then
    expect(registration.errorHandler.handle).to.have.been.called;
    expect(registration.tag.update).to.have.been.called;

    done();
  });

  it('should short circuit submit to server if input is in invalid state', function(done) {
    //given
    var e;
    e = { target: form, result: false };
    registration.account.create = sinon.spy();

    //when
    registration.submit(e);

    //then
    expect(registration.account.create).to.not.have.been.called;

    done();
  });

  it('should submit account info to server for registration and wire handlers accordingly', function (done) {
    //given
    var e, callbacks;
    e = { target: form, result: true };
    callbacks = spyOnFuncAndCallbacks(registration.account, 'create');

    //when
    registration.submit(e);

    //then
    expect(registration.account.create).to.have.been.calledWithExactly(formResult);
    expect(callbacks.successHandler).to.have.been.calledWith(registration.onSuccess);
    expect(callbacks.errorHandler).to.have.been.calledWith(registration.onError);

    done();
  });


});