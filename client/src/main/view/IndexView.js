import LoadableView from './LoadableView';

class IndexView extends LoadableView {
  constructor() {
    super('/partials/index.html', "#index");
  }
}

export default IndexView;