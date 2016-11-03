let singleton = Symbol();
let singletonEnforcer = Symbol();

class Router {
  constructor(enforcer) {
    if (enforcer !== singletonEnforcer) {
      throw "Cannot construct singleton"
    }
    this.activeView = null;
    this.page = page;
    this.$ = $;

    this.onViewRendered = this.onViewRendered.bind(this);
    this.onRouteChange = this.onRouteChange.bind(this);
  }

  onViewRendered(view) {
    this.activeView = view;
    //this.$(document.body).removeClass('cloak');
  }

  onRouteChange(route) {
    return (routeState)=> {
      this.$(document.body).addClass('cloak');
      if (this.activeView) {
        this.activeView.teardown();
      }
      route.handle(routeState).then(this.onViewRendered);
    };
  }

  navigate(path) {
    this.page(path);
  }

  start(routes) {
    if (this.started) {
      return;
    }

    this.page.base('/app');
    routes.forEach((route)=> {
      this.page(route.getPath(), this.onRouteChange(route));
    });
    this.page.start();
    this.started = true;
  }

  static get instance() {
    if (!this[singleton]) {
      this[singleton] = new Router(singletonEnforcer);
    }
    return this[singleton];
  }
}

export default Router;