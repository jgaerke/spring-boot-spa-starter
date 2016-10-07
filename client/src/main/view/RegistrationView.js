import LoadableView from './LoadableView';

class RegistrationView extends LoadableView {
  constructor() {
    super('/partials/account/register.html', '#registration');
  }
}

export default RegistrationView;