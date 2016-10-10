import View from './View';
import { cache } from '../middleware';

class LoadableView extends View {
  constructor(el, templateUrl) {
    super(el);
    this.templateUrl = templateUrl;
    this.cache = cache;
  }

  bind() {
    if (this.cache.get(this.templateUrl)) {
      this.$el.html(this.cache.get(this.templateUrl));
      return Promise.resolve({});
    }
    return new Promise((resolve, reject) => {
      this.$el.load(this.templateUrl, (html, responseText, jqXhr)=> {
        if (jqXhr.status && jqXhr.status.toString().indexOf('2') == 0) {
          this.cache.set(this.templateUrl, html);
          resolve({html, responseText, jqXhr});
        }
        return reject({html, responseText, jqXhr});
      });
    });
  }
}

export default LoadableView;