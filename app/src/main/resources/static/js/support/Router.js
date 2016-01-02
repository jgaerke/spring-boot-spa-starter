(function () {
  var Router = Module.extend({

    init: function (window, page, riot, app, componentLoader) {
      this.window = window;
      this.page = page;
      this.riot = riot;
      this.app = app;
      this.componentLoader = componentLoader;
      this.routes = {};

      this.onRouteChange = this.onRouteChange.bind(this);
      this.onRegisterRoute = this.onRegisterRoute.bind(this);
      this.register = this.register.bind(this);
      this.start = this.start.bind(this);
      this.getPath = this.getPath.bind(this);
      this.go = this.go.bind(this);
    },

    onRouteChange: function (route) {
      var self = this;
      return function (ctx) {
        var shortCircuited = false;

        if (route.authenticate && !self.app.resolve('authenticated')) {
          return self.page.redirect('/login');
        }

        route.interceptors = (route.interceptors || []).map(function(interceptor) {
          return self.app.resolve(interceptor);
        });

        route.interceptors.forEach(function(interceptor) {
          if(!shortCircuited && interceptor.preHandle) {
            shortCircuited = !interceptor.preHandle.call(this, route, self.page);
          }
        });

        if(shortCircuited) {
          return;
        }

        var ctrl = self.app.resolve(route.component);
        ctrl.ctx = ctx;
        self.componentLoader.mount(route.viewport || '#viewport', route.tag, ctrl);

        route.interceptors.forEach(function(interceptor) {
          if(!shortCircuited && interceptor.postHandle) {
            shortCircuited = !interceptor.postHandle.call(this, route, self.page);
          }
        });
      }
    },

    onRegisterRoute: function (route) {
      this.routes[route.name] = route;
      this.page(route.path, this.onRouteChange(route));
    },

    register: function (routes) {
      routes.forEach(this.onRegisterRoute);
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