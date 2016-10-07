import View from './View';

class GlobalNavView extends View {
  constructor() {
    super('#globalnav');
  }

  getInitialState(routeState) {
    return {
      globalNav: {
        isLoginRoute: routeState.name == 'login',
        isRegistrationRoute: routeState.name == 'registration',
        authenticated: this.session.isAuthenticated(),
        logout: ()=> console.log('clicked logout!')
      }
    }
  }
}

export default GlobalNavView;