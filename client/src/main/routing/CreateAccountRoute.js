import { CreateAccountView } from '../view';

class CreateAccountRoute {
  constructor(createAccountView = new CreateAccountView()) {
    this.path = '/register';
    this.createAccountView = createAccountView;
  }

  handle(data, onViewBound = ()=> {}) {
    //console.log('create account');
    this.createAccountView.render(data, onViewBound);
  }
};

export default CreateAccountRoute;
