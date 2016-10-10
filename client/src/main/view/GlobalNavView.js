import View from './View';
import { session } from '../middleware';

class GlobalNavView extends View {
  constructor() {
    super('#globalnav');
    this.session = session;
  }

  bind(route) {
    const globalNavLogin = this.$el.find('#global-nav-login');
    const globalNavLogout = this.$el.find('#global-nav-logout');
    const globalNavRegistration = this.$el.find('#global-nav-registration');

    if (!session.isAuthenticated()) {
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

    globalNavLogout.on('click', this.logout);

    switch(route.name) {
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