describe('ComponentLoader', function () {
  var ComponentLoader, $, riot, appStub, http, componentLoader;

  beforeEach(function (done) {
    ComponentLoader = app.getType('ComponentLoader');
    $ = {};
    riot = {};
    appStub = {};
    http = {};
    componentLoader = new ComponentLoader($, riot, appStub, http);
    done();
  });

  it('should parse component references', function (done) {
    //given
    var results;

    componentLoader.app.components = ['compA', 'compB'];

    //when
    results = componentLoader.parseComponentReferences('compA', '<compA><compB></compB></compA>');

    //then
    expect(results.length).to.eq(1);

    done();
  });

  it('should handle fetch success', function (done) {
    //given
    var cb, onSuccessCb, matches;
    cb = sinon.spy();
    matches = [];
    componentLoader.compile = sinon.spy();

    //when
    onSuccessCb = componentLoader.onFetchSuccess(cb);
    onSuccessCb(matches);

    //then
    expect(componentLoader.compile).to.have.been.calledWith(matches);
    expect(cb).to.have.been.calledWith(matches);

    done();
  });

  it('should execute callback if fetch called with falsy components param', function (done) {
    //given
    var cb = sinon.spy();

    //when
    componentLoader.fetch(null, cb);

    //then
    expect(cb).to.have.been.called;

    done();
  });

  it('should initialize array of components if non-array provided to fetch', function (done) {
    //given
    var cb, doneSpy;

    cb = sinon.spy();
    doneSpy = sinon.spy();
    componentLoader.$ = jQuery;
    componentLoader.http.get = sinon.spy(function () {
      return {
        done: doneSpy
      };
    });

    //when
    componentLoader.fetch('compA', cb);

    //then
    expect(componentLoader.http.get).to.have.been.calledWith('/components/content?names=compA');
    expect(doneSpy).to.have.been.called;

    done();
  });

  it('should fetch components', function (done) {
    //given
    var cb, doneSpy;

    cb = sinon.spy();
    doneSpy = sinon.spy();
    componentLoader.$ = jQuery;
    componentLoader.http.get = sinon.spy(function () {
      return {
        done: doneSpy
      };
    });

    //when
    componentLoader.fetch(['compA', 'compB'], cb);

    //then
    expect(componentLoader.http.get).to.have.been.calledWith('/components/content?names=compA,compB');
    expect(doneSpy).to.have.been.called;

    done();
  });


  it('should filter out previously compiled components before fetching components', function (done) {
    //given
    var cb, doneSpy;

    cb = sinon.spy();
    doneSpy = sinon.spy();
    componentLoader.$ = jQuery;
    componentLoader.http.get = sinon.spy(function () {
      return {
        done: doneSpy
      };
    });
    componentLoader.compiled['compA'] = true;

    //when
    componentLoader.fetch(['compA', 'compB'], cb);

    //then
    expect(componentLoader.http.get).to.have.been.calledWith('/components/content?names=compB');
    expect(doneSpy).to.have.been.called;

    done();
  });

  it('should compile', function (done) {
    //given
    var content, components;
    content = '<compA><p>hello</p></compA>';
    components = [{
      name: 'compA',
      content: content
    }];
    componentLoader.riot.compile = sinon.spy();

    //when
    componentLoader.compile(components);

    //then
    expect(componentLoader.riot.compile).to.have.been.calledWith(content);
    expect(componentLoader.compiled['compA']).to.be.true;

    done();
  });

  it('should not compile previously compiled components', function (done) {
    //given
    var content, components;
    content = '<compA><p>hello</p></compA>';
    components = [{
      name: 'compA',
      content: content
    }];
    componentLoader.compiled['compA'] = true;
    componentLoader.riot.compile = sinon.spy();

    //when
    componentLoader.compile(components);

    //then
    expect(componentLoader.riot.compile).to.not.have.been.called;

    done();
  });

  it('should handle load completion', function (done) {
    //given
    var cb, onCompleteCb, content, components;
    cb = sinon.spy();
    content = '<compA><p>hello</p></compA>';
    components = [{
      name: 'compA',
      content: content
    }];
    componentLoader.parseComponentReferences = sinon.spy();
    componentLoader.fetch = sinon.spy();

    //when
    onCompleteCb = componentLoader.onLoadComplete('compA', cb);
    onCompleteCb(components);

    //then
    expect(cb).to.not.have.been.called;
    expect(componentLoader.parseComponentReferences).to.have.been.called;
    expect(componentLoader.fetch).to.have.been.called;

    done();
  });

  it('should exit load completion if component array empty', function (done) {
    //given
    var cb, onCompleteCb;
    cb = sinon.spy();
    components = []

    //when
    onCompleteCb = componentLoader.onLoadComplete('compA', cb);
    onCompleteCb(components);

    //then
    expect(cb).to.have.been.called;

    done();
  });

  it('should load component', function (done) {
    //given
    var cb = sinon.spy();
    componentLoader.onLoadComplete = sinon.spy();
    componentLoader.fetch = sinon.spy();

    //when
    componentLoader.load('compA', cb);

    //then
    expect(componentLoader.fetch).to.have.been.called;
    expect(componentLoader.onLoadComplete).to.have.been.called;

    done();
  });

  it('should unmount previous component', function (done) {
    //given
    componentLoader.mounted = [
      {
        unmount: sinon.spy()
      }
    ]

    //when
    componentLoader.unmountPrevious();

    //then
    expect(componentLoader.mounted[0].unmount).to.have.been.called;

    done();
  });

  it('should handle mount completion', function (done) {
    //given
    var ctx, cb, onMountLoadedCb, htmlSpy;
    ctx = {
      onMounted: sinon.spy()
    };
    cb = sinon.spy();
    componentLoader.unmountPrevious = sinon.spy();
    componentLoader.riot.mount = sinon.spy();
    htmlSpy = sinon.spy();
    componentLoader.$ = sinon.spy(function() {
      return {
        html: htmlSpy
      }
    });

    //when
    onMountLoadedCb = componentLoader.onMountComplete('#viewport', 'component', ctx, cb);
    onMountLoadedCb();

    //then
    expect(componentLoader.unmountPrevious).to.have.been.called;
    expect(componentLoader.$).to.have.been.calledWith('#viewport');
    expect(htmlSpy).to.have.been.calledWith('<component></component>');
    expect(componentLoader.riot.mount).to.have.been.calledWith('component', ctx);

    done();
  });

  it('should mount component', function (done) {
    //given
    var ctx, cb;
    ctx = {};
    cb = sinon.spy();
    componentLoader.load = sinon.spy();
    componentLoader.onMountComplete = sinon.spy();

    //when
    componentLoader.mount('#viewport', 'compA', ctx, cb);

    //then
    expect(componentLoader.load).to.have.been.calledWith('compa');
    expect(componentLoader.onMountComplete).to.have.been.calledWith('#viewport', 'compa', ctx, cb);

    done();
  });
});