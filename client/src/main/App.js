import './style/Index.css';
import { Router, Route, Session } from './middleware';
import {
    CompositeView,
    GlobalNavView,
    RegistrationView,
    IndexView,
    LoginView,
    AccountNavView,
    ProfileView,
    BillingView,
    PasswordRecoveryView
} from './view';
import bootStrapValidator from 'bootstrap-validator';

const routes = [
  new Route('login', '/login', new CompositeView(new GlobalNavView(), new LoginView())),
  new Route('registration', '/register', new CompositeView(new GlobalNavView(), new RegistrationView())),
  new Route('profile', '/account/profile', new CompositeView(new GlobalNavView(), new AccountNavView(), new ProfileView())),
  new Route('billing', '/account/billing', new CompositeView(new GlobalNavView(), new AccountNavView(), new BillingView())),
  new Route('password-recovery', '/account/password/recovery', new CompositeView(new GlobalNavView(), new PasswordRecoveryView()),
  new Route('index', '*', new CompositeView(new GlobalNavView(), new IndexView())))
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
    if (this.started) {
      return false;
    }
    this.session.set('authenticated', this.authenticated);
    this.router.start(this.routes);
    this.started = true;
  }
}
;

window.App = App;

export default App;
