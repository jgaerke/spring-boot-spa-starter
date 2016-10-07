import View from './View';
import { cache } from '../middleware';

class LoadableView extends View {
  constructor(templateUrl, viewSelector, containerSelector = '#viewport') {
    super(viewSelector);
    this.templateUrl = templateUrl;
    this.containerSelector = containerSelector;
    this.cache = cache;
  }

  load() {
    if (this.cache.get(this.templateUrl)) {
      this.$(this.containerSelector).html(this.cache.get(this.templateUrl));
      return Promise.resolve({});
    }
    return new Promise((resolve, reject) => {
      this.$(this.containerSelector).load(this.templateUrl, (html, responseText, jqXhr)=> {
        if (jqXhr.status && jqXhr.status.toString().indexOf('2') == 0) {
          this.cache.set(this.templateUrl, html);
          resolve({html, responseText, jqXhr});
        }
        return reject({html, responseText, jqXhr});
      });
    });
  }

  bind(viewState) {
    return this.load().then(() => {
      return super.bind(viewState);
    });
  }
}

export default LoadableView;