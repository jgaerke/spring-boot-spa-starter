var app = (function () {
  var typeRegistry, instanceRegistry, app;

  typeRegistry = {};
  instanceRegistry = {};

  app = {

    components: [],

    routes: [],

    getType: function(name) {
      return typeRegistry[name];
    },

    value: function (name, value) {
      instanceRegistry[name] = value;
    },

    service: function (name, type, dependencies) {
      type.dependencies = dependencies || [];
      typeRegistry[name] = type;
    },

    component: function (name, type, dependencies, tag) {
      type.dependencies = dependencies || [];
      typeRegistry[name] = type;
      this.components.push(tag || name);
    },

    checkForCircularDependency: function (typeName, dependencyName) {
      var type = typeRegistry[dependencyName];
      if(!type) {
        return;
      }
      type.dependencies.forEach(function (dep) {
        if(dep == typeName) {
          throw new Error("Types '" + typeName + "' and '" + dep + "' have " +
          "a circular dependency on one another");
        }
      });
    },

    getDependencyInstances: function (typeName, type) {
      var self = this;
      return type.dependencies.map(function (dependencyName) {
        self.checkForCircularDependency(typeName, dependencyName);
        return self.resolve(dependencyName, typeName);
      });
    },

    resolve: function (name, forName) {
      if (instanceRegistry[name] !== undefined) {
        return instanceRegistry[name];
      }
      if (typeRegistry[name] === undefined) {
        throw new Error("Type: " + forName + " depends on unregistered dependency: " + name);
      }
      var dependencies = this.getDependencyInstances(name, typeRegistry[name]);
      dependencies.splice(0, 0, null);
      var instance = instanceRegistry[name] = new (Function.prototype.bind.apply(typeRegistry[name], dependencies));
      this.riot.observable(instance);
      return instance;
    },

    run: function(authenticated) {
      this.riot = riot;
      this.value('authenticated', authenticated);
      this.value('window', window);
      this.value('JSON', JSON);
      this.value('$', $);
      this.value('riot', riot);
      this.value('page', page);
      this.value('components', app.components);
      this.value('app', app);
      this.value('console', console);
      var router = app.resolve('Router');
      router.register(this.routes).start('/app');
    }
  };

  return app;
})();