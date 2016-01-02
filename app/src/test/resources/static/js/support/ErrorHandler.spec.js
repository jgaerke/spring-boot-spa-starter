describe('ErrorHandler', function () {
  var ErrorHandler, $, errorHandler;

  beforeEach(function (done) {
    ErrorHandler = app.getType('ErrorHandler');
    $ = {};
    errorHandler = new ErrorHandler($);
    done();
  });

  it('should handle errors', function (done) {
    //given

    //when
    errorHandler.handle({ foo: 'bar' });

    //then

    done();
  });

});