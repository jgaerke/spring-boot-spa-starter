(function () {
  var Router = Module.extend({

    init: function (window, page, riot, app, componentLoader) {
      this.window = window;
      this.page = page;
      this.riot = riot;
      this.app = app;
      this.componentLoader = componentLoader;
      this.routes = {};
    },

    onRouteChange: function (route) {
      var self = this;
      return function (ctx) {
        var shortCircuited = false;

        if (route.authenticate && !self.app.resolve('authenticated')) {
          return self.page.redirect('/login');
        }

        route.interceptors = (route.interceptors || []).map(function (interceptor) {
          return self.app.resolve(interceptor);
        });

        route.interceptors.forEach(function (interceptor) {
          if (!shortCircuited && interceptor.preHandle) {
            shortCircuited = !interceptor.preHandle.call(this, route, self.page);
          }
        });

        if (shortCircuited) {
          return;
        }

        var ctrl = {};
        if (route.component) {
          ctrl = self.app.resolve(route.component);
        }
        ctrl.ctx = ctx;
        self.componentLoader.mount(route.viewport || '#viewport', route.component || route.templateName, route.tag, ctrl);

        route.interceptors.forEach(function (interceptor) {
          if (!shortCircuited && interceptor.postHandle) {
            shortCircuited = !interceptor.postHandle.call(this, route, self.page);
          }
        });
      }
    },

    onRegisterRoute: function (route) {
      this.routes[route.component || route.templateName] = route;
      this.page(route.path, this.onRouteChange(route));
    },

    register: function (routes) {
      var sorted = routes.sort(function(a, b){
        a.index = a.index || 0;
        b.index = b.index || 0;
        if (a.index > b.index) {
          return 1;
        }
        if (a.index < b.index) {
          return -1;
        }
      });
      sorted.forEach(this.onRegisterRoute);
      return this;
    },

    start: function (base) {
      //this.history.redirect(null, base);
      this.page.base(base);
      this.page.start();
    },

    getPath: function (route, params) {
      var path = route.path;
      params = params || {};
      for (var key in params) {
        if (params.hasOwnProperty(key)) {
          path = route.path.replace(':' + key, params[key])
        }
      }
      return path;
    },

    go: function (name, params) {
      if (name.indexOf('http') == 0 || name.indexOf('/') == 0) {
        return this.window.location.href = name;
      }
      if (!this.routes[name]) {
        throw new Error("The route: '" + name + "' is not registered");
      }
      this.page.show(this.getPath(this.routes[name], params));
    }

  });


  app.service(
      'Router',
      Router,
      [
        'window',
        'page',
        'riot',
        'app',
        'ComponentLoader'
      ]
  );

})();