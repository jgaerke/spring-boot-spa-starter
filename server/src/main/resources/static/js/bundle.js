/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].e;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			e: {},
/******/ 			i: moduleId,
/******/ 			l: false
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.e, module, module.e, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.e;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 5);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	
	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();
	
	var _View2 = __webpack_require__(1);
	
	var _View3 = _interopRequireDefault(_View2);
	
	var _middleware = __webpack_require__(2);
	
	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
	
	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
	
	function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }
	
	function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }
	
	var LoadableView = function (_View) {
	  _inherits(LoadableView, _View);
	
	  function LoadableView(el, templateUrl) {
	    _classCallCheck(this, LoadableView);
	
	    var _this = _possibleConstructorReturn(this, (LoadableView.__proto__ || Object.getPrototypeOf(LoadableView)).call(this, el));
	
	    _this.templateUrl = templateUrl;
	    _this.cache = _middleware.cache;
	    return _this;
	  }
	
	  _createClass(LoadableView, [{
	    key: 'bind',
	    value: function bind() {
	      var _this2 = this;
	
	      if (this.cache.get(this.templateUrl)) {
	        this.$el.html(this.cache.get(this.templateUrl));
	        return Promise.resolve({});
	      }
	      return new Promise(function (resolve, reject) {
	        _this2.$el.load(_this2.templateUrl, function (html, responseText, jqXhr) {
	          if (jqXhr.status && jqXhr.status.toString().indexOf('2') == 0) {
	            _this2.cache.set(_this2.templateUrl, html);
	            resolve({ html: html, responseText: responseText, jqXhr: jqXhr });
	          }
	          return reject({ html: html, responseText: responseText, jqXhr: jqXhr });
	        });
	      });
	    }
	  }]);
	
	  return LoadableView;
	}(_View3.default);
	
	exports.default = LoadableView;

/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function($) {'use strict';
	
	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	
	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();
	
	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
	
	var View = function () {
	  function View(el) {
	    _classCallCheck(this, View);
	
	    this.$ = $;
	    this._ = _;
	    this.el = el;
	    this.$el = this.$(this.el);
	  }
	
	  _createClass(View, [{
	    key: 'bind',
	    value: function bind(route) {
	      Promise.resolve(this);
	    }
	  }, {
	    key: 'unbind',
	    value: function unbind() {
	      console.log('unbind');
	    }
	  }]);
	
	  return View;
	}();
	
	exports.default = View;
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(3)))

/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	exports.router = exports.cache = exports.broker = exports.session = undefined;
	
	var _Session = __webpack_require__(10);
	
	var _Session2 = _interopRequireDefault(_Session);
	
	var _Broker = __webpack_require__(6);
	
	var _Broker2 = _interopRequireDefault(_Broker);
	
	var _Cache = __webpack_require__(7);
	
	var _Cache2 = _interopRequireDefault(_Cache);
	
	var _Router = __webpack_require__(9);
	
	var _Router2 = _interopRequireDefault(_Router);
	
	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
	
	var session = exports.session = new _Session2.default();
	var broker = exports.broker = new _Broker2.default();
	var cache = exports.cache = new _Cache2.default();
	var router = exports.router = new _Router2.default();

/***/ },
/* 3 */
/***/ function(module, exports) {

	module.e = jQuery;

/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {

	// style-loader: Adds some css to the DOM by adding a <style> tag
	
	// load the styles
	var content = __webpack_require__(19);
	if(typeof content === 'string') content = [[module.i, content, '']];
	// add the styles to the DOM
	var update = __webpack_require__(21)(content, {});
	if(content.locals) module.e = content.locals;
	// Hot Module Replacement
	if(false) {
		// When the styles change, update the <style> tags
		if(!content.locals) {
			module.hot.accept("!!./../../../node_modules/css-loader/index.js!./Index.css", function() {
				var newContent = require("!!./../../../node_modules/css-loader/index.js!./Index.css");
				if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
				update(newContent);
			});
		}
		// When the module is disposed, remove the <style> tags
		module.hot.dispose(function() { update(); });
	}

/***/ },
/* 5 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	
	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();
	
	__webpack_require__(4);
	
	var _middleware = __webpack_require__(2);
	
	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
	
	var App = function () {
	  function App() {
	    _classCallCheck(this, App);
	
	    this.started = false;
	    this.router = _middleware.router;
	  }
	
	  _createClass(App, [{
	    key: 'start',
	    value: function start() {
	      if (this.started) {
	        return false;
	      }
	      this.router.start();
	      this.started = true;
	    }
	  }]);
	
	  return App;
	}();
	
	;
	
	window.App = App;
	
	exports.default = App;

/***/ },
/* 6 */
/***/ function(module, exports) {

	"use strict";
	
	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	
	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();
	
	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
	
	var Broker = function () {
	  function Broker() {
	    _classCallCheck(this, Broker);
	
	    this.subscriptions = {};
	  }
	
	  _createClass(Broker, [{
	    key: "publish",
	    value: function publish(event, message) {
	      var subscriptions = this.subscriptions[event];
	      if (subscriptions && subscriptions.length) {
	        subscriptions.forEach(function (subscription) {
	          subscription(message);
	        });
	      }
	    }
	  }, {
	    key: "subscribe",
	    value: function subscribe(event, subscriber) {
	      this.subscriptions[event] = this.subscriptions[event] || [];
	      this.subscriptions[event].push(subscriber);
	    }
	  }]);
	
	  return Broker;
	}();
	
	exports.default = Broker;

/***/ },
/* 7 */
/***/ function(module, exports) {

	"use strict";
	
	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	
	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();
	
	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
	
	var Cache = function () {
	  function Cache() {
	    _classCallCheck(this, Cache);
	
	    this.data = {};
	  }
	
	  _createClass(Cache, [{
	    key: "get",
	    value: function get(key) {
	      return this.data[key];
	    }
	  }, {
	    key: "set",
	    value: function set(key, value) {
	      this.data[key] = value;
	    }
	  }]);
	
	  return Cache;
	}();
	
	exports.default = Cache;

/***/ },
/* 8 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function($) {"use strict";
	
	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	
	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();
	
	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
	
	var Route = function () {
	  function Route(name, path, view) {
	    _classCallCheck(this, Route);
	
	    this.name = name;
	    this.path = path;
	    this.view = view;
	    this.rivets = rivets;
	    this.$ = $;
	    this._ = _;
	  }
	
	  _createClass(Route, [{
	    key: "getPath",
	    value: function getPath() {
	      return this.path;
	    }
	  }, {
	    key: "handle",
	    value: function handle(route) {
	      return this.view.bind(this._.assign({}, { name: this.name }, route));
	    }
	  }]);
	
	  return Route;
	}();
	
	exports.default = Route;
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(3)))

/***/ },
/* 9 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(page, $) {'use strict';
	
	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	
	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();
	
	var _Route = __webpack_require__(8);
	
	var _Route2 = _interopRequireDefault(_Route);
	
	var _view = __webpack_require__(18);
	
	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
	
	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
	
	var Router = function () {
	  function Router() {
	    _classCallCheck(this, Router);
	
	    this.activeView = null;
	    this.page = page;
	    this.$ = $;
	
	    this.routes = [new _Route2.default('index', '/', new _view.CompositeView(new _view.GlobalNavView(), new _view.IndexView())), new _Route2.default('login', '/login', new _view.CompositeView(new _view.GlobalNavView(), new _view.LoginView())), new _Route2.default('registration', '/register', new _view.CompositeView(new _view.GlobalNavView(), new _view.RegistrationView()))];
	
	    this.onViewBound = this.onViewBound.bind(this);
	    this.onRouteChange = this.onRouteChange.bind(this);
	  }
	
	  _createClass(Router, [{
	    key: 'onViewBound',
	    value: function onViewBound(view) {
	      this.activeView = view;
	      //this.$(document.body).removeClass('cloak');
	    }
	  }, {
	    key: 'onRouteChange',
	    value: function onRouteChange(route) {
	      var _this = this;
	
	      return function (routeState) {
	        _this.$(document.body).addClass('cloak');
	        if (_this.activeView) {
	          _this.activeView.unbind();
	        }
	        route.handle(routeState).then(_this.onViewBound);
	      };
	    }
	  }, {
	    key: 'start',
	    value: function start() {
	      var _this2 = this;
	
	      if (this.started) {
	        return;
	      }
	      this.page.base('/app');
	      this.routes.forEach(function (route) {
	        _this2.page(route.getPath(), _this2.onRouteChange(route));
	      });
	      this.page.start();
	      this.started = true;
	    }
	  }]);
	
	  return Router;
	}();
	
	exports.default = Router;
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(22), __webpack_require__(3)))

/***/ },
/* 10 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function($) {'use strict';
	
	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	
	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();
	
	var _util = __webpack_require__(12);
	
	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
	
	var Session = function () {
	  function Session() {
	    _classCallCheck(this, Session);
	
	    this.data = { authenticated: false };
	    this.$ = $;
	  }
	
	  _createClass(Session, [{
	    key: 'login',
	    value: function login(email, password, rememberMe) {
	      if (this.authenticated) {
	        return Promise.resolve({});
	      }
	      var data = this.data;
	
	      return (0, _util.toPromise)(this.$.post('/api/accounts/login', { email: email, password: password, rememberMe: rememberMe })).then(function (response) {
	        console.log('login success', response);
	        data.authenticated = true;
	        return response;
	      }).catch(function (response) {
	        console.log('login failure', response);
	        data.authenticated = false;
	        return response;
	      });
	    }
	  }, {
	    key: 'logout',
	    value: function logout() {
	      if (!this.authenticated) {
	        return Promise.resolve({});
	      }
	      return (0, _util.toPromise)(this.$.post('/api/accounts/logout')).then(function (response) {
	        console.log('logout success', response);
	        data.authenticated = false;
	        return response;
	      }).catch(function (response) {
	        console.log('logout failure', response);
	        return response;
	      });
	    }
	  }, {
	    key: 'getData',
	    value: function getData() {
	      return this.data;
	    }
	  }, {
	    key: 'get',
	    value: function get(key) {
	      return this.data[key];
	    }
	  }, {
	    key: 'set',
	    value: function set(key, val) {
	      this.data[key] = val;
	    }
	  }, {
	    key: 'isAuthenticated',
	    value: function isAuthenticated() {
	      return this.data['authenticated'];
	    }
	  }]);
	
	  return Session;
	}();
	
	exports.default = Session;
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(3)))

/***/ },
/* 11 */
/***/ function(module, exports) {

	"use strict";
	
	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	var toPromise = function toPromise(deferred) {
	  return new Promise(function (resolve, reject) {
	    deferred.then(resolve, reject);
	  });
	};
	
	exports.default = toPromise;

/***/ },
/* 12 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	Object.defineProperty(exports, "__esModule", {
	    value: true
	});
	exports.toPromise = undefined;
	
	var _ToPromise = __webpack_require__(11);
	
	var _ToPromise2 = _interopRequireDefault(_ToPromise);
	
	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
	
	exports.toPromise = _ToPromise2.default;

/***/ },
/* 13 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	
	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();
	
	var _View = __webpack_require__(1);
	
	var _View2 = _interopRequireDefault(_View);
	
	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
	
	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
	
	var CompositeView = function () {
	  function CompositeView() {
	    _classCallCheck(this, CompositeView);
	
	    this.views = Array.prototype.slice.call(arguments);
	    this._ = _;
	  }
	
	  _createClass(CompositeView, [{
	    key: 'bind',
	    value: function bind(route) {
	      var _this = this;
	
	      return Promise.all(this.views.map(function (view) {
	        return view.bind(route);
	      })).then(function () {
	        return _this;
	      });
	    }
	  }, {
	    key: 'unbind',
	    value: function unbind() {
	      return this.views.forEach(function (view) {
	        return view.unbind();
	      });
	    }
	  }]);
	
	  return CompositeView;
	}();
	
	exports.default = CompositeView;

/***/ },
/* 14 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	
	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();
	
	var _View2 = __webpack_require__(1);
	
	var _View3 = _interopRequireDefault(_View2);
	
	var _middleware = __webpack_require__(2);
	
	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
	
	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
	
	function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }
	
	function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }
	
	var GlobalNavView = function (_View) {
	  _inherits(GlobalNavView, _View);
	
	  function GlobalNavView() {
	    _classCallCheck(this, GlobalNavView);
	
	    var _this = _possibleConstructorReturn(this, (GlobalNavView.__proto__ || Object.getPrototypeOf(GlobalNavView)).call(this, '#globalnav'));
	
	    _this.session = _middleware.session;
	    return _this;
	  }
	
	  _createClass(GlobalNavView, [{
	    key: 'bind',
	    value: function bind(route) {
	      var globalNavLogin = this.$el.find('#global-nav-login');
	      var globalNavLogout = this.$el.find('#global-nav-logout');
	      var globalNavRegistration = this.$el.find('#global-nav-registration');
	
	      if (!_middleware.session.isAuthenticated()) {
	        globalNavLogin.show();
	        globalNavLogout.hide();
	        globalNavRegistration.show();
	      } else {
	        globalNavLogin.hide();
	        globalNavLogout.show();
	        globalNavRegistration.hide();
	      }
	
	      globalNavLogin.removeClass('active');
	      globalNavLogout.removeClass('active');
	      globalNavRegistration.removeClass('active');
	
	      globalNavLogout.on('click', this.logout);
	
	      switch (route.name) {
	        case 'login':
	          globalNavLogin.addClass('active');
	          break;
	        case 'registration':
	          globalNavRegistration.addClass('active');
	          break;
	      }
	
	      return Promise.resolve(this);
	    }
	  }, {
	    key: 'logout',
	    value: function logout(e) {
	      console.log('logout clicked');
	    }
	  }]);
	
	  return GlobalNavView;
	}(_View3.default);
	
	exports.default = GlobalNavView;

/***/ },
/* 15 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	
	var _LoadableView2 = __webpack_require__(0);
	
	var _LoadableView3 = _interopRequireDefault(_LoadableView2);
	
	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
	
	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
	
	function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }
	
	function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }
	
	var IndexView = function (_LoadableView) {
	  _inherits(IndexView, _LoadableView);
	
	  function IndexView() {
	    _classCallCheck(this, IndexView);
	
	    return _possibleConstructorReturn(this, (IndexView.__proto__ || Object.getPrototypeOf(IndexView)).call(this, '#viewport', '/partials/index.html'));
	  }
	
	  return IndexView;
	}(_LoadableView3.default);
	
	exports.default = IndexView;

/***/ },
/* 16 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	
	var _LoadableView2 = __webpack_require__(0);
	
	var _LoadableView3 = _interopRequireDefault(_LoadableView2);
	
	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
	
	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
	
	function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }
	
	function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }
	
	var LoginView = function (_LoadableView) {
	  _inherits(LoginView, _LoadableView);
	
	  function LoginView() {
	    _classCallCheck(this, LoginView);
	
	    return _possibleConstructorReturn(this, (LoginView.__proto__ || Object.getPrototypeOf(LoginView)).call(this, '#viewport', '/partials/account/login.html', '#login'));
	  }
	
	  return LoginView;
	}(_LoadableView3.default);
	
	exports.default = LoginView;

/***/ },
/* 17 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	
	var _LoadableView2 = __webpack_require__(0);
	
	var _LoadableView3 = _interopRequireDefault(_LoadableView2);
	
	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
	
	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
	
	function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }
	
	function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }
	
	var RegistrationView = function (_LoadableView) {
	  _inherits(RegistrationView, _LoadableView);
	
	  function RegistrationView() {
	    _classCallCheck(this, RegistrationView);
	
	    return _possibleConstructorReturn(this, (RegistrationView.__proto__ || Object.getPrototypeOf(RegistrationView)).call(this, '#viewport', '/partials/account/register.html'));
	  }
	
	  return RegistrationView;
	}(_LoadableView3.default);
	
	exports.default = RegistrationView;

/***/ },
/* 18 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	Object.defineProperty(exports, "__esModule", {
	    value: true
	});
	exports.LoginView = exports.IndexView = exports.RegistrationView = exports.GlobalNavView = exports.CompositeView = exports.LoadableView = exports.View = undefined;
	
	var _View = __webpack_require__(1);
	
	var _View2 = _interopRequireDefault(_View);
	
	var _LoadableView = __webpack_require__(0);
	
	var _LoadableView2 = _interopRequireDefault(_LoadableView);
	
	var _CompositeView = __webpack_require__(13);
	
	var _CompositeView2 = _interopRequireDefault(_CompositeView);
	
	var _GlobalNavView = __webpack_require__(14);
	
	var _GlobalNavView2 = _interopRequireDefault(_GlobalNavView);
	
	var _RegistrationView = __webpack_require__(17);
	
	var _RegistrationView2 = _interopRequireDefault(_RegistrationView);
	
	var _IndexView = __webpack_require__(15);
	
	var _IndexView2 = _interopRequireDefault(_IndexView);
	
	var _LoginView = __webpack_require__(16);
	
	var _LoginView2 = _interopRequireDefault(_LoginView);
	
	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
	
	exports.View = _View2.default;
	exports.LoadableView = _LoadableView2.default;
	exports.CompositeView = _CompositeView2.default;
	exports.GlobalNavView = _GlobalNavView2.default;
	exports.RegistrationView = _RegistrationView2.default;
	exports.IndexView = _IndexView2.default;
	exports.LoginView = _LoginView2.default;

/***/ },
/* 19 */
/***/ function(module, exports, __webpack_require__) {

	exports = module.e = __webpack_require__(20)();
	// imports
	
	
	// module
	exports.push([module.i, "body {\n    padding-top: 75px;\n}\n\n[cloak] { display: none !important; }", ""]);
	
	// exports


/***/ },
/* 20 */
/***/ function(module, exports, __webpack_require__) {

	/*
		MIT License http://www.opensource.org/licenses/mit-license.php
		Author Tobias Koppers @sokra
	*/
	// css base code, injected by the css-loader
	module.e = function() {
		var list = [];
	
		// return the list of modules as css string
		list.toString = function toString() {
			var result = [];
			for(var i = 0; i < this.length; i++) {
				var item = this[i];
				if(item[2]) {
					result.push("@media " + item[2] + "{" + item[1] + "}");
				} else {
					result.push(item[1]);
				}
			}
			return result.join("");
		};
	
		// import a list of modules into the list
		list.i = function(modules, mediaQuery) {
			if(typeof modules === "string")
				modules = [[null, modules, ""]];
			var alreadyImportedModules = {};
			for(var i = 0; i < this.length; i++) {
				var id = this[i][0];
				if(typeof id === "number")
					alreadyImportedModules[id] = true;
			}
			for(i = 0; i < modules.length; i++) {
				var item = modules[i];
				// skip already imported module
				// this implementation is not 100% perfect for weird media query combinations
				//  when a module is imported multiple times with different media queries.
				//  I hope this will never occur (Hey this way we have smaller bundles)
				if(typeof item[0] !== "number" || !alreadyImportedModules[item[0]]) {
					if(mediaQuery && !item[2]) {
						item[2] = mediaQuery;
					} else if(mediaQuery) {
						item[2] = "(" + item[2] + ") and (" + mediaQuery + ")";
					}
					list.push(item);
				}
			}
		};
		return list;
	};


/***/ },
/* 21 */
/***/ function(module, exports, __webpack_require__) {

	/*
		MIT License http://www.opensource.org/licenses/mit-license.php
		Author Tobias Koppers @sokra
	*/
	var stylesInDom = {},
		memoize = function(fn) {
			var memo;
			return function () {
				if (typeof memo === "undefined") memo = fn.apply(this, arguments);
				return memo;
			};
		},
		isOldIE = memoize(function() {
			return /msie [6-9]\b/.test(window.navigator.userAgent.toLowerCase());
		}),
		getHeadElement = memoize(function () {
			return document.head || document.getElementsByTagName("head")[0];
		}),
		singletonElement = null,
		singletonCounter = 0,
		styleElementsInsertedAtTop = [];
	
	module.e = function(list, options) {
		if(typeof DEBUG !== "undefined" && DEBUG) {
			if(typeof document !== "object") throw new Error("The style-loader cannot be used in a non-browser environment");
		}
	
		options = options || {};
		// Force single-tag solution on IE6-9, which has a hard limit on the # of <style>
		// tags it will allow on a page
		if (typeof options.singleton === "undefined") options.singleton = isOldIE();
	
		// By default, add <style> tags to the bottom of <head>.
		if (typeof options.insertAt === "undefined") options.insertAt = "bottom";
	
		var styles = listToStyles(list);
		addStylesToDom(styles, options);
	
		return function update(newList) {
			var mayRemove = [];
			for(var i = 0; i < styles.length; i++) {
				var item = styles[i];
				var domStyle = stylesInDom[item.id];
				domStyle.refs--;
				mayRemove.push(domStyle);
			}
			if(newList) {
				var newStyles = listToStyles(newList);
				addStylesToDom(newStyles, options);
			}
			for(var i = 0; i < mayRemove.length; i++) {
				var domStyle = mayRemove[i];
				if(domStyle.refs === 0) {
					for(var j = 0; j < domStyle.parts.length; j++)
						domStyle.parts[j]();
					delete stylesInDom[domStyle.id];
				}
			}
		};
	}
	
	function addStylesToDom(styles, options) {
		for(var i = 0; i < styles.length; i++) {
			var item = styles[i];
			var domStyle = stylesInDom[item.id];
			if(domStyle) {
				domStyle.refs++;
				for(var j = 0; j < domStyle.parts.length; j++) {
					domStyle.parts[j](item.parts[j]);
				}
				for(; j < item.parts.length; j++) {
					domStyle.parts.push(addStyle(item.parts[j], options));
				}
			} else {
				var parts = [];
				for(var j = 0; j < item.parts.length; j++) {
					parts.push(addStyle(item.parts[j], options));
				}
				stylesInDom[item.id] = {id: item.id, refs: 1, parts: parts};
			}
		}
	}
	
	function listToStyles(list) {
		var styles = [];
		var newStyles = {};
		for(var i = 0; i < list.length; i++) {
			var item = list[i];
			var id = item[0];
			var css = item[1];
			var media = item[2];
			var sourceMap = item[3];
			var part = {css: css, media: media, sourceMap: sourceMap};
			if(!newStyles[id])
				styles.push(newStyles[id] = {id: id, parts: [part]});
			else
				newStyles[id].parts.push(part);
		}
		return styles;
	}
	
	function insertStyleElement(options, styleElement) {
		var head = getHeadElement();
		var lastStyleElementInsertedAtTop = styleElementsInsertedAtTop[styleElementsInsertedAtTop.length - 1];
		if (options.insertAt === "top") {
			if(!lastStyleElementInsertedAtTop) {
				head.insertBefore(styleElement, head.firstChild);
			} else if(lastStyleElementInsertedAtTop.nextSibling) {
				head.insertBefore(styleElement, lastStyleElementInsertedAtTop.nextSibling);
			} else {
				head.appendChild(styleElement);
			}
			styleElementsInsertedAtTop.push(styleElement);
		} else if (options.insertAt === "bottom") {
			head.appendChild(styleElement);
		} else {
			throw new Error("Invalid value for parameter 'insertAt'. Must be 'top' or 'bottom'.");
		}
	}
	
	function removeStyleElement(styleElement) {
		styleElement.parentNode.removeChild(styleElement);
		var idx = styleElementsInsertedAtTop.indexOf(styleElement);
		if(idx >= 0) {
			styleElementsInsertedAtTop.splice(idx, 1);
		}
	}
	
	function createStyleElement(options) {
		var styleElement = document.createElement("style");
		styleElement.type = "text/css";
		insertStyleElement(options, styleElement);
		return styleElement;
	}
	
	function createLinkElement(options) {
		var linkElement = document.createElement("link");
		linkElement.rel = "stylesheet";
		insertStyleElement(options, linkElement);
		return linkElement;
	}
	
	function addStyle(obj, options) {
		var styleElement, update, remove;
	
		if (options.singleton) {
			var styleIndex = singletonCounter++;
			styleElement = singletonElement || (singletonElement = createStyleElement(options));
			update = applyToSingletonTag.bind(null, styleElement, styleIndex, false);
			remove = applyToSingletonTag.bind(null, styleElement, styleIndex, true);
		} else if(obj.sourceMap &&
			typeof URL === "function" &&
			typeof URL.createObjectURL === "function" &&
			typeof URL.revokeObjectURL === "function" &&
			typeof Blob === "function" &&
			typeof btoa === "function") {
			styleElement = createLinkElement(options);
			update = updateLink.bind(null, styleElement);
			remove = function() {
				removeStyleElement(styleElement);
				if(styleElement.href)
					URL.revokeObjectURL(styleElement.href);
			};
		} else {
			styleElement = createStyleElement(options);
			update = applyToTag.bind(null, styleElement);
			remove = function() {
				removeStyleElement(styleElement);
			};
		}
	
		update(obj);
	
		return function updateStyle(newObj) {
			if(newObj) {
				if(newObj.css === obj.css && newObj.media === obj.media && newObj.sourceMap === obj.sourceMap)
					return;
				update(obj = newObj);
			} else {
				remove();
			}
		};
	}
	
	var replaceText = (function () {
		var textStore = [];
	
		return function (index, replacement) {
			textStore[index] = replacement;
			return textStore.filter(Boolean).join('\n');
		};
	})();
	
	function applyToSingletonTag(styleElement, index, remove, obj) {
		var css = remove ? "" : obj.css;
	
		if (styleElement.styleSheet) {
			styleElement.styleSheet.cssText = replaceText(index, css);
		} else {
			var cssNode = document.createTextNode(css);
			var childNodes = styleElement.childNodes;
			if (childNodes[index]) styleElement.removeChild(childNodes[index]);
			if (childNodes.length) {
				styleElement.insertBefore(cssNode, childNodes[index]);
			} else {
				styleElement.appendChild(cssNode);
			}
		}
	}
	
	function applyToTag(styleElement, obj) {
		var css = obj.css;
		var media = obj.media;
	
		if(media) {
			styleElement.setAttribute("media", media)
		}
	
		if(styleElement.styleSheet) {
			styleElement.styleSheet.cssText = css;
		} else {
			while(styleElement.firstChild) {
				styleElement.removeChild(styleElement.firstChild);
			}
			styleElement.appendChild(document.createTextNode(css));
		}
	}
	
	function updateLink(linkElement, obj) {
		var css = obj.css;
		var sourceMap = obj.sourceMap;
	
		if(sourceMap) {
			// http://stackoverflow.com/a/26603875
			css += "\n/*# sourceMappingURL=data:application/json;base64," + btoa(unescape(encodeURIComponent(JSON.stringify(sourceMap)))) + " */";
		}
	
		var blob = new Blob([css], { type: "text/css" });
	
		var oldSrc = linkElement.href;
	
		linkElement.href = URL.createObjectURL(blob);
	
		if(oldSrc)
			URL.revokeObjectURL(oldSrc);
	}


/***/ },
/* 22 */
/***/ function(module, exports) {

	module.e = page;

/***/ }
/******/ ]);
//# sourceMappingURL=bundle.js.map