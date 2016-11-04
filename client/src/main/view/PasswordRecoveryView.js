import View from './View';
import { Http } from '../middleware';

class PasswordRecoveryView extends View {
  constructor() {
    super('#viewport', '#password-recovery', '/partials/account/password-recovery.html');
    this.http = Http.instance;
    this.recover = this.recover.bind(this);
  }

  getModel() {
    return Promise.resolve({
      email: null,
      sent: false,
      serverErrors: {
        unexpectedError: false,
      }
    });
  }

  setup(template, model) {
    return super.setup(template, model).then((ractive)=> {
      this.$('#password-recovery-form').validator().on('submit', this.recover);
      return ractive;
    });
  }

  recover(e) {
    if (e.isDefaultPrevented()) {
      return;
    }
    e.preventDefault();


    this.ractive.set('serverErrors', {
      unexpectedError: false
    });

    const _ = this._;
    const requestBody = _.omit(this.model, ['serverErrors']);

    console.log('recover clicked', requestBody);

    return this.http.post('/api/accounts/password/recover', requestBody).then((response) => {
      console.log('success', response);
      this.ractive.set('sent', true);
    }).catch((response) => {
      console.log('error', response);
      this.ractive.set('serverErrors.unexpectedError', true);
    });
  }
}

export default PasswordRecoveryView;