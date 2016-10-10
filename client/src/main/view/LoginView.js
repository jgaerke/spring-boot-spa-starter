import LoadableView from './LoadableView';

class LoginView extends LoadableView {
  constructor() {
    super('#viewport', '/partials/account/login.html', '#login');
  }
}

export default LoginView;