describe('Registration', function () {
  var registration, $, errorHandler, router, account, form, formResult;

  beforeEach(function (done) {
    var Registration = app.getType('Registration');
    $ = {};
    errorHandler = {};
    router = {};
    account = {};

    registration = new Registration($, errorHandler, router, account);
    registration.tag = {
      root: {},
      update: sinon.spy()
    };

    form = {
      email: {value: 'some-email@gmail.com'},
      first: {value: 'jeremy'},
      last: {value: 'gaerke'},
      password: {value: 'password'},
      passwordConfirm: {value: 'password'},
      rememberMe: {checked: true}
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

  it('should set status  and call tag update on 400 series error', function (done) {
    //given
    var jqXHR = {status: 400};

    //when
    registration.onError(jqXHR);

    //then
    expect(registration.status).to.eq(400);
    expect(registration.tag.update).to.have.been.called;

    done();
  });

  it('should add form error and update tag on 409 series error', function (done) {
    //given
    var jqXHR = {status: 409};
    registration.form = {
      form: sinon.spy()
    };

    //when
    registration.onError(jqXHR);

    //then
    expect(registration.status).to.eq(409);
    expect(registration.form.form).to.have.been.calledWith('add errors', ['Email address taken.']);
    expect(registration.tag.update).to.have.been.called;

    done();
  });


  it('should delegate to error handler and exit on 500 series error', function (done) {
    //given
    var jqXHR = {status: 500};
    registration.errorHandler.handle = sinon.spy();

    //when
    registration.onError(jqXHR);

    //then
    expect(registration.errorHandler.handle).to.have.been.called;

    done();
  });

  it('should submit account info to server for registration and wire handlers accordingly', function (done) {
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
      create: sinon.spy(function () {
        return {
          done: onDone
        }
      })
    };
    registration.account = account;

    //when
    registration.submit(e);

    //then
    expect(account.onSuccess);
    expect(onFail).to.have.been.calledWith(registration.onError);

    done();
  });


});