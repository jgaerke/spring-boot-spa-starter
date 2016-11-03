import View from './View';
import { toPromise } from '../util';
import { Session, Http, Broker, Router } from '../middleware';

class RegistrationView extends View {
  constructor() {
    super('#viewport', '/partials/account/registration.html');
    this.session = Session.instance;
    this.http = Http.instance;
    this.broker=  Broker.instance;
    this.router = Router.instance;
  }

  getModel() {
    return Promise.resolve({
      email: '',
      first: '',
      last: '',
      password: '',
      rememberMe: true,
      serverErrors: {
        emailTaken: false,
        accountInfoInvalid: false,
      }
    });
  }

  setup(template, model) {
    return super.setup(template, model).then((ractive)=> {
      this.$('#registration-form').validator().on('submit', (e)=> this.register(e));
      return ractive;
    });
  }

  register(e) {
    console.log('register clicked', this.model);
    if (e.isDefaultPrevented()) {
      return;
    }
    e.preventDefault();


    this.ractive.set('serverErrors', {
      emailTaken: false,
      accountInfoInvalid: false
    });

    return toPromise(this.http.post('/api/accounts', this.model)).then((response) => {
      console.log('success', response);
      this.broker.publish('user.authentication.change', { authenticated: true });
      this.router.navigate('/');
    }).catch((response) => {
      console.log('error', response);
      if(response.status == 409) {
        this.ractive.set('serverErrors.emailTaken', true);
      }
      if(response.status == 400) {
        this.ractive.set('serverErrors.accountInfoInvalid', true);
      }
    });
  }
}

export default RegistrationView;