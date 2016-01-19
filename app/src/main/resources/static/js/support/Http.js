(function () {
  var Http = Class.extend({
    init: function ($) {
      this.$ = $;

      //this.dispatch = this.dispatch.bind(this);
      //this.get = this.get.bind(this);
      //this.post = this.post.bind(this);
      //this.put = this.put.bind(this);
      //this.patch = this.patch.bind(this);
      //this.delete = this.delete.bind(this);
    },

    dispatch: function (options) {
      if(options.contentType === undefined) {
        options.contentType = false;
      }
      if(options.data && this.$.isPlainObject(options.data)) {
        options.data = JSON.stringify(options.data);
      }
      options.headers = this.$.extend({
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-XSRF-TOKEN': this.$.cookie('XSRF-TOKEN')
      }, options.headers);
      return this.$.ajax(options);
    },

    get: function (url, headers) {
      return this.dispatch({
        url: url,
        type: 'GET',
        dataType: 'json',
        headers: headers
      });
    },

    post: function (url, data, headers) {
      return this.dispatch({
        url: url,
        type: 'POST',
        data: data,
        headers: headers
      });
    },

    put: function (url, data, headers) {
      return this.dispatch({
        url: url,
        type: 'PUT',
        data: data,
        headers: headers
      });
    },

    patch: function (url, data, headers) {
      return this.dispatch({
        url: url,
        type: 'PATCH',
        data: data,
        headers: headers
      });
    },

    delete: function (url, headers) {
      return this.dispatch({
        url: url,
        type: 'DELETE',
        headers: headers
      });
    }
  });


  app.service(
      'Http',
      Http,
      [
        '$'
      ]
  );

})();