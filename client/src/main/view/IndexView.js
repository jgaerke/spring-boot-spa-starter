import LoadableView from './PartialView';

class IndexView extends LoadableView {
  constructor() {
    super('#viewport', '/partials/index.html');
  }
}

export default IndexView;