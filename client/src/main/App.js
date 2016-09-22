import 'rivets';
import $ from 'jquery';
import bootstrap from 'bootstrap'
import './style/Index.css';
import { Router } from './routing';

class App {
  constructor(authenticated = false, router = new Router()) {
    this.authenticated = authenticated;
    this.router = router;
  }

  start() {
    //console.log('starting', this.authenticated);
    //console.log(this);
    this.router.start()
  }
};

window.App = App;
window.jQuery = $;
window.$ = $;

export default App;
