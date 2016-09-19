import page from 'page';
import CreateAccountRoute from './CreateAccountRoute';
import IndexRoute from './IndexRoute';
import LoginRoute from './LoginRoute';

class Router {
  constructor(page = Router.page, routes = Router.routes) {
    this.activeView = null;
    this.page = page;
    this.routes = routes;
    this.onViewBound = this.onViewBound.bind(this);
    this.onRouteChange = this.onRouteChange.bind(this);
  }

  onViewBound(view) {
    this.activeView = view;
  }

  onRouteChange(route) {
    return (data)=> {
      if (this.activeView) {
        this.activeView.unbind();
      }
      route.handle(data, this.onViewBound)
    };
  }


  start() {
    if (this.started) {
      return;
    }
    this.page.base('/app');
    this.routes.forEach((route)=> {
      //console.log(route.handle);
      this.page(route.path, this.onRouteChange(route));
    });
    this.page.start();
    this.started = true;
  }
}
;

Router.page = page;
Router.routes = [
  new CreateAccountRoute(),
  new LoginRoute(),
  new IndexRoute()
];

export default Router;