import View from './View';
import { toPromise } from '../util';
import { Session, Http, Broker, Router } from '../middleware';

class LoginView extends View {
  constructor() {
    super('#viewport', '/partials/account/login.html');
    this.session = Session.instance;
    this.http = Http.instance;
    this.broker = Broker.instance;
    this.router = Router.instance;
    this.login = this.login.bind(this);
  }

  getModel() {
    return Promise.resolve({
      email: '',
      password: '',
      rememberMe: true,
      serverErrors: {
        loginInfoInvalid: false,
      }
    });
  }

  setup(template, model) {
    return super.setup(template, model).then((ractive)=> {
      this.$('#login-form').validator().on('submit', this.login);
      return ractive;
    });
  }

  getEncodedCredentials(credentials) {
    const str = [];
    for (var p in credentials)
      str.push(encodeURIComponent(p) + "=" + encodeURIComponent(credentials[p]));
    return str.join("&");
  }

  login(e) {
    console.log('login clicked', this.model);
    if (e.isDefaultPrevented()) {
      return;
    }
    e.preventDefault();


    this.ractive.set('serverErrors', {
      loginInfoInvalid: false
    });

    return toPromise(this.http.post(
        '/api/accounts/login',
        this.getEncodedCredentials(this.model),
        {'Content-Type': 'application/x-www-form-urlencoded'}
    )).then((response) => {
      console.log('success', response);
      this.broker.publish('user.authentication.change', {authenticated: true});
      this.router.navigate('/');
    }).catch((response) => {
      console.log('error', response);
      if (response.status == 400) {
        this.ractive.set('serverErrors.loginInfoInvalid', true);
      }
      if (response.status == 401) {
        this.ractive.set('serverErrors.credentialsInvalid', true);
      }
    });
  }
}

export default LoginView;