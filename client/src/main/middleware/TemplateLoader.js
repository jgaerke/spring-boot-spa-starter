import { Cache } from '../middleware';

let singleton = Symbol();
let singletonEnforcer = Symbol();

class Loader {
  constructor(enforcer) {
    if (enforcer !== singletonEnforcer) {
      throw "Cannot construct singleton"
    }
    this.cache = Cache.instance;
  }

  load($el, url) {
    if (this.cache.get(url)) {
      return Promise.resolve({ html: this.cache.get(url) });
    }
    return new Promise((resolve, reject) => {
      $el.load(url, (html, responseText, jqXhr)=> {
        if (jqXhr.status && jqXhr.status.toString().indexOf('2') == 0) {
          this.cache.set(url, html);
          resolve({html, responseText, jqXhr});
        }
        return reject({html, responseText, jqXhr});
      });
    });
  }

  static get instance() {
    if(!this[singleton]) {
      this[singleton] = new Loader(singletonEnforcer);
    }
    return this[singleton];
  }
}

export default Loader;