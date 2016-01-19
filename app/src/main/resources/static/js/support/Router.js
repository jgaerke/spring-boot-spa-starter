(function () {
  var Router = Class.extend({

    init: function (window, page, riot, app, componentLoader, $) {
      this.window = window;
      this.page = page;
      this.riot = riot;
      this.app = app;
      this.current = null;
      this.componentLoader = componentLoader;
      this.$ = $;
      this.routes = {};
    },

    onRouteChange: function (route) {
      var self = this;
      return function (ctx) {
        var shortCircuited = false;

        self.current = ctx;

        if (route.authenticate && !self.app.resolve('authenticated')) {
          return self.page.redirect('/login');
        }

        route.interceptors = (route.interceptors || []).map(function (interceptor) {
          return self.app.resolve(interceptor);
        });

        route.interceptors.forEach(function (interceptor) {
          if (!shortCircuited && interceptor.preHandle) {
            shortCircuited = !interceptor.preHandle.call(self, route, self.page);
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
        var viewport = route.viewport || '#viewport';
        self.componentLoader.mount(viewport, route.templateName || route.component, route.tag, ctrl, function() {
          self.window.scrollTo(0, 0);
        });

        route.interceptors.forEach(function (interceptor) {
          if (!shortCircuited && interceptor.postHandle) {
            shortCircuited = !interceptor.postHandle.call(self, route, self.page);
          }
        });
      }
    },

    onRegisterRoute: function (route) {
      this.routes[route.name || route.templateName || route.component] = route;
      this.page(route.path, this.onRouteChange(route));
    },

    register: function (routes) {
      var sorted = routes.sort(function (a, b) {
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
      this.base = base || '/';
      this.page.base(base);
      this.page.start();
    },

    isCurrent: function (name) {
      if (!this.routes[name]) {
        throw new Error("The route: '" + name + "' is not registered");
      }
      return this.current.path.toLowerCase() == this.getPath(this.routes[name]).toLowerCase();
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

    go: function (name, params, reload) {
      if (name.indexOf('http') == 0 || name.indexOf('/') == 0) {
        return this.window.location.href = name;
      }
      if (reload) {
        return this.window.location.href = this.base + this.routes[name].path;
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
        'ComponentLoader',
        '$'
      ]
  );

})();