import LoadableView from './PartialView';

class RegistrationView extends LoadableView {
  constructor() {
    super('#viewport', '/partials/account/register.html');
  }
}

export default RegistrationView;