var spyOnFuncAndCallbacks = function(obj, funcName, opts) {
  opts = opts || {};
  var success = opts.success || 'done';
  var error = opts.error || 'fail';

  var onErrorSpec = {};
  onErrorSpec[error] = sinon.spy();
  var onSuccessSpec = {};
  onSuccessSpec[success] = sinon.spy(function() {
    return onErrorSpec;
  });
  obj[funcName] = sinon.spy(function () {
    return onSuccessSpec;
  });
  var spec = {};
  spec.successHandler = onSuccessSpec[success];
  spec.errorHandler = onErrorSpec[error];
  return spec;
}

