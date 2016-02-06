describe('ErrorHandler', function () {
  var ErrorHandler, errorHandler;

  beforeEach(function (done) {
    ErrorHandler = app.getType('ErrorHandler');
    errorHandler = new ErrorHandler();
    done();
  });

  it('should handle error by binding to form', function (done) {
    //given
    var form = {errors: sinon.spy()};
    var status = 400;
    var errors = {
      400: {form: form, text: 'some error text'}
    };

    //when
    errorHandler.handle(status, errors);

    //then
    expect(form.errors).to.have.been.calledWith(['some error text']);
    done();
  });

  it('should not handle error if status not in supplied responses', function (done) {
    //given
    var form = { form: sinon.spy() };
    var status = 401;
    var errors = {
      400: {form: form, text: 'some error text'}
    };

    //when
    errorHandler.handle(status, errors);

    //then
    expect(form.form).not.to.have.been.called;

    done();
  });

  it('should handle error by responding with error confirmation', function (done) {
    //given
    var status = 400;
    var errors = {
      400: {route: 'foo'}
    };
    errorHandler.router = { go: sinon.spy() };

    //when
    errorHandler.handle(status, errors);

    //then
    expect(errorHandler.router.go).to.have.been.calledWith('foo');
    done();
  });

});