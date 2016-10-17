import View from './View';
import { session } from '../middleware';

class GlobalNavView extends View {
  constructor() {
    super('#globalnav');
    this.session = session;
  }

  getRefs() {
    return {
      'isAuthenticated': {
        expression: 'this.session.isAuthenticated()'
      },
      'globalNavLogin': {
        'selector': '#global-nav-login',
        'show': '!this.isAuthenticated',
        'hide': 'this.isAuthenticated',
        'css': {
          'active': 'this.route.name == "login"'
        }
      },
      'globalNavLogout': {
        'selector': '#global-nav-logout',
        'show': 'this.isAuthenticated',
        'hide': '!this.isAuthenticated',
        'events': {
          'click': 'logout'
        },
      },
      'globalNavRegistration': {
        'selector': '#global-nav-registration',
        'show': '!this.isAuthenticated',
        'hide': 'this.isAuthenticated',
        'css': {
          'active': 'this.route.name == "registration"'
        }
      }
    };
  }

  logout(e) {
    console.log('logout clicked');
  }

}

export default GlobalNavView;