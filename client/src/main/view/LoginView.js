import LoadableView from './LoadableView';

class LoginView extends LoadableView {
  constructor() {
    super('/partials/account/login.html', '#login');
  }
}

export default LoginView;