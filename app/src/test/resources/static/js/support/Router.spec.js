describe('Router', function () {
  var Router, window, page, riot, appStub, componentLoader, router;

  beforeEach(function (done) {
    window = {};
    page = {};
    riot = {};
    appStub = {};
    componentLoader = {};
    Router = app.getType('Router');
    router = new Router(window, page, riot, appStub, componentLoader);
    done();
  });

  it('should handle route change', function (done) {
    //given
    var route, routeChangeCb, ctx, ctrl;
    route = {
      name: 'foo',
      path: '/foo',
      component: 'foo',
      viewport: '#foo',
      tag: 'foo'
    };
    ctx = {};
    ctrl = {};
    router.app.resolve = sinon.spy(function () {
      return ctrl;
    });
    router.componentLoader.mount = sinon.spy();

    //when
    routeChangeCb = router.onRouteChange(route);
    routeChangeCb(ctx);

    //then
    expect(router.app.resolve).to.have.been.calledWith('foo');
    expect(ctrl.ctx).to.eq(ctx);
    expect(router.componentLoader.mount).to.have.been.calledWith('#foo', 'foo', 'foo', ctrl);

    done();
  });

  it('should handle route registration', function (done) {
    //given
    var route;
    route = {
      component: 'foo',
      path: '/foo'
    };

    router.page = sinon.spy();
    router.onRouteChange = sinon.spy();

    //when
    router.onRegisterRoute(route);

    //then
    expect(router.routes['foo']).to.eq(route);
    expect(router.page).to.have.been.calledWith('/foo');
    expect(router.onRouteChange).to.have.been.calledWith(route);

    done();
  });

  it('should register routes', function (done) {
    //given
    var expectedSpy = sinon.spy();
    var routes = {
      forEach: sinon.spy(),
      sort: sinon.spy(function() {
        return {
          forEach: expectedSpy
        };
      })
    };

    //when
    router.register(routes);

    //then
    expect(expectedSpy).to.have.been.calledWith(router.onRegisterRoute);

    done();
  });

  it('should start routing', function (done) {
    //given
    router.page.base = sinon.spy();
    router.page.start = sinon.spy();

    //when
    router.start('/app');

    //then
    expect(router.page.base).to.have.been.calledWith('/app');
    expect(router.page.start).to.have.been.called;

    done();
  });

  it('should get path', function (done) {
    //given
    var route, params, path;
    route = {
      path: '/foo/:id'
    };
    params = {
      id: 'bar'
    };

    //when
    path = router.getPath(route, params);

    //then
    expect(path).to.eq('/foo/bar');

    done();
  });

  it('should change window location if suggested route is an absolute URL', function (done) {
    //given
    router.window = {
      location: {
        href: ''
      }
    };

    //when
    router.go('http://foo.com/bar');

    //then
    expect(router.window.location.href).to.eq('http://foo.com/bar');

    done();
  });

  it('should change window location if suggested route is a relative path', function (done) {
    //given
    router.window = {
      location: {
        href: ''
      }
    };

    //when
    router.go('/app/bar');

    //then
    expect(router.window.location.href).to.eq('/app/bar');

    done();
  });

  it('should throw error if route name not registered', function (done) {
    //then
    expect(router.go.bind(router, 'HOME')).to.throw("The route: 'HOME' is not registered");

    done();
  });

  it('should route to supplied name if registered', function (done) {
    //given
    var params = {};
    router.page.show = sinon.spy();
    router.getPath = sinon.spy();
    router.routes = {
      'HOME': {
        name: 'foo',
        path: '/foo/:id',
        component: 'foo',
        viewport: '#foo',
        tag: 'foo'
      }
    };

    //when
    router.go('HOME', params);

    //then
    expect(router.page.show).to.have.been.called;
    expect(router.getPath).to.have.been.calledWith(router.routes['HOME'], params);

    done();
  });

});