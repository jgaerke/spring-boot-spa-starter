describe('Container', function () {
  var Container, container, errorHandler, account, router;

  beforeEach(function (done) {
    Container = app.getType('Container');
    errorHandler = {};
    account = {};
    router = {};
    container = new Container(errorHandler, account, router);
    done();
  });

  it('should logout', function(done) {
    //given
    var failSpy, doneSpy;
    failSpy = sinon.spy()
    doneSpy = sinon.spy(function() {
      return {
        fail: failSpy
      }
    });
    account.logout = sinon.spy(function() {
      return {
        done: doneSpy
      };
    });

    //when
    container.logout();

    //then
    expect(doneSpy).to.have.been.calledWith(container.onLogoutSuccess);
    expect(failSpy).to.have.been.calledWith(container.onLogoutFailure);

    done();
  });

  it('should handle logout success', function(done) {
    //given
    container.router.go = sinon.spy();

    //when
    container.onLogoutSuccess();

    //then
    expect(container.router.go).to.have.been.calledWith('/app');

    done();
  });

  it('should delegate to error handler and exit on 400 series errors', function(done) {
    //given
    var jqXHR = { status: 400 };
    container.errorHandler.handle = sinon.spy();

    //when
    container.onLogoutFailure(jqXHR);

    //then
    expect(container.errorHandler.handle).to.have.been.called;

    done();
  });

  it('should delegate to error handler and exit on 500 series errors', function(done) {
    //given
    var jqXHR = { status: 500 };
    container.errorHandler.handle = sinon.spy();

    //when
    container.onLogoutFailure(jqXHR);

    //then
    expect(container.errorHandler.handle).to.have.been.called;

    done();
  });
});