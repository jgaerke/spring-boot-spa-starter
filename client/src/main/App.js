import './style/Index.css';
import { Router, Route, Session } from './middleware';
import { CompositeView, GlobalNavView, RegistrationView, IndexView, LoginView } from './view';
import bootStrapValidator from 'bootstrap-validator';

const routes = [
  new Route('index', '/', new CompositeView(new GlobalNavView(), new IndexView())),
  new Route('login', '/login', new CompositeView(new GlobalNavView(), new LoginView())),
  new Route('registration', '/register', new CompositeView(new GlobalNavView(), new RegistrationView()))
];

class App {
  constructor(authenticated) {
    this.authenticated = authenticated;
    this.started = false;
    this.routes = routes;
    this.router = Router.instance;
    this.session = Session.instance;
  }

  start() {
    if(this.started) {
      return false;
    }
    this.session.set('authenticated', this.authenticated);
    this.router.start(this.routes);
    this.started = true;
  }
};

window.App = App;

export default App;
