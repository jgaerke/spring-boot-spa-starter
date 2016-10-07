import Route from './Route';
import { CompositeView, GlobalNavView, RegistrationView, IndexView, LoginView } from '../view';

class Router {
  constructor() {
    this.activeView = null;
    this.page = page;

    this.routes = [
      new Route('index', '/', new CompositeView(new GlobalNavView(), new IndexView())),
      new Route('login', '/login', new CompositeView(new GlobalNavView(), new LoginView())),
      new Route('registration', '/register', new CompositeView(new GlobalNavView(), new RegistrationView()))
    ];

    this.onViewBound = this.onViewBound.bind(this);
    this.onRouteChange = this.onRouteChange.bind(this);
  }

  onViewBound(view) {
    this.activeView = view;
  }

  onRouteChange(route) {
    return (routeState)=> {
      if (this.activeView) {
        this.activeView.unbind();
      }
      route.handle(routeState).then(this.onViewBound);
    };
  }


  start() {
    if (this.started) {
      return;
    }
    this.page.base('/app');
    this.routes.forEach((route)=> {
      this.page(route.getPath(), this.onRouteChange(route));
    });
    this.page.start();
    this.started = true;
  }
}

export default Router;