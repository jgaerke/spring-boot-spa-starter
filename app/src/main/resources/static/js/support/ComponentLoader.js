(function () {
  var ComponentLoader = Class.extend({

    init: function ($, riot, app, http) {
      this.$ = $;
      this.riot = riot;
      this.app = app;
      this.http = http;
      this.compiled = {};
      this.mounted = [];
    },

    parseComponentReferences: function (parentComponent, content) {
      var references = [];
      content = content.toLowerCase();
      this.app.components.forEach(function (component) {
        if (component != parentComponent && content.indexOf('<' + component.toLowerCase()) > -1) {
          references.push(component);
        }
      });
      return references;
    },

    onFetchSuccess: function (cb) {
      var self = this;
      return function (matches) {
        self.compile(matches);
        cb(matches);
      }
    },

    fetch: function (components, cb) {
      var self = this;

      if (!components) {
        return cb([]);
      }

      if (!self.$.isArray(components)) {
        components = [components];
      }

      //remove already compiled components.
      components = components.filter(function (component) {
        return !self.compiled[component];
      });

      if (!components.length) {
        return cb([]);
      }
      return self.http.get('/components/content?names=' + components.join()).done(this.onFetchSuccess(cb));
    },

    compile: function (components) {
      var self = this;
      components.forEach(function (component) {
        if (self.compiled[component.name]) return;
        self.riot.compile(component.content);
        self.compiled[component.name] = true;
      });
    },

    onLoadComplete: function (component, cb) {
      var self = this;
      return function (components) {
        if (!components.length) {
          return cb();
        }
        var componentReferences = self.parseComponentReferences(component, components[0].content);
        self.fetch(componentReferences, cb);
      };
    },

    load: function (component, cb) {
      this.fetch(component, this.onLoadComplete(component, cb));
    },

    unmountPrevious: function () {
      this.mounted.forEach(function (tag) {
        tag.unmount();
      });
    },

    onMountComplete: function (viewport, component, tag, ctrl, cb) {
      var self = this;
      return function () {
        self.unmountPrevious();
        self.$(viewport).html('<' + tag + '></' + tag + '>');
        self.mounted = self.riot.mount(tag, ctrl);
        if (cb) {
          cb();
        }
      }
    },

    mount: function (viewport, component, tag, ctrl, cb) {
      component = component.toLowerCase();
      this.load(component, this.onMountComplete(viewport, component, tag, ctrl ,cb));
    }
  });

  app.service(
      'ComponentLoader',
      ComponentLoader,
      [
        '$',
        'riot',
        'app',
        'Http'
      ]
  );
})();