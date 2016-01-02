describe('Http', function () {
  var Http, http;

  beforeEach(function (done) {
    Http = app.getType('Http');
    http = new Http(jQuery);
    done();
  });

  it('should dispatch requests', function (done) {
    //given
    http.$.cookie = sinon.spy();
    http.$.ajax = sinon.spy();

    //when
    http.dispatch({
      contentType: false,
      data: {
        foo: 'bar'
      }
    });

    //then
    expect(http.$.ajax).to.have.been.calledWith({
      contentType: false,
      data: '{"foo":"bar"}',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-XSRF-TOKEN': undefined
      }
    });

    done();
  });

  it('should perform GET', function (done) {
    //given
    http.dispatch = sinon.spy();

    //when
    http.get('/api/foo', {
      header1: 'value1'
    });

    //then
    expect(http.dispatch).to.have.been.calledWith({
      url: '/api/foo',
      type: 'GET',
      dataType: 'json',
      headers: {
        header1: 'value1'
      }
    });

    done();
  });

  it('should perform POST', function (done) {
    //given
    http.dispatch = sinon.spy();

    //when
    http.post('/api/foo', {
          foo: "bar"
        },
        {
          header1: 'value1'
        }
    );

    //then
    expect(http.dispatch).to.have.been.calledWith({
      url: '/api/foo',
      type: 'POST',
      data: {
        foo: "bar"
      },
      headers: {
        header1: "value1"
      }
    });

    done();
  });

  it('should perform PUT', function (done) {
    //given
    http.dispatch = sinon.spy();

    //when
    http.put('/api/foo', {
          foo: "bar"
        },
        {
          header1: 'value1'
        }
    );

    //then
    expect(http.dispatch).to.have.been.calledWith({
      url: '/api/foo',
      type: 'PUT',
      data: {
        foo: "bar"
      },
      headers: {
        header1: "value1"
      }
    });

    done();
  });



  it('should perform PATCH', function (done) {
    //given
    http.dispatch = sinon.spy();

    //when
    http.patch('/api/foo', {
          foo: "bar"
        },
        {
          header1: 'value1'
        }
    );

    //then
    expect(http.dispatch).to.have.been.calledWith({
      url: '/api/foo',
      type: 'PATCH',
      data: {
        foo: "bar"
      },
      headers: {
        header1: "value1"
      }
    });

    done();
  });

  it('should perform DELETE', function (done) {
    //given
    http.dispatch = sinon.spy();

    //when
    http.delete('/api/foo',
        {
          header1: 'value1'
        }
    );

    //then
    expect(http.dispatch).to.have.been.calledWith({
      url: '/api/foo',
      type: 'DELETE',
      headers: {
        header1: "value1"
      }
    });

    done();
  });

});