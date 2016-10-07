import { toPromise } from '../util';

class Session {
  constructor() {
    this.data = {authenticated: false};
    this.$ = $;
  }

  login(email, password, rememberMe) {
    if (this.authenticated) {
      return Promise.resolve({});
    }
    const data = this.data;

    return toPromise(this.$.post('/api/accounts/login', {email, password, rememberMe}))
        .then((response) => {
          console.log('login success', response);
          data.authenticated = true;
          return response;
        })
        .catch((response) => {
          console.log('login failure', response);
          data.authenticated = false;
          return response;
        });
  }

  logout() {
    if (!this.authenticated) {
      return Promise.resolve({});
    }
    return toPromise(this.$.post('/api/accounts/logout'))
        .then((response) => {
          console.log('logout success', response);
          data.authenticated = false;
          return response;
        })
        .catch((response) => {
          console.log('logout failure', response);
          return response;
        });
  }

  getData() {
    return this.data;
  }

  get(key) {
    return this.data[key];
  }

  set(key, val) {
    this.data[key] = val;
  }

  isAuthenticated() {
    return this.data['authenticated'];
  }
}

export default Session;
