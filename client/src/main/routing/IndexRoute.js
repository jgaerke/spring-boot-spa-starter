import { IndexView } from '../view';

class IndexRoute {
  constructor(indexView = new IndexView()) {
    this.path = '/';
    this.indexView = indexView;
  }

  handle(data, onViewBound = ()=> {}) {
    console.log('index');
    this.indexView.render(data, onViewBound);
  }
};

export default IndexRoute;