import { LoginView } from '../view';

class LoginRoute {
  constructor(loginView = new LoginView()) {
    this.path = '/login';
    this.loginView = loginView;
  }

  handle(data, onViewBound = ()=> {}) {
    console.log('login');
    this.loginView.render(data, onViewBound);
  }
};

export default LoginRoute;
