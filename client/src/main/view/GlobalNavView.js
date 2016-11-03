import View from './View';
import { Session, Broker } from '../middleware';

class GlobalNavView extends View {
  constructor() {
    super('#globalnav');
    this.persistentAcrossRoutes = true;
    this.session = Session.instance;
    this.broker = Broker.instance;
    this.logout = this.logout.bind(this);
    this.onUserAuthChange = this.onUserAuthChange.bind(this);
  }

  getModel() {
    return Promise.resolve({
      authenticated: this.session.isAuthenticated(),
      route: this.route
    });
  }

  setup(template, model) {
    return super.setup(template, model).then((ractive)=> {
      this.broker.subscribe('user.authentication.change', this.onUserAuthChange);
      this.ractive.on('logout', this.logout)
      return ractive;
    });
  }

  onUserAuthChange(event, message) {
    this.session.set('authenticated', message.authenticated);
    this.ractive.set('authenticated', message.authenticated);
  }

  logout(e) {
    this.session.logout().then(() => {
      this.broker.publish('user.authentication.change', { authenticated: false });
    });
  }

  teardown() {
    super.teardown();
    this.broker.unsubscribe('user.authentication.change', this.onUserAuthChange);
  }
}

export default GlobalNavView;