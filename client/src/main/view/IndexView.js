import LoadableView from './LoadableView';

class IndexView extends LoadableView {
  constructor() {
    super('#viewport', '/partials/index.html');
  }
}

export default IndexView;