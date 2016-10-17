import View from './View';
import { session } from '../middleware';

class GlobalNavView extends View {
  constructor() {
    super('#globalnav');
    this.session = session;
  }

  getRefs() {
    return {
      'globalNavLogin': '#global-nav-login',
      'globalNavLogout': '#global-nav-logout',
      'globalNavRegistration': '#global-nav-registration'
    };
  }

  getEvents() {
    return {
      'click #global-nav-registration': 'logout'
    }
  }

  onBind(route) {
    const globalNavLogin = this.globalNavLogin;
    const globalNavLogout = this.globalNavLogout;
    const globalNavRegistration = this.globalNavRegistration;

    if (!this.session.isAuthenticated()) {
      globalNavLogin.show();
      globalNavLogout.hide();
      globalNavRegistration.show();
    } else {
      globalNavLogin.hide();
      globalNavLogout.show();
      globalNavRegistration.hide();
    }

    globalNavLogin.removeClass('active');
    globalNavLogout.removeClass('active');
    globalNavRegistration.removeClass('active');


    switch (route.name) {
      case 'login':
        globalNavLogin.addClass('active');
        break;
      case 'registration':
        globalNavRegistration.addClass('active');
        break;
    }

    return Promise.resolve(this);
  }

  logout(e) {
    console.log('logout clicked');
  }

}

export default GlobalNavView;