describe('Container', function () {
  var Container, container, account, router, $, tag, dropDownSpy;

  beforeEach(function (done) {
    Container = app.getType('Container');
    account = {};
    router = {};
    dropDownSpy = sinon.spy();
    $ = sinon.spy(function() {
      return { dropdown: dropDownSpy };
    });
    tag = { root: {} };
    container = new Container(account, router, $);
    done();
  });

  it('should wire ui dropdown on mount', function(done) {
    //when
    container.onMount(tag);

    //then
    expect(container.$).to.have.been.calledWith('.ui.dropdown', tag.root);
    expect(dropDownSpy).to.have.been.called;

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
    expect(container.router.go).to.have.been.calledWith('Login');

    done();
  });

  it('should handle error', function(done) {
    //given
    var jqXHR = { status: 400 };
    container.router.go = sinon.spy();

    //when
    container.onLogoutFailure(jqXHR);

    //then
    expect(container.router.go).to.have.been.calledWith('LogoutError');

    done();
  });

});