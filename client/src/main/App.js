import './style/Index.css';
import { router } from './middleware';

class App {
  constructor() {
    this.started = false;
    this.router = router;
  }

  start() {
    if(this.started) {
      return false;
    }
    this.router.start();
    this.started = true;
  }
};

window.App = App;

export default App;
