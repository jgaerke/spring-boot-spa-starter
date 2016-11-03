import View from './View';
import { Session, Broker } from '../middleware';

class AccountNavView extends View {
  constructor() {
    super('#viewport', '#account-nav', '/partials/account/account-nav.html');
  }
}

export default AccountNavView;