/* Riot v2.2.4, @license MIT, (c) 2015 Muut Inc. + contributors */

;(function(window, undefined) {
  'use strict';
  var riot = { version: 'v2.2.4', settings: {} },
  //// be aware, internal usage

  // counter to give a unique id to all the Tag instances
      __uid = 0,

  // riot specific prefixes
      RIOT_PREFIX = 'riot-',
      RIOT_TAG = RIOT_PREFIX + 'tag',

  // for typeof == '' comparisons
      T_STRING = 'string',
      T_OBJECT = 'object',
      T_UNDEF  = 'undefined',
      T_FUNCTION = 'function',
  // special native tags that cannot be treated like the others
      SPECIAL_TAGS_REGEX = /^(?:opt(ion|group)|tbody|col|t[rhd])$/,
      RESERVED_WORDS_BLACKLIST = ['_item', '_id', 'update', 'root', 'mount', 'unmount', 'mixin', 'isMounted', 'isLoop', 'tags', 'parent', 'opts', 'trigger', 'on', 'off', 'one'],

  // version# for IE 8-11, 0 for others
      IE_VERSION = (window && window.document || {}).documentMode | 0,

  // Array.isArray for IE8 is in the polyfills
      isArray = Array.isArray

  riot.observable = function(el) {

    el = el || {}

    var callbacks = {},
        _id = 0

    el.on = function(events, fn) {
      if (isFunction(fn)) {
        if (typeof fn.id === T_UNDEF) fn._id = _id++

        events.replace(/\S+/g, function(name, pos) {
          (callbacks[name] = callbacks[name] || []).push(fn)
          fn.typed = pos > 0
        })
      }
      return el
    }

    el.off = function(events, fn) {
      if (events == '*') callbacks = {}
      else {
        events.replace(/\S+/g, function(name) {
          if (fn) {
            var arr = callbacks[name]
            for (var i = 0, cb; (cb = arr && arr[i]); ++i) {
              if (cb._id == fn._id) arr.splice(i--, 1)
            }
          } else {
            callbacks[name] = []
          }
        })
      }
      return el
    }

    // only single event supported
    el.one = function(name, fn) {
      function on() {
        el.off(name, on)
        fn.apply(el, arguments)
      }
      return el.on(name, on)
    }

    el.trigger = function(name) {
      var args = [].slice.call(arguments, 1),
          fns = callbacks[name] || []

      for (var i = 0, fn; (fn = fns[i]); ++i) {
        if (!fn.busy) {
          fn.busy = 1
          fn.apply(el, fn.typed ? [name].concat(args) : args)
          if (fns[i] !== fn) { i-- }
          fn.busy = 0
        }
      }

      if (callbacks.all && name != 'all') {
        el.trigger.apply(el, ['all', name].concat(args))
      }

      return el
    }

    return el

  }
  riot.mixin = (function() {
    var mixins = {}

    return function(name, mixin) {
      if (!mixin) return mixins[name]
      mixins[name] = mixin
    }

  })()

  ;(function(riot, evt, win) {

    // browsers only
    if (!win) return

    var loc = win.location,
        fns = riot.observable(),
        started = false,
        current

    function hash() {
      return loc.href.split('#')[1] || ''   // why not loc.hash.splice(1) ?
    }

    function parser(path) {
      return path.split('/')
    }

    function emit(path) {
      if (path.type) path = hash()

      if (path != current) {
        fns.trigger.apply(null, ['H'].concat(parser(path)))
        current = path
      }
    }

    var r = riot.route = function(arg) {
      // string
      if (arg[0]) {
        loc.hash = arg
        emit(arg)

        // function
      } else {
        fns.on('H', arg)
      }
    }

    r.exec = function(fn) {
      fn.apply(null, parser(hash()))
    }

    r.parser = function(fn) {
      parser = fn
    }

    r.stop = function () {
      if (started) {
        if (win.removeEventListener) win.removeEventListener(evt, emit, false) //@IE8 - the if()
        else win.detachEvent('on' + evt, emit) //@IE8
        fns.off('*')
        started = false
      }
    }

    r.start = function () {
      if (!started) {
        if (win.addEventListener) win.addEventListener(evt, emit, false) //@IE8 - the if()
        else win.attachEvent('on' + evt, emit) //IE8
        started = true
      }
    }

    // autostart the router
    r.start()

  })(riot, 'hashchange', window)
  /*

   //// How it works?


   Three ways:

   1. Expressions: tmpl('{ value }', data).
   Returns the result of evaluated expression as a raw object.

   2. Templates: tmpl('Hi { name } { surname }', data).
   Returns a string with evaluated expressions.

   3. Filters: tmpl('{ show: !done, highlight: active }', data).
   Returns a space separated list of trueish keys (mainly
   used for setting html classes), e.g. "show highlight".


   // Template examples

   tmpl('{ title || "Untitled" }', data)
   tmpl('Results are { results ? "ready" : "loading" }', data)
   tmpl('Today is { new Date() }', data)
   tmpl('{ message.length > 140 && "Message is too long" }', data)
   tmpl('This item got { Math.round(rating) } stars', data)
   tmpl('<h1>{ title }</h1>{ body }', data)


   // Falsy expressions in templates

   In templates (as opposed to single expressions) all falsy values
   except zero (undefined/null/false) will default to empty string:

   tmpl('{ undefined } - { false } - { null } - { 0 }', {})
   // will return: " - - - 0"

   */


  var brackets = (function(orig) {

    var cachedBrackets,
        r,
        b,
        re = /[{}]/g

    return function(x) {

      // make sure we use the current setting
      var s = riot.settings.brackets || orig

      // recreate cached vars if needed
      if (cachedBrackets !== s) {
        cachedBrackets = s
        b = s.split(' ')
        r = b.map(function (e) { return e.replace(/(?=.)/g, '\\') })
      }

      // if regexp given, rewrite it with current brackets (only if differ from default)
      return x instanceof RegExp ? (
          s === orig ? x :
              new RegExp(x.source.replace(re, function(b) { return r[~~(b === '}')] }), x.global ? 'g' : '')
      ) :
        // else, get specific bracket
          b[x]
    }
  })('{ }')


  var tmpl = (function() {

    var cache = {},
        OGLOB = '"in d?d:' + (window ? 'window).' : 'global).'),
        reVars =
            /(['"\/])(?:[^\\]*?|\\.|.)*?\1|\.\w*|\w*:|\b(?:(?:new|typeof|in|instanceof) |(?:this|true|false|null|undefined)\b|function\s*\()|([A-Za-z_$]\w*)/g

    // build a template (or get it from cache), render with data
    return function(str, data) {
      return str && (cache[str] || (cache[str] = tmpl(str)))(data)
    }


    // create a template instance

    function tmpl(s, p) {

      if (s.indexOf(brackets(0)) < 0) {
        // return raw text
        s = s.replace(/\n|\r\n?/g, '\n')
        return function () { return s }
      }

      // temporarily convert \{ and \} to a non-character
      s = s
          .replace(brackets(/\\{/g), '\uFFF0')
          .replace(brackets(/\\}/g), '\uFFF1')

      // split string to expression and non-expresion parts
      p = split(s, extract(s, brackets(/{/), brackets(/}/)))

      // is it a single expression or a template? i.e. {x} or <b>{x}</b>
      s = (p.length === 2 && !p[0]) ?

        // if expression, evaluate it
          expr(p[1]) :

        // if template, evaluate all expressions in it
      '[' + p.map(function(s, i) {

        // is it an expression or a string (every second part is an expression)
        return i % 2 ?

          // evaluate the expressions
            expr(s, true) :

          // process string parts of the template:
        '"' + s

          // preserve new lines
            .replace(/\n|\r\n?/g, '\\n')

          // escape quotes
            .replace(/"/g, '\\"') +

        '"'

      }).join(',') + '].join("")'

      return new Function('d', 'return ' + s
            // bring escaped { and } back
              .replace(/\uFFF0/g, brackets(0))
              .replace(/\uFFF1/g, brackets(1)) + ';')

    }


    // parse { ... } expression

    function expr(s, n) {
      s = s

        // convert new lines to spaces
          .replace(/\n|\r\n?/g, ' ')

        // trim whitespace, brackets, strip comments
          .replace(brackets(/^[{ ]+|[ }]+$|\/\*.+?\*\//g), '')

      // is it an object literal? i.e. { key : value }
      return /^\s*[\w- "']+ *:/.test(s) ?

        // if object literal, return trueish keys
        // e.g.: { show: isOpen(), done: item.done } -> "show done"
      '[' +

        // extract key:val pairs, ignoring any nested objects
      extract(s,

          // name part: name:, "name":, 'name':, name :
          /["' ]*[\w- ]+["' ]*:/,

          // expression part: everything upto a comma followed by a name (see above) or end of line
          /,(?=["' ]*[\w- ]+["' ]*:)|}|$/
      ).map(function(pair) {

            // get key, val parts
            return pair.replace(/^[ "']*(.+?)[ "']*: *(.+?),? *$/, function(_, k, v) {

              // wrap all conditional parts to ignore errors
              return v.replace(/[^&|=!><]+/g, wrap) + '?"' + k + '":"",'

            })

          }).join('') +

      '].join(" ").trim()' :

        // if js expression, evaluate as javascript
          wrap(s, n)

    }


    // execute js w/o breaking on errors or undefined vars

    function wrap(s, nonull) {
      s = s.trim()
      return !s ? '' : '(function(v){try{v=' +

        // prefix vars (name => data.name)
      s.replace(reVars, function(s, _, v) { return v ? '(("' + v + OGLOB + v + ')' : s }) +

        // default to empty string for falsy values except zero
      '}catch(e){}return ' + (nonull === true ? '!v&&v!==0?"":v' : 'v') + '}).call(d)'
    }


    // split string by an array of substrings

    function split(str, substrings) {
      var parts = []
      substrings.map(function(sub, i) {

        // push matched expression and part before it
        i = str.indexOf(sub)
        parts.push(str.slice(0, i), sub)
        str = str.slice(i + sub.length)
      })
      if (str) parts.push(str)

      // push the remaining part
      return parts
    }


    // match strings between opening and closing regexp, skipping any inner/nested matches

    function extract(str, open, close) {

      var start,
          level = 0,
          matches = [],
          re = new RegExp('(' + open.source + ')|(' + close.source + ')', 'g')

      str.replace(re, function(_, open, close, pos) {

        // if outer inner bracket, mark position
        if (!level && open) start = pos

        // in(de)crease bracket level
        level += open ? 1 : -1

        // if outer closing bracket, grab the match
        if (!level && close != null) matches.push(str.slice(start, pos + close.length))

      })

      return matches
    }

  })()

  /*
   lib/browser/tag/mkdom.js

   Includes hacks needed for the Internet Explorer version 9 and bellow

   */
// http://kangax.github.io/compat-table/es5/#ie8
// http://codeplanet.io/dropping-ie8/

  var mkdom = (function (checkIE) {

    var rootEls = {
          'tr': 'tbody',
          'th': 'tr',
          'td': 'tr',
          'tbody': 'table',
          'col': 'colgroup'
        },
        GENERIC = 'div'

    checkIE = checkIE && checkIE < 10

    // creates any dom element in a div, table, or colgroup container
    function _mkdom(html) {

      var match = html && html.match(/^\s*<([-\w]+)/),
          tagName = match && match[1].toLowerCase(),
          rootTag = rootEls[tagName] || GENERIC,
          el = mkEl(rootTag)

      el.stub = true

      if (checkIE && tagName && (match = tagName.match(SPECIAL_TAGS_REGEX)))
        ie9elem(el, html, tagName, !!match[1])
      else
        el.innerHTML = html

      return el
    }

    // creates tr, th, td, option, optgroup element for IE8-9
    /* istanbul ignore next */
    function ie9elem(el, html, tagName, select) {

      var div = mkEl(GENERIC),
          tag = select ? 'select>' : 'table>',
          child

      div.innerHTML = '<' + tag + html + '</' + tag

      child = div.getElementsByTagName(tagName)[0]
      if (child)
        el.appendChild(child)

    }
    // end ie9elem()

    return _mkdom

  })(IE_VERSION)

// { key, i in items} -> { key, i, items }
  function loopKeys(expr) {
    var b0 = brackets(0),
        els = expr.trim().slice(b0.length).match(/^\s*(\S+?)\s*(?:,\s*(\S+))?\s+in\s+(.+)$/)
    return els ? { key: els[1], pos: els[2], val: b0 + els[3] } : { val: expr }
  }

  function mkitem(expr, key, val) {
    var item = {}
    item[expr.key] = key
    if (expr.pos) item[expr.pos] = val
    return item
  }


  /* Beware: heavy stuff */
  function _each(dom, parent, expr) {

    remAttr(dom, 'each')

    var tagName = getTagName(dom),
        template = dom.outerHTML,
        hasImpl = !!tagImpl[tagName],
        impl = tagImpl[tagName] || {
              tmpl: template
            },
        root = dom.parentNode,
        placeholder = document.createComment('riot placeholder'),
        tags = [],
        child = getTag(dom),
        checksum

    root.insertBefore(placeholder, dom)

    expr = loopKeys(expr)

    // clean template code
    parent
        .one('premount', function () {
          if (root.stub) root = parent.root
          // remove the original DOM node
          dom.parentNode.removeChild(dom)
        })
        .on('update', function () {
          var items = tmpl(expr.val, parent)

          // object loop. any changes cause full redraw
          if (!isArray(items)) {

            checksum = items ? JSON.stringify(items) : ''

            items = !items ? [] :
                Object.keys(items).map(function (key) {
                  return mkitem(expr, key, items[key])
                })
          }

          var frag = document.createDocumentFragment(),
              i = tags.length,
              j = items.length

          // unmount leftover items
          while (i > j) {
            tags[--i].unmount()
            tags.splice(i, 1)
          }

          for (i = 0; i < j; ++i) {
            var _item = !checksum && !!expr.key ? mkitem(expr, items[i], i) : items[i]

            if (!tags[i]) {
              // mount new
              (tags[i] = new Tag(impl, {
                    parent: parent,
                    isLoop: true,
                    hasImpl: hasImpl,
                    root: SPECIAL_TAGS_REGEX.test(tagName) ? root : dom.cloneNode(),
                    item: _item
                  }, dom.innerHTML)
              ).mount()

              frag.appendChild(tags[i].root)
            } else
              tags[i].update(_item)

            tags[i]._item = _item

          }

          root.insertBefore(frag, placeholder)

          if (child) parent.tags[tagName] = tags

        }).one('updated', function() {
          var keys = Object.keys(parent)// only set new values
          walk(root, function(node) {
            // only set element node and not isLoop
            if (node.nodeType == 1 && !node.isLoop && !node._looped) {
              node._visited = false // reset _visited for loop node
              node._looped = true // avoid set multiple each
              setNamed(node, parent, keys)
            }
          })
        })

  }


  function parseNamedElements(root, tag, childTags) {

    walk(root, function(dom) {
      if (dom.nodeType == 1) {
        dom.isLoop = dom.isLoop || (dom.parentNode && dom.parentNode.isLoop || dom.getAttribute('each')) ? 1 : 0

        // custom child tag
        var child = getTag(dom)

        if (child && !dom.isLoop) {
          childTags.push(initChildTag(child, dom, tag))
        }

        if (!dom.isLoop)
          setNamed(dom, tag, [])
      }

    })

  }

  function parseExpressions(root, tag, expressions) {

    function addExpr(dom, val, extra) {
      if (val.indexOf(brackets(0)) >= 0) {
        var expr = { dom: dom, expr: val }
        expressions.push(extend(expr, extra))
      }
    }

    walk(root, function(dom) {
      var type = dom.nodeType

      // text node
      if (type == 3 && dom.parentNode.tagName != 'STYLE') addExpr(dom, dom.nodeValue)
      if (type != 1) return

      /* element */

      // loop
      var attr = dom.getAttribute('each')

      if (attr) { _each(dom, tag, attr); return false }

      // attribute expressions
      each(dom.attributes, function(attr) {
        var name = attr.name,
            bool = name.split('__')[1]

        addExpr(dom, attr.value, { attr: bool || name, bool: bool })
        if (bool) { remAttr(dom, name); return false }

      })

      // skip custom tags
      if (getTag(dom)) return false

    })

  }
  function Tag(impl, conf, innerHTML) {

    var self = riot.observable(this),
        opts = inherit(conf.opts) || {},
        dom = mkdom(impl.tmpl),
        parent = conf.parent,
        isLoop = conf.isLoop,
        hasImpl = conf.hasImpl,
        item = cleanUpData(conf.item),
        expressions = [],
        childTags = [],
        root = conf.root,
        fn = impl.fn,
        tagName = root.tagName.toLowerCase(),
        attr = {},
        propsInSyncWithParent = []

    if (fn && root._tag) {
      root._tag.unmount(true)
    }

    // not yet mounted
    this.isMounted = false
    root.isLoop = isLoop

    // keep a reference to the tag just created
    // so we will be able to mount this tag multiple times
    root._tag = this

    // create a unique id to this tag
    // it could be handy to use it also to improve the virtual dom rendering speed
    this._id = __uid++

    extend(this, { parent: parent, root: root, opts: opts, tags: {} }, item)

    // grab attributes
    each(root.attributes, function(el) {
      var val = el.value
      // remember attributes with expressions only
      if (brackets(/{.*}/).test(val)) attr[el.name] = val
    })

    if (dom.innerHTML && !/^(select|optgroup|table|tbody|tr|col(?:group)?)$/.test(tagName))
    // replace all the yield tags with the tag inner html
      dom.innerHTML = replaceYield(dom.innerHTML, innerHTML)

    // options
    function updateOpts() {
      var ctx = hasImpl && isLoop ? self : parent || self

      // update opts from current DOM attributes
      each(root.attributes, function(el) {
        opts[el.name] = tmpl(el.value, ctx)
      })
      // recover those with expressions
      each(Object.keys(attr), function(name) {
        opts[name] = tmpl(attr[name], ctx)
      })
    }

    function normalizeData(data) {
      for (var key in item) {
        if (typeof self[key] !== T_UNDEF)
          self[key] = data[key]
      }
    }

    function inheritFromParent () {
      if (!self.parent || !isLoop) return
      each(Object.keys(self.parent), function(k) {
        // some properties must be always in sync with the parent tag
        var mustSync = !~RESERVED_WORDS_BLACKLIST.indexOf(k) && ~propsInSyncWithParent.indexOf(k)
        if (typeof self[k] === T_UNDEF || mustSync) {
          // track the property to keep in sync
          // so we can keep it updated
          if (!mustSync) propsInSyncWithParent.push(k)
          self[k] = self.parent[k]
        }
      })
    }

    this.update = function(data) {
      // make sure the data passed will not override
      // the component core methods
      data = cleanUpData(data)
      // inherit properties from the parent
      inheritFromParent()
      // normalize the tag properties in case an item object was initially passed
      if (data && typeof item === T_OBJECT) {
        normalizeData(data)
        item = data
      }
      extend(self, data)
      updateOpts()
      self.trigger('update', data)
      update(expressions, self)
      self.trigger('updated')
    }

    this.mixin = function() {
      each(arguments, function(mix) {
        mix = typeof mix === T_STRING ? riot.mixin(mix) : mix
        each(Object.keys(mix), function(key) {
          // bind methods to self
          if (key != 'init')
            self[key] = isFunction(mix[key]) ? mix[key].bind(self) : mix[key]
        })
        // init method will be called automatically
        if (mix.init) mix.init.bind(self)()
      })
    }

    this.mount = function() {

      updateOpts()

      // initialiation
      if (fn) fn.call(self, opts)

      // parse layout after init. fn may calculate args for nested custom tags
      parseExpressions(dom, self, expressions)

      // mount the child tags
      toggle(true)

      // update the root adding custom attributes coming from the compiler
      // it fixes also #1087
      if (impl.attrs || hasImpl) {
        walkAttributes(impl.attrs, function (k, v) { root.setAttribute(k, v) })
        parseExpressions(self.root, self, expressions)
      }

      if (!self.parent || isLoop) self.update(item)

      // internal use only, fixes #403
      self.trigger('premount')

      if (isLoop && !hasImpl) {
        // update the root attribute for the looped elements
        self.root = root = dom.firstChild

      } else {
        while (dom.firstChild) root.appendChild(dom.firstChild)
        if (root.stub) self.root = root = parent.root
      }
      // if it's not a child tag we can trigger its mount event
      if (!self.parent || self.parent.isMounted) {
        self.isMounted = true
        self.trigger('mount')
      }
      // otherwise we need to wait that the parent event gets triggered
      else self.parent.one('mount', function() {
        // avoid to trigger the `mount` event for the tags
        // not visible included in an if statement
        if (!isInStub(self.root)) {
          self.parent.isMounted = self.isMounted = true
          self.trigger('mount')
        }
      })
    }


    this.unmount = function(keepRootTag) {
      var el = root,
          p = el.parentNode,
          ptag

      if (p) {

        if (parent) {
          ptag = getImmediateCustomParentTag(parent)
          // remove this tag from the parent tags object
          // if there are multiple nested tags with same name..
          // remove this element form the array
          if (isArray(ptag.tags[tagName]))
            each(ptag.tags[tagName], function(tag, i) {
              if (tag._id == self._id)
                ptag.tags[tagName].splice(i, 1)
            })
          else
          // otherwise just delete the tag instance
            ptag.tags[tagName] = undefined
        }

        else
          while (el.firstChild) el.removeChild(el.firstChild)

        if (!keepRootTag)
          p.removeChild(el)
        else
        // the riot-tag attribute isn't needed anymore, remove it
          p.removeAttribute('riot-tag')
      }


      self.trigger('unmount')
      toggle()
      self.off('*')
      // somehow ie8 does not like `delete root._tag`
      root._tag = null

    }

    function toggle(isMount) {

      // mount/unmount children
      each(childTags, function(child) { child[isMount ? 'mount' : 'unmount']() })

      // listen/unlisten parent (events flow one way from parent to children)
      if (parent) {
        var evt = isMount ? 'on' : 'off'

        // the loop tags will be always in sync with the parent automatically
        if (isLoop)
          parent[evt]('unmount', self.unmount)
        else
          parent[evt]('update', self.update)[evt]('unmount', self.unmount)
      }
    }

    // named elements available for fn
    parseNamedElements(dom, this, childTags)


  }

  function setEventHandler(name, handler, dom, tag) {

    dom[name] = function(e) {

      var item = tag._item,
          ptag = tag.parent,
          el

      if (!item)
        while (ptag && !item) {
          item = ptag._item
          ptag = ptag.parent
        }

      // cross browser event fix
      e = e || window.event

      // ignore error on some browsers
      try {
        e.currentTarget = dom
        if (!e.target) e.target = e.srcElement
        if (!e.which) e.which = e.charCode || e.keyCode
      } catch (ignored) { /**/ }

      e.item = item

      // prevent default behaviour (by default)
      if (handler.call(tag, e) !== true && !/radio|check/.test(dom.type)) {
        if (e.preventDefault) e.preventDefault()
        e.returnValue = false
      }

      if (!e.preventUpdate) {
        el = item ? getImmediateCustomParentTag(ptag) : tag
        el.update()
      }

    }

  }

// used by if- attribute
  function insertTo(root, node, before) {
    if (root) {
      root.insertBefore(before, node)
      root.removeChild(node)
    }
  }

  function update(expressions, tag) {

    each(expressions, function(expr, i) {

      var dom = expr.dom,
          attrName = expr.attr,
          value = tmpl(expr.expr, tag),
          parent = expr.dom.parentNode

      if (expr.bool)
        value = value ? attrName : false
      else if (value == null)
        value = ''

      // leave out riot- prefixes from strings inside textarea
      // fix #815: any value -> string
      if (parent && parent.tagName == 'TEXTAREA') value = ('' + value).replace(/riot-/g, '')

      // no change
      if (expr.value === value) return
      expr.value = value

      // text node
      if (!attrName) {
        dom.nodeValue = '' + value    // #815 related
        return
      }

      // remove original attribute
      remAttr(dom, attrName)
      // event handler
      if (isFunction(value)) {
        setEventHandler(attrName, value, dom, tag)

        // if- conditional
      } else if (attrName == 'if') {
        var stub = expr.stub,
            add = function() { insertTo(stub.parentNode, stub, dom) },
            remove = function() { insertTo(dom.parentNode, dom, stub) }

        // add to DOM
        if (value) {
          if (stub) {
            add()
            dom.inStub = false
            // avoid to trigger the mount event if the tags is not visible yet
            // maybe we can optimize this avoiding to mount the tag at all
            if (!isInStub(dom)) {
              walk(dom, function(el) {
                if (el._tag && !el._tag.isMounted) el._tag.isMounted = !!el._tag.trigger('mount')
              })
            }
          }
          // remove from DOM
        } else {
          stub = expr.stub = stub || document.createTextNode('')
          // if the parentNode is defined we can easily replace the tag
          if (dom.parentNode)
            remove()
          else
          // otherwise we need to wait the updated event
            (tag.parent || tag).one('updated', remove)

          dom.inStub = true
        }
        // show / hide
      } else if (/^(show|hide)$/.test(attrName)) {
        if (attrName == 'hide') value = !value
        dom.style.display = value ? '' : 'none'

        // field value
      } else if (attrName == 'value') {
        dom.value = value

        // <img src="{ expr }">
      } else if (startsWith(attrName, RIOT_PREFIX) && attrName != RIOT_TAG) {
        if (value)
          dom.setAttribute(attrName.slice(RIOT_PREFIX.length), value)

      } else {
        if (expr.bool) {
          dom[attrName] = value
          if (!value) return
        }

        if (typeof value !== T_OBJECT) dom.setAttribute(attrName, value)

      }

    })

  }
  function each(els, fn) {
    for (var i = 0, len = (els || []).length, el; i < len; i++) {
      el = els[i]
      // return false -> remove current item during loop
      if (el != null && fn(el, i) === false) i--
    }
    return els
  }

  function isFunction(v) {
    return typeof v === T_FUNCTION || false   // avoid IE problems
  }

  function remAttr(dom, name) {
    dom.removeAttribute(name)
  }

  function getTag(dom) {
    return dom.tagName && tagImpl[dom.getAttribute(RIOT_TAG) || dom.tagName.toLowerCase()]
  }

  function initChildTag(child, dom, parent) {
    var tag = new Tag(child, { root: dom, parent: parent }, dom.innerHTML),
        tagName = getTagName(dom),
        ptag = getImmediateCustomParentTag(parent),
        cachedTag

    // fix for the parent attribute in the looped elements
    tag.parent = ptag

    cachedTag = ptag.tags[tagName]

    // if there are multiple children tags having the same name
    if (cachedTag) {
      // if the parent tags property is not yet an array
      // create it adding the first cached tag
      if (!isArray(cachedTag))
        ptag.tags[tagName] = [cachedTag]
      // add the new nested tag to the array
      if (!~ptag.tags[tagName].indexOf(tag))
        ptag.tags[tagName].push(tag)
    } else {
      ptag.tags[tagName] = tag
    }

    // empty the child node once we got its template
    // to avoid that its children get compiled multiple times
    dom.innerHTML = ''

    return tag
  }

  function getImmediateCustomParentTag(tag) {
    var ptag = tag
    while (!getTag(ptag.root)) {
      if (!ptag.parent) break
      ptag = ptag.parent
    }
    return ptag
  }

  function getTagName(dom) {
    var child = getTag(dom),
        namedTag = dom.getAttribute('name'),
        tagName = namedTag && namedTag.indexOf(brackets(0)) < 0 ? namedTag : child ? child.name : dom.tagName.toLowerCase()

    return tagName
  }

  function extend(src) {
    var obj, args = arguments
    for (var i = 1; i < args.length; ++i) {
      if ((obj = args[i])) {
        for (var key in obj) {      // eslint-disable-line guard-for-in
          src[key] = obj[key]
        }
      }
    }
    return src
  }

// with this function we avoid that the current Tag methods get overridden
  function cleanUpData(data) {
    if (!(data instanceof Tag) && !(data && typeof data.trigger == T_FUNCTION)) return data

    var o = {}
    for (var key in data) {
      if (!~RESERVED_WORDS_BLACKLIST.indexOf(key))
        o[key] = data[key]
    }
    return o
  }

  function walk(dom, fn) {
    if (dom) {
      if (fn(dom) === false) return
      else {
        dom = dom.firstChild

        while (dom) {
          walk(dom, fn)
          dom = dom.nextSibling
        }
      }
    }
  }

// minimize risk: only zero or one _space_ between attr & value
  function walkAttributes(html, fn) {
    var m,
        re = /([-\w]+) ?= ?(?:"([^"]*)|'([^']*)|({[^}]*}))/g

    while ((m = re.exec(html))) {
      fn(m[1].toLowerCase(), m[2] || m[3] || m[4])
    }
  }

  function isInStub(dom) {
    while (dom) {
      if (dom.inStub) return true
      dom = dom.parentNode
    }
    return false
  }

  function mkEl(name) {
    return document.createElement(name)
  }

  function replaceYield(tmpl, innerHTML) {
    return tmpl.replace(/<(yield)\/?>(<\/\1>)?/gi, innerHTML || '')
  }

  function $$(selector, ctx) {
    return (ctx || document).querySelectorAll(selector)
  }

  function $(selector, ctx) {
    return (ctx || document).querySelector(selector)
  }

  function inherit(parent) {
    function Child() {}
    Child.prototype = parent
    return new Child()
  }

  function setNamed(dom, parent, keys) {
    if (dom._visited) return
    var p,
        v = dom.getAttribute('id') || dom.getAttribute('name')

    if (v) {
      if (keys.indexOf(v) < 0) {
        p = parent[v]
        if (!p)
          parent[v] = dom
        else if (isArray(p))
          p.push(dom)
        else
          parent[v] = [p, dom]
      }
      dom._visited = true
    }
  }

// faster String startsWith alternative
  function startsWith(src, str) {
    return src.slice(0, str.length) === str
  }

  /*
   Virtual dom is an array of custom tags on the document.
   Updates and unmounts propagate downwards from parent to children.
   */

  var virtualDom = [],
      tagImpl = {},
      styleNode

  function injectStyle(css) {

    if (riot.render) return // skip injection on the server

    if (!styleNode) {
      styleNode = mkEl('style')
      styleNode.setAttribute('type', 'text/css')
    }

    var head = document.head || document.getElementsByTagName('head')[0]

    if (styleNode.styleSheet)
      styleNode.styleSheet.cssText += css
    else
      styleNode.innerHTML += css

    if (!styleNode._rendered)
      if (styleNode.styleSheet) {
        document.body.appendChild(styleNode)
      } else {
        var rs = $('style[type=riot]')
        if (rs) {
          rs.parentNode.insertBefore(styleNode, rs)
          rs.parentNode.removeChild(rs)
        } else head.appendChild(styleNode)

      }

    styleNode._rendered = true

  }

  function mountTo(root, tagName, opts) {
    var tag = tagImpl[tagName],
    // cache the inner HTML to fix #855
        innerHTML = root._innerHTML = root._innerHTML || root.innerHTML

    // clear the inner html
    root.innerHTML = ''

    if (tag && root) tag = new Tag(tag, { root: root, opts: opts }, innerHTML)

    if (tag && tag.mount) {
      tag.mount()
      virtualDom.push(tag)
      return tag.on('unmount', function() {
        virtualDom.splice(virtualDom.indexOf(tag), 1)
      })
    }

  }

  riot.tag = function(name, html, css, attrs, fn) {
    if (isFunction(attrs)) {
      fn = attrs
      if (/^[\w\-]+\s?=/.test(css)) {
        attrs = css
        css = ''
      } else attrs = ''
    }
    if (css) {
      if (isFunction(css)) fn = css
      else injectStyle(css)
    }
    tagImpl[name] = { name: name, tmpl: html, attrs: attrs, fn: fn }
    return name
  }

  riot.mount = function(selector, tagName, opts) {

    var els,
        allTags,
        tags = []

    // helper functions

    function addRiotTags(arr) {
      var list = ''
      each(arr, function (e) {
        list += ', *[' + RIOT_TAG + '="' + e.trim() + '"]'
      })
      return list
    }

    function selectAllTags() {
      var keys = Object.keys(tagImpl)
      return keys + addRiotTags(keys)
    }

    function pushTags(root) {
      var last
      if (root.tagName) {
        if (tagName && (!(last = root.getAttribute(RIOT_TAG)) || last != tagName))
          root.setAttribute(RIOT_TAG, tagName)

        var tag = mountTo(root,
            tagName || root.getAttribute(RIOT_TAG) || root.tagName.toLowerCase(), opts)

        if (tag) tags.push(tag)
      }
      else if (root.length) {
        each(root, pushTags)   // assume nodeList
      }
    }

    // ----- mount code -----

    if (typeof tagName === T_OBJECT) {
      opts = tagName
      tagName = 0
    }

    // crawl the DOM to find the tag
    if (typeof selector === T_STRING) {
      if (selector === '*')
      // select all the tags registered
      // and also the tags found with the riot-tag attribute set
        selector = allTags = selectAllTags()
      else
      // or just the ones named like the selector
        selector += addRiotTags(selector.split(','))

      els = $$(selector)
    }
    else
    // probably you have passed already a tag or a NodeList
      els = selector

    // select all the registered and mount them inside their root elements
    if (tagName === '*') {
      // get all custom tags
      tagName = allTags || selectAllTags()
      // if the root els it's just a single tag
      if (els.tagName)
        els = $$(tagName, els)
      else {
        // select all the children for all the different root elements
        var nodeList = []
        each(els, function (_el) {
          nodeList.push($$(tagName, _el))
        })
        els = nodeList
      }
      // get rid of the tagName
      tagName = 0
    }

    if (els.tagName)
      pushTags(els)
    else
      each(els, pushTags)

    return tags
  }

// update everything
  riot.update = function() {
    return each(virtualDom, function(tag) {
      tag.update()
    })
  }

// @deprecated
  riot.mountTo = riot.mount

  // share methods for other riot parts, e.g. compiler
  riot.util = { brackets: brackets, tmpl: tmpl }

  // support CommonJS, AMD & browser
  /* istanbul ignore next */
  if (typeof exports === T_OBJECT)
    module.exports = riot
  else if (typeof define === 'function' && define.amd)
    define(function() { return (window.riot = riot) })
  else
    window.riot = riot

})(typeof window != 'undefined' ? window : void 0);
(function (root, factory) {
  /* istanbul ignore next */
  if (typeof define === 'function' && define.amd)
    define(['riot'], factory)
  else if (typeof exports === 'object')
    factory(require('riot'))
  else factory(root.riot)
}(this, function (riot, undefined) {

  var T_STRING = 'string'
  /* istanbul ignore next */
  var parsers = {
    html: {},
    css: {},
    js: {
      coffee: function(js) {
        return CoffeeScript.compile(js, { bare: true })
      },
      es6: function(js) {
        return babel.transform(js, { blacklist: ['useStrict'] }).code
      },
      none: function(js) {
        return js
      }
    }
  }

// fix 913
  parsers.js.javascript = parsers.js.none
// 4 the nostalgics
  parsers.js.coffeescript = parsers.js.coffee

  riot.parsers = parsers


  var BOOL_ATTR = ('allowfullscreen,async,autofocus,autoplay,checked,compact,controls,declare,default,'+
      'defaultchecked,defaultmuted,defaultselected,defer,disabled,draggable,enabled,formnovalidate,hidden,'+
      'indeterminate,inert,ismap,itemscope,loop,multiple,muted,nohref,noresize,noshade,novalidate,nowrap,open,'+
      'pauseonexit,readonly,required,reversed,scoped,seamless,selected,sortable,spellcheck,translate,truespeed,'+
      'typemustmatch,visible').split(','),
  // these cannot be auto-closed
      VOID_TAGS = 'area,base,br,col,command,embed,hr,img,input,keygen,link,meta,param,source,track,wbr'.split(','),
  /*
   Following attributes give error when parsed on browser with { exrp_values }

   'd' describes the SVG <path>, Chrome gives error if the value is not valid format
   https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/d
   */
      PREFIX_ATTR = ['style', 'src', 'd'],

      LINE_TAG = /^<([\w\-]+)>(.*)<\/\1>/gim,
      QUOTE = /=({[^}]+})([\s\/\>]|$)/g,
      SET_ATTR = /([\w\-]+)=(["'])([^\2]+?)\2/g,
      EXPR = /{\s*([^}]+)\s*}/g,
  // (tagname) (html) (javascript) endtag
      CUSTOM_TAG = /^<([\w\-]+)\s?([^>]*)>([^\x00]*[\w\/}"']>$)?([^\x00]*?)^<\/\1>/gim,
      SCRIPT = /<script(?:\s+type=['"]?([^>'"]+)['"]?)?>([^\x00]*?)<\/script>/gi,
      STYLE = /<style(?:\s+([^>]+))?>([^\x00]*?)<\/style>/gi,
      CSS_SELECTOR = /(^|\}|\{)\s*([^\{\}]+)\s*(?=\{)/g,
      HTML_COMMENT = /<!--.*?-->/g,
      CLOSED_TAG = /<([\w\-]+)([^>]*)\/\s*>/g,
      BLOCK_COMMENT = /\/\*[\s\S]*?\*\//g,
      LINE_COMMENT = /^\s*\/\/.*$/gm,
      INPUT_NUMBER = /(<input\s[^>]*?)type=['"]number['"]/gm

  function mktag(name, html, css, attrs, js) {
    return 'riot.tag(\'' +
        name + '\', \'' +
        html + '\'' +
        (css ? ', \'' + css + '\'' : '') +
        (attrs ? ', \'' + attrs.replace(/'/g, "\\'") + '\'' : '') +
        ', function(opts) {' + js + '\n});'
  }

  function compileHTML(html, opts, type) {

    if (!html) return ''

    var brackets = riot.util.brackets,
        b0 = brackets(0),
        b1 = brackets(1)

    // foo={ bar } --> foo="{ bar }"
    html = html.replace(brackets(QUOTE), '="$1"$2')

    // whitespace
    html = opts.whitespace ? html.replace(/\r\n?|\n/g, '\\n') : html.replace(/\s+/g, ' ')

    // strip comments
    html = html.trim().replace(HTML_COMMENT, '')

    // input type=numbr
    html = html.replace(INPUT_NUMBER, '$1riot-type='+ b0 +'"number"'+ b1) // fake expression

    // alter special attribute names
    html = html.replace(SET_ATTR, function(full, name, _, expr) {
      if (expr.indexOf(b0) >= 0) {
        name = name.toLowerCase()

        if (PREFIX_ATTR.indexOf(name) >= 0) name = 'riot-' + name

        // IE8 looses boolean attr values: `checked={ expr }` --> `__checked={ expr }`
        else if (BOOL_ATTR.indexOf(name) >= 0) name = '__' + name
      }

      return name + '="' + expr + '"'
    })

    // run expressions trough parser
    if (opts.expr) {
      html = html.replace(brackets(EXPR), function(_, expr) {
        var ret = compileJS(expr, opts, type).trim().replace(/[\r\n]+/g, '').trim()
        if (ret.slice(-1) == ';') ret = ret.slice(0, -1)
        return b0 + ret + b1
      })
    }

    // <foo/> -> <foo></foo>
    html = html.replace(CLOSED_TAG, function(_, name, attr) {
      var tag = '<' + name + (attr ? ' ' + attr.trim() : '') + '>'

      // Do not self-close HTML5 void tags
      if (VOID_TAGS.indexOf(name.toLowerCase()) == -1) tag += '</' + name + '>'
      return tag
    })

    // escape single quotes
    html = html.replace(/'/g, "\\'")

    // \{ jotain \} --> \\{ jotain \\}
    html = html.replace(brackets(/\\{|\\}/g), '\\$&')

    // compact: no whitespace between tags
    if (opts.compact) html = html.replace(/> </g, '><')

    return html

  }


  function riotjs(js) {

    // strip comments
    js = js.replace(LINE_COMMENT, '').replace(BLOCK_COMMENT, '')

    // ES6 method signatures
    var lines = js.split('\n'),
        es6Ident = ''

    lines.forEach(function(line, i) {
      var l = line.trim()

      // method start
      if (l[0] != '}' && ~l.indexOf('(')) {
        var end = l.match(/[{}]$/),
            m = end && line.match(/^(\s+)([$\w]+)\s*\(([$\w,\s]*)\)\s*\{/)

        if (m && !/^(if|while|switch|for|catch|function)$/.test(m[2])) {
          lines[i] = m[1] + 'this.' + m[2] + ' = function(' + m[3] + ') {'

          // foo() { }
          if (end[0] == '}') {
            lines[i] += ' ' + l.slice(m[0].length - 1, -1) + '}.bind(this)'

          } else {
            es6Ident = m[1]
          }
        }

      }

      // method end
      if (line.slice(0, es6Ident.length + 1) == es6Ident + '}') {
        lines[i] = es6Ident + '}.bind(this);'
        es6Ident = ''
      }

    })

    return lines.join('\n')

  }

  function scopedCSS (tag, style, type) {
    // 1. Remove CSS comments
    // 2. Find selectors and separate them by conmma
    // 3. keep special selectors as is
    // 4. prepend tag and [riot-tag]
    return style.replace(BLOCK_COMMENT, '').replace(CSS_SELECTOR, function (m, p1, p2) {
      return p1 + ' ' + p2.split(/\s*,\s*/g).map(function(sel) {
            var s = sel.trim()
            var t = (/:scope/.test(s) ? '' : ' ') + s.replace(/:scope/, '')
            return s[0] == '@' || s == 'from' || s == 'to' || /%$/.test(s) ? s :
            tag + t + ', [riot-tag="' + tag + '"]' + t
          }).join(',')
    }).trim()
  }

  function compileJS(js, opts, type) {
    if (!js) return ''
    var parser = opts.parser || (type ? riot.parsers.js[type] : riotjs)
    if (!parser) throw new Error('Parser not found "' + type + '"')
    return parser(js.replace(/\r\n?/g, '\n'), opts)
  }

  function compileTemplate(lang, html) {
    var parser = riot.parsers.html[lang]
    if (!parser) throw new Error('Template parser not found "' + lang + '"')
    return parser(html.replace(/\r\n?/g, '\n'))
  }

  function compileCSS(style, tag, type, scoped) {
    if (type === 'scoped-css') scoped = 1
    else if (riot.parsers.css[type]) style = riot.parsers.css[type](tag, style)
    else if (type !== 'css') throw new Error('CSS parser not found: "' + type + '"')
    if (scoped) style = scopedCSS(tag, style)
    return style.replace(/\s+/g, ' ').replace(/\\/g, '\\\\').replace(/'/g, "\\'").trim()
  }

  function compile(src, opts) {

    if (!opts) opts = {}
    else {

      if (opts.brackets) riot.settings.brackets = opts.brackets

      if (opts.template) src = compileTemplate(opts.template, src)
    }

    src = src.replace(LINE_TAG, function(_, tagName, html) {
      return mktag(tagName, compileHTML(html, opts), '', '', '')
    })

    return src.replace(CUSTOM_TAG, function(_, tagName, attrs, html, js) {
      var style = '',
          type = opts.type

      if (html) {

        // js wrapped inside <script> tag
        if (!js.trim()) {
          html = html.replace(SCRIPT, function(_, _type, script) {
            if (_type) type = _type.replace('text/', '')
            js = script
            return ''
          })
        }

        // styles in <style> tag
        html = html.replace(STYLE, function(_, types, _style) {
          var scoped = /(?:^|\s+)scoped(\s|=|$)/i.test(types),
              type = types && types.match(/(?:^|\s+)type\s*=\s*['"]?([^'"\s]+)['"]?/i)
          if (type) type = type[1].replace('text/', '')
          style += (style ? ' ' : '') + compileCSS(_style.trim(), tagName, type || 'css', scoped)
          return ''
        })
      }

      return mktag(
          tagName,
          compileHTML(html, opts, type),
          style,
          compileHTML(attrs, ''),
          compileJS(js, opts, type)
      )

    })

  }
  var doc = window.document,
      promise,
      ready


  function GET(url, fn) {
    var req = new XMLHttpRequest()

    req.onreadystatechange = function() {
      if (req.readyState == 4 && (req.status == 200 || (!req.status && req.responseText.length)))
        fn(req.responseText)
    }
    req.open('GET', url, true)
    req.send('')
  }

  function unindent(src) {
    var ident = /[ \t]+/.exec(src)
    if (ident) src = src.replace(new RegExp('^' + ident[0], 'gm'), '')
    return src
  }

  function globalEval(js) {
    var node = doc.createElement('script'),
        root = doc.documentElement

    node.text = compile(js)
    root.appendChild(node)
    root.removeChild(node)
  }

  function compileScripts(fn) {
    var scripts = doc.querySelectorAll('script[type="riot/tag"]'),
        scriptsAmount = scripts.length

    function done() {
      promise.trigger('ready')
      ready = true
      if (fn) fn()
    }

    if (!scriptsAmount) {
      done()
    } else {
      [].map.call(scripts, function(script) {
        var url = script.getAttribute('src')

        function compileTag(source) {
          globalEval(source)
          scriptsAmount--
          if (!scriptsAmount) {
            done()
          }
        }

        return url ? GET(url, compileTag) : compileTag(unindent(script.innerHTML))
      })
    }
  }


  riot.compile = function(arg, fn) {

    // string
    if (typeof arg === T_STRING) {

      // compile & return
      if (arg.trim()[0] == '<') {
        var js = unindent(compile(arg))
        if (!fn) globalEval(js)
        return js

        // URL
      } else {
        return GET(arg, function(str) {
          var js = unindent(compile(str))
          globalEval(js)
          if (fn) fn(js, str)
        })
      }
    }

    // must be a function
    if (typeof arg !== 'function') arg = undefined

    // all compiled
    if (ready) return arg && arg()

    // add to queue
    if (promise) {
      if (arg) promise.on('ready', arg)

      // grab riot/tag elements + load & execute them
    } else {
      promise = riot.observable()
      compileScripts(arg)
    }

  }

// reassign mount methods
  var mount = riot.mount

  riot.mount = function(a, b, c) {
    var ret
    riot.compile(function() { ret = mount(a, b, c) })
    return ret
  }

// @deprecated
  riot.mountTo = riot.mount
}));
!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.page=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (process){
  /* globals require, module */

  'use strict';

  /**
   * Module dependencies.
   */

  var pathtoRegexp = require('path-to-regexp');

  /**
   * Module exports.
   */

  module.exports = page;

  /**
   * Detect click event
   */
  var clickEvent = ('undefined' !== typeof document) && document.ontouchstart ? 'touchstart' : 'click';

  /**
   * To work properly with the URL
   * history.location generated polyfill in https://github.com/devote/HTML5-History-API
   */

  var location = ('undefined' !== typeof window) && (window.history.location || window.location);

  /**
   * Perform initial dispatch.
   */

  var dispatch = true;


  /**
   * Decode URL components (query string, pathname, hash).
   * Accommodates both regular percent encoding and x-www-form-urlencoded format.
   */
  var decodeURLComponents = true;

  /**
   * Base path.
   */

  var base = '';

  /**
   * Running flag.
   */

  var running;

  /**
   * HashBang option
   */

  var hashbang = false;

  /**
   * Previous context, for capturing
   * page exit events.
   */

  var prevContext;

  /**
   * Register `path` with callback `fn()`,
   * or route `path`, or redirection,
   * or `page.start()`.
   *
   *   page(fn);
   *   page('*', fn);
   *   page('/user/:id', load, user);
   *   page('/user/' + user.id, { some: 'thing' });
   *   page('/user/' + user.id);
   *   page('/from', '/to')
   *   page();
   *
   * @param {String|Function} path
   * @param {Function} fn...
   * @api public
   */

  function page(path, fn) {
    // <callback>
    if ('function' === typeof path) {
      return page('*', path);
    }

    // route <path> to <callback ...>
    if ('function' === typeof fn) {
      var route = new Route(path);
      for (var i = 1; i < arguments.length; ++i) {
        page.callbacks.push(route.middleware(arguments[i]));
      }
      // show <path> with [state]
    } else if ('string' === typeof path) {
      page['string' === typeof fn ? 'redirect' : 'show'](path, fn);
      // start [options]
    } else {
      page.start(path);
    }
  }

  /**
   * Callback functions.
   */

  page.callbacks = [];
  page.exits = [];

  /**
   * Current path being processed
   * @type {String}
   */
  page.current = '';

  /**
   * Number of pages navigated to.
   * @type {number}
   *
   *     page.len == 0;
   *     page('/login');
   *     page.len == 1;
   */

  page.len = 0;

  /**
   * Get or set basepath to `path`.
   *
   * @param {String} path
   * @api public
   */

  page.base = function(path) {
    if (0 === arguments.length) return base;
    base = path;
  };

  /**
   * Bind with the given `options`.
   *
   * Options:
   *
   *    - `click` bind to click events [true]
   *    - `popstate` bind to popstate [true]
   *    - `dispatch` perform initial dispatch [true]
   *
   * @param {Object} options
   * @api public
   */

  page.start = function(options) {
    options = options || {};
    if (running) return;
    running = true;
    if (false === options.dispatch) dispatch = false;
    if (false === options.decodeURLComponents) decodeURLComponents = false;
    if (false !== options.popstate) window.addEventListener('popstate', onpopstate, false);
    if (false !== options.click) {
      document.addEventListener(clickEvent, onclick, false);
    }
    if (true === options.hashbang) hashbang = true;
    if (!dispatch) return;
    var url = (hashbang && ~location.hash.indexOf('#!')) ? location.hash.substr(2) + location.search : location.pathname + location.search + location.hash;
    page.replace(url, null, true, dispatch);
  };

  /**
   * Unbind click and popstate event handlers.
   *
   * @api public
   */

  page.stop = function() {
    if (!running) return;
    page.current = '';
    page.len = 0;
    running = false;
    document.removeEventListener(clickEvent, onclick, false);
    window.removeEventListener('popstate', onpopstate, false);
  };

  /**
   * Show `path` with optional `state` object.
   *
   * @param {String} path
   * @param {Object} state
   * @param {Boolean} dispatch
   * @return {Context}
   * @api public
   */

  page.show = function(path, state, dispatch, push) {
    var ctx = new Context(path, state);
    page.current = ctx.path;
    if (false !== dispatch) page.dispatch(ctx);
    if (false !== ctx.handled && false !== push) ctx.pushState();
    return ctx;
  };

  /**
   * Goes back in the history
   * Back should always let the current route push state and then go back.
   *
   * @param {String} path - fallback path to go back if no more history exists, if undefined defaults to page.base
   * @param {Object} [state]
   * @api public
   */

  page.back = function(path, state) {
    if (page.len > 0) {
      // this may need more testing to see if all browsers
      // wait for the next tick to go back in history
      history.back();
      page.len--;
    } else if (path) {
      setTimeout(function() {
        page.show(path, state);
      });
    }else{
      setTimeout(function() {
        page.show(base, state);
      });
    }
  };


  /**
   * Register route to redirect from one path to other
   * or just redirect to another route
   *
   * @param {String} from - if param 'to' is undefined redirects to 'from'
   * @param {String} [to]
   * @api public
   */
  page.redirect = function(from, to) {
    // Define route from a path to another
    if ('string' === typeof from && 'string' === typeof to) {
      page(from, function(e) {
        setTimeout(function() {
          page.replace(to);
        }, 0);
      });
    }

    // Wait for the push state and replace it with another
    if ('string' === typeof from && 'undefined' === typeof to) {
      setTimeout(function() {
        page.replace(from);
      }, 0);
    }
  };

  /**
   * Replace `path` with optional `state` object.
   *
   * @param {String} path
   * @param {Object} state
   * @return {Context}
   * @api public
   */


  page.replace = function(path, state, init, dispatch) {
    var ctx = new Context(path, state);
    page.current = ctx.path;
    ctx.init = init;
    ctx.save(); // save before dispatching, which may redirect
    if (false !== dispatch) page.dispatch(ctx);
    return ctx;
  };

  /**
   * Dispatch the given `ctx`.
   *
   * @param {Object} ctx
   * @api private
   */

  page.dispatch = function(ctx) {
    var prev = prevContext,
      i = 0,
      j = 0;

    prevContext = ctx;

    function nextExit() {
      var fn = page.exits[j++];
      if (!fn) return nextEnter();
      fn(prev, nextExit);
    }

    function nextEnter() {
      var fn = page.callbacks[i++];

      if (ctx.path !== page.current) {
        ctx.handled = false;
        return;
      }
      if (!fn) return unhandled(ctx);
      fn(ctx, nextEnter);
    }

    if (prev) {
      nextExit();
    } else {
      nextEnter();
    }
  };

  /**
   * Unhandled `ctx`. When it's not the initial
   * popstate then redirect. If you wish to handle
   * 404s on your own use `page('*', callback)`.
   *
   * @param {Context} ctx
   * @api private
   */

  function unhandled(ctx) {
    if (ctx.handled) return;
    var current;

    if (hashbang) {
      current = base + location.hash.replace('#!', '');
    } else {
      current = location.pathname + location.search;
    }

    if (current === ctx.canonicalPath) return;
    page.stop();
    ctx.handled = false;
    location.href = ctx.canonicalPath;
  }

  /**
   * Register an exit route on `path` with
   * callback `fn()`, which will be called
   * on the previous context when a new
   * page is visited.
   */
  page.exit = function(path, fn) {
    if (typeof path === 'function') {
      return page.exit('*', path);
    }

    var route = new Route(path);
    for (var i = 1; i < arguments.length; ++i) {
      page.exits.push(route.middleware(arguments[i]));
    }
  };

  /**
   * Remove URL encoding from the given `str`.
   * Accommodates whitespace in both x-www-form-urlencoded
   * and regular percent-encoded form.
   *
   * @param {str} URL component to decode
   */
  function decodeURLEncodedURIComponent(val) {
    if (typeof val !== 'string') { return val; }
    return decodeURLComponents ? decodeURIComponent(val.replace(/\+/g, ' ')) : val;
  }

  /**
   * Initialize a new "request" `Context`
   * with the given `path` and optional initial `state`.
   *
   * @param {String} path
   * @param {Object} state
   * @api public
   */

  function Context(path, state) {
    if ('/' === path[0] && 0 !== path.indexOf(base)) path = base + (hashbang ? '#!' : '') + path;
    var i = path.indexOf('?');

    this.canonicalPath = path;
    this.path = path.replace(base, '') || '/';
    if (hashbang) this.path = this.path.replace('#!', '') || '/';

    this.title = document.title;
    this.state = state || {};
    this.state.path = path;
    this.querystring = ~i ? decodeURLEncodedURIComponent(path.slice(i + 1)) : '';
    this.pathname = decodeURLEncodedURIComponent(~i ? path.slice(0, i) : path);
    this.params = {};

    // fragment
    this.hash = '';
    if (!hashbang) {
      if (!~this.path.indexOf('#')) return;
      var parts = this.path.split('#');
      this.path = parts[0];
      this.hash = decodeURLEncodedURIComponent(parts[1]) || '';
      this.querystring = this.querystring.split('#')[0];
    }
  }

  /**
   * Expose `Context`.
   */

  page.Context = Context;

  /**
   * Push state.
   *
   * @api private
   */

  Context.prototype.pushState = function() {
    page.len++;
    history.pushState(this.state, this.title, hashbang && this.path !== '/' ? '#!' + this.path : this.canonicalPath);
  };

  /**
   * Save the context state.
   *
   * @api public
   */

  Context.prototype.save = function() {
    history.replaceState(this.state, this.title, hashbang && this.path !== '/' ? '#!' + this.path : this.canonicalPath);
  };

  /**
   * Initialize `Route` with the given HTTP `path`,
   * and an array of `callbacks` and `options`.
   *
   * Options:
   *
   *   - `sensitive`    enable case-sensitive routes
   *   - `strict`       enable strict matching for trailing slashes
   *
   * @param {String} path
   * @param {Object} options.
   * @api private
   */

  function Route(path, options) {
    options = options || {};
    this.path = (path === '*') ? '(.*)' : path;
    this.method = 'GET';
    this.regexp = pathtoRegexp(this.path,
      this.keys = [],
      options.sensitive,
      options.strict);
  }

  /**
   * Expose `Route`.
   */

  page.Route = Route;

  /**
   * Return route middleware with
   * the given callback `fn()`.
   *
   * @param {Function} fn
   * @return {Function}
   * @api public
   */

  Route.prototype.middleware = function(fn) {
    var self = this;
    return function(ctx, next) {
      if (self.match(ctx.path, ctx.params)) return fn(ctx, next);
      next();
    };
  };

  /**
   * Check if this route matches `path`, if so
   * populate `params`.
   *
   * @param {String} path
   * @param {Object} params
   * @return {Boolean}
   * @api private
   */

  Route.prototype.match = function(path, params) {
    var keys = this.keys,
      qsIndex = path.indexOf('?'),
      pathname = ~qsIndex ? path.slice(0, qsIndex) : path,
      m = this.regexp.exec(decodeURIComponent(pathname));

    if (!m) return false;

    for (var i = 1, len = m.length; i < len; ++i) {
      var key = keys[i - 1];
      var val = decodeURLEncodedURIComponent(m[i]);
      if (val !== undefined || !(hasOwnProperty.call(params, key.name))) {
        params[key.name] = val;
      }
    }

    return true;
  };


  /**
   * Handle "populate" events.
   */

  var onpopstate = (function () {
    var loaded = false;
    if ('undefined' === typeof window) {
      return;
    }
    if (document.readyState === 'complete') {
      loaded = true;
    } else {
      window.addEventListener('load', function() {
        setTimeout(function() {
          loaded = true;
        }, 0);
      });
    }
    return function onpopstate(e) {
      if (!loaded) return;
      if (e.state) {
        var path = e.state.path;
        page.replace(path, e.state);
      } else {
        page.show(location.pathname + location.hash, undefined, undefined, false);
      }
    };
  })();
  /**
   * Handle "click" events.
   */

  function onclick(e) {

    if (1 !== which(e)) return;

    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
    if (e.defaultPrevented) return;



    // ensure link
    var el = e.target;
    while (el && 'A' !== el.nodeName) el = el.parentNode;
    if (!el || 'A' !== el.nodeName) return;



    // Ignore if tag has
    // 1. "download" attribute
    // 2. rel="external" attribute
    if (el.hasAttribute('download') || el.getAttribute('rel') === 'external') return;

    // ensure non-hash for the same path
    var link = el.getAttribute('href');
    if (!hashbang && el.pathname === location.pathname && (el.hash || '#' === link)) return;



    // Check for mailto: in the href
    if (link && link.indexOf('mailto:') > -1) return;

    // check target
    if (el.target) return;

    // x-origin
    if (!sameOrigin(el.href)) return;



    // rebuild path
    var path = el.pathname + el.search + (el.hash || '');

    // strip leading "/[drive letter]:" on NW.js on Windows
    if (typeof process !== 'undefined' && path.match(/^\/[a-zA-Z]:\//)) {
      path = path.replace(/^\/[a-zA-Z]:\//, '/');
    }

    // same page
    var orig = path;

    if (path.indexOf(base) === 0) {
      path = path.substr(base.length);
    }

    if (hashbang) path = path.replace('#!', '');

    if (base && orig === path) return;

    e.preventDefault();
    page.show(orig);
  }

  /**
   * Event button.
   */

  function which(e) {
    e = e || window.event;
    return null === e.which ? e.button : e.which;
  }

  /**
   * Check if `href` is the same origin.
   */

  function sameOrigin(href) {
    var origin = location.protocol + '//' + location.hostname;
    if (location.port) origin += ':' + location.port;
    return (href && (0 === href.indexOf(origin)));
  }

  page.sameOrigin = sameOrigin;

}).call(this,require('_process'))
},{"_process":2,"path-to-regexp":3}],2:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canMutationObserver = typeof window !== 'undefined'
    && window.MutationObserver;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    var queue = [];

    if (canMutationObserver) {
        var hiddenDiv = document.createElement("div");
        var observer = new MutationObserver(function () {
            var queueList = queue.slice();
            queue.length = 0;
            queueList.forEach(function (fn) {
                fn();
            });
        });

        observer.observe(hiddenDiv, { attributes: true });

        return function nextTick(fn) {
            if (!queue.length) {
                hiddenDiv.setAttribute('yes', 'no');
            }
            queue.push(fn);
        };
    }

    if (canPost) {
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],3:[function(require,module,exports){
var isArray = require('isarray');

/**
 * Expose `pathToRegexp`.
 */
module.exports = pathToRegexp;

/**
 * The main path matching regexp utility.
 *
 * @type {RegExp}
 */
var PATH_REGEXP = new RegExp([
  // Match escaped characters that would otherwise appear in future matches.
  // This allows the user to escape special characters that won't transform.
  '(\\\\.)',
  // Match Express-style parameters and un-named parameters with a prefix
  // and optional suffixes. Matches appear as:
  //
  // "/:test(\\d+)?" => ["/", "test", "\d+", undefined, "?"]
  // "/route(\\d+)" => [undefined, undefined, undefined, "\d+", undefined]
  '([\\/.])?(?:\\:(\\w+)(?:\\(((?:\\\\.|[^)])*)\\))?|\\(((?:\\\\.|[^)])*)\\))([+*?])?',
  // Match regexp special characters that are always escaped.
  '([.+*?=^!:${}()[\\]|\\/])'
].join('|'), 'g');

/**
 * Escape the capturing group by escaping special characters and meaning.
 *
 * @param  {String} group
 * @return {String}
 */
function escapeGroup (group) {
  return group.replace(/([=!:$\/()])/g, '\\$1');
}

/**
 * Attach the keys as a property of the regexp.
 *
 * @param  {RegExp} re
 * @param  {Array}  keys
 * @return {RegExp}
 */
function attachKeys (re, keys) {
  re.keys = keys;
  return re;
}

/**
 * Get the flags for a regexp from the options.
 *
 * @param  {Object} options
 * @return {String}
 */
function flags (options) {
  return options.sensitive ? '' : 'i';
}

/**
 * Pull out keys from a regexp.
 *
 * @param  {RegExp} path
 * @param  {Array}  keys
 * @return {RegExp}
 */
function regexpToRegexp (path, keys) {
  // Use a negative lookahead to match only capturing groups.
  var groups = path.source.match(/\((?!\?)/g);

  if (groups) {
    for (var i = 0; i < groups.length; i++) {
      keys.push({
        name:      i,
        delimiter: null,
        optional:  false,
        repeat:    false
      });
    }
  }

  return attachKeys(path, keys);
}

/**
 * Transform an array into a regexp.
 *
 * @param  {Array}  path
 * @param  {Array}  keys
 * @param  {Object} options
 * @return {RegExp}
 */
function arrayToRegexp (path, keys, options) {
  var parts = [];

  for (var i = 0; i < path.length; i++) {
    parts.push(pathToRegexp(path[i], keys, options).source);
  }

  var regexp = new RegExp('(?:' + parts.join('|') + ')', flags(options));
  return attachKeys(regexp, keys);
}

/**
 * Replace the specific tags with regexp strings.
 *
 * @param  {String} path
 * @param  {Array}  keys
 * @return {String}
 */
function replacePath (path, keys) {
  var index = 0;

  function replace (_, escaped, prefix, key, capture, group, suffix, escape) {
    if (escaped) {
      return escaped;
    }

    if (escape) {
      return '\\' + escape;
    }

    var repeat   = suffix === '+' || suffix === '*';
    var optional = suffix === '?' || suffix === '*';

    keys.push({
      name:      key || index++,
      delimiter: prefix || '/',
      optional:  optional,
      repeat:    repeat
    });

    prefix = prefix ? ('\\' + prefix) : '';
    capture = escapeGroup(capture || group || '[^' + (prefix || '\\/') + ']+?');

    if (repeat) {
      capture = capture + '(?:' + prefix + capture + ')*';
    }

    if (optional) {
      return '(?:' + prefix + '(' + capture + '))?';
    }

    // Basic parameter support.
    return prefix + '(' + capture + ')';
  }

  return path.replace(PATH_REGEXP, replace);
}

/**
 * Normalize the given path string, returning a regular expression.
 *
 * An empty array can be passed in for the keys, which will hold the
 * placeholder key descriptions. For example, using `/user/:id`, `keys` will
 * contain `[{ name: 'id', delimiter: '/', optional: false, repeat: false }]`.
 *
 * @param  {(String|RegExp|Array)} path
 * @param  {Array}                 [keys]
 * @param  {Object}                [options]
 * @return {RegExp}
 */
function pathToRegexp (path, keys, options) {
  keys = keys || [];

  if (!isArray(keys)) {
    options = keys;
    keys = [];
  } else if (!options) {
    options = {};
  }

  if (path instanceof RegExp) {
    return regexpToRegexp(path, keys, options);
  }

  if (isArray(path)) {
    return arrayToRegexp(path, keys, options);
  }

  var strict = options.strict;
  var end = options.end !== false;
  var route = replacePath(path, keys);
  var endsWithSlash = path.charAt(path.length - 1) === '/';

  // In non-strict mode we allow a slash at the end of match. If the path to
  // match already ends with a slash, we remove it for consistency. The slash
  // is valid at the end of a path match, not in the middle. This is important
  // in non-ending mode, where "/test/" shouldn't match "/test//route".
  if (!strict) {
    route = (endsWithSlash ? route.slice(0, -2) : route) + '(?:\\/(?=$))?';
  }

  if (end) {
    route += '$';
  } else {
    // In non-ending mode, we need the capturing groups to match as much as
    // possible by using a positive lookahead to the end or next path segment.
    route += strict && endsWithSlash ? '' : '(?=\\/|$)';
  }

  return attachKeys(new RegExp('^' + route, flags(options)), keys);
}

},{"isarray":4}],4:[function(require,module,exports){
module.exports = Array.isArray || function (arr) {
  return Object.prototype.toString.call(arr) == '[object Array]';
};

},{}]},{},[1])(1)
});
/*! jQuery v2.1.4 | (c) 2005, 2015 jQuery Foundation, Inc. | jquery.org/license */
!function(a,b){"object"==typeof module&&"object"==typeof module.exports?module.exports=a.document?b(a,!0):function(a){if(!a.document)throw new Error("jQuery requires a window with a document");return b(a)}:b(a)}("undefined"!=typeof window?window:this,function(a,b){var c=[],d=c.slice,e=c.concat,f=c.push,g=c.indexOf,h={},i=h.toString,j=h.hasOwnProperty,k={},l=a.document,m="2.1.4",n=function(a,b){return new n.fn.init(a,b)},o=/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g,p=/^-ms-/,q=/-([\da-z])/gi,r=function(a,b){return b.toUpperCase()};n.fn=n.prototype={jquery:m,constructor:n,selector:"",length:0,toArray:function(){return d.call(this)},get:function(a){return null!=a?0>a?this[a+this.length]:this[a]:d.call(this)},pushStack:function(a){var b=n.merge(this.constructor(),a);return b.prevObject=this,b.context=this.context,b},each:function(a,b){return n.each(this,a,b)},map:function(a){return this.pushStack(n.map(this,function(b,c){return a.call(b,c,b)}))},slice:function(){return this.pushStack(d.apply(this,arguments))},first:function(){return this.eq(0)},last:function(){return this.eq(-1)},eq:function(a){var b=this.length,c=+a+(0>a?b:0);return this.pushStack(c>=0&&b>c?[this[c]]:[])},end:function(){return this.prevObject||this.constructor(null)},push:f,sort:c.sort,splice:c.splice},n.extend=n.fn.extend=function(){var a,b,c,d,e,f,g=arguments[0]||{},h=1,i=arguments.length,j=!1;for("boolean"==typeof g&&(j=g,g=arguments[h]||{},h++),"object"==typeof g||n.isFunction(g)||(g={}),h===i&&(g=this,h--);i>h;h++)if(null!=(a=arguments[h]))for(b in a)c=g[b],d=a[b],g!==d&&(j&&d&&(n.isPlainObject(d)||(e=n.isArray(d)))?(e?(e=!1,f=c&&n.isArray(c)?c:[]):f=c&&n.isPlainObject(c)?c:{},g[b]=n.extend(j,f,d)):void 0!==d&&(g[b]=d));return g},n.extend({expando:"jQuery"+(m+Math.random()).replace(/\D/g,""),isReady:!0,error:function(a){throw new Error(a)},noop:function(){},isFunction:function(a){return"function"===n.type(a)},isArray:Array.isArray,isWindow:function(a){return null!=a&&a===a.window},isNumeric:function(a){return!n.isArray(a)&&a-parseFloat(a)+1>=0},isPlainObject:function(a){return"object"!==n.type(a)||a.nodeType||n.isWindow(a)?!1:a.constructor&&!j.call(a.constructor.prototype,"isPrototypeOf")?!1:!0},isEmptyObject:function(a){var b;for(b in a)return!1;return!0},type:function(a){return null==a?a+"":"object"==typeof a||"function"==typeof a?h[i.call(a)]||"object":typeof a},globalEval:function(a){var b,c=eval;a=n.trim(a),a&&(1===a.indexOf("use strict")?(b=l.createElement("script"),b.text=a,l.head.appendChild(b).parentNode.removeChild(b)):c(a))},camelCase:function(a){return a.replace(p,"ms-").replace(q,r)},nodeName:function(a,b){return a.nodeName&&a.nodeName.toLowerCase()===b.toLowerCase()},each:function(a,b,c){var d,e=0,f=a.length,g=s(a);if(c){if(g){for(;f>e;e++)if(d=b.apply(a[e],c),d===!1)break}else for(e in a)if(d=b.apply(a[e],c),d===!1)break}else if(g){for(;f>e;e++)if(d=b.call(a[e],e,a[e]),d===!1)break}else for(e in a)if(d=b.call(a[e],e,a[e]),d===!1)break;return a},trim:function(a){return null==a?"":(a+"").replace(o,"")},makeArray:function(a,b){var c=b||[];return null!=a&&(s(Object(a))?n.merge(c,"string"==typeof a?[a]:a):f.call(c,a)),c},inArray:function(a,b,c){return null==b?-1:g.call(b,a,c)},merge:function(a,b){for(var c=+b.length,d=0,e=a.length;c>d;d++)a[e++]=b[d];return a.length=e,a},grep:function(a,b,c){for(var d,e=[],f=0,g=a.length,h=!c;g>f;f++)d=!b(a[f],f),d!==h&&e.push(a[f]);return e},map:function(a,b,c){var d,f=0,g=a.length,h=s(a),i=[];if(h)for(;g>f;f++)d=b(a[f],f,c),null!=d&&i.push(d);else for(f in a)d=b(a[f],f,c),null!=d&&i.push(d);return e.apply([],i)},guid:1,proxy:function(a,b){var c,e,f;return"string"==typeof b&&(c=a[b],b=a,a=c),n.isFunction(a)?(e=d.call(arguments,2),f=function(){return a.apply(b||this,e.concat(d.call(arguments)))},f.guid=a.guid=a.guid||n.guid++,f):void 0},now:Date.now,support:k}),n.each("Boolean Number String Function Array Date RegExp Object Error".split(" "),function(a,b){h["[object "+b+"]"]=b.toLowerCase()});function s(a){var b="length"in a&&a.length,c=n.type(a);return"function"===c||n.isWindow(a)?!1:1===a.nodeType&&b?!0:"array"===c||0===b||"number"==typeof b&&b>0&&b-1 in a}var t=function(a){var b,c,d,e,f,g,h,i,j,k,l,m,n,o,p,q,r,s,t,u="sizzle"+1*new Date,v=a.document,w=0,x=0,y=ha(),z=ha(),A=ha(),B=function(a,b){return a===b&&(l=!0),0},C=1<<31,D={}.hasOwnProperty,E=[],F=E.pop,G=E.push,H=E.push,I=E.slice,J=function(a,b){for(var c=0,d=a.length;d>c;c++)if(a[c]===b)return c;return-1},K="checked|selected|async|autofocus|autoplay|controls|defer|disabled|hidden|ismap|loop|multiple|open|readonly|required|scoped",L="[\\x20\\t\\r\\n\\f]",M="(?:\\\\.|[\\w-]|[^\\x00-\\xa0])+",N=M.replace("w","w#"),O="\\["+L+"*("+M+")(?:"+L+"*([*^$|!~]?=)"+L+"*(?:'((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\"|("+N+"))|)"+L+"*\\]",P=":("+M+")(?:\\((('((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\")|((?:\\\\.|[^\\\\()[\\]]|"+O+")*)|.*)\\)|)",Q=new RegExp(L+"+","g"),R=new RegExp("^"+L+"+|((?:^|[^\\\\])(?:\\\\.)*)"+L+"+$","g"),S=new RegExp("^"+L+"*,"+L+"*"),T=new RegExp("^"+L+"*([>+~]|"+L+")"+L+"*"),U=new RegExp("="+L+"*([^\\]'\"]*?)"+L+"*\\]","g"),V=new RegExp(P),W=new RegExp("^"+N+"$"),X={ID:new RegExp("^#("+M+")"),CLASS:new RegExp("^\\.("+M+")"),TAG:new RegExp("^("+M.replace("w","w*")+")"),ATTR:new RegExp("^"+O),PSEUDO:new RegExp("^"+P),CHILD:new RegExp("^:(only|first|last|nth|nth-last)-(child|of-type)(?:\\("+L+"*(even|odd|(([+-]|)(\\d*)n|)"+L+"*(?:([+-]|)"+L+"*(\\d+)|))"+L+"*\\)|)","i"),bool:new RegExp("^(?:"+K+")$","i"),needsContext:new RegExp("^"+L+"*[>+~]|:(even|odd|eq|gt|lt|nth|first|last)(?:\\("+L+"*((?:-\\d)?\\d*)"+L+"*\\)|)(?=[^-]|$)","i")},Y=/^(?:input|select|textarea|button)$/i,Z=/^h\d$/i,$=/^[^{]+\{\s*\[native \w/,_=/^(?:#([\w-]+)|(\w+)|\.([\w-]+))$/,aa=/[+~]/,ba=/'|\\/g,ca=new RegExp("\\\\([\\da-f]{1,6}"+L+"?|("+L+")|.)","ig"),da=function(a,b,c){var d="0x"+b-65536;return d!==d||c?b:0>d?String.fromCharCode(d+65536):String.fromCharCode(d>>10|55296,1023&d|56320)},ea=function(){m()};try{H.apply(E=I.call(v.childNodes),v.childNodes),E[v.childNodes.length].nodeType}catch(fa){H={apply:E.length?function(a,b){G.apply(a,I.call(b))}:function(a,b){var c=a.length,d=0;while(a[c++]=b[d++]);a.length=c-1}}}function ga(a,b,d,e){var f,h,j,k,l,o,r,s,w,x;if((b?b.ownerDocument||b:v)!==n&&m(b),b=b||n,d=d||[],k=b.nodeType,"string"!=typeof a||!a||1!==k&&9!==k&&11!==k)return d;if(!e&&p){if(11!==k&&(f=_.exec(a)))if(j=f[1]){if(9===k){if(h=b.getElementById(j),!h||!h.parentNode)return d;if(h.id===j)return d.push(h),d}else if(b.ownerDocument&&(h=b.ownerDocument.getElementById(j))&&t(b,h)&&h.id===j)return d.push(h),d}else{if(f[2])return H.apply(d,b.getElementsByTagName(a)),d;if((j=f[3])&&c.getElementsByClassName)return H.apply(d,b.getElementsByClassName(j)),d}if(c.qsa&&(!q||!q.test(a))){if(s=r=u,w=b,x=1!==k&&a,1===k&&"object"!==b.nodeName.toLowerCase()){o=g(a),(r=b.getAttribute("id"))?s=r.replace(ba,"\\$&"):b.setAttribute("id",s),s="[id='"+s+"'] ",l=o.length;while(l--)o[l]=s+ra(o[l]);w=aa.test(a)&&pa(b.parentNode)||b,x=o.join(",")}if(x)try{return H.apply(d,w.querySelectorAll(x)),d}catch(y){}finally{r||b.removeAttribute("id")}}}return i(a.replace(R,"$1"),b,d,e)}function ha(){var a=[];function b(c,e){return a.push(c+" ")>d.cacheLength&&delete b[a.shift()],b[c+" "]=e}return b}function ia(a){return a[u]=!0,a}function ja(a){var b=n.createElement("div");try{return!!a(b)}catch(c){return!1}finally{b.parentNode&&b.parentNode.removeChild(b),b=null}}function ka(a,b){var c=a.split("|"),e=a.length;while(e--)d.attrHandle[c[e]]=b}function la(a,b){var c=b&&a,d=c&&1===a.nodeType&&1===b.nodeType&&(~b.sourceIndex||C)-(~a.sourceIndex||C);if(d)return d;if(c)while(c=c.nextSibling)if(c===b)return-1;return a?1:-1}function ma(a){return function(b){var c=b.nodeName.toLowerCase();return"input"===c&&b.type===a}}function na(a){return function(b){var c=b.nodeName.toLowerCase();return("input"===c||"button"===c)&&b.type===a}}function oa(a){return ia(function(b){return b=+b,ia(function(c,d){var e,f=a([],c.length,b),g=f.length;while(g--)c[e=f[g]]&&(c[e]=!(d[e]=c[e]))})})}function pa(a){return a&&"undefined"!=typeof a.getElementsByTagName&&a}c=ga.support={},f=ga.isXML=function(a){var b=a&&(a.ownerDocument||a).documentElement;return b?"HTML"!==b.nodeName:!1},m=ga.setDocument=function(a){var b,e,g=a?a.ownerDocument||a:v;return g!==n&&9===g.nodeType&&g.documentElement?(n=g,o=g.documentElement,e=g.defaultView,e&&e!==e.top&&(e.addEventListener?e.addEventListener("unload",ea,!1):e.attachEvent&&e.attachEvent("onunload",ea)),p=!f(g),c.attributes=ja(function(a){return a.className="i",!a.getAttribute("className")}),c.getElementsByTagName=ja(function(a){return a.appendChild(g.createComment("")),!a.getElementsByTagName("*").length}),c.getElementsByClassName=$.test(g.getElementsByClassName),c.getById=ja(function(a){return o.appendChild(a).id=u,!g.getElementsByName||!g.getElementsByName(u).length}),c.getById?(d.find.ID=function(a,b){if("undefined"!=typeof b.getElementById&&p){var c=b.getElementById(a);return c&&c.parentNode?[c]:[]}},d.filter.ID=function(a){var b=a.replace(ca,da);return function(a){return a.getAttribute("id")===b}}):(delete d.find.ID,d.filter.ID=function(a){var b=a.replace(ca,da);return function(a){var c="undefined"!=typeof a.getAttributeNode&&a.getAttributeNode("id");return c&&c.value===b}}),d.find.TAG=c.getElementsByTagName?function(a,b){return"undefined"!=typeof b.getElementsByTagName?b.getElementsByTagName(a):c.qsa?b.querySelectorAll(a):void 0}:function(a,b){var c,d=[],e=0,f=b.getElementsByTagName(a);if("*"===a){while(c=f[e++])1===c.nodeType&&d.push(c);return d}return f},d.find.CLASS=c.getElementsByClassName&&function(a,b){return p?b.getElementsByClassName(a):void 0},r=[],q=[],(c.qsa=$.test(g.querySelectorAll))&&(ja(function(a){o.appendChild(a).innerHTML="<a id='"+u+"'></a><select id='"+u+"-\f]' msallowcapture=''><option selected=''></option></select>",a.querySelectorAll("[msallowcapture^='']").length&&q.push("[*^$]="+L+"*(?:''|\"\")"),a.querySelectorAll("[selected]").length||q.push("\\["+L+"*(?:value|"+K+")"),a.querySelectorAll("[id~="+u+"-]").length||q.push("~="),a.querySelectorAll(":checked").length||q.push(":checked"),a.querySelectorAll("a#"+u+"+*").length||q.push(".#.+[+~]")}),ja(function(a){var b=g.createElement("input");b.setAttribute("type","hidden"),a.appendChild(b).setAttribute("name","D"),a.querySelectorAll("[name=d]").length&&q.push("name"+L+"*[*^$|!~]?="),a.querySelectorAll(":enabled").length||q.push(":enabled",":disabled"),a.querySelectorAll("*,:x"),q.push(",.*:")})),(c.matchesSelector=$.test(s=o.matches||o.webkitMatchesSelector||o.mozMatchesSelector||o.oMatchesSelector||o.msMatchesSelector))&&ja(function(a){c.disconnectedMatch=s.call(a,"div"),s.call(a,"[s!='']:x"),r.push("!=",P)}),q=q.length&&new RegExp(q.join("|")),r=r.length&&new RegExp(r.join("|")),b=$.test(o.compareDocumentPosition),t=b||$.test(o.contains)?function(a,b){var c=9===a.nodeType?a.documentElement:a,d=b&&b.parentNode;return a===d||!(!d||1!==d.nodeType||!(c.contains?c.contains(d):a.compareDocumentPosition&&16&a.compareDocumentPosition(d)))}:function(a,b){if(b)while(b=b.parentNode)if(b===a)return!0;return!1},B=b?function(a,b){if(a===b)return l=!0,0;var d=!a.compareDocumentPosition-!b.compareDocumentPosition;return d?d:(d=(a.ownerDocument||a)===(b.ownerDocument||b)?a.compareDocumentPosition(b):1,1&d||!c.sortDetached&&b.compareDocumentPosition(a)===d?a===g||a.ownerDocument===v&&t(v,a)?-1:b===g||b.ownerDocument===v&&t(v,b)?1:k?J(k,a)-J(k,b):0:4&d?-1:1)}:function(a,b){if(a===b)return l=!0,0;var c,d=0,e=a.parentNode,f=b.parentNode,h=[a],i=[b];if(!e||!f)return a===g?-1:b===g?1:e?-1:f?1:k?J(k,a)-J(k,b):0;if(e===f)return la(a,b);c=a;while(c=c.parentNode)h.unshift(c);c=b;while(c=c.parentNode)i.unshift(c);while(h[d]===i[d])d++;return d?la(h[d],i[d]):h[d]===v?-1:i[d]===v?1:0},g):n},ga.matches=function(a,b){return ga(a,null,null,b)},ga.matchesSelector=function(a,b){if((a.ownerDocument||a)!==n&&m(a),b=b.replace(U,"='$1']"),!(!c.matchesSelector||!p||r&&r.test(b)||q&&q.test(b)))try{var d=s.call(a,b);if(d||c.disconnectedMatch||a.document&&11!==a.document.nodeType)return d}catch(e){}return ga(b,n,null,[a]).length>0},ga.contains=function(a,b){return(a.ownerDocument||a)!==n&&m(a),t(a,b)},ga.attr=function(a,b){(a.ownerDocument||a)!==n&&m(a);var e=d.attrHandle[b.toLowerCase()],f=e&&D.call(d.attrHandle,b.toLowerCase())?e(a,b,!p):void 0;return void 0!==f?f:c.attributes||!p?a.getAttribute(b):(f=a.getAttributeNode(b))&&f.specified?f.value:null},ga.error=function(a){throw new Error("Syntax error, unrecognized expression: "+a)},ga.uniqueSort=function(a){var b,d=[],e=0,f=0;if(l=!c.detectDuplicates,k=!c.sortStable&&a.slice(0),a.sort(B),l){while(b=a[f++])b===a[f]&&(e=d.push(f));while(e--)a.splice(d[e],1)}return k=null,a},e=ga.getText=function(a){var b,c="",d=0,f=a.nodeType;if(f){if(1===f||9===f||11===f){if("string"==typeof a.textContent)return a.textContent;for(a=a.firstChild;a;a=a.nextSibling)c+=e(a)}else if(3===f||4===f)return a.nodeValue}else while(b=a[d++])c+=e(b);return c},d=ga.selectors={cacheLength:50,createPseudo:ia,match:X,attrHandle:{},find:{},relative:{">":{dir:"parentNode",first:!0}," ":{dir:"parentNode"},"+":{dir:"previousSibling",first:!0},"~":{dir:"previousSibling"}},preFilter:{ATTR:function(a){return a[1]=a[1].replace(ca,da),a[3]=(a[3]||a[4]||a[5]||"").replace(ca,da),"~="===a[2]&&(a[3]=" "+a[3]+" "),a.slice(0,4)},CHILD:function(a){return a[1]=a[1].toLowerCase(),"nth"===a[1].slice(0,3)?(a[3]||ga.error(a[0]),a[4]=+(a[4]?a[5]+(a[6]||1):2*("even"===a[3]||"odd"===a[3])),a[5]=+(a[7]+a[8]||"odd"===a[3])):a[3]&&ga.error(a[0]),a},PSEUDO:function(a){var b,c=!a[6]&&a[2];return X.CHILD.test(a[0])?null:(a[3]?a[2]=a[4]||a[5]||"":c&&V.test(c)&&(b=g(c,!0))&&(b=c.indexOf(")",c.length-b)-c.length)&&(a[0]=a[0].slice(0,b),a[2]=c.slice(0,b)),a.slice(0,3))}},filter:{TAG:function(a){var b=a.replace(ca,da).toLowerCase();return"*"===a?function(){return!0}:function(a){return a.nodeName&&a.nodeName.toLowerCase()===b}},CLASS:function(a){var b=y[a+" "];return b||(b=new RegExp("(^|"+L+")"+a+"("+L+"|$)"))&&y(a,function(a){return b.test("string"==typeof a.className&&a.className||"undefined"!=typeof a.getAttribute&&a.getAttribute("class")||"")})},ATTR:function(a,b,c){return function(d){var e=ga.attr(d,a);return null==e?"!="===b:b?(e+="","="===b?e===c:"!="===b?e!==c:"^="===b?c&&0===e.indexOf(c):"*="===b?c&&e.indexOf(c)>-1:"$="===b?c&&e.slice(-c.length)===c:"~="===b?(" "+e.replace(Q," ")+" ").indexOf(c)>-1:"|="===b?e===c||e.slice(0,c.length+1)===c+"-":!1):!0}},CHILD:function(a,b,c,d,e){var f="nth"!==a.slice(0,3),g="last"!==a.slice(-4),h="of-type"===b;return 1===d&&0===e?function(a){return!!a.parentNode}:function(b,c,i){var j,k,l,m,n,o,p=f!==g?"nextSibling":"previousSibling",q=b.parentNode,r=h&&b.nodeName.toLowerCase(),s=!i&&!h;if(q){if(f){while(p){l=b;while(l=l[p])if(h?l.nodeName.toLowerCase()===r:1===l.nodeType)return!1;o=p="only"===a&&!o&&"nextSibling"}return!0}if(o=[g?q.firstChild:q.lastChild],g&&s){k=q[u]||(q[u]={}),j=k[a]||[],n=j[0]===w&&j[1],m=j[0]===w&&j[2],l=n&&q.childNodes[n];while(l=++n&&l&&l[p]||(m=n=0)||o.pop())if(1===l.nodeType&&++m&&l===b){k[a]=[w,n,m];break}}else if(s&&(j=(b[u]||(b[u]={}))[a])&&j[0]===w)m=j[1];else while(l=++n&&l&&l[p]||(m=n=0)||o.pop())if((h?l.nodeName.toLowerCase()===r:1===l.nodeType)&&++m&&(s&&((l[u]||(l[u]={}))[a]=[w,m]),l===b))break;return m-=e,m===d||m%d===0&&m/d>=0}}},PSEUDO:function(a,b){var c,e=d.pseudos[a]||d.setFilters[a.toLowerCase()]||ga.error("unsupported pseudo: "+a);return e[u]?e(b):e.length>1?(c=[a,a,"",b],d.setFilters.hasOwnProperty(a.toLowerCase())?ia(function(a,c){var d,f=e(a,b),g=f.length;while(g--)d=J(a,f[g]),a[d]=!(c[d]=f[g])}):function(a){return e(a,0,c)}):e}},pseudos:{not:ia(function(a){var b=[],c=[],d=h(a.replace(R,"$1"));return d[u]?ia(function(a,b,c,e){var f,g=d(a,null,e,[]),h=a.length;while(h--)(f=g[h])&&(a[h]=!(b[h]=f))}):function(a,e,f){return b[0]=a,d(b,null,f,c),b[0]=null,!c.pop()}}),has:ia(function(a){return function(b){return ga(a,b).length>0}}),contains:ia(function(a){return a=a.replace(ca,da),function(b){return(b.textContent||b.innerText||e(b)).indexOf(a)>-1}}),lang:ia(function(a){return W.test(a||"")||ga.error("unsupported lang: "+a),a=a.replace(ca,da).toLowerCase(),function(b){var c;do if(c=p?b.lang:b.getAttribute("xml:lang")||b.getAttribute("lang"))return c=c.toLowerCase(),c===a||0===c.indexOf(a+"-");while((b=b.parentNode)&&1===b.nodeType);return!1}}),target:function(b){var c=a.location&&a.location.hash;return c&&c.slice(1)===b.id},root:function(a){return a===o},focus:function(a){return a===n.activeElement&&(!n.hasFocus||n.hasFocus())&&!!(a.type||a.href||~a.tabIndex)},enabled:function(a){return a.disabled===!1},disabled:function(a){return a.disabled===!0},checked:function(a){var b=a.nodeName.toLowerCase();return"input"===b&&!!a.checked||"option"===b&&!!a.selected},selected:function(a){return a.parentNode&&a.parentNode.selectedIndex,a.selected===!0},empty:function(a){for(a=a.firstChild;a;a=a.nextSibling)if(a.nodeType<6)return!1;return!0},parent:function(a){return!d.pseudos.empty(a)},header:function(a){return Z.test(a.nodeName)},input:function(a){return Y.test(a.nodeName)},button:function(a){var b=a.nodeName.toLowerCase();return"input"===b&&"button"===a.type||"button"===b},text:function(a){var b;return"input"===a.nodeName.toLowerCase()&&"text"===a.type&&(null==(b=a.getAttribute("type"))||"text"===b.toLowerCase())},first:oa(function(){return[0]}),last:oa(function(a,b){return[b-1]}),eq:oa(function(a,b,c){return[0>c?c+b:c]}),even:oa(function(a,b){for(var c=0;b>c;c+=2)a.push(c);return a}),odd:oa(function(a,b){for(var c=1;b>c;c+=2)a.push(c);return a}),lt:oa(function(a,b,c){for(var d=0>c?c+b:c;--d>=0;)a.push(d);return a}),gt:oa(function(a,b,c){for(var d=0>c?c+b:c;++d<b;)a.push(d);return a})}},d.pseudos.nth=d.pseudos.eq;for(b in{radio:!0,checkbox:!0,file:!0,password:!0,image:!0})d.pseudos[b]=ma(b);for(b in{submit:!0,reset:!0})d.pseudos[b]=na(b);function qa(){}qa.prototype=d.filters=d.pseudos,d.setFilters=new qa,g=ga.tokenize=function(a,b){var c,e,f,g,h,i,j,k=z[a+" "];if(k)return b?0:k.slice(0);h=a,i=[],j=d.preFilter;while(h){(!c||(e=S.exec(h)))&&(e&&(h=h.slice(e[0].length)||h),i.push(f=[])),c=!1,(e=T.exec(h))&&(c=e.shift(),f.push({value:c,type:e[0].replace(R," ")}),h=h.slice(c.length));for(g in d.filter)!(e=X[g].exec(h))||j[g]&&!(e=j[g](e))||(c=e.shift(),f.push({value:c,type:g,matches:e}),h=h.slice(c.length));if(!c)break}return b?h.length:h?ga.error(a):z(a,i).slice(0)};function ra(a){for(var b=0,c=a.length,d="";c>b;b++)d+=a[b].value;return d}function sa(a,b,c){var d=b.dir,e=c&&"parentNode"===d,f=x++;return b.first?function(b,c,f){while(b=b[d])if(1===b.nodeType||e)return a(b,c,f)}:function(b,c,g){var h,i,j=[w,f];if(g){while(b=b[d])if((1===b.nodeType||e)&&a(b,c,g))return!0}else while(b=b[d])if(1===b.nodeType||e){if(i=b[u]||(b[u]={}),(h=i[d])&&h[0]===w&&h[1]===f)return j[2]=h[2];if(i[d]=j,j[2]=a(b,c,g))return!0}}}function ta(a){return a.length>1?function(b,c,d){var e=a.length;while(e--)if(!a[e](b,c,d))return!1;return!0}:a[0]}function ua(a,b,c){for(var d=0,e=b.length;e>d;d++)ga(a,b[d],c);return c}function va(a,b,c,d,e){for(var f,g=[],h=0,i=a.length,j=null!=b;i>h;h++)(f=a[h])&&(!c||c(f,d,e))&&(g.push(f),j&&b.push(h));return g}function wa(a,b,c,d,e,f){return d&&!d[u]&&(d=wa(d)),e&&!e[u]&&(e=wa(e,f)),ia(function(f,g,h,i){var j,k,l,m=[],n=[],o=g.length,p=f||ua(b||"*",h.nodeType?[h]:h,[]),q=!a||!f&&b?p:va(p,m,a,h,i),r=c?e||(f?a:o||d)?[]:g:q;if(c&&c(q,r,h,i),d){j=va(r,n),d(j,[],h,i),k=j.length;while(k--)(l=j[k])&&(r[n[k]]=!(q[n[k]]=l))}if(f){if(e||a){if(e){j=[],k=r.length;while(k--)(l=r[k])&&j.push(q[k]=l);e(null,r=[],j,i)}k=r.length;while(k--)(l=r[k])&&(j=e?J(f,l):m[k])>-1&&(f[j]=!(g[j]=l))}}else r=va(r===g?r.splice(o,r.length):r),e?e(null,g,r,i):H.apply(g,r)})}function xa(a){for(var b,c,e,f=a.length,g=d.relative[a[0].type],h=g||d.relative[" "],i=g?1:0,k=sa(function(a){return a===b},h,!0),l=sa(function(a){return J(b,a)>-1},h,!0),m=[function(a,c,d){var e=!g&&(d||c!==j)||((b=c).nodeType?k(a,c,d):l(a,c,d));return b=null,e}];f>i;i++)if(c=d.relative[a[i].type])m=[sa(ta(m),c)];else{if(c=d.filter[a[i].type].apply(null,a[i].matches),c[u]){for(e=++i;f>e;e++)if(d.relative[a[e].type])break;return wa(i>1&&ta(m),i>1&&ra(a.slice(0,i-1).concat({value:" "===a[i-2].type?"*":""})).replace(R,"$1"),c,e>i&&xa(a.slice(i,e)),f>e&&xa(a=a.slice(e)),f>e&&ra(a))}m.push(c)}return ta(m)}function ya(a,b){var c=b.length>0,e=a.length>0,f=function(f,g,h,i,k){var l,m,o,p=0,q="0",r=f&&[],s=[],t=j,u=f||e&&d.find.TAG("*",k),v=w+=null==t?1:Math.random()||.1,x=u.length;for(k&&(j=g!==n&&g);q!==x&&null!=(l=u[q]);q++){if(e&&l){m=0;while(o=a[m++])if(o(l,g,h)){i.push(l);break}k&&(w=v)}c&&((l=!o&&l)&&p--,f&&r.push(l))}if(p+=q,c&&q!==p){m=0;while(o=b[m++])o(r,s,g,h);if(f){if(p>0)while(q--)r[q]||s[q]||(s[q]=F.call(i));s=va(s)}H.apply(i,s),k&&!f&&s.length>0&&p+b.length>1&&ga.uniqueSort(i)}return k&&(w=v,j=t),r};return c?ia(f):f}return h=ga.compile=function(a,b){var c,d=[],e=[],f=A[a+" "];if(!f){b||(b=g(a)),c=b.length;while(c--)f=xa(b[c]),f[u]?d.push(f):e.push(f);f=A(a,ya(e,d)),f.selector=a}return f},i=ga.select=function(a,b,e,f){var i,j,k,l,m,n="function"==typeof a&&a,o=!f&&g(a=n.selector||a);if(e=e||[],1===o.length){if(j=o[0]=o[0].slice(0),j.length>2&&"ID"===(k=j[0]).type&&c.getById&&9===b.nodeType&&p&&d.relative[j[1].type]){if(b=(d.find.ID(k.matches[0].replace(ca,da),b)||[])[0],!b)return e;n&&(b=b.parentNode),a=a.slice(j.shift().value.length)}i=X.needsContext.test(a)?0:j.length;while(i--){if(k=j[i],d.relative[l=k.type])break;if((m=d.find[l])&&(f=m(k.matches[0].replace(ca,da),aa.test(j[0].type)&&pa(b.parentNode)||b))){if(j.splice(i,1),a=f.length&&ra(j),!a)return H.apply(e,f),e;break}}}return(n||h(a,o))(f,b,!p,e,aa.test(a)&&pa(b.parentNode)||b),e},c.sortStable=u.split("").sort(B).join("")===u,c.detectDuplicates=!!l,m(),c.sortDetached=ja(function(a){return 1&a.compareDocumentPosition(n.createElement("div"))}),ja(function(a){return a.innerHTML="<a href='#'></a>","#"===a.firstChild.getAttribute("href")})||ka("type|href|height|width",function(a,b,c){return c?void 0:a.getAttribute(b,"type"===b.toLowerCase()?1:2)}),c.attributes&&ja(function(a){return a.innerHTML="<input/>",a.firstChild.setAttribute("value",""),""===a.firstChild.getAttribute("value")})||ka("value",function(a,b,c){return c||"input"!==a.nodeName.toLowerCase()?void 0:a.defaultValue}),ja(function(a){return null==a.getAttribute("disabled")})||ka(K,function(a,b,c){var d;return c?void 0:a[b]===!0?b.toLowerCase():(d=a.getAttributeNode(b))&&d.specified?d.value:null}),ga}(a);n.find=t,n.expr=t.selectors,n.expr[":"]=n.expr.pseudos,n.unique=t.uniqueSort,n.text=t.getText,n.isXMLDoc=t.isXML,n.contains=t.contains;var u=n.expr.match.needsContext,v=/^<(\w+)\s*\/?>(?:<\/\1>|)$/,w=/^.[^:#\[\.,]*$/;function x(a,b,c){if(n.isFunction(b))return n.grep(a,function(a,d){return!!b.call(a,d,a)!==c});if(b.nodeType)return n.grep(a,function(a){return a===b!==c});if("string"==typeof b){if(w.test(b))return n.filter(b,a,c);b=n.filter(b,a)}return n.grep(a,function(a){return g.call(b,a)>=0!==c})}n.filter=function(a,b,c){var d=b[0];return c&&(a=":not("+a+")"),1===b.length&&1===d.nodeType?n.find.matchesSelector(d,a)?[d]:[]:n.find.matches(a,n.grep(b,function(a){return 1===a.nodeType}))},n.fn.extend({find:function(a){var b,c=this.length,d=[],e=this;if("string"!=typeof a)return this.pushStack(n(a).filter(function(){for(b=0;c>b;b++)if(n.contains(e[b],this))return!0}));for(b=0;c>b;b++)n.find(a,e[b],d);return d=this.pushStack(c>1?n.unique(d):d),d.selector=this.selector?this.selector+" "+a:a,d},filter:function(a){return this.pushStack(x(this,a||[],!1))},not:function(a){return this.pushStack(x(this,a||[],!0))},is:function(a){return!!x(this,"string"==typeof a&&u.test(a)?n(a):a||[],!1).length}});var y,z=/^(?:\s*(<[\w\W]+>)[^>]*|#([\w-]*))$/,A=n.fn.init=function(a,b){var c,d;if(!a)return this;if("string"==typeof a){if(c="<"===a[0]&&">"===a[a.length-1]&&a.length>=3?[null,a,null]:z.exec(a),!c||!c[1]&&b)return!b||b.jquery?(b||y).find(a):this.constructor(b).find(a);if(c[1]){if(b=b instanceof n?b[0]:b,n.merge(this,n.parseHTML(c[1],b&&b.nodeType?b.ownerDocument||b:l,!0)),v.test(c[1])&&n.isPlainObject(b))for(c in b)n.isFunction(this[c])?this[c](b[c]):this.attr(c,b[c]);return this}return d=l.getElementById(c[2]),d&&d.parentNode&&(this.length=1,this[0]=d),this.context=l,this.selector=a,this}return a.nodeType?(this.context=this[0]=a,this.length=1,this):n.isFunction(a)?"undefined"!=typeof y.ready?y.ready(a):a(n):(void 0!==a.selector&&(this.selector=a.selector,this.context=a.context),n.makeArray(a,this))};A.prototype=n.fn,y=n(l);var B=/^(?:parents|prev(?:Until|All))/,C={children:!0,contents:!0,next:!0,prev:!0};n.extend({dir:function(a,b,c){var d=[],e=void 0!==c;while((a=a[b])&&9!==a.nodeType)if(1===a.nodeType){if(e&&n(a).is(c))break;d.push(a)}return d},sibling:function(a,b){for(var c=[];a;a=a.nextSibling)1===a.nodeType&&a!==b&&c.push(a);return c}}),n.fn.extend({has:function(a){var b=n(a,this),c=b.length;return this.filter(function(){for(var a=0;c>a;a++)if(n.contains(this,b[a]))return!0})},closest:function(a,b){for(var c,d=0,e=this.length,f=[],g=u.test(a)||"string"!=typeof a?n(a,b||this.context):0;e>d;d++)for(c=this[d];c&&c!==b;c=c.parentNode)if(c.nodeType<11&&(g?g.index(c)>-1:1===c.nodeType&&n.find.matchesSelector(c,a))){f.push(c);break}return this.pushStack(f.length>1?n.unique(f):f)},index:function(a){return a?"string"==typeof a?g.call(n(a),this[0]):g.call(this,a.jquery?a[0]:a):this[0]&&this[0].parentNode?this.first().prevAll().length:-1},add:function(a,b){return this.pushStack(n.unique(n.merge(this.get(),n(a,b))))},addBack:function(a){return this.add(null==a?this.prevObject:this.prevObject.filter(a))}});function D(a,b){while((a=a[b])&&1!==a.nodeType);return a}n.each({parent:function(a){var b=a.parentNode;return b&&11!==b.nodeType?b:null},parents:function(a){return n.dir(a,"parentNode")},parentsUntil:function(a,b,c){return n.dir(a,"parentNode",c)},next:function(a){return D(a,"nextSibling")},prev:function(a){return D(a,"previousSibling")},nextAll:function(a){return n.dir(a,"nextSibling")},prevAll:function(a){return n.dir(a,"previousSibling")},nextUntil:function(a,b,c){return n.dir(a,"nextSibling",c)},prevUntil:function(a,b,c){return n.dir(a,"previousSibling",c)},siblings:function(a){return n.sibling((a.parentNode||{}).firstChild,a)},children:function(a){return n.sibling(a.firstChild)},contents:function(a){return a.contentDocument||n.merge([],a.childNodes)}},function(a,b){n.fn[a]=function(c,d){var e=n.map(this,b,c);return"Until"!==a.slice(-5)&&(d=c),d&&"string"==typeof d&&(e=n.filter(d,e)),this.length>1&&(C[a]||n.unique(e),B.test(a)&&e.reverse()),this.pushStack(e)}});var E=/\S+/g,F={};function G(a){var b=F[a]={};return n.each(a.match(E)||[],function(a,c){b[c]=!0}),b}n.Callbacks=function(a){a="string"==typeof a?F[a]||G(a):n.extend({},a);var b,c,d,e,f,g,h=[],i=!a.once&&[],j=function(l){for(b=a.memory&&l,c=!0,g=e||0,e=0,f=h.length,d=!0;h&&f>g;g++)if(h[g].apply(l[0],l[1])===!1&&a.stopOnFalse){b=!1;break}d=!1,h&&(i?i.length&&j(i.shift()):b?h=[]:k.disable())},k={add:function(){if(h){var c=h.length;!function g(b){n.each(b,function(b,c){var d=n.type(c);"function"===d?a.unique&&k.has(c)||h.push(c):c&&c.length&&"string"!==d&&g(c)})}(arguments),d?f=h.length:b&&(e=c,j(b))}return this},remove:function(){return h&&n.each(arguments,function(a,b){var c;while((c=n.inArray(b,h,c))>-1)h.splice(c,1),d&&(f>=c&&f--,g>=c&&g--)}),this},has:function(a){return a?n.inArray(a,h)>-1:!(!h||!h.length)},empty:function(){return h=[],f=0,this},disable:function(){return h=i=b=void 0,this},disabled:function(){return!h},lock:function(){return i=void 0,b||k.disable(),this},locked:function(){return!i},fireWith:function(a,b){return!h||c&&!i||(b=b||[],b=[a,b.slice?b.slice():b],d?i.push(b):j(b)),this},fire:function(){return k.fireWith(this,arguments),this},fired:function(){return!!c}};return k},n.extend({Deferred:function(a){var b=[["resolve","done",n.Callbacks("once memory"),"resolved"],["reject","fail",n.Callbacks("once memory"),"rejected"],["notify","progress",n.Callbacks("memory")]],c="pending",d={state:function(){return c},always:function(){return e.done(arguments).fail(arguments),this},then:function(){var a=arguments;return n.Deferred(function(c){n.each(b,function(b,f){var g=n.isFunction(a[b])&&a[b];e[f[1]](function(){var a=g&&g.apply(this,arguments);a&&n.isFunction(a.promise)?a.promise().done(c.resolve).fail(c.reject).progress(c.notify):c[f[0]+"With"](this===d?c.promise():this,g?[a]:arguments)})}),a=null}).promise()},promise:function(a){return null!=a?n.extend(a,d):d}},e={};return d.pipe=d.then,n.each(b,function(a,f){var g=f[2],h=f[3];d[f[1]]=g.add,h&&g.add(function(){c=h},b[1^a][2].disable,b[2][2].lock),e[f[0]]=function(){return e[f[0]+"With"](this===e?d:this,arguments),this},e[f[0]+"With"]=g.fireWith}),d.promise(e),a&&a.call(e,e),e},when:function(a){var b=0,c=d.call(arguments),e=c.length,f=1!==e||a&&n.isFunction(a.promise)?e:0,g=1===f?a:n.Deferred(),h=function(a,b,c){return function(e){b[a]=this,c[a]=arguments.length>1?d.call(arguments):e,c===i?g.notifyWith(b,c):--f||g.resolveWith(b,c)}},i,j,k;if(e>1)for(i=new Array(e),j=new Array(e),k=new Array(e);e>b;b++)c[b]&&n.isFunction(c[b].promise)?c[b].promise().done(h(b,k,c)).fail(g.reject).progress(h(b,j,i)):--f;return f||g.resolveWith(k,c),g.promise()}});var H;n.fn.ready=function(a){return n.ready.promise().done(a),this},n.extend({isReady:!1,readyWait:1,holdReady:function(a){a?n.readyWait++:n.ready(!0)},ready:function(a){(a===!0?--n.readyWait:n.isReady)||(n.isReady=!0,a!==!0&&--n.readyWait>0||(H.resolveWith(l,[n]),n.fn.triggerHandler&&(n(l).triggerHandler("ready"),n(l).off("ready"))))}});function I(){l.removeEventListener("DOMContentLoaded",I,!1),a.removeEventListener("load",I,!1),n.ready()}n.ready.promise=function(b){return H||(H=n.Deferred(),"complete"===l.readyState?setTimeout(n.ready):(l.addEventListener("DOMContentLoaded",I,!1),a.addEventListener("load",I,!1))),H.promise(b)},n.ready.promise();var J=n.access=function(a,b,c,d,e,f,g){var h=0,i=a.length,j=null==c;if("object"===n.type(c)){e=!0;for(h in c)n.access(a,b,h,c[h],!0,f,g)}else if(void 0!==d&&(e=!0,n.isFunction(d)||(g=!0),j&&(g?(b.call(a,d),b=null):(j=b,b=function(a,b,c){return j.call(n(a),c)})),b))for(;i>h;h++)b(a[h],c,g?d:d.call(a[h],h,b(a[h],c)));return e?a:j?b.call(a):i?b(a[0],c):f};n.acceptData=function(a){return 1===a.nodeType||9===a.nodeType||!+a.nodeType};function K(){Object.defineProperty(this.cache={},0,{get:function(){return{}}}),this.expando=n.expando+K.uid++}K.uid=1,K.accepts=n.acceptData,K.prototype={key:function(a){if(!K.accepts(a))return 0;var b={},c=a[this.expando];if(!c){c=K.uid++;try{b[this.expando]={value:c},Object.defineProperties(a,b)}catch(d){b[this.expando]=c,n.extend(a,b)}}return this.cache[c]||(this.cache[c]={}),c},set:function(a,b,c){var d,e=this.key(a),f=this.cache[e];if("string"==typeof b)f[b]=c;else if(n.isEmptyObject(f))n.extend(this.cache[e],b);else for(d in b)f[d]=b[d];return f},get:function(a,b){var c=this.cache[this.key(a)];return void 0===b?c:c[b]},access:function(a,b,c){var d;return void 0===b||b&&"string"==typeof b&&void 0===c?(d=this.get(a,b),void 0!==d?d:this.get(a,n.camelCase(b))):(this.set(a,b,c),void 0!==c?c:b)},remove:function(a,b){var c,d,e,f=this.key(a),g=this.cache[f];if(void 0===b)this.cache[f]={};else{n.isArray(b)?d=b.concat(b.map(n.camelCase)):(e=n.camelCase(b),b in g?d=[b,e]:(d=e,d=d in g?[d]:d.match(E)||[])),c=d.length;while(c--)delete g[d[c]]}},hasData:function(a){return!n.isEmptyObject(this.cache[a[this.expando]]||{})},discard:function(a){a[this.expando]&&delete this.cache[a[this.expando]]}};var L=new K,M=new K,N=/^(?:\{[\w\W]*\}|\[[\w\W]*\])$/,O=/([A-Z])/g;function P(a,b,c){var d;if(void 0===c&&1===a.nodeType)if(d="data-"+b.replace(O,"-$1").toLowerCase(),c=a.getAttribute(d),"string"==typeof c){try{c="true"===c?!0:"false"===c?!1:"null"===c?null:+c+""===c?+c:N.test(c)?n.parseJSON(c):c}catch(e){}M.set(a,b,c)}else c=void 0;return c}n.extend({hasData:function(a){return M.hasData(a)||L.hasData(a)},data:function(a,b,c){
return M.access(a,b,c)},removeData:function(a,b){M.remove(a,b)},_data:function(a,b,c){return L.access(a,b,c)},_removeData:function(a,b){L.remove(a,b)}}),n.fn.extend({data:function(a,b){var c,d,e,f=this[0],g=f&&f.attributes;if(void 0===a){if(this.length&&(e=M.get(f),1===f.nodeType&&!L.get(f,"hasDataAttrs"))){c=g.length;while(c--)g[c]&&(d=g[c].name,0===d.indexOf("data-")&&(d=n.camelCase(d.slice(5)),P(f,d,e[d])));L.set(f,"hasDataAttrs",!0)}return e}return"object"==typeof a?this.each(function(){M.set(this,a)}):J(this,function(b){var c,d=n.camelCase(a);if(f&&void 0===b){if(c=M.get(f,a),void 0!==c)return c;if(c=M.get(f,d),void 0!==c)return c;if(c=P(f,d,void 0),void 0!==c)return c}else this.each(function(){var c=M.get(this,d);M.set(this,d,b),-1!==a.indexOf("-")&&void 0!==c&&M.set(this,a,b)})},null,b,arguments.length>1,null,!0)},removeData:function(a){return this.each(function(){M.remove(this,a)})}}),n.extend({queue:function(a,b,c){var d;return a?(b=(b||"fx")+"queue",d=L.get(a,b),c&&(!d||n.isArray(c)?d=L.access(a,b,n.makeArray(c)):d.push(c)),d||[]):void 0},dequeue:function(a,b){b=b||"fx";var c=n.queue(a,b),d=c.length,e=c.shift(),f=n._queueHooks(a,b),g=function(){n.dequeue(a,b)};"inprogress"===e&&(e=c.shift(),d--),e&&("fx"===b&&c.unshift("inprogress"),delete f.stop,e.call(a,g,f)),!d&&f&&f.empty.fire()},_queueHooks:function(a,b){var c=b+"queueHooks";return L.get(a,c)||L.access(a,c,{empty:n.Callbacks("once memory").add(function(){L.remove(a,[b+"queue",c])})})}}),n.fn.extend({queue:function(a,b){var c=2;return"string"!=typeof a&&(b=a,a="fx",c--),arguments.length<c?n.queue(this[0],a):void 0===b?this:this.each(function(){var c=n.queue(this,a,b);n._queueHooks(this,a),"fx"===a&&"inprogress"!==c[0]&&n.dequeue(this,a)})},dequeue:function(a){return this.each(function(){n.dequeue(this,a)})},clearQueue:function(a){return this.queue(a||"fx",[])},promise:function(a,b){var c,d=1,e=n.Deferred(),f=this,g=this.length,h=function(){--d||e.resolveWith(f,[f])};"string"!=typeof a&&(b=a,a=void 0),a=a||"fx";while(g--)c=L.get(f[g],a+"queueHooks"),c&&c.empty&&(d++,c.empty.add(h));return h(),e.promise(b)}});var Q=/[+-]?(?:\d*\.|)\d+(?:[eE][+-]?\d+|)/.source,R=["Top","Right","Bottom","Left"],S=function(a,b){return a=b||a,"none"===n.css(a,"display")||!n.contains(a.ownerDocument,a)},T=/^(?:checkbox|radio)$/i;!function(){var a=l.createDocumentFragment(),b=a.appendChild(l.createElement("div")),c=l.createElement("input");c.setAttribute("type","radio"),c.setAttribute("checked","checked"),c.setAttribute("name","t"),b.appendChild(c),k.checkClone=b.cloneNode(!0).cloneNode(!0).lastChild.checked,b.innerHTML="<textarea>x</textarea>",k.noCloneChecked=!!b.cloneNode(!0).lastChild.defaultValue}();var U="undefined";k.focusinBubbles="onfocusin"in a;var V=/^key/,W=/^(?:mouse|pointer|contextmenu)|click/,X=/^(?:focusinfocus|focusoutblur)$/,Y=/^([^.]*)(?:\.(.+)|)$/;function Z(){return!0}function $(){return!1}function _(){try{return l.activeElement}catch(a){}}n.event={global:{},add:function(a,b,c,d,e){var f,g,h,i,j,k,l,m,o,p,q,r=L.get(a);if(r){c.handler&&(f=c,c=f.handler,e=f.selector),c.guid||(c.guid=n.guid++),(i=r.events)||(i=r.events={}),(g=r.handle)||(g=r.handle=function(b){return typeof n!==U&&n.event.triggered!==b.type?n.event.dispatch.apply(a,arguments):void 0}),b=(b||"").match(E)||[""],j=b.length;while(j--)h=Y.exec(b[j])||[],o=q=h[1],p=(h[2]||"").split(".").sort(),o&&(l=n.event.special[o]||{},o=(e?l.delegateType:l.bindType)||o,l=n.event.special[o]||{},k=n.extend({type:o,origType:q,data:d,handler:c,guid:c.guid,selector:e,needsContext:e&&n.expr.match.needsContext.test(e),namespace:p.join(".")},f),(m=i[o])||(m=i[o]=[],m.delegateCount=0,l.setup&&l.setup.call(a,d,p,g)!==!1||a.addEventListener&&a.addEventListener(o,g,!1)),l.add&&(l.add.call(a,k),k.handler.guid||(k.handler.guid=c.guid)),e?m.splice(m.delegateCount++,0,k):m.push(k),n.event.global[o]=!0)}},remove:function(a,b,c,d,e){var f,g,h,i,j,k,l,m,o,p,q,r=L.hasData(a)&&L.get(a);if(r&&(i=r.events)){b=(b||"").match(E)||[""],j=b.length;while(j--)if(h=Y.exec(b[j])||[],o=q=h[1],p=(h[2]||"").split(".").sort(),o){l=n.event.special[o]||{},o=(d?l.delegateType:l.bindType)||o,m=i[o]||[],h=h[2]&&new RegExp("(^|\\.)"+p.join("\\.(?:.*\\.|)")+"(\\.|$)"),g=f=m.length;while(f--)k=m[f],!e&&q!==k.origType||c&&c.guid!==k.guid||h&&!h.test(k.namespace)||d&&d!==k.selector&&("**"!==d||!k.selector)||(m.splice(f,1),k.selector&&m.delegateCount--,l.remove&&l.remove.call(a,k));g&&!m.length&&(l.teardown&&l.teardown.call(a,p,r.handle)!==!1||n.removeEvent(a,o,r.handle),delete i[o])}else for(o in i)n.event.remove(a,o+b[j],c,d,!0);n.isEmptyObject(i)&&(delete r.handle,L.remove(a,"events"))}},trigger:function(b,c,d,e){var f,g,h,i,k,m,o,p=[d||l],q=j.call(b,"type")?b.type:b,r=j.call(b,"namespace")?b.namespace.split("."):[];if(g=h=d=d||l,3!==d.nodeType&&8!==d.nodeType&&!X.test(q+n.event.triggered)&&(q.indexOf(".")>=0&&(r=q.split("."),q=r.shift(),r.sort()),k=q.indexOf(":")<0&&"on"+q,b=b[n.expando]?b:new n.Event(q,"object"==typeof b&&b),b.isTrigger=e?2:3,b.namespace=r.join("."),b.namespace_re=b.namespace?new RegExp("(^|\\.)"+r.join("\\.(?:.*\\.|)")+"(\\.|$)"):null,b.result=void 0,b.target||(b.target=d),c=null==c?[b]:n.makeArray(c,[b]),o=n.event.special[q]||{},e||!o.trigger||o.trigger.apply(d,c)!==!1)){if(!e&&!o.noBubble&&!n.isWindow(d)){for(i=o.delegateType||q,X.test(i+q)||(g=g.parentNode);g;g=g.parentNode)p.push(g),h=g;h===(d.ownerDocument||l)&&p.push(h.defaultView||h.parentWindow||a)}f=0;while((g=p[f++])&&!b.isPropagationStopped())b.type=f>1?i:o.bindType||q,m=(L.get(g,"events")||{})[b.type]&&L.get(g,"handle"),m&&m.apply(g,c),m=k&&g[k],m&&m.apply&&n.acceptData(g)&&(b.result=m.apply(g,c),b.result===!1&&b.preventDefault());return b.type=q,e||b.isDefaultPrevented()||o._default&&o._default.apply(p.pop(),c)!==!1||!n.acceptData(d)||k&&n.isFunction(d[q])&&!n.isWindow(d)&&(h=d[k],h&&(d[k]=null),n.event.triggered=q,d[q](),n.event.triggered=void 0,h&&(d[k]=h)),b.result}},dispatch:function(a){a=n.event.fix(a);var b,c,e,f,g,h=[],i=d.call(arguments),j=(L.get(this,"events")||{})[a.type]||[],k=n.event.special[a.type]||{};if(i[0]=a,a.delegateTarget=this,!k.preDispatch||k.preDispatch.call(this,a)!==!1){h=n.event.handlers.call(this,a,j),b=0;while((f=h[b++])&&!a.isPropagationStopped()){a.currentTarget=f.elem,c=0;while((g=f.handlers[c++])&&!a.isImmediatePropagationStopped())(!a.namespace_re||a.namespace_re.test(g.namespace))&&(a.handleObj=g,a.data=g.data,e=((n.event.special[g.origType]||{}).handle||g.handler).apply(f.elem,i),void 0!==e&&(a.result=e)===!1&&(a.preventDefault(),a.stopPropagation()))}return k.postDispatch&&k.postDispatch.call(this,a),a.result}},handlers:function(a,b){var c,d,e,f,g=[],h=b.delegateCount,i=a.target;if(h&&i.nodeType&&(!a.button||"click"!==a.type))for(;i!==this;i=i.parentNode||this)if(i.disabled!==!0||"click"!==a.type){for(d=[],c=0;h>c;c++)f=b[c],e=f.selector+" ",void 0===d[e]&&(d[e]=f.needsContext?n(e,this).index(i)>=0:n.find(e,this,null,[i]).length),d[e]&&d.push(f);d.length&&g.push({elem:i,handlers:d})}return h<b.length&&g.push({elem:this,handlers:b.slice(h)}),g},props:"altKey bubbles cancelable ctrlKey currentTarget eventPhase metaKey relatedTarget shiftKey target timeStamp view which".split(" "),fixHooks:{},keyHooks:{props:"char charCode key keyCode".split(" "),filter:function(a,b){return null==a.which&&(a.which=null!=b.charCode?b.charCode:b.keyCode),a}},mouseHooks:{props:"button buttons clientX clientY offsetX offsetY pageX pageY screenX screenY toElement".split(" "),filter:function(a,b){var c,d,e,f=b.button;return null==a.pageX&&null!=b.clientX&&(c=a.target.ownerDocument||l,d=c.documentElement,e=c.body,a.pageX=b.clientX+(d&&d.scrollLeft||e&&e.scrollLeft||0)-(d&&d.clientLeft||e&&e.clientLeft||0),a.pageY=b.clientY+(d&&d.scrollTop||e&&e.scrollTop||0)-(d&&d.clientTop||e&&e.clientTop||0)),a.which||void 0===f||(a.which=1&f?1:2&f?3:4&f?2:0),a}},fix:function(a){if(a[n.expando])return a;var b,c,d,e=a.type,f=a,g=this.fixHooks[e];g||(this.fixHooks[e]=g=W.test(e)?this.mouseHooks:V.test(e)?this.keyHooks:{}),d=g.props?this.props.concat(g.props):this.props,a=new n.Event(f),b=d.length;while(b--)c=d[b],a[c]=f[c];return a.target||(a.target=l),3===a.target.nodeType&&(a.target=a.target.parentNode),g.filter?g.filter(a,f):a},special:{load:{noBubble:!0},focus:{trigger:function(){return this!==_()&&this.focus?(this.focus(),!1):void 0},delegateType:"focusin"},blur:{trigger:function(){return this===_()&&this.blur?(this.blur(),!1):void 0},delegateType:"focusout"},click:{trigger:function(){return"checkbox"===this.type&&this.click&&n.nodeName(this,"input")?(this.click(),!1):void 0},_default:function(a){return n.nodeName(a.target,"a")}},beforeunload:{postDispatch:function(a){void 0!==a.result&&a.originalEvent&&(a.originalEvent.returnValue=a.result)}}},simulate:function(a,b,c,d){var e=n.extend(new n.Event,c,{type:a,isSimulated:!0,originalEvent:{}});d?n.event.trigger(e,null,b):n.event.dispatch.call(b,e),e.isDefaultPrevented()&&c.preventDefault()}},n.removeEvent=function(a,b,c){a.removeEventListener&&a.removeEventListener(b,c,!1)},n.Event=function(a,b){return this instanceof n.Event?(a&&a.type?(this.originalEvent=a,this.type=a.type,this.isDefaultPrevented=a.defaultPrevented||void 0===a.defaultPrevented&&a.returnValue===!1?Z:$):this.type=a,b&&n.extend(this,b),this.timeStamp=a&&a.timeStamp||n.now(),void(this[n.expando]=!0)):new n.Event(a,b)},n.Event.prototype={isDefaultPrevented:$,isPropagationStopped:$,isImmediatePropagationStopped:$,preventDefault:function(){var a=this.originalEvent;this.isDefaultPrevented=Z,a&&a.preventDefault&&a.preventDefault()},stopPropagation:function(){var a=this.originalEvent;this.isPropagationStopped=Z,a&&a.stopPropagation&&a.stopPropagation()},stopImmediatePropagation:function(){var a=this.originalEvent;this.isImmediatePropagationStopped=Z,a&&a.stopImmediatePropagation&&a.stopImmediatePropagation(),this.stopPropagation()}},n.each({mouseenter:"mouseover",mouseleave:"mouseout",pointerenter:"pointerover",pointerleave:"pointerout"},function(a,b){n.event.special[a]={delegateType:b,bindType:b,handle:function(a){var c,d=this,e=a.relatedTarget,f=a.handleObj;return(!e||e!==d&&!n.contains(d,e))&&(a.type=f.origType,c=f.handler.apply(this,arguments),a.type=b),c}}}),k.focusinBubbles||n.each({focus:"focusin",blur:"focusout"},function(a,b){var c=function(a){n.event.simulate(b,a.target,n.event.fix(a),!0)};n.event.special[b]={setup:function(){var d=this.ownerDocument||this,e=L.access(d,b);e||d.addEventListener(a,c,!0),L.access(d,b,(e||0)+1)},teardown:function(){var d=this.ownerDocument||this,e=L.access(d,b)-1;e?L.access(d,b,e):(d.removeEventListener(a,c,!0),L.remove(d,b))}}}),n.fn.extend({on:function(a,b,c,d,e){var f,g;if("object"==typeof a){"string"!=typeof b&&(c=c||b,b=void 0);for(g in a)this.on(g,b,c,a[g],e);return this}if(null==c&&null==d?(d=b,c=b=void 0):null==d&&("string"==typeof b?(d=c,c=void 0):(d=c,c=b,b=void 0)),d===!1)d=$;else if(!d)return this;return 1===e&&(f=d,d=function(a){return n().off(a),f.apply(this,arguments)},d.guid=f.guid||(f.guid=n.guid++)),this.each(function(){n.event.add(this,a,d,c,b)})},one:function(a,b,c,d){return this.on(a,b,c,d,1)},off:function(a,b,c){var d,e;if(a&&a.preventDefault&&a.handleObj)return d=a.handleObj,n(a.delegateTarget).off(d.namespace?d.origType+"."+d.namespace:d.origType,d.selector,d.handler),this;if("object"==typeof a){for(e in a)this.off(e,b,a[e]);return this}return(b===!1||"function"==typeof b)&&(c=b,b=void 0),c===!1&&(c=$),this.each(function(){n.event.remove(this,a,c,b)})},trigger:function(a,b){return this.each(function(){n.event.trigger(a,b,this)})},triggerHandler:function(a,b){var c=this[0];return c?n.event.trigger(a,b,c,!0):void 0}});var aa=/<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/gi,ba=/<([\w:]+)/,ca=/<|&#?\w+;/,da=/<(?:script|style|link)/i,ea=/checked\s*(?:[^=]|=\s*.checked.)/i,fa=/^$|\/(?:java|ecma)script/i,ga=/^true\/(.*)/,ha=/^\s*<!(?:\[CDATA\[|--)|(?:\]\]|--)>\s*$/g,ia={option:[1,"<select multiple='multiple'>","</select>"],thead:[1,"<table>","</table>"],col:[2,"<table><colgroup>","</colgroup></table>"],tr:[2,"<table><tbody>","</tbody></table>"],td:[3,"<table><tbody><tr>","</tr></tbody></table>"],_default:[0,"",""]};ia.optgroup=ia.option,ia.tbody=ia.tfoot=ia.colgroup=ia.caption=ia.thead,ia.th=ia.td;function ja(a,b){return n.nodeName(a,"table")&&n.nodeName(11!==b.nodeType?b:b.firstChild,"tr")?a.getElementsByTagName("tbody")[0]||a.appendChild(a.ownerDocument.createElement("tbody")):a}function ka(a){return a.type=(null!==a.getAttribute("type"))+"/"+a.type,a}function la(a){var b=ga.exec(a.type);return b?a.type=b[1]:a.removeAttribute("type"),a}function ma(a,b){for(var c=0,d=a.length;d>c;c++)L.set(a[c],"globalEval",!b||L.get(b[c],"globalEval"))}function na(a,b){var c,d,e,f,g,h,i,j;if(1===b.nodeType){if(L.hasData(a)&&(f=L.access(a),g=L.set(b,f),j=f.events)){delete g.handle,g.events={};for(e in j)for(c=0,d=j[e].length;d>c;c++)n.event.add(b,e,j[e][c])}M.hasData(a)&&(h=M.access(a),i=n.extend({},h),M.set(b,i))}}function oa(a,b){var c=a.getElementsByTagName?a.getElementsByTagName(b||"*"):a.querySelectorAll?a.querySelectorAll(b||"*"):[];return void 0===b||b&&n.nodeName(a,b)?n.merge([a],c):c}function pa(a,b){var c=b.nodeName.toLowerCase();"input"===c&&T.test(a.type)?b.checked=a.checked:("input"===c||"textarea"===c)&&(b.defaultValue=a.defaultValue)}n.extend({clone:function(a,b,c){var d,e,f,g,h=a.cloneNode(!0),i=n.contains(a.ownerDocument,a);if(!(k.noCloneChecked||1!==a.nodeType&&11!==a.nodeType||n.isXMLDoc(a)))for(g=oa(h),f=oa(a),d=0,e=f.length;e>d;d++)pa(f[d],g[d]);if(b)if(c)for(f=f||oa(a),g=g||oa(h),d=0,e=f.length;e>d;d++)na(f[d],g[d]);else na(a,h);return g=oa(h,"script"),g.length>0&&ma(g,!i&&oa(a,"script")),h},buildFragment:function(a,b,c,d){for(var e,f,g,h,i,j,k=b.createDocumentFragment(),l=[],m=0,o=a.length;o>m;m++)if(e=a[m],e||0===e)if("object"===n.type(e))n.merge(l,e.nodeType?[e]:e);else if(ca.test(e)){f=f||k.appendChild(b.createElement("div")),g=(ba.exec(e)||["",""])[1].toLowerCase(),h=ia[g]||ia._default,f.innerHTML=h[1]+e.replace(aa,"<$1></$2>")+h[2],j=h[0];while(j--)f=f.lastChild;n.merge(l,f.childNodes),f=k.firstChild,f.textContent=""}else l.push(b.createTextNode(e));k.textContent="",m=0;while(e=l[m++])if((!d||-1===n.inArray(e,d))&&(i=n.contains(e.ownerDocument,e),f=oa(k.appendChild(e),"script"),i&&ma(f),c)){j=0;while(e=f[j++])fa.test(e.type||"")&&c.push(e)}return k},cleanData:function(a){for(var b,c,d,e,f=n.event.special,g=0;void 0!==(c=a[g]);g++){if(n.acceptData(c)&&(e=c[L.expando],e&&(b=L.cache[e]))){if(b.events)for(d in b.events)f[d]?n.event.remove(c,d):n.removeEvent(c,d,b.handle);L.cache[e]&&delete L.cache[e]}delete M.cache[c[M.expando]]}}}),n.fn.extend({text:function(a){return J(this,function(a){return void 0===a?n.text(this):this.empty().each(function(){(1===this.nodeType||11===this.nodeType||9===this.nodeType)&&(this.textContent=a)})},null,a,arguments.length)},append:function(){return this.domManip(arguments,function(a){if(1===this.nodeType||11===this.nodeType||9===this.nodeType){var b=ja(this,a);b.appendChild(a)}})},prepend:function(){return this.domManip(arguments,function(a){if(1===this.nodeType||11===this.nodeType||9===this.nodeType){var b=ja(this,a);b.insertBefore(a,b.firstChild)}})},before:function(){return this.domManip(arguments,function(a){this.parentNode&&this.parentNode.insertBefore(a,this)})},after:function(){return this.domManip(arguments,function(a){this.parentNode&&this.parentNode.insertBefore(a,this.nextSibling)})},remove:function(a,b){for(var c,d=a?n.filter(a,this):this,e=0;null!=(c=d[e]);e++)b||1!==c.nodeType||n.cleanData(oa(c)),c.parentNode&&(b&&n.contains(c.ownerDocument,c)&&ma(oa(c,"script")),c.parentNode.removeChild(c));return this},empty:function(){for(var a,b=0;null!=(a=this[b]);b++)1===a.nodeType&&(n.cleanData(oa(a,!1)),a.textContent="");return this},clone:function(a,b){return a=null==a?!1:a,b=null==b?a:b,this.map(function(){return n.clone(this,a,b)})},html:function(a){return J(this,function(a){var b=this[0]||{},c=0,d=this.length;if(void 0===a&&1===b.nodeType)return b.innerHTML;if("string"==typeof a&&!da.test(a)&&!ia[(ba.exec(a)||["",""])[1].toLowerCase()]){a=a.replace(aa,"<$1></$2>");try{for(;d>c;c++)b=this[c]||{},1===b.nodeType&&(n.cleanData(oa(b,!1)),b.innerHTML=a);b=0}catch(e){}}b&&this.empty().append(a)},null,a,arguments.length)},replaceWith:function(){var a=arguments[0];return this.domManip(arguments,function(b){a=this.parentNode,n.cleanData(oa(this)),a&&a.replaceChild(b,this)}),a&&(a.length||a.nodeType)?this:this.remove()},detach:function(a){return this.remove(a,!0)},domManip:function(a,b){a=e.apply([],a);var c,d,f,g,h,i,j=0,l=this.length,m=this,o=l-1,p=a[0],q=n.isFunction(p);if(q||l>1&&"string"==typeof p&&!k.checkClone&&ea.test(p))return this.each(function(c){var d=m.eq(c);q&&(a[0]=p.call(this,c,d.html())),d.domManip(a,b)});if(l&&(c=n.buildFragment(a,this[0].ownerDocument,!1,this),d=c.firstChild,1===c.childNodes.length&&(c=d),d)){for(f=n.map(oa(c,"script"),ka),g=f.length;l>j;j++)h=c,j!==o&&(h=n.clone(h,!0,!0),g&&n.merge(f,oa(h,"script"))),b.call(this[j],h,j);if(g)for(i=f[f.length-1].ownerDocument,n.map(f,la),j=0;g>j;j++)h=f[j],fa.test(h.type||"")&&!L.access(h,"globalEval")&&n.contains(i,h)&&(h.src?n._evalUrl&&n._evalUrl(h.src):n.globalEval(h.textContent.replace(ha,"")))}return this}}),n.each({appendTo:"append",prependTo:"prepend",insertBefore:"before",insertAfter:"after",replaceAll:"replaceWith"},function(a,b){n.fn[a]=function(a){for(var c,d=[],e=n(a),g=e.length-1,h=0;g>=h;h++)c=h===g?this:this.clone(!0),n(e[h])[b](c),f.apply(d,c.get());return this.pushStack(d)}});var qa,ra={};function sa(b,c){var d,e=n(c.createElement(b)).appendTo(c.body),f=a.getDefaultComputedStyle&&(d=a.getDefaultComputedStyle(e[0]))?d.display:n.css(e[0],"display");return e.detach(),f}function ta(a){var b=l,c=ra[a];return c||(c=sa(a,b),"none"!==c&&c||(qa=(qa||n("<iframe frameborder='0' width='0' height='0'/>")).appendTo(b.documentElement),b=qa[0].contentDocument,b.write(),b.close(),c=sa(a,b),qa.detach()),ra[a]=c),c}var ua=/^margin/,va=new RegExp("^("+Q+")(?!px)[a-z%]+$","i"),wa=function(b){return b.ownerDocument.defaultView.opener?b.ownerDocument.defaultView.getComputedStyle(b,null):a.getComputedStyle(b,null)};function xa(a,b,c){var d,e,f,g,h=a.style;return c=c||wa(a),c&&(g=c.getPropertyValue(b)||c[b]),c&&(""!==g||n.contains(a.ownerDocument,a)||(g=n.style(a,b)),va.test(g)&&ua.test(b)&&(d=h.width,e=h.minWidth,f=h.maxWidth,h.minWidth=h.maxWidth=h.width=g,g=c.width,h.width=d,h.minWidth=e,h.maxWidth=f)),void 0!==g?g+"":g}function ya(a,b){return{get:function(){return a()?void delete this.get:(this.get=b).apply(this,arguments)}}}!function(){var b,c,d=l.documentElement,e=l.createElement("div"),f=l.createElement("div");if(f.style){f.style.backgroundClip="content-box",f.cloneNode(!0).style.backgroundClip="",k.clearCloneStyle="content-box"===f.style.backgroundClip,e.style.cssText="border:0;width:0;height:0;top:0;left:-9999px;margin-top:1px;position:absolute",e.appendChild(f);function g(){f.style.cssText="-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;display:block;margin-top:1%;top:1%;border:1px;padding:1px;width:4px;position:absolute",f.innerHTML="",d.appendChild(e);var g=a.getComputedStyle(f,null);b="1%"!==g.top,c="4px"===g.width,d.removeChild(e)}a.getComputedStyle&&n.extend(k,{pixelPosition:function(){return g(),b},boxSizingReliable:function(){return null==c&&g(),c},reliableMarginRight:function(){var b,c=f.appendChild(l.createElement("div"));return c.style.cssText=f.style.cssText="-webkit-box-sizing:content-box;-moz-box-sizing:content-box;box-sizing:content-box;display:block;margin:0;border:0;padding:0",c.style.marginRight=c.style.width="0",f.style.width="1px",d.appendChild(e),b=!parseFloat(a.getComputedStyle(c,null).marginRight),d.removeChild(e),f.removeChild(c),b}})}}(),n.swap=function(a,b,c,d){var e,f,g={};for(f in b)g[f]=a.style[f],a.style[f]=b[f];e=c.apply(a,d||[]);for(f in b)a.style[f]=g[f];return e};var za=/^(none|table(?!-c[ea]).+)/,Aa=new RegExp("^("+Q+")(.*)$","i"),Ba=new RegExp("^([+-])=("+Q+")","i"),Ca={position:"absolute",visibility:"hidden",display:"block"},Da={letterSpacing:"0",fontWeight:"400"},Ea=["Webkit","O","Moz","ms"];function Fa(a,b){if(b in a)return b;var c=b[0].toUpperCase()+b.slice(1),d=b,e=Ea.length;while(e--)if(b=Ea[e]+c,b in a)return b;return d}function Ga(a,b,c){var d=Aa.exec(b);return d?Math.max(0,d[1]-(c||0))+(d[2]||"px"):b}function Ha(a,b,c,d,e){for(var f=c===(d?"border":"content")?4:"width"===b?1:0,g=0;4>f;f+=2)"margin"===c&&(g+=n.css(a,c+R[f],!0,e)),d?("content"===c&&(g-=n.css(a,"padding"+R[f],!0,e)),"margin"!==c&&(g-=n.css(a,"border"+R[f]+"Width",!0,e))):(g+=n.css(a,"padding"+R[f],!0,e),"padding"!==c&&(g+=n.css(a,"border"+R[f]+"Width",!0,e)));return g}function Ia(a,b,c){var d=!0,e="width"===b?a.offsetWidth:a.offsetHeight,f=wa(a),g="border-box"===n.css(a,"boxSizing",!1,f);if(0>=e||null==e){if(e=xa(a,b,f),(0>e||null==e)&&(e=a.style[b]),va.test(e))return e;d=g&&(k.boxSizingReliable()||e===a.style[b]),e=parseFloat(e)||0}return e+Ha(a,b,c||(g?"border":"content"),d,f)+"px"}function Ja(a,b){for(var c,d,e,f=[],g=0,h=a.length;h>g;g++)d=a[g],d.style&&(f[g]=L.get(d,"olddisplay"),c=d.style.display,b?(f[g]||"none"!==c||(d.style.display=""),""===d.style.display&&S(d)&&(f[g]=L.access(d,"olddisplay",ta(d.nodeName)))):(e=S(d),"none"===c&&e||L.set(d,"olddisplay",e?c:n.css(d,"display"))));for(g=0;h>g;g++)d=a[g],d.style&&(b&&"none"!==d.style.display&&""!==d.style.display||(d.style.display=b?f[g]||"":"none"));return a}n.extend({cssHooks:{opacity:{get:function(a,b){if(b){var c=xa(a,"opacity");return""===c?"1":c}}}},cssNumber:{columnCount:!0,fillOpacity:!0,flexGrow:!0,flexShrink:!0,fontWeight:!0,lineHeight:!0,opacity:!0,order:!0,orphans:!0,widows:!0,zIndex:!0,zoom:!0},cssProps:{"float":"cssFloat"},style:function(a,b,c,d){if(a&&3!==a.nodeType&&8!==a.nodeType&&a.style){var e,f,g,h=n.camelCase(b),i=a.style;return b=n.cssProps[h]||(n.cssProps[h]=Fa(i,h)),g=n.cssHooks[b]||n.cssHooks[h],void 0===c?g&&"get"in g&&void 0!==(e=g.get(a,!1,d))?e:i[b]:(f=typeof c,"string"===f&&(e=Ba.exec(c))&&(c=(e[1]+1)*e[2]+parseFloat(n.css(a,b)),f="number"),null!=c&&c===c&&("number"!==f||n.cssNumber[h]||(c+="px"),k.clearCloneStyle||""!==c||0!==b.indexOf("background")||(i[b]="inherit"),g&&"set"in g&&void 0===(c=g.set(a,c,d))||(i[b]=c)),void 0)}},css:function(a,b,c,d){var e,f,g,h=n.camelCase(b);return b=n.cssProps[h]||(n.cssProps[h]=Fa(a.style,h)),g=n.cssHooks[b]||n.cssHooks[h],g&&"get"in g&&(e=g.get(a,!0,c)),void 0===e&&(e=xa(a,b,d)),"normal"===e&&b in Da&&(e=Da[b]),""===c||c?(f=parseFloat(e),c===!0||n.isNumeric(f)?f||0:e):e}}),n.each(["height","width"],function(a,b){n.cssHooks[b]={get:function(a,c,d){return c?za.test(n.css(a,"display"))&&0===a.offsetWidth?n.swap(a,Ca,function(){return Ia(a,b,d)}):Ia(a,b,d):void 0},set:function(a,c,d){var e=d&&wa(a);return Ga(a,c,d?Ha(a,b,d,"border-box"===n.css(a,"boxSizing",!1,e),e):0)}}}),n.cssHooks.marginRight=ya(k.reliableMarginRight,function(a,b){return b?n.swap(a,{display:"inline-block"},xa,[a,"marginRight"]):void 0}),n.each({margin:"",padding:"",border:"Width"},function(a,b){n.cssHooks[a+b]={expand:function(c){for(var d=0,e={},f="string"==typeof c?c.split(" "):[c];4>d;d++)e[a+R[d]+b]=f[d]||f[d-2]||f[0];return e}},ua.test(a)||(n.cssHooks[a+b].set=Ga)}),n.fn.extend({css:function(a,b){return J(this,function(a,b,c){var d,e,f={},g=0;if(n.isArray(b)){for(d=wa(a),e=b.length;e>g;g++)f[b[g]]=n.css(a,b[g],!1,d);return f}return void 0!==c?n.style(a,b,c):n.css(a,b)},a,b,arguments.length>1)},show:function(){return Ja(this,!0)},hide:function(){return Ja(this)},toggle:function(a){return"boolean"==typeof a?a?this.show():this.hide():this.each(function(){S(this)?n(this).show():n(this).hide()})}});function Ka(a,b,c,d,e){return new Ka.prototype.init(a,b,c,d,e)}n.Tween=Ka,Ka.prototype={constructor:Ka,init:function(a,b,c,d,e,f){this.elem=a,this.prop=c,this.easing=e||"swing",this.options=b,this.start=this.now=this.cur(),this.end=d,this.unit=f||(n.cssNumber[c]?"":"px")},cur:function(){var a=Ka.propHooks[this.prop];return a&&a.get?a.get(this):Ka.propHooks._default.get(this)},run:function(a){var b,c=Ka.propHooks[this.prop];return this.options.duration?this.pos=b=n.easing[this.easing](a,this.options.duration*a,0,1,this.options.duration):this.pos=b=a,this.now=(this.end-this.start)*b+this.start,this.options.step&&this.options.step.call(this.elem,this.now,this),c&&c.set?c.set(this):Ka.propHooks._default.set(this),this}},Ka.prototype.init.prototype=Ka.prototype,Ka.propHooks={_default:{get:function(a){var b;return null==a.elem[a.prop]||a.elem.style&&null!=a.elem.style[a.prop]?(b=n.css(a.elem,a.prop,""),b&&"auto"!==b?b:0):a.elem[a.prop]},set:function(a){n.fx.step[a.prop]?n.fx.step[a.prop](a):a.elem.style&&(null!=a.elem.style[n.cssProps[a.prop]]||n.cssHooks[a.prop])?n.style(a.elem,a.prop,a.now+a.unit):a.elem[a.prop]=a.now}}},Ka.propHooks.scrollTop=Ka.propHooks.scrollLeft={set:function(a){a.elem.nodeType&&a.elem.parentNode&&(a.elem[a.prop]=a.now)}},n.easing={linear:function(a){return a},swing:function(a){return.5-Math.cos(a*Math.PI)/2}},n.fx=Ka.prototype.init,n.fx.step={};var La,Ma,Na=/^(?:toggle|show|hide)$/,Oa=new RegExp("^(?:([+-])=|)("+Q+")([a-z%]*)$","i"),Pa=/queueHooks$/,Qa=[Va],Ra={"*":[function(a,b){var c=this.createTween(a,b),d=c.cur(),e=Oa.exec(b),f=e&&e[3]||(n.cssNumber[a]?"":"px"),g=(n.cssNumber[a]||"px"!==f&&+d)&&Oa.exec(n.css(c.elem,a)),h=1,i=20;if(g&&g[3]!==f){f=f||g[3],e=e||[],g=+d||1;do h=h||".5",g/=h,n.style(c.elem,a,g+f);while(h!==(h=c.cur()/d)&&1!==h&&--i)}return e&&(g=c.start=+g||+d||0,c.unit=f,c.end=e[1]?g+(e[1]+1)*e[2]:+e[2]),c}]};function Sa(){return setTimeout(function(){La=void 0}),La=n.now()}function Ta(a,b){var c,d=0,e={height:a};for(b=b?1:0;4>d;d+=2-b)c=R[d],e["margin"+c]=e["padding"+c]=a;return b&&(e.opacity=e.width=a),e}function Ua(a,b,c){for(var d,e=(Ra[b]||[]).concat(Ra["*"]),f=0,g=e.length;g>f;f++)if(d=e[f].call(c,b,a))return d}function Va(a,b,c){var d,e,f,g,h,i,j,k,l=this,m={},o=a.style,p=a.nodeType&&S(a),q=L.get(a,"fxshow");c.queue||(h=n._queueHooks(a,"fx"),null==h.unqueued&&(h.unqueued=0,i=h.empty.fire,h.empty.fire=function(){h.unqueued||i()}),h.unqueued++,l.always(function(){l.always(function(){h.unqueued--,n.queue(a,"fx").length||h.empty.fire()})})),1===a.nodeType&&("height"in b||"width"in b)&&(c.overflow=[o.overflow,o.overflowX,o.overflowY],j=n.css(a,"display"),k="none"===j?L.get(a,"olddisplay")||ta(a.nodeName):j,"inline"===k&&"none"===n.css(a,"float")&&(o.display="inline-block")),c.overflow&&(o.overflow="hidden",l.always(function(){o.overflow=c.overflow[0],o.overflowX=c.overflow[1],o.overflowY=c.overflow[2]}));for(d in b)if(e=b[d],Na.exec(e)){if(delete b[d],f=f||"toggle"===e,e===(p?"hide":"show")){if("show"!==e||!q||void 0===q[d])continue;p=!0}m[d]=q&&q[d]||n.style(a,d)}else j=void 0;if(n.isEmptyObject(m))"inline"===("none"===j?ta(a.nodeName):j)&&(o.display=j);else{q?"hidden"in q&&(p=q.hidden):q=L.access(a,"fxshow",{}),f&&(q.hidden=!p),p?n(a).show():l.done(function(){n(a).hide()}),l.done(function(){var b;L.remove(a,"fxshow");for(b in m)n.style(a,b,m[b])});for(d in m)g=Ua(p?q[d]:0,d,l),d in q||(q[d]=g.start,p&&(g.end=g.start,g.start="width"===d||"height"===d?1:0))}}function Wa(a,b){var c,d,e,f,g;for(c in a)if(d=n.camelCase(c),e=b[d],f=a[c],n.isArray(f)&&(e=f[1],f=a[c]=f[0]),c!==d&&(a[d]=f,delete a[c]),g=n.cssHooks[d],g&&"expand"in g){f=g.expand(f),delete a[d];for(c in f)c in a||(a[c]=f[c],b[c]=e)}else b[d]=e}function Xa(a,b,c){var d,e,f=0,g=Qa.length,h=n.Deferred().always(function(){delete i.elem}),i=function(){if(e)return!1;for(var b=La||Sa(),c=Math.max(0,j.startTime+j.duration-b),d=c/j.duration||0,f=1-d,g=0,i=j.tweens.length;i>g;g++)j.tweens[g].run(f);return h.notifyWith(a,[j,f,c]),1>f&&i?c:(h.resolveWith(a,[j]),!1)},j=h.promise({elem:a,props:n.extend({},b),opts:n.extend(!0,{specialEasing:{}},c),originalProperties:b,originalOptions:c,startTime:La||Sa(),duration:c.duration,tweens:[],createTween:function(b,c){var d=n.Tween(a,j.opts,b,c,j.opts.specialEasing[b]||j.opts.easing);return j.tweens.push(d),d},stop:function(b){var c=0,d=b?j.tweens.length:0;if(e)return this;for(e=!0;d>c;c++)j.tweens[c].run(1);return b?h.resolveWith(a,[j,b]):h.rejectWith(a,[j,b]),this}}),k=j.props;for(Wa(k,j.opts.specialEasing);g>f;f++)if(d=Qa[f].call(j,a,k,j.opts))return d;return n.map(k,Ua,j),n.isFunction(j.opts.start)&&j.opts.start.call(a,j),n.fx.timer(n.extend(i,{elem:a,anim:j,queue:j.opts.queue})),j.progress(j.opts.progress).done(j.opts.done,j.opts.complete).fail(j.opts.fail).always(j.opts.always)}n.Animation=n.extend(Xa,{tweener:function(a,b){n.isFunction(a)?(b=a,a=["*"]):a=a.split(" ");for(var c,d=0,e=a.length;e>d;d++)c=a[d],Ra[c]=Ra[c]||[],Ra[c].unshift(b)},prefilter:function(a,b){b?Qa.unshift(a):Qa.push(a)}}),n.speed=function(a,b,c){var d=a&&"object"==typeof a?n.extend({},a):{complete:c||!c&&b||n.isFunction(a)&&a,duration:a,easing:c&&b||b&&!n.isFunction(b)&&b};return d.duration=n.fx.off?0:"number"==typeof d.duration?d.duration:d.duration in n.fx.speeds?n.fx.speeds[d.duration]:n.fx.speeds._default,(null==d.queue||d.queue===!0)&&(d.queue="fx"),d.old=d.complete,d.complete=function(){n.isFunction(d.old)&&d.old.call(this),d.queue&&n.dequeue(this,d.queue)},d},n.fn.extend({fadeTo:function(a,b,c,d){return this.filter(S).css("opacity",0).show().end().animate({opacity:b},a,c,d)},animate:function(a,b,c,d){var e=n.isEmptyObject(a),f=n.speed(b,c,d),g=function(){var b=Xa(this,n.extend({},a),f);(e||L.get(this,"finish"))&&b.stop(!0)};return g.finish=g,e||f.queue===!1?this.each(g):this.queue(f.queue,g)},stop:function(a,b,c){var d=function(a){var b=a.stop;delete a.stop,b(c)};return"string"!=typeof a&&(c=b,b=a,a=void 0),b&&a!==!1&&this.queue(a||"fx",[]),this.each(function(){var b=!0,e=null!=a&&a+"queueHooks",f=n.timers,g=L.get(this);if(e)g[e]&&g[e].stop&&d(g[e]);else for(e in g)g[e]&&g[e].stop&&Pa.test(e)&&d(g[e]);for(e=f.length;e--;)f[e].elem!==this||null!=a&&f[e].queue!==a||(f[e].anim.stop(c),b=!1,f.splice(e,1));(b||!c)&&n.dequeue(this,a)})},finish:function(a){return a!==!1&&(a=a||"fx"),this.each(function(){var b,c=L.get(this),d=c[a+"queue"],e=c[a+"queueHooks"],f=n.timers,g=d?d.length:0;for(c.finish=!0,n.queue(this,a,[]),e&&e.stop&&e.stop.call(this,!0),b=f.length;b--;)f[b].elem===this&&f[b].queue===a&&(f[b].anim.stop(!0),f.splice(b,1));for(b=0;g>b;b++)d[b]&&d[b].finish&&d[b].finish.call(this);delete c.finish})}}),n.each(["toggle","show","hide"],function(a,b){var c=n.fn[b];n.fn[b]=function(a,d,e){return null==a||"boolean"==typeof a?c.apply(this,arguments):this.animate(Ta(b,!0),a,d,e)}}),n.each({slideDown:Ta("show"),slideUp:Ta("hide"),slideToggle:Ta("toggle"),fadeIn:{opacity:"show"},fadeOut:{opacity:"hide"},fadeToggle:{opacity:"toggle"}},function(a,b){n.fn[a]=function(a,c,d){return this.animate(b,a,c,d)}}),n.timers=[],n.fx.tick=function(){var a,b=0,c=n.timers;for(La=n.now();b<c.length;b++)a=c[b],a()||c[b]!==a||c.splice(b--,1);c.length||n.fx.stop(),La=void 0},n.fx.timer=function(a){n.timers.push(a),a()?n.fx.start():n.timers.pop()},n.fx.interval=13,n.fx.start=function(){Ma||(Ma=setInterval(n.fx.tick,n.fx.interval))},n.fx.stop=function(){clearInterval(Ma),Ma=null},n.fx.speeds={slow:600,fast:200,_default:400},n.fn.delay=function(a,b){return a=n.fx?n.fx.speeds[a]||a:a,b=b||"fx",this.queue(b,function(b,c){var d=setTimeout(b,a);c.stop=function(){clearTimeout(d)}})},function(){var a=l.createElement("input"),b=l.createElement("select"),c=b.appendChild(l.createElement("option"));a.type="checkbox",k.checkOn=""!==a.value,k.optSelected=c.selected,b.disabled=!0,k.optDisabled=!c.disabled,a=l.createElement("input"),a.value="t",a.type="radio",k.radioValue="t"===a.value}();var Ya,Za,$a=n.expr.attrHandle;n.fn.extend({attr:function(a,b){return J(this,n.attr,a,b,arguments.length>1)},removeAttr:function(a){return this.each(function(){n.removeAttr(this,a)})}}),n.extend({attr:function(a,b,c){var d,e,f=a.nodeType;if(a&&3!==f&&8!==f&&2!==f)return typeof a.getAttribute===U?n.prop(a,b,c):(1===f&&n.isXMLDoc(a)||(b=b.toLowerCase(),d=n.attrHooks[b]||(n.expr.match.bool.test(b)?Za:Ya)),
void 0===c?d&&"get"in d&&null!==(e=d.get(a,b))?e:(e=n.find.attr(a,b),null==e?void 0:e):null!==c?d&&"set"in d&&void 0!==(e=d.set(a,c,b))?e:(a.setAttribute(b,c+""),c):void n.removeAttr(a,b))},removeAttr:function(a,b){var c,d,e=0,f=b&&b.match(E);if(f&&1===a.nodeType)while(c=f[e++])d=n.propFix[c]||c,n.expr.match.bool.test(c)&&(a[d]=!1),a.removeAttribute(c)},attrHooks:{type:{set:function(a,b){if(!k.radioValue&&"radio"===b&&n.nodeName(a,"input")){var c=a.value;return a.setAttribute("type",b),c&&(a.value=c),b}}}}}),Za={set:function(a,b,c){return b===!1?n.removeAttr(a,c):a.setAttribute(c,c),c}},n.each(n.expr.match.bool.source.match(/\w+/g),function(a,b){var c=$a[b]||n.find.attr;$a[b]=function(a,b,d){var e,f;return d||(f=$a[b],$a[b]=e,e=null!=c(a,b,d)?b.toLowerCase():null,$a[b]=f),e}});var _a=/^(?:input|select|textarea|button)$/i;n.fn.extend({prop:function(a,b){return J(this,n.prop,a,b,arguments.length>1)},removeProp:function(a){return this.each(function(){delete this[n.propFix[a]||a]})}}),n.extend({propFix:{"for":"htmlFor","class":"className"},prop:function(a,b,c){var d,e,f,g=a.nodeType;if(a&&3!==g&&8!==g&&2!==g)return f=1!==g||!n.isXMLDoc(a),f&&(b=n.propFix[b]||b,e=n.propHooks[b]),void 0!==c?e&&"set"in e&&void 0!==(d=e.set(a,c,b))?d:a[b]=c:e&&"get"in e&&null!==(d=e.get(a,b))?d:a[b]},propHooks:{tabIndex:{get:function(a){return a.hasAttribute("tabindex")||_a.test(a.nodeName)||a.href?a.tabIndex:-1}}}}),k.optSelected||(n.propHooks.selected={get:function(a){var b=a.parentNode;return b&&b.parentNode&&b.parentNode.selectedIndex,null}}),n.each(["tabIndex","readOnly","maxLength","cellSpacing","cellPadding","rowSpan","colSpan","useMap","frameBorder","contentEditable"],function(){n.propFix[this.toLowerCase()]=this});var ab=/[\t\r\n\f]/g;n.fn.extend({addClass:function(a){var b,c,d,e,f,g,h="string"==typeof a&&a,i=0,j=this.length;if(n.isFunction(a))return this.each(function(b){n(this).addClass(a.call(this,b,this.className))});if(h)for(b=(a||"").match(E)||[];j>i;i++)if(c=this[i],d=1===c.nodeType&&(c.className?(" "+c.className+" ").replace(ab," "):" ")){f=0;while(e=b[f++])d.indexOf(" "+e+" ")<0&&(d+=e+" ");g=n.trim(d),c.className!==g&&(c.className=g)}return this},removeClass:function(a){var b,c,d,e,f,g,h=0===arguments.length||"string"==typeof a&&a,i=0,j=this.length;if(n.isFunction(a))return this.each(function(b){n(this).removeClass(a.call(this,b,this.className))});if(h)for(b=(a||"").match(E)||[];j>i;i++)if(c=this[i],d=1===c.nodeType&&(c.className?(" "+c.className+" ").replace(ab," "):"")){f=0;while(e=b[f++])while(d.indexOf(" "+e+" ")>=0)d=d.replace(" "+e+" "," ");g=a?n.trim(d):"",c.className!==g&&(c.className=g)}return this},toggleClass:function(a,b){var c=typeof a;return"boolean"==typeof b&&"string"===c?b?this.addClass(a):this.removeClass(a):this.each(n.isFunction(a)?function(c){n(this).toggleClass(a.call(this,c,this.className,b),b)}:function(){if("string"===c){var b,d=0,e=n(this),f=a.match(E)||[];while(b=f[d++])e.hasClass(b)?e.removeClass(b):e.addClass(b)}else(c===U||"boolean"===c)&&(this.className&&L.set(this,"__className__",this.className),this.className=this.className||a===!1?"":L.get(this,"__className__")||"")})},hasClass:function(a){for(var b=" "+a+" ",c=0,d=this.length;d>c;c++)if(1===this[c].nodeType&&(" "+this[c].className+" ").replace(ab," ").indexOf(b)>=0)return!0;return!1}});var bb=/\r/g;n.fn.extend({val:function(a){var b,c,d,e=this[0];{if(arguments.length)return d=n.isFunction(a),this.each(function(c){var e;1===this.nodeType&&(e=d?a.call(this,c,n(this).val()):a,null==e?e="":"number"==typeof e?e+="":n.isArray(e)&&(e=n.map(e,function(a){return null==a?"":a+""})),b=n.valHooks[this.type]||n.valHooks[this.nodeName.toLowerCase()],b&&"set"in b&&void 0!==b.set(this,e,"value")||(this.value=e))});if(e)return b=n.valHooks[e.type]||n.valHooks[e.nodeName.toLowerCase()],b&&"get"in b&&void 0!==(c=b.get(e,"value"))?c:(c=e.value,"string"==typeof c?c.replace(bb,""):null==c?"":c)}}}),n.extend({valHooks:{option:{get:function(a){var b=n.find.attr(a,"value");return null!=b?b:n.trim(n.text(a))}},select:{get:function(a){for(var b,c,d=a.options,e=a.selectedIndex,f="select-one"===a.type||0>e,g=f?null:[],h=f?e+1:d.length,i=0>e?h:f?e:0;h>i;i++)if(c=d[i],!(!c.selected&&i!==e||(k.optDisabled?c.disabled:null!==c.getAttribute("disabled"))||c.parentNode.disabled&&n.nodeName(c.parentNode,"optgroup"))){if(b=n(c).val(),f)return b;g.push(b)}return g},set:function(a,b){var c,d,e=a.options,f=n.makeArray(b),g=e.length;while(g--)d=e[g],(d.selected=n.inArray(d.value,f)>=0)&&(c=!0);return c||(a.selectedIndex=-1),f}}}}),n.each(["radio","checkbox"],function(){n.valHooks[this]={set:function(a,b){return n.isArray(b)?a.checked=n.inArray(n(a).val(),b)>=0:void 0}},k.checkOn||(n.valHooks[this].get=function(a){return null===a.getAttribute("value")?"on":a.value})}),n.each("blur focus focusin focusout load resize scroll unload click dblclick mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave change select submit keydown keypress keyup error contextmenu".split(" "),function(a,b){n.fn[b]=function(a,c){return arguments.length>0?this.on(b,null,a,c):this.trigger(b)}}),n.fn.extend({hover:function(a,b){return this.mouseenter(a).mouseleave(b||a)},bind:function(a,b,c){return this.on(a,null,b,c)},unbind:function(a,b){return this.off(a,null,b)},delegate:function(a,b,c,d){return this.on(b,a,c,d)},undelegate:function(a,b,c){return 1===arguments.length?this.off(a,"**"):this.off(b,a||"**",c)}});var cb=n.now(),db=/\?/;n.parseJSON=function(a){return JSON.parse(a+"")},n.parseXML=function(a){var b,c;if(!a||"string"!=typeof a)return null;try{c=new DOMParser,b=c.parseFromString(a,"text/xml")}catch(d){b=void 0}return(!b||b.getElementsByTagName("parsererror").length)&&n.error("Invalid XML: "+a),b};var eb=/#.*$/,fb=/([?&])_=[^&]*/,gb=/^(.*?):[ \t]*([^\r\n]*)$/gm,hb=/^(?:about|app|app-storage|.+-extension|file|res|widget):$/,ib=/^(?:GET|HEAD)$/,jb=/^\/\//,kb=/^([\w.+-]+:)(?:\/\/(?:[^\/?#]*@|)([^\/?#:]*)(?::(\d+)|)|)/,lb={},mb={},nb="*/".concat("*"),ob=a.location.href,pb=kb.exec(ob.toLowerCase())||[];function qb(a){return function(b,c){"string"!=typeof b&&(c=b,b="*");var d,e=0,f=b.toLowerCase().match(E)||[];if(n.isFunction(c))while(d=f[e++])"+"===d[0]?(d=d.slice(1)||"*",(a[d]=a[d]||[]).unshift(c)):(a[d]=a[d]||[]).push(c)}}function rb(a,b,c,d){var e={},f=a===mb;function g(h){var i;return e[h]=!0,n.each(a[h]||[],function(a,h){var j=h(b,c,d);return"string"!=typeof j||f||e[j]?f?!(i=j):void 0:(b.dataTypes.unshift(j),g(j),!1)}),i}return g(b.dataTypes[0])||!e["*"]&&g("*")}function sb(a,b){var c,d,e=n.ajaxSettings.flatOptions||{};for(c in b)void 0!==b[c]&&((e[c]?a:d||(d={}))[c]=b[c]);return d&&n.extend(!0,a,d),a}function tb(a,b,c){var d,e,f,g,h=a.contents,i=a.dataTypes;while("*"===i[0])i.shift(),void 0===d&&(d=a.mimeType||b.getResponseHeader("Content-Type"));if(d)for(e in h)if(h[e]&&h[e].test(d)){i.unshift(e);break}if(i[0]in c)f=i[0];else{for(e in c){if(!i[0]||a.converters[e+" "+i[0]]){f=e;break}g||(g=e)}f=f||g}return f?(f!==i[0]&&i.unshift(f),c[f]):void 0}function ub(a,b,c,d){var e,f,g,h,i,j={},k=a.dataTypes.slice();if(k[1])for(g in a.converters)j[g.toLowerCase()]=a.converters[g];f=k.shift();while(f)if(a.responseFields[f]&&(c[a.responseFields[f]]=b),!i&&d&&a.dataFilter&&(b=a.dataFilter(b,a.dataType)),i=f,f=k.shift())if("*"===f)f=i;else if("*"!==i&&i!==f){if(g=j[i+" "+f]||j["* "+f],!g)for(e in j)if(h=e.split(" "),h[1]===f&&(g=j[i+" "+h[0]]||j["* "+h[0]])){g===!0?g=j[e]:j[e]!==!0&&(f=h[0],k.unshift(h[1]));break}if(g!==!0)if(g&&a["throws"])b=g(b);else try{b=g(b)}catch(l){return{state:"parsererror",error:g?l:"No conversion from "+i+" to "+f}}}return{state:"success",data:b}}n.extend({active:0,lastModified:{},etag:{},ajaxSettings:{url:ob,type:"GET",isLocal:hb.test(pb[1]),global:!0,processData:!0,async:!0,contentType:"application/x-www-form-urlencoded; charset=UTF-8",accepts:{"*":nb,text:"text/plain",html:"text/html",xml:"application/xml, text/xml",json:"application/json, text/javascript"},contents:{xml:/xml/,html:/html/,json:/json/},responseFields:{xml:"responseXML",text:"responseText",json:"responseJSON"},converters:{"* text":String,"text html":!0,"text json":n.parseJSON,"text xml":n.parseXML},flatOptions:{url:!0,context:!0}},ajaxSetup:function(a,b){return b?sb(sb(a,n.ajaxSettings),b):sb(n.ajaxSettings,a)},ajaxPrefilter:qb(lb),ajaxTransport:qb(mb),ajax:function(a,b){"object"==typeof a&&(b=a,a=void 0),b=b||{};var c,d,e,f,g,h,i,j,k=n.ajaxSetup({},b),l=k.context||k,m=k.context&&(l.nodeType||l.jquery)?n(l):n.event,o=n.Deferred(),p=n.Callbacks("once memory"),q=k.statusCode||{},r={},s={},t=0,u="canceled",v={readyState:0,getResponseHeader:function(a){var b;if(2===t){if(!f){f={};while(b=gb.exec(e))f[b[1].toLowerCase()]=b[2]}b=f[a.toLowerCase()]}return null==b?null:b},getAllResponseHeaders:function(){return 2===t?e:null},setRequestHeader:function(a,b){var c=a.toLowerCase();return t||(a=s[c]=s[c]||a,r[a]=b),this},overrideMimeType:function(a){return t||(k.mimeType=a),this},statusCode:function(a){var b;if(a)if(2>t)for(b in a)q[b]=[q[b],a[b]];else v.always(a[v.status]);return this},abort:function(a){var b=a||u;return c&&c.abort(b),x(0,b),this}};if(o.promise(v).complete=p.add,v.success=v.done,v.error=v.fail,k.url=((a||k.url||ob)+"").replace(eb,"").replace(jb,pb[1]+"//"),k.type=b.method||b.type||k.method||k.type,k.dataTypes=n.trim(k.dataType||"*").toLowerCase().match(E)||[""],null==k.crossDomain&&(h=kb.exec(k.url.toLowerCase()),k.crossDomain=!(!h||h[1]===pb[1]&&h[2]===pb[2]&&(h[3]||("http:"===h[1]?"80":"443"))===(pb[3]||("http:"===pb[1]?"80":"443")))),k.data&&k.processData&&"string"!=typeof k.data&&(k.data=n.param(k.data,k.traditional)),rb(lb,k,b,v),2===t)return v;i=n.event&&k.global,i&&0===n.active++&&n.event.trigger("ajaxStart"),k.type=k.type.toUpperCase(),k.hasContent=!ib.test(k.type),d=k.url,k.hasContent||(k.data&&(d=k.url+=(db.test(d)?"&":"?")+k.data,delete k.data),k.cache===!1&&(k.url=fb.test(d)?d.replace(fb,"$1_="+cb++):d+(db.test(d)?"&":"?")+"_="+cb++)),k.ifModified&&(n.lastModified[d]&&v.setRequestHeader("If-Modified-Since",n.lastModified[d]),n.etag[d]&&v.setRequestHeader("If-None-Match",n.etag[d])),(k.data&&k.hasContent&&k.contentType!==!1||b.contentType)&&v.setRequestHeader("Content-Type",k.contentType),v.setRequestHeader("Accept",k.dataTypes[0]&&k.accepts[k.dataTypes[0]]?k.accepts[k.dataTypes[0]]+("*"!==k.dataTypes[0]?", "+nb+"; q=0.01":""):k.accepts["*"]);for(j in k.headers)v.setRequestHeader(j,k.headers[j]);if(k.beforeSend&&(k.beforeSend.call(l,v,k)===!1||2===t))return v.abort();u="abort";for(j in{success:1,error:1,complete:1})v[j](k[j]);if(c=rb(mb,k,b,v)){v.readyState=1,i&&m.trigger("ajaxSend",[v,k]),k.async&&k.timeout>0&&(g=setTimeout(function(){v.abort("timeout")},k.timeout));try{t=1,c.send(r,x)}catch(w){if(!(2>t))throw w;x(-1,w)}}else x(-1,"No Transport");function x(a,b,f,h){var j,r,s,u,w,x=b;2!==t&&(t=2,g&&clearTimeout(g),c=void 0,e=h||"",v.readyState=a>0?4:0,j=a>=200&&300>a||304===a,f&&(u=tb(k,v,f)),u=ub(k,u,v,j),j?(k.ifModified&&(w=v.getResponseHeader("Last-Modified"),w&&(n.lastModified[d]=w),w=v.getResponseHeader("etag"),w&&(n.etag[d]=w)),204===a||"HEAD"===k.type?x="nocontent":304===a?x="notmodified":(x=u.state,r=u.data,s=u.error,j=!s)):(s=x,(a||!x)&&(x="error",0>a&&(a=0))),v.status=a,v.statusText=(b||x)+"",j?o.resolveWith(l,[r,x,v]):o.rejectWith(l,[v,x,s]),v.statusCode(q),q=void 0,i&&m.trigger(j?"ajaxSuccess":"ajaxError",[v,k,j?r:s]),p.fireWith(l,[v,x]),i&&(m.trigger("ajaxComplete",[v,k]),--n.active||n.event.trigger("ajaxStop")))}return v},getJSON:function(a,b,c){return n.get(a,b,c,"json")},getScript:function(a,b){return n.get(a,void 0,b,"script")}}),n.each(["get","post"],function(a,b){n[b]=function(a,c,d,e){return n.isFunction(c)&&(e=e||d,d=c,c=void 0),n.ajax({url:a,type:b,dataType:e,data:c,success:d})}}),n._evalUrl=function(a){return n.ajax({url:a,type:"GET",dataType:"script",async:!1,global:!1,"throws":!0})},n.fn.extend({wrapAll:function(a){var b;return n.isFunction(a)?this.each(function(b){n(this).wrapAll(a.call(this,b))}):(this[0]&&(b=n(a,this[0].ownerDocument).eq(0).clone(!0),this[0].parentNode&&b.insertBefore(this[0]),b.map(function(){var a=this;while(a.firstElementChild)a=a.firstElementChild;return a}).append(this)),this)},wrapInner:function(a){return this.each(n.isFunction(a)?function(b){n(this).wrapInner(a.call(this,b))}:function(){var b=n(this),c=b.contents();c.length?c.wrapAll(a):b.append(a)})},wrap:function(a){var b=n.isFunction(a);return this.each(function(c){n(this).wrapAll(b?a.call(this,c):a)})},unwrap:function(){return this.parent().each(function(){n.nodeName(this,"body")||n(this).replaceWith(this.childNodes)}).end()}}),n.expr.filters.hidden=function(a){return a.offsetWidth<=0&&a.offsetHeight<=0},n.expr.filters.visible=function(a){return!n.expr.filters.hidden(a)};var vb=/%20/g,wb=/\[\]$/,xb=/\r?\n/g,yb=/^(?:submit|button|image|reset|file)$/i,zb=/^(?:input|select|textarea|keygen)/i;function Ab(a,b,c,d){var e;if(n.isArray(b))n.each(b,function(b,e){c||wb.test(a)?d(a,e):Ab(a+"["+("object"==typeof e?b:"")+"]",e,c,d)});else if(c||"object"!==n.type(b))d(a,b);else for(e in b)Ab(a+"["+e+"]",b[e],c,d)}n.param=function(a,b){var c,d=[],e=function(a,b){b=n.isFunction(b)?b():null==b?"":b,d[d.length]=encodeURIComponent(a)+"="+encodeURIComponent(b)};if(void 0===b&&(b=n.ajaxSettings&&n.ajaxSettings.traditional),n.isArray(a)||a.jquery&&!n.isPlainObject(a))n.each(a,function(){e(this.name,this.value)});else for(c in a)Ab(c,a[c],b,e);return d.join("&").replace(vb,"+")},n.fn.extend({serialize:function(){return n.param(this.serializeArray())},serializeArray:function(){return this.map(function(){var a=n.prop(this,"elements");return a?n.makeArray(a):this}).filter(function(){var a=this.type;return this.name&&!n(this).is(":disabled")&&zb.test(this.nodeName)&&!yb.test(a)&&(this.checked||!T.test(a))}).map(function(a,b){var c=n(this).val();return null==c?null:n.isArray(c)?n.map(c,function(a){return{name:b.name,value:a.replace(xb,"\r\n")}}):{name:b.name,value:c.replace(xb,"\r\n")}}).get()}}),n.ajaxSettings.xhr=function(){try{return new XMLHttpRequest}catch(a){}};var Bb=0,Cb={},Db={0:200,1223:204},Eb=n.ajaxSettings.xhr();a.attachEvent&&a.attachEvent("onunload",function(){for(var a in Cb)Cb[a]()}),k.cors=!!Eb&&"withCredentials"in Eb,k.ajax=Eb=!!Eb,n.ajaxTransport(function(a){var b;return k.cors||Eb&&!a.crossDomain?{send:function(c,d){var e,f=a.xhr(),g=++Bb;if(f.open(a.type,a.url,a.async,a.username,a.password),a.xhrFields)for(e in a.xhrFields)f[e]=a.xhrFields[e];a.mimeType&&f.overrideMimeType&&f.overrideMimeType(a.mimeType),a.crossDomain||c["X-Requested-With"]||(c["X-Requested-With"]="XMLHttpRequest");for(e in c)f.setRequestHeader(e,c[e]);b=function(a){return function(){b&&(delete Cb[g],b=f.onload=f.onerror=null,"abort"===a?f.abort():"error"===a?d(f.status,f.statusText):d(Db[f.status]||f.status,f.statusText,"string"==typeof f.responseText?{text:f.responseText}:void 0,f.getAllResponseHeaders()))}},f.onload=b(),f.onerror=b("error"),b=Cb[g]=b("abort");try{f.send(a.hasContent&&a.data||null)}catch(h){if(b)throw h}},abort:function(){b&&b()}}:void 0}),n.ajaxSetup({accepts:{script:"text/javascript, application/javascript, application/ecmascript, application/x-ecmascript"},contents:{script:/(?:java|ecma)script/},converters:{"text script":function(a){return n.globalEval(a),a}}}),n.ajaxPrefilter("script",function(a){void 0===a.cache&&(a.cache=!1),a.crossDomain&&(a.type="GET")}),n.ajaxTransport("script",function(a){if(a.crossDomain){var b,c;return{send:function(d,e){b=n("<script>").prop({async:!0,charset:a.scriptCharset,src:a.url}).on("load error",c=function(a){b.remove(),c=null,a&&e("error"===a.type?404:200,a.type)}),l.head.appendChild(b[0])},abort:function(){c&&c()}}}});var Fb=[],Gb=/(=)\?(?=&|$)|\?\?/;n.ajaxSetup({jsonp:"callback",jsonpCallback:function(){var a=Fb.pop()||n.expando+"_"+cb++;return this[a]=!0,a}}),n.ajaxPrefilter("json jsonp",function(b,c,d){var e,f,g,h=b.jsonp!==!1&&(Gb.test(b.url)?"url":"string"==typeof b.data&&!(b.contentType||"").indexOf("application/x-www-form-urlencoded")&&Gb.test(b.data)&&"data");return h||"jsonp"===b.dataTypes[0]?(e=b.jsonpCallback=n.isFunction(b.jsonpCallback)?b.jsonpCallback():b.jsonpCallback,h?b[h]=b[h].replace(Gb,"$1"+e):b.jsonp!==!1&&(b.url+=(db.test(b.url)?"&":"?")+b.jsonp+"="+e),b.converters["script json"]=function(){return g||n.error(e+" was not called"),g[0]},b.dataTypes[0]="json",f=a[e],a[e]=function(){g=arguments},d.always(function(){a[e]=f,b[e]&&(b.jsonpCallback=c.jsonpCallback,Fb.push(e)),g&&n.isFunction(f)&&f(g[0]),g=f=void 0}),"script"):void 0}),n.parseHTML=function(a,b,c){if(!a||"string"!=typeof a)return null;"boolean"==typeof b&&(c=b,b=!1),b=b||l;var d=v.exec(a),e=!c&&[];return d?[b.createElement(d[1])]:(d=n.buildFragment([a],b,e),e&&e.length&&n(e).remove(),n.merge([],d.childNodes))};var Hb=n.fn.load;n.fn.load=function(a,b,c){if("string"!=typeof a&&Hb)return Hb.apply(this,arguments);var d,e,f,g=this,h=a.indexOf(" ");return h>=0&&(d=n.trim(a.slice(h)),a=a.slice(0,h)),n.isFunction(b)?(c=b,b=void 0):b&&"object"==typeof b&&(e="POST"),g.length>0&&n.ajax({url:a,type:e,dataType:"html",data:b}).done(function(a){f=arguments,g.html(d?n("<div>").append(n.parseHTML(a)).find(d):a)}).complete(c&&function(a,b){g.each(c,f||[a.responseText,b,a])}),this},n.each(["ajaxStart","ajaxStop","ajaxComplete","ajaxError","ajaxSuccess","ajaxSend"],function(a,b){n.fn[b]=function(a){return this.on(b,a)}}),n.expr.filters.animated=function(a){return n.grep(n.timers,function(b){return a===b.elem}).length};var Ib=a.document.documentElement;function Jb(a){return n.isWindow(a)?a:9===a.nodeType&&a.defaultView}n.offset={setOffset:function(a,b,c){var d,e,f,g,h,i,j,k=n.css(a,"position"),l=n(a),m={};"static"===k&&(a.style.position="relative"),h=l.offset(),f=n.css(a,"top"),i=n.css(a,"left"),j=("absolute"===k||"fixed"===k)&&(f+i).indexOf("auto")>-1,j?(d=l.position(),g=d.top,e=d.left):(g=parseFloat(f)||0,e=parseFloat(i)||0),n.isFunction(b)&&(b=b.call(a,c,h)),null!=b.top&&(m.top=b.top-h.top+g),null!=b.left&&(m.left=b.left-h.left+e),"using"in b?b.using.call(a,m):l.css(m)}},n.fn.extend({offset:function(a){if(arguments.length)return void 0===a?this:this.each(function(b){n.offset.setOffset(this,a,b)});var b,c,d=this[0],e={top:0,left:0},f=d&&d.ownerDocument;if(f)return b=f.documentElement,n.contains(b,d)?(typeof d.getBoundingClientRect!==U&&(e=d.getBoundingClientRect()),c=Jb(f),{top:e.top+c.pageYOffset-b.clientTop,left:e.left+c.pageXOffset-b.clientLeft}):e},position:function(){if(this[0]){var a,b,c=this[0],d={top:0,left:0};return"fixed"===n.css(c,"position")?b=c.getBoundingClientRect():(a=this.offsetParent(),b=this.offset(),n.nodeName(a[0],"html")||(d=a.offset()),d.top+=n.css(a[0],"borderTopWidth",!0),d.left+=n.css(a[0],"borderLeftWidth",!0)),{top:b.top-d.top-n.css(c,"marginTop",!0),left:b.left-d.left-n.css(c,"marginLeft",!0)}}},offsetParent:function(){return this.map(function(){var a=this.offsetParent||Ib;while(a&&!n.nodeName(a,"html")&&"static"===n.css(a,"position"))a=a.offsetParent;return a||Ib})}}),n.each({scrollLeft:"pageXOffset",scrollTop:"pageYOffset"},function(b,c){var d="pageYOffset"===c;n.fn[b]=function(e){return J(this,function(b,e,f){var g=Jb(b);return void 0===f?g?g[c]:b[e]:void(g?g.scrollTo(d?a.pageXOffset:f,d?f:a.pageYOffset):b[e]=f)},b,e,arguments.length,null)}}),n.each(["top","left"],function(a,b){n.cssHooks[b]=ya(k.pixelPosition,function(a,c){return c?(c=xa(a,b),va.test(c)?n(a).position()[b]+"px":c):void 0})}),n.each({Height:"height",Width:"width"},function(a,b){n.each({padding:"inner"+a,content:b,"":"outer"+a},function(c,d){n.fn[d]=function(d,e){var f=arguments.length&&(c||"boolean"!=typeof d),g=c||(d===!0||e===!0?"margin":"border");return J(this,function(b,c,d){var e;return n.isWindow(b)?b.document.documentElement["client"+a]:9===b.nodeType?(e=b.documentElement,Math.max(b.body["scroll"+a],e["scroll"+a],b.body["offset"+a],e["offset"+a],e["client"+a])):void 0===d?n.css(b,c,g):n.style(b,c,d,g)},b,f?d:void 0,f,null)}})}),n.fn.size=function(){return this.length},n.fn.andSelf=n.fn.addBack,"function"==typeof define&&define.amd&&define("jquery",[],function(){return n});var Kb=a.jQuery,Lb=a.$;return n.noConflict=function(b){return a.$===n&&(a.$=Lb),b&&a.jQuery===n&&(a.jQuery=Kb),n},typeof b===U&&(a.jQuery=a.$=n),n});

 /*
 * # Semantic UI - 2.1.6
 * https://github.com/Semantic-Org/Semantic-UI
 * http://www.semantic-ui.com/
 *
 * Copyright 2014 Contributors
 * Released under the MIT license
 * http://opensource.org/licenses/MIT
 *
 */
/*!
 * # Semantic UI 2.1.6 - Site
 * http://github.com/semantic-org/semantic-ui/
 *
 *
 * Copyright 2015 Contributors
 * Released under the MIT license
 * http://opensource.org/licenses/MIT
 *
 */
;(function ( $, window, document, undefined ) {

$.site = $.fn.site = function(parameters) {
  var
    time           = new Date().getTime(),
    performance    = [],

    query          = arguments[0],
    methodInvoked  = (typeof query == 'string'),
    queryArguments = [].slice.call(arguments, 1),

    settings        = ( $.isPlainObject(parameters) )
      ? $.extend(true, {}, $.site.settings, parameters)
      : $.extend({}, $.site.settings),

    namespace       = settings.namespace,
    error           = settings.error,

    eventNamespace  = '.' + namespace,
    moduleNamespace = 'module-' + namespace,

    $document       = $(document),
    $module         = $document,
    element         = this,
    instance        = $module.data(moduleNamespace),

    module,
    returnedValue
  ;
  module = {

    initialize: function() {
      module.instantiate();
    },

    instantiate: function() {
      module.verbose('Storing instance of site', module);
      instance = module;
      $module
        .data(moduleNamespace, module)
      ;
    },

    normalize: function() {
      module.fix.console();
      module.fix.requestAnimationFrame();
    },

    fix: {
      console: function() {
        module.debug('Normalizing window.console');
        if (console === undefined || console.log === undefined) {
          module.verbose('Console not available, normalizing events');
          module.disable.console();
        }
        if (typeof console.group == 'undefined' || typeof console.groupEnd == 'undefined' || typeof console.groupCollapsed == 'undefined') {
          module.verbose('Console group not available, normalizing events');
          window.console.group = function() {};
          window.console.groupEnd = function() {};
          window.console.groupCollapsed = function() {};
        }
        if (typeof console.markTimeline == 'undefined') {
          module.verbose('Mark timeline not available, normalizing events');
          window.console.markTimeline = function() {};
        }
      },
      consoleClear: function() {
        module.debug('Disabling programmatic console clearing');
        window.console.clear = function() {};
      },
      requestAnimationFrame: function() {
        module.debug('Normalizing requestAnimationFrame');
        if(window.requestAnimationFrame === undefined) {
          module.debug('RequestAnimationFrame not available, normalizing event');
          window.requestAnimationFrame = window.requestAnimationFrame
            || window.mozRequestAnimationFrame
            || window.webkitRequestAnimationFrame
            || window.msRequestAnimationFrame
            || function(callback) { setTimeout(callback, 0); }
          ;
        }
      }
    },

    moduleExists: function(name) {
      return ($.fn[name] !== undefined && $.fn[name].settings !== undefined);
    },

    enabled: {
      modules: function(modules) {
        var
          enabledModules = []
        ;
        modules = modules || settings.modules;
        $.each(modules, function(index, name) {
          if(module.moduleExists(name)) {
            enabledModules.push(name);
          }
        });
        return enabledModules;
      }
    },

    disabled: {
      modules: function(modules) {
        var
          disabledModules = []
        ;
        modules = modules || settings.modules;
        $.each(modules, function(index, name) {
          if(!module.moduleExists(name)) {
            disabledModules.push(name);
          }
        });
        return disabledModules;
      }
    },

    change: {
      setting: function(setting, value, modules, modifyExisting) {
        modules = (typeof modules === 'string')
          ? (modules === 'all')
            ? settings.modules
            : [modules]
          : modules || settings.modules
        ;
        modifyExisting = (modifyExisting !== undefined)
          ? modifyExisting
          : true
        ;
        $.each(modules, function(index, name) {
          var
            namespace = (module.moduleExists(name))
              ? $.fn[name].settings.namespace || false
              : true,
            $existingModules
          ;
          if(module.moduleExists(name)) {
            module.verbose('Changing default setting', setting, value, name);
            $.fn[name].settings[setting] = value;
            if(modifyExisting && namespace) {
              $existingModules = $(':data(module-' + namespace + ')');
              if($existingModules.length > 0) {
                module.verbose('Modifying existing settings', $existingModules);
                $existingModules[name]('setting', setting, value);
              }
            }
          }
        });
      },
      settings: function(newSettings, modules, modifyExisting) {
        modules = (typeof modules === 'string')
          ? [modules]
          : modules || settings.modules
        ;
        modifyExisting = (modifyExisting !== undefined)
          ? modifyExisting
          : true
        ;
        $.each(modules, function(index, name) {
          var
            $existingModules
          ;
          if(module.moduleExists(name)) {
            module.verbose('Changing default setting', newSettings, name);
            $.extend(true, $.fn[name].settings, newSettings);
            if(modifyExisting && namespace) {
              $existingModules = $(':data(module-' + namespace + ')');
              if($existingModules.length > 0) {
                module.verbose('Modifying existing settings', $existingModules);
                $existingModules[name]('setting', newSettings);
              }
            }
          }
        });
      }
    },

    enable: {
      console: function() {
        module.console(true);
      },
      debug: function(modules, modifyExisting) {
        modules = modules || settings.modules;
        module.debug('Enabling debug for modules', modules);
        module.change.setting('debug', true, modules, modifyExisting);
      },
      verbose: function(modules, modifyExisting) {
        modules = modules || settings.modules;
        module.debug('Enabling verbose debug for modules', modules);
        module.change.setting('verbose', true, modules, modifyExisting);
      }
    },
    disable: {
      console: function() {
        module.console(false);
      },
      debug: function(modules, modifyExisting) {
        modules = modules || settings.modules;
        module.debug('Disabling debug for modules', modules);
        module.change.setting('debug', false, modules, modifyExisting);
      },
      verbose: function(modules, modifyExisting) {
        modules = modules || settings.modules;
        module.debug('Disabling verbose debug for modules', modules);
        module.change.setting('verbose', false, modules, modifyExisting);
      }
    },

    console: function(enable) {
      if(enable) {
        if(instance.cache.console === undefined) {
          module.error(error.console);
          return;
        }
        module.debug('Restoring console function');
        window.console = instance.cache.console;
      }
      else {
        module.debug('Disabling console function');
        instance.cache.console = window.console;
        window.console = {
          clear          : function(){},
          error          : function(){},
          group          : function(){},
          groupCollapsed : function(){},
          groupEnd       : function(){},
          info           : function(){},
          log            : function(){},
          markTimeline   : function(){},
          warn           : function(){}
        };
      }
    },

    destroy: function() {
      module.verbose('Destroying previous site for', $module);
      $module
        .removeData(moduleNamespace)
      ;
    },

    cache: {},

    setting: function(name, value) {
      if( $.isPlainObject(name) ) {
        $.extend(true, settings, name);
      }
      else if(value !== undefined) {
        settings[name] = value;
      }
      else {
        return settings[name];
      }
    },
    internal: function(name, value) {
      if( $.isPlainObject(name) ) {
        $.extend(true, module, name);
      }
      else if(value !== undefined) {
        module[name] = value;
      }
      else {
        return module[name];
      }
    },
    debug: function() {
      if(settings.debug) {
        if(settings.performance) {
          module.performance.log(arguments);
        }
        else {
          module.debug = Function.prototype.bind.call(console.info, console, settings.name + ':');
          module.debug.apply(console, arguments);
        }
      }
    },
    verbose: function() {
      if(settings.verbose && settings.debug) {
        if(settings.performance) {
          module.performance.log(arguments);
        }
        else {
          module.verbose = Function.prototype.bind.call(console.info, console, settings.name + ':');
          module.verbose.apply(console, arguments);
        }
      }
    },
    error: function() {
      module.error = Function.prototype.bind.call(console.error, console, settings.name + ':');
      module.error.apply(console, arguments);
    },
    performance: {
      log: function(message) {
        var
          currentTime,
          executionTime,
          previousTime
        ;
        if(settings.performance) {
          currentTime   = new Date().getTime();
          previousTime  = time || currentTime;
          executionTime = currentTime - previousTime;
          time          = currentTime;
          performance.push({
            'Element'        : element,
            'Name'           : message[0],
            'Arguments'      : [].slice.call(message, 1) || '',
            'Execution Time' : executionTime
          });
        }
        clearTimeout(module.performance.timer);
        module.performance.timer = setTimeout(module.performance.display, 500);
      },
      display: function() {
        var
          title = settings.name + ':',
          totalTime = 0
        ;
        time = false;
        clearTimeout(module.performance.timer);
        $.each(performance, function(index, data) {
          totalTime += data['Execution Time'];
        });
        title += ' ' + totalTime + 'ms';
        if( (console.group !== undefined || console.table !== undefined) && performance.length > 0) {
          console.groupCollapsed(title);
          if(console.table) {
            console.table(performance);
          }
          else {
            $.each(performance, function(index, data) {
              console.log(data['Name'] + ': ' + data['Execution Time']+'ms');
            });
          }
          console.groupEnd();
        }
        performance = [];
      }
    },
    invoke: function(query, passedArguments, context) {
      var
        object = instance,
        maxDepth,
        found,
        response
      ;
      passedArguments = passedArguments || queryArguments;
      context         = element         || context;
      if(typeof query == 'string' && object !== undefined) {
        query    = query.split(/[\. ]/);
        maxDepth = query.length - 1;
        $.each(query, function(depth, value) {
          var camelCaseValue = (depth != maxDepth)
            ? value + query[depth + 1].charAt(0).toUpperCase() + query[depth + 1].slice(1)
            : query
          ;
          if( $.isPlainObject( object[camelCaseValue] ) && (depth != maxDepth) ) {
            object = object[camelCaseValue];
          }
          else if( object[camelCaseValue] !== undefined ) {
            found = object[camelCaseValue];
            return false;
          }
          else if( $.isPlainObject( object[value] ) && (depth != maxDepth) ) {
            object = object[value];
          }
          else if( object[value] !== undefined ) {
            found = object[value];
            return false;
          }
          else {
            module.error(error.method, query);
            return false;
          }
        });
      }
      if ( $.isFunction( found ) ) {
        response = found.apply(context, passedArguments);
      }
      else if(found !== undefined) {
        response = found;
      }
      if($.isArray(returnedValue)) {
        returnedValue.push(response);
      }
      else if(returnedValue !== undefined) {
        returnedValue = [returnedValue, response];
      }
      else if(response !== undefined) {
        returnedValue = response;
      }
      return found;
    }
  };

  if(methodInvoked) {
    if(instance === undefined) {
      module.initialize();
    }
    module.invoke(query);
  }
  else {
    if(instance !== undefined) {
      module.destroy();
    }
    module.initialize();
  }
  return (returnedValue !== undefined)
    ? returnedValue
    : this
  ;
};

$.site.settings = {

  name        : 'Site',
  namespace   : 'site',

  error : {
    console : 'Console cannot be restored, most likely it was overwritten outside of module',
    method : 'The method you called is not defined.'
  },

  debug       : false,
  verbose     : false,
  performance : true,

  modules: [
    'accordion',
    'api',
    'checkbox',
    'dimmer',
    'dropdown',
    'embed',
    'form',
    'modal',
    'nag',
    'popup',
    'rating',
    'shape',
    'sidebar',
    'state',
    'sticky',
    'tab',
    'transition',
    'visit',
    'visibility'
  ],

  siteNamespace   : 'site',
  namespaceStub   : {
    cache     : {},
    config    : {},
    sections  : {},
    section   : {},
    utilities : {}
  }

};

// allows for selection of elements with data attributes
$.extend($.expr[ ":" ], {
  data: ($.expr.createPseudo)
    ? $.expr.createPseudo(function(dataName) {
        return function(elem) {
          return !!$.data(elem, dataName);
        };
      })
    : function(elem, i, match) {
      // support: jQuery < 1.8
      return !!$.data(elem, match[ 3 ]);
    }
});


})( jQuery, window, document );

/*!
 * # Semantic UI 2.1.6 - Form Validation
 * http://github.com/semantic-org/semantic-ui/
 *
 *
 * Copyright 2015 Contributors
 * Released under the MIT license
 * http://opensource.org/licenses/MIT
 *
 */

;(function ( $, window, document, undefined ) {

"use strict";

$.fn.form = function(parameters) {
  var
    $allModules      = $(this),
    moduleSelector   = $allModules.selector || '',

    time             = new Date().getTime(),
    performance      = [],

    query            = arguments[0],
    legacyParameters = arguments[1],
    methodInvoked    = (typeof query == 'string'),
    queryArguments   = [].slice.call(arguments, 1),
    returnedValue
  ;
  $allModules
    .each(function() {
      var
        $module     = $(this),
        element     = this,

        formErrors  = [],
        keyHeldDown = false,

        // set at run-time
        $field,
        $group,
        $message,
        $prompt,
        $submit,
        $clear,
        $reset,

        settings,
        validation,

        metadata,
        selector,
        className,
        error,

        namespace,
        moduleNamespace,
        eventNamespace,

        instance,
        module
      ;

      module      = {

        initialize: function() {

          // settings grabbed at run time
          module.get.settings();
          if(methodInvoked) {
            if(instance === undefined) {
              module.instantiate();
            }
            module.invoke(query);
          }
          else {
            module.verbose('Initializing form validation', $module, settings);
            module.bindEvents();
            module.set.defaults();
            module.instantiate();
          }
        },

        instantiate: function() {
          module.verbose('Storing instance of module', module);
          instance = module;
          $module
            .data(moduleNamespace, module)
          ;
        },

        destroy: function() {
          module.verbose('Destroying previous module', instance);
          module.removeEvents();
          $module
            .removeData(moduleNamespace)
          ;
        },

        refresh: function() {
          module.verbose('Refreshing selector cache');
          $field      = $module.find(selector.field);
          $group      = $module.find(selector.group);
          $message    = $module.find(selector.message);
          $prompt     = $module.find(selector.prompt);

          $submit     = $module.find(selector.submit);
          $clear      = $module.find(selector.clear);
          $reset      = $module.find(selector.reset);
        },

        submit: function() {
          module.verbose('Submitting form', $module);
          $module
            .submit()
          ;
        },

        attachEvents: function(selector, action) {
          action = action || 'submit';
          $(selector)
            .on('click' + eventNamespace, function(event) {
              module[action]();
              event.preventDefault();
            })
          ;
        },

        bindEvents: function() {
          module.verbose('Attaching form events');
          $module
            .on('submit' + eventNamespace, module.validate.form)
            .on('blur'   + eventNamespace, selector.field, module.event.field.blur)
            .on('click'  + eventNamespace, selector.submit, module.submit)
            .on('click'  + eventNamespace, selector.reset, module.reset)
            .on('click'  + eventNamespace, selector.clear, module.clear)
          ;
          if(settings.keyboardShortcuts) {
            $module
              .on('keydown' + eventNamespace, selector.field, module.event.field.keydown)
            ;
          }
          $field
            .each(function() {
              var
                $input     = $(this),
                type       = $input.prop('type'),
                inputEvent = module.get.changeEvent(type, $input)
              ;
              $(this)
                .on(inputEvent + eventNamespace, module.event.field.change)
              ;
            })
          ;
        },

        clear: function() {
          $field
            .each(function () {
              var
                $field       = $(this),
                $element     = $field.parent(),
                $fieldGroup  = $field.closest($group),
                $prompt      = $fieldGroup.find(selector.prompt),
                defaultValue = $field.data(metadata.defaultValue) || '',
                isCheckbox   = $element.is(selector.uiCheckbox),
                isDropdown   = $element.is(selector.uiDropdown),
                isErrored    = $fieldGroup.hasClass(className.error)
              ;
              if(isErrored) {
                module.verbose('Resetting error on field', $fieldGroup);
                $fieldGroup.removeClass(className.error);
                $prompt.remove();
              }
              if(isDropdown) {
                module.verbose('Resetting dropdown value', $element, defaultValue);
                $element.dropdown('clear');
              }
              else if(isCheckbox) {
                $field.prop('checked', false);
              }
              else {
                module.verbose('Resetting field value', $field, defaultValue);
                $field.val('');
              }
            })
          ;
        },

        reset: function() {
          $field
            .each(function () {
              var
                $field       = $(this),
                $element     = $field.parent(),
                $fieldGroup  = $field.closest($group),
                $prompt      = $fieldGroup.find(selector.prompt),
                defaultValue = $field.data(metadata.defaultValue),
                isCheckbox   = $element.is(selector.uiCheckbox),
                isDropdown   = $element.is(selector.uiDropdown),
                isErrored    = $fieldGroup.hasClass(className.error)
              ;
              if(defaultValue === undefined) {
                return;
              }
              if(isErrored) {
                module.verbose('Resetting error on field', $fieldGroup);
                $fieldGroup.removeClass(className.error);
                $prompt.remove();
              }
              if(isDropdown) {
                module.verbose('Resetting dropdown value', $element, defaultValue);
                $element.dropdown('restore defaults');
              }
              else if(isCheckbox) {
                module.verbose('Resetting checkbox value', $element, defaultValue);
                $field.prop('checked', defaultValue);
              }
              else {
                module.verbose('Resetting field value', $field, defaultValue);
                $field.val(defaultValue);
              }
            })
          ;
        },

        is: {
          bracketedRule: function(rule) {
            return (rule.type && rule.type.match(settings.regExp.bracket));
          },
          valid: function() {
            var
              allValid = true
            ;
            module.verbose('Checking if form is valid');
            $.each(validation, function(fieldName, field) {
              if( !( module.validate.field(field, fieldName) ) ) {
                allValid = false;
              }
            });
            return allValid;
          }
        },

        removeEvents: function() {
          $module
            .off(eventNamespace)
          ;
          $field
            .off(eventNamespace)
          ;
          $submit
            .off(eventNamespace)
          ;
          $field
            .off(eventNamespace)
          ;
        },

        event: {
          field: {
            keydown: function(event) {
              var
                $field  = $(this),
                key     = event.which,
                keyCode = {
                  enter  : 13,
                  escape : 27
                }
              ;
              if( key == keyCode.escape) {
                module.verbose('Escape key pressed blurring field');
                $field
                  .blur()
                ;
              }
              if(!event.ctrlKey && key == keyCode.enter && $field.is(selector.input) && $field.not(selector.checkbox).length > 0 ) {
                if(!keyHeldDown) {
                  $field
                    .one('keyup' + eventNamespace, module.event.field.keyup)
                  ;
                  module.submit();
                  module.debug('Enter pressed on input submitting form');
                }
                keyHeldDown = true;
              }
            },
            keyup: function() {
              keyHeldDown = false;
            },
            blur: function(event) {
              var
                $field          = $(this),
                $fieldGroup     = $field.closest($group),
                validationRules = module.get.validation($field)
              ;
              if( $fieldGroup.hasClass(className.error) ) {
                module.debug('Revalidating field', $field, validationRules);
                module.validate.form.call(module, event, true);
              }
              else if(settings.on == 'blur' || settings.on == 'change') {
                if(validationRules) {
                  module.validate.field( validationRules );
                }
              }
            },
            change: function(event) {
              var
                $field      = $(this),
                $fieldGroup = $field.closest($group)
              ;
              if(settings.on == 'change' || ( $fieldGroup.hasClass(className.error) && settings.revalidate) ) {
                clearTimeout(module.timer);
                module.timer = setTimeout(function() {
                  module.debug('Revalidating field', $field,  module.get.validation($field));
                  module.validate.form.call(module, event, true);
                }, settings.delay);
              }
            }
          }

        },

        get: {
          ancillaryValue: function(rule) {
            if(!rule.type || !module.is.bracketedRule(rule)) {
              return false;
            }
            return rule.type.match(settings.regExp.bracket)[1] + '';
          },
          ruleName: function(rule) {
            if( module.is.bracketedRule(rule) ) {
              return rule.type.replace(rule.type.match(settings.regExp.bracket)[0], '');
            }
            return rule.type;
          },
          changeEvent: function(type, $input) {
            if(type == 'checkbox' || type == 'radio' || type == 'hidden' || $input.is('select')) {
              return 'change';
            }
            else {
              return module.get.inputEvent();
            }
          },
          inputEvent: function() {
            return (document.createElement('input').oninput !== undefined)
              ? 'input'
              : (document.createElement('input').onpropertychange !== undefined)
                ? 'propertychange'
                : 'keyup'
            ;
          },
          prompt: function(rule, field) {
            var
              ruleName      = module.get.ruleName(rule),
              ancillary     = module.get.ancillaryValue(rule),
              prompt        = rule.prompt || settings.prompt[ruleName] || settings.text.unspecifiedRule,
              requiresValue = (prompt.search('{value}') !== -1),
              requiresName  = (prompt.search('{name}') !== -1),
              $label,
              $field,
              name
            ;
            if(requiresName || requiresValue) {
              $field = module.get.field(field.identifier);
            }
            if(requiresValue) {
              prompt = prompt.replace('{value}', $field.val());
            }
            if(requiresName) {
              $label = $field.closest(selector.group).find('label').eq(0);
              name = ($label.size() == 1)
                ? $label.text()
                : $field.prop('placeholder') || settings.text.unspecifiedField
              ;
              prompt = prompt.replace('{name}', name);
            }
            prompt = prompt.replace('{identifier}', field.identifier);
            prompt = prompt.replace('{ruleValue}', ancillary);
            if(!rule.prompt) {
              module.verbose('Using default validation prompt for type', prompt, ruleName);
            }
            return prompt;
          },
          settings: function() {
            if($.isPlainObject(parameters)) {
              var
                keys     = Object.keys(parameters),
                isLegacySettings = (keys.length > 0)
                  ? (parameters[keys[0]].identifier !== undefined && parameters[keys[0]].rules !== undefined)
                  : false,
                ruleKeys
              ;
              if(isLegacySettings) {
                // 1.x (ducktyped)
                settings   = $.extend(true, {}, $.fn.form.settings, legacyParameters);
                validation = $.extend({}, $.fn.form.settings.defaults, parameters);
                module.error(settings.error.oldSyntax, element);
                module.verbose('Extending settings from legacy parameters', validation, settings);
              }
              else {
                // 2.x
                if(parameters.fields) {
                  ruleKeys = Object.keys(parameters.fields);
                  if( typeof parameters.fields[ruleKeys[0]] == 'string' || $.isArray(parameters.fields[ruleKeys[0]]) ) {
                    $.each(parameters.fields, function(name, rules) {
                      if(typeof rules == 'string') {
                        rules = [rules];
                      }
                      parameters.fields[name] = {
                        rules: []
                      };
                      $.each(rules, function(index, rule) {
                        parameters.fields[name].rules.push({ type: rule });
                      });
                    });
                  }
                }

                settings   = $.extend(true, {}, $.fn.form.settings, parameters);
                validation = $.extend({}, $.fn.form.settings.defaults, settings.fields);
                module.verbose('Extending settings', validation, settings);
              }
            }
            else {
              settings   = $.fn.form.settings;
              validation = $.fn.form.settings.defaults;
              module.verbose('Using default form validation', validation, settings);
            }

            // shorthand
            namespace       = settings.namespace;
            metadata        = settings.metadata;
            selector        = settings.selector;
            className       = settings.className;
            error           = settings.error;
            moduleNamespace = 'module-' + namespace;
            eventNamespace  = '.' + namespace;

            // grab instance
            instance = $module.data(moduleNamespace);

            // refresh selector cache
            module.refresh();
          },
          field: function(identifier) {
            module.verbose('Finding field with identifier', identifier);
            if( $field.filter('#' + identifier).length > 0 ) {
              return $field.filter('#' + identifier);
            }
            else if( $field.filter('[name="' + identifier +'"]').length > 0 ) {
              return $field.filter('[name="' + identifier +'"]');
            }
            else if( $field.filter('[name="' + identifier +'[]"]').length > 0 ) {
              return $field.filter('[name="' + identifier +'[]"]');
            }
            else if( $field.filter('[data-' + metadata.validate + '="'+ identifier +'"]').length > 0 ) {
              return $field.filter('[data-' + metadata.validate + '="'+ identifier +'"]');
            }
            return $('<input/>');
          },
          fields: function(fields) {
            var
              $fields = $()
            ;
            $.each(fields, function(index, name) {
              $fields = $fields.add( module.get.field(name) );
            });
            return $fields;
          },
          validation: function($field) {
            var
              fieldValidation,
              identifier
            ;
            if(!validation) {
              return false;
            }
            $.each(validation, function(fieldName, field) {
              identifier = field.identifier || fieldName;
              if( module.get.field(identifier)[0] == $field[0] ) {
                field.identifier = identifier;
                fieldValidation = field;
              }
            });
            return fieldValidation || false;
          },
          value: function (field) {
            var
              fields = [],
              results
            ;
            fields.push(field);
            results = module.get.values.call(element, fields);
            return results[field];
          },
          values: function (fields) {
            var
              $fields = $.isArray(fields)
                ? module.get.fields(fields)
                : $field,
              values = {}
            ;
            $fields.each(function(index, field) {
              var
                $field     = $(field),
                type       = $field.prop('type'),
                name       = $field.prop('name'),
                value      = $field.val(),
                isCheckbox = $field.is(selector.checkbox),
                isRadio    = $field.is(selector.radio),
                isMultiple = (name.indexOf('[]') !== -1),
                isChecked  = (isCheckbox)
                  ? $field.is(':checked')
                  : false
              ;
              if(name) {
                if(isMultiple) {
                  name = name.replace('[]', '');
                  if(!values[name]) {
                    values[name] = [];
                  }
                  if(isCheckbox) {
                    if(isChecked) {
                      values[name].push(value || true);
                    }
                    else {
                      values[name].push(false);
                    }
                  }
                  else {
                    values[name].push(value);
                  }
                }
                else {
                  if(isRadio) {
                    if(isChecked) {
                      values[name] = value;
                    }
                  }
                  else if(isCheckbox) {
                    if(isChecked) {
                      values[name] = value || true;
                    }
                    else {
                      values[name] = false;
                    }
                  }
                  else {
                    values[name] = value;
                  }
                }
              }
            });
            return values;
          }
        },

        has: {

          field: function(identifier) {
            module.verbose('Checking for existence of a field with identifier', identifier);
            if(typeof identifier !== 'string') {
              module.error(error.identifier, identifier);
            }
            if( $field.filter('#' + identifier).length > 0 ) {
              return true;
            }
            else if( $field.filter('[name="' + identifier +'"]').length > 0 ) {
              return true;
            }
            else if( $field.filter('[data-' + metadata.validate + '="'+ identifier +'"]').length > 0 ) {
              return true;
            }
            return false;
          }

        },

        add: {
          prompt: function(identifier, errors) {
            var
              $field       = module.get.field(identifier),
              $fieldGroup  = $field.closest($group),
              $prompt      = $fieldGroup.children(selector.prompt),
              promptExists = ($prompt.length !== 0)
            ;
            errors = (typeof errors == 'string')
              ? [errors]
              : errors
            ;
            module.verbose('Adding field error state', identifier);
            $fieldGroup
              .addClass(className.error)
            ;
            if(settings.inline) {
              if(!promptExists) {
                $prompt = settings.templates.prompt(errors);
                $prompt
                  .appendTo($fieldGroup)
                ;
              }
              $prompt
                .html(errors[0])
              ;
              if(!promptExists) {
                if(settings.transition && $.fn.transition !== undefined && $module.transition('is supported')) {
                  module.verbose('Displaying error with css transition', settings.transition);
                  $prompt.transition(settings.transition + ' in', settings.duration);
                }
                else {
                  module.verbose('Displaying error with fallback javascript animation');
                  $prompt
                    .fadeIn(settings.duration)
                  ;
                }
              }
              else {
                module.verbose('Inline errors are disabled, no inline error added', identifier);
              }
            }
          },
          errors: function(errors) {
            module.debug('Adding form error messages', errors);
            module.set.error();
            $message
              .html( settings.templates.error(errors) )
            ;
          }
        },

        remove: {
          prompt: function(identifier) {
            var
              $field      = module.get.field(identifier),
              $fieldGroup = $field.closest($group),
              $prompt     = $fieldGroup.children(selector.prompt)
            ;
            $fieldGroup
              .removeClass(className.error)
            ;
            if(settings.inline && $prompt.is(':visible')) {
              module.verbose('Removing prompt for field', identifier);
              if(settings.transition && $.fn.transition !== undefined && $module.transition('is supported')) {
                $prompt.transition(settings.transition + ' out', settings.duration, function() {
                  $prompt.remove();
                });
              }
              else {
                $prompt
                  .fadeOut(settings.duration, function(){
                    $prompt.remove();
                  })
                ;
              }
            }
          }
        },

        set: {
          success: function() {
            $module
              .removeClass(className.error)
              .addClass(className.success)
            ;
          },
          defaults: function () {
            $field
              .each(function () {
                var
                  $field     = $(this),
                  isCheckbox = ($field.filter(selector.checkbox).length > 0),
                  value      = (isCheckbox)
                    ? $field.is(':checked')
                    : $field.val()
                ;
                $field.data(metadata.defaultValue, value);
              })
            ;
          },
          error: function() {
            $module
              .removeClass(className.success)
              .addClass(className.error)
            ;
          },
          value: function (field, value) {
            var
              fields = {}
            ;
            fields[field] = value;
            return module.set.values.call(element, fields);
          },
          values: function (fields) {
            if($.isEmptyObject(fields)) {
              return;
            }
            $.each(fields, function(key, value) {
              var
                $field      = module.get.field(key),
                $element    = $field.parent(),
                isMultiple  = $.isArray(value),
                isCheckbox  = $element.is(selector.uiCheckbox),
                isDropdown  = $element.is(selector.uiDropdown),
                isRadio     = ($field.is(selector.radio) && isCheckbox),
                fieldExists = ($field.length > 0),
                $multipleField
              ;
              if(fieldExists) {
                if(isMultiple && isCheckbox) {
                  module.verbose('Selecting multiple', value, $field);
                  $element.checkbox('uncheck');
                  $.each(value, function(index, value) {
                    $multipleField = $field.filter('[value="' + value + '"]');
                    $element       = $multipleField.parent();
                    if($multipleField.length > 0) {
                      $element.checkbox('check');
                    }
                  });
                }
                else if(isRadio) {
                  module.verbose('Selecting radio value', value, $field);
                  $field.filter('[value="' + value + '"]')
                    .parent(selector.uiCheckbox)
                      .checkbox('check')
                  ;
                }
                else if(isCheckbox) {
                  module.verbose('Setting checkbox value', value, $element);
                  if(value === true) {
                    $element.checkbox('check');
                  }
                  else {
                    $element.checkbox('uncheck');
                  }
                }
                else if(isDropdown) {
                  module.verbose('Setting dropdown value', value, $element);
                  $element.dropdown('set selected', value);
                }
                else {
                  module.verbose('Setting field value', value, $field);
                  $field.val(value);
                }
              }
            });
          }
        },

        validate: {

          form: function(event, ignoreCallbacks) {
            var
              values = module.get.values(),
              apiRequest
            ;

            // input keydown event will fire submit repeatedly by browser default
            if(keyHeldDown) {
              return false;
            }

            // reset errors
            formErrors = [];
            if( module.is.valid() ) {
              module.debug('Form has no validation errors, submitting');
              module.set.success();
              if(ignoreCallbacks !== true) {
                return settings.onSuccess.call(element, event, values);
              }
            }
            else {
              module.debug('Form has errors');
              module.set.error();
              if(!settings.inline) {
                module.add.errors(formErrors);
              }
              // prevent ajax submit
              if($module.data('moduleApi') !== undefined) {
                event.stopImmediatePropagation();
              }
              if(ignoreCallbacks !== true) {
                return settings.onFailure.call(element, formErrors, values);
              }
            }
          },

          // takes a validation object and returns whether field passes validation
          field: function(field, fieldName) {
            var
              identifier  = field.identifier || fieldName,
              $field      = module.get.field(identifier),
              fieldValid  = true,
              fieldErrors = []
            ;
            if(!field.identifier) {
              module.debug('Using field name as identifier', identifier);
              field.identifier = identifier;
            }
            if($field.prop('disabled')) {
              module.debug('Field is disabled. Skipping', identifier);
              fieldValid = true;
            }
            else if(field.optional && $.trim($field.val()) === ''){
              module.debug('Field is optional and empty. Skipping', identifier);
              fieldValid = true;
            }
            else if(field.rules !== undefined) {
              $.each(field.rules, function(index, rule) {
                if( module.has.field(identifier) && !( module.validate.rule(field, rule) ) ) {
                  module.debug('Field is invalid', identifier, rule.type);
                  fieldErrors.push(module.get.prompt(rule, field));
                  fieldValid = false;
                }
              });
            }
            if(fieldValid) {
              module.remove.prompt(identifier, fieldErrors);
              settings.onValid.call($field);
            }
            else {
              formErrors = formErrors.concat(fieldErrors);
              module.add.prompt(identifier, fieldErrors);
              settings.onInvalid.call($field, fieldErrors);
              return false;
            }
            return true;
          },

          // takes validation rule and returns whether field passes rule
          rule: function(field, rule) {
            var
              $field       = module.get.field(field.identifier),
              type         = rule.type,
              value        = $field.val(),
              isValid      = true,
              ancillary    = module.get.ancillaryValue(rule),
              ruleName     = module.get.ruleName(rule),
              ruleFunction = settings.rules[ruleName]
            ;
            if( !$.isFunction(ruleFunction) ) {
              module.error(error.noRule, ruleName);
              return;
            }
            // cast to string avoiding encoding special values
            value = (value === undefined || value === '' || value === null)
              ? ''
              : $.trim(value + '')
            ;
            return ruleFunction.call($field, value, ancillary);
          }
        },

        setting: function(name, value) {
          if( $.isPlainObject(name) ) {
            $.extend(true, settings, name);
          }
          else if(value !== undefined) {
            settings[name] = value;
          }
          else {
            return settings[name];
          }
        },
        internal: function(name, value) {
          if( $.isPlainObject(name) ) {
            $.extend(true, module, name);
          }
          else if(value !== undefined) {
            module[name] = value;
          }
          else {
            return module[name];
          }
        },
        debug: function() {
          if(settings.debug) {
            if(settings.performance) {
              module.performance.log(arguments);
            }
            else {
              module.debug = Function.prototype.bind.call(console.info, console, settings.name + ':');
              module.debug.apply(console, arguments);
            }
          }
        },
        verbose: function() {
          if(settings.verbose && settings.debug) {
            if(settings.performance) {
              module.performance.log(arguments);
            }
            else {
              module.verbose = Function.prototype.bind.call(console.info, console, settings.name + ':');
              module.verbose.apply(console, arguments);
            }
          }
        },
        error: function() {
          module.error = Function.prototype.bind.call(console.error, console, settings.name + ':');
          module.error.apply(console, arguments);
        },
        performance: {
          log: function(message) {
            var
              currentTime,
              executionTime,
              previousTime
            ;
            if(settings.performance) {
              currentTime   = new Date().getTime();
              previousTime  = time || currentTime;
              executionTime = currentTime - previousTime;
              time          = currentTime;
              performance.push({
                'Name'           : message[0],
                'Arguments'      : [].slice.call(message, 1) || '',
                'Element'        : element,
                'Execution Time' : executionTime
              });
            }
            clearTimeout(module.performance.timer);
            module.performance.timer = setTimeout(module.performance.display, 500);
          },
          display: function() {
            var
              title = settings.name + ':',
              totalTime = 0
            ;
            time = false;
            clearTimeout(module.performance.timer);
            $.each(performance, function(index, data) {
              totalTime += data['Execution Time'];
            });
            title += ' ' + totalTime + 'ms';
            if(moduleSelector) {
              title += ' \'' + moduleSelector + '\'';
            }
            if($allModules.length > 1) {
              title += ' ' + '(' + $allModules.length + ')';
            }
            if( (console.group !== undefined || console.table !== undefined) && performance.length > 0) {
              console.groupCollapsed(title);
              if(console.table) {
                console.table(performance);
              }
              else {
                $.each(performance, function(index, data) {
                  console.log(data['Name'] + ': ' + data['Execution Time']+'ms');
                });
              }
              console.groupEnd();
            }
            performance = [];
          }
        },
        invoke: function(query, passedArguments, context) {
          var
            object = instance,
            maxDepth,
            found,
            response
          ;
          passedArguments = passedArguments || queryArguments;
          context         = element         || context;
          if(typeof query == 'string' && object !== undefined) {
            query    = query.split(/[\. ]/);
            maxDepth = query.length - 1;
            $.each(query, function(depth, value) {
              var camelCaseValue = (depth != maxDepth)
                ? value + query[depth + 1].charAt(0).toUpperCase() + query[depth + 1].slice(1)
                : query
              ;
              if( $.isPlainObject( object[camelCaseValue] ) && (depth != maxDepth) ) {
                object = object[camelCaseValue];
              }
              else if( object[camelCaseValue] !== undefined ) {
                found = object[camelCaseValue];
                return false;
              }
              else if( $.isPlainObject( object[value] ) && (depth != maxDepth) ) {
                object = object[value];
              }
              else if( object[value] !== undefined ) {
                found = object[value];
                return false;
              }
              else {
                return false;
              }
            });
          }
          if( $.isFunction( found ) ) {
            response = found.apply(context, passedArguments);
          }
          else if(found !== undefined) {
            response = found;
          }
          if($.isArray(returnedValue)) {
            returnedValue.push(response);
          }
          else if(returnedValue !== undefined) {
            returnedValue = [returnedValue, response];
          }
          else if(response !== undefined) {
            returnedValue = response;
          }
          return found;
        }
      };
      module.initialize();
    })
  ;

  return (returnedValue !== undefined)
    ? returnedValue
    : this
  ;
};

$.fn.form.settings = {

  name              : 'Form',
  namespace         : 'form',

  debug             : false,
  verbose           : false,
  performance       : true,

  fields            : false,

  keyboardShortcuts : true,
  on                : 'submit',
  inline            : false,

  delay             : 200,
  revalidate        : true,

  transition        : 'scale',
  duration          : 200,

  onValid           : function() {},
  onInvalid         : function() {},
  onSuccess         : function() { return true; },
  onFailure         : function() { return false; },

  metadata : {
    defaultValue : 'default',
    validate     : 'validate'
  },

  regExp: {
    bracket : /\[(.*)\]/i,
    decimal : /^\d*(\.)\d+/,
    email   : "[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?",
    escape  : /[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g,
    flags   : /^\/(.*)\/(.*)?/,
    integer : /^\-?\d+$/,
    number  : /^\-?\d*(\.\d+)?$/,
    url     : /(https?:\/\/(?:www\.|(?!www))[^\s\.]+\.[^\s]{2,}|www\.[^\s]+\.[^\s]{2,})/i
  },

  text: {
    unspecifiedRule  : 'Please enter a valid value',
    unspecifiedField : 'This field'
  },

  prompt: {
    empty                : '{name} must have a value',
    checked              : '{name} must be checked',
    email                : '{name} must be a valid e-mail',
    url                  : '{name} must be a valid url',
    regExp               : '{name} is not formatted correctly',
    integer              : '{name} must be an integer',
    decimal              : '{name} must be a decimal number',
    number               : '{name} must be set to a number',
    is                   : '{name} must be "{ruleValue}"',
    isExactly            : '{name} must be exactly "{ruleValue}"',
    not                  : '{name} cannot be set to "{ruleValue}"',
    notExactly           : '{name} cannot be set to exactly "{ruleValue}"',
    contain              : '{name} cannot contain "{ruleValue}"',
    containExactly       : '{name} cannot contain exactly "{ruleValue}"',
    doesntContain        : '{name} must contain  "{ruleValue}"',
    doesntContainExactly : '{name} must contain exactly "{ruleValue}"',
    minLength            : '{name} must be at least {ruleValue} characters',
    length               : '{name} must be at least {ruleValue} characters',
    exactLength          : '{name} must be exactly {ruleValue} characters',
    maxLength            : '{name} cannot be longer than {ruleValue} characters',
    match                : '{name} must match {ruleValue} field',
    different            : '{name} must have a different value than {ruleValue} field',
    creditCard           : '{name} must be a valid credit card number',
    minCount             : '{name} must have at least {ruleValue} choices',
    exactCount           : '{name} must have exactly {ruleValue} choices',
    maxCount             : '{name} must have {ruleValue} or less choices'
  },

  selector : {
    checkbox   : 'input[type="checkbox"], input[type="radio"]',
    clear      : '.clear',
    field      : 'input, textarea, select',
    group      : '.field',
    input      : 'input',
    message    : '.error.message',
    prompt     : '.prompt.label',
    radio      : 'input[type="radio"]',
    reset      : '.reset:not([type="reset"])',
    submit     : '.submit:not([type="submit"])',
    uiCheckbox : '.ui.checkbox',
    uiDropdown : '.ui.dropdown'
  },

  className : {
    error   : 'error',
    label   : 'ui prompt label',
    pressed : 'down',
    success : 'success'
  },

  error: {
    identifier : 'You must specify a string identifier for each field',
    method     : 'The method you called is not defined.',
    noRule     : 'There is no rule matching the one you specified',
    oldSyntax  : 'Starting in 2.0 forms now only take a single settings object. Validation settings converted to new syntax automatically.'
  },

  templates: {

    // template that produces error message
    error: function(errors) {
      var
        html = '<ul class="list">'
      ;
      $.each(errors, function(index, value) {
        html += '<li>' + value + '</li>';
      });
      html += '</ul>';
      return $(html);
    },

    // template that produces label
    prompt: function(errors) {
      return $('<div/>')
        .addClass('ui basic red pointing prompt label')
        .html(errors[0])
      ;
    }
  },

  rules: {

    // is not empty or blank string
    empty: function(value) {
      return !(value === undefined || '' === value || $.isArray(value) && value.length === 0);
    },

    // checkbox checked
    checked: function() {
      return ($(this).filter(':checked').length > 0);
    },

    // is most likely an email
    email: function(value){
      var
        emailRegExp = new RegExp($.fn.form.settings.regExp.email, 'i')
      ;
      return emailRegExp.test(value);
    },

    // value is most likely url
    url: function(value) {
      return $.fn.form.settings.regExp.url.test(value);
    },

    // matches specified regExp
    regExp: function(value, regExp) {
      var
        regExpParts = regExp.match($.fn.form.settings.regExp.flags),
        flags
      ;
      // regular expression specified as /baz/gi (flags)
      if(regExpParts) {
        regExp = (regExpParts.length >= 2)
          ? regExpParts[1]
          : regExp
        ;
        flags = (regExpParts.length >= 3)
          ? regExpParts[2]
          : ''
        ;
      }
      return value.match( new RegExp(regExp, flags) );
    },

    // is valid integer or matches range
    integer: function(value, range) {
      var
        intRegExp = $.fn.form.settings.regExp.integer,
        min,
        max,
        parts
      ;
      if( !range || ['', '..'].indexOf(range) !== -1) {
        // do nothing
      }
      else if(range.indexOf('..') == -1) {
        if(intRegExp.test(range)) {
          min = max = range - 0;
        }
      }
      else {
        parts = range.split('..', 2);
        if(intRegExp.test(parts[0])) {
          min = parts[0] - 0;
        }
        if(intRegExp.test(parts[1])) {
          max = parts[1] - 0;
        }
      }
      return (
        intRegExp.test(value) &&
        (min === undefined || value >= min) &&
        (max === undefined || value <= max)
      );
    },

    // is valid number (with decimal)
    decimal: function(value) {
      return $.fn.form.settings.regExp.decimal.test(value);
    },

    // is valid number
    number: function(value) {
      return $.fn.form.settings.regExp.number.test(value);
    },

    // is value (case insensitive)
    is: function(value, text) {
      text = (typeof text == 'string')
        ? text.toLowerCase()
        : text
      ;
      value = (typeof value == 'string')
        ? value.toLowerCase()
        : value
      ;
      return (value == text);
    },

    // is value
    isExactly: function(value, text) {
      return (value == text);
    },

    // value is not another value (case insensitive)
    not: function(value, notValue) {
      value = (typeof value == 'string')
        ? value.toLowerCase()
        : value
      ;
      notValue = (typeof notValue == 'string')
        ? notValue.toLowerCase()
        : notValue
      ;
      return (value != notValue);
    },

    // value is not another value (case sensitive)
    notExactly: function(value, notValue) {
      return (value != notValue);
    },

    // value contains text (insensitive)
    contains: function(value, text) {
      // escape regex characters
      text = text.replace($.fn.form.settings.regExp.escape, "\\$&");
      return (value.search( new RegExp(text, 'i') ) !== -1);
    },

    // value contains text (case sensitive)
    containsExactly: function(value, text) {
      // escape regex characters
      text = text.replace($.fn.form.settings.regExp.escape, "\\$&");
      return (value.search( new RegExp(text) ) !== -1);
    },

    // value contains text (insensitive)
    doesntContain: function(value, text) {
      // escape regex characters
      text = text.replace($.fn.form.settings.regExp.escape, "\\$&");
      return (value.search( new RegExp(text, 'i') ) === -1);
    },

    // value contains text (case sensitive)
    doesntContainExactly: function(value, text) {
      // escape regex characters
      text = text.replace($.fn.form.settings.regExp.escape, "\\$&");
      return (value.search( new RegExp(text) ) === -1);
    },

    // is at least string length
    minLength: function(value, requiredLength) {
      return (value !== undefined)
        ? (value.length >= requiredLength)
        : false
      ;
    },

    // see rls notes for 2.0.6 (this is a duplicate of minLength)
    length: function(value, requiredLength) {
      return (value !== undefined)
        ? (value.length >= requiredLength)
        : false
      ;
    },

    // is exactly length
    exactLength: function(value, requiredLength) {
      return (value !== undefined)
        ? (value.length == requiredLength)
        : false
      ;
    },

    // is less than length
    maxLength: function(value, maxLength) {
      return (value !== undefined)
        ? (value.length <= maxLength)
        : false
      ;
    },

    // matches another field
    match: function(value, identifier) {
      var
        $form = $(this),
        matchingValue
      ;
      if( $('[data-validate="'+ identifier +'"]').length > 0 ) {
        matchingValue = $('[data-validate="'+ identifier +'"]').val();
      }
      else if($('#' + identifier).length > 0) {
        matchingValue = $('#' + identifier).val();
      }
      else if($('[name="' + identifier +'"]').length > 0) {
        matchingValue = $('[name="' + identifier + '"]').val();
      }
      else if( $('[name="' + identifier +'[]"]').length > 0 ) {
        matchingValue = $('[name="' + identifier +'[]"]');
      }
      return (matchingValue !== undefined)
        ? ( value.toString() == matchingValue.toString() )
        : false
      ;
    },

    // different than another field
    different: function(value, identifier) {
      // use either id or name of field
      var
        $form = $(this),
        matchingValue
      ;
      if( $('[data-validate="'+ identifier +'"]').length > 0 ) {
        matchingValue = $('[data-validate="'+ identifier +'"]').val();
      }
      else if($('#' + identifier).length > 0) {
        matchingValue = $('#' + identifier).val();
      }
      else if($('[name="' + identifier +'"]').length > 0) {
        matchingValue = $('[name="' + identifier + '"]').val();
      }
      else if( $('[name="' + identifier +'[]"]').length > 0 ) {
        matchingValue = $('[name="' + identifier +'[]"]');
      }
      return (matchingValue !== undefined)
        ? ( value.toString() !== matchingValue.toString() )
        : false
      ;
    },

    creditCard: function(cardNumber, cardTypes) {
      var
        cards = {
          visa: {
            pattern : /^4/,
            length  : [16]
          },
          amex: {
            pattern : /^3[47]/,
            length  : [15]
          },
          mastercard: {
            pattern : /^5[1-5]/,
            length  : [16]
          },
          discover: {
            pattern : /^(6011|622(12[6-9]|1[3-9][0-9]|[2-8][0-9]{2}|9[0-1][0-9]|92[0-5]|64[4-9])|65)/,
            length  : [16]
          },
          unionPay: {
            pattern : /^(62|88)/,
            length  : [16, 17, 18, 19]
          },
          jcb: {
            pattern : /^35(2[89]|[3-8][0-9])/,
            length  : [16]
          },
          maestro: {
            pattern : /^(5018|5020|5038|6304|6759|676[1-3])/,
            length  : [12, 13, 14, 15, 16, 17, 18, 19]
          },
          dinersClub: {
            pattern : /^(30[0-5]|^36)/,
            length  : [14]
          },
          laser: {
            pattern : /^(6304|670[69]|6771)/,
            length  : [16, 17, 18, 19]
          },
          visaElectron: {
            pattern : /^(4026|417500|4508|4844|491(3|7))/,
            length  : [16]
          }
        },
        valid         = {},
        validCard     = false,
        requiredTypes = (typeof cardTypes == 'string')
          ? cardTypes.split(',')
          : false,
        unionPay,
        validation
      ;

      if(typeof cardNumber !== 'string' || cardNumber.length === 0) {
        return;
      }

      // verify card types
      if(requiredTypes) {
        $.each(requiredTypes, function(index, type){
          // verify each card type
          validation = cards[type];
          if(validation) {
            valid = {
              length  : ($.inArray(cardNumber.length, validation.length) !== -1),
              pattern : (cardNumber.search(validation.pattern) !== -1)
            };
            if(valid.length && valid.pattern) {
              validCard = true;
            }
          }
        });

        if(!validCard) {
          return false;
        }
      }

      // skip luhn for UnionPay
      unionPay = {
        number  : ($.inArray(cardNumber.length, cards.unionPay.length) !== -1),
        pattern : (cardNumber.search(cards.unionPay.pattern) !== -1)
      };
      if(unionPay.number && unionPay.pattern) {
        return true;
      }

      // verify luhn, adapted from  <https://gist.github.com/2134376>
      var
        length        = cardNumber.length,
        multiple      = 0,
        producedValue = [
          [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
          [0, 2, 4, 6, 8, 1, 3, 5, 7, 9]
        ],
        sum           = 0
      ;
      while (length--) {
        sum += producedValue[multiple][parseInt(cardNumber.charAt(length), 10)];
        multiple ^= 1;
      }
      return (sum % 10 === 0 && sum > 0);
    },

    minCount: function(value, minCount) {
      if(minCount == 0) {
        return true;
      }
      if(minCount == 1) {
        return (value !== '');
      }
      return (value.split(',').length >= minCount);
    },

    exactCount: function(value, exactCount) {
      if(exactCount == 0) {
        return (value === '');
      }
      if(exactCount == 1) {
        return (value !== '' && value.search(',') === -1);
      }
      return (value.split(',').length == exactCount);
    },

    maxCount: function(value, maxCount) {
      if(maxCount == 0) {
        return false;
      }
      if(maxCount == 1) {
        return (value.search(',') === -1);
      }
      return (value.split(',').length <= maxCount);
    }
  }

};

})( jQuery, window, document );

/*!
 * # Semantic UI 2.1.6 - Accordion
 * http://github.com/semantic-org/semantic-ui/
 *
 *
 * Copyright 2015 Contributors
 * Released under the MIT license
 * http://opensource.org/licenses/MIT
 *
 */

;(function ($, window, document, undefined) {

"use strict";

$.fn.accordion = function(parameters) {
  var
    $allModules     = $(this),

    time            = new Date().getTime(),
    performance     = [],

    query           = arguments[0],
    methodInvoked   = (typeof query == 'string'),
    queryArguments  = [].slice.call(arguments, 1),

    requestAnimationFrame = window.requestAnimationFrame
      || window.mozRequestAnimationFrame
      || window.webkitRequestAnimationFrame
      || window.msRequestAnimationFrame
      || function(callback) { setTimeout(callback, 0); },

    returnedValue
  ;
  $allModules
    .each(function() {
      var
        settings        = ( $.isPlainObject(parameters) )
          ? $.extend(true, {}, $.fn.accordion.settings, parameters)
          : $.extend({}, $.fn.accordion.settings),

        className       = settings.className,
        namespace       = settings.namespace,
        selector        = settings.selector,
        error           = settings.error,

        eventNamespace  = '.' + namespace,
        moduleNamespace = 'module-' + namespace,
        moduleSelector  = $allModules.selector || '',

        $module  = $(this),
        $title   = $module.find(selector.title),
        $content = $module.find(selector.content),

        element  = this,
        instance = $module.data(moduleNamespace),
        observer,
        module
      ;

      module = {

        initialize: function() {
          module.debug('Initializing', $module);
          module.bind.events();
          if(settings.observeChanges) {
            module.observeChanges();
          }
          module.instantiate();
        },

        instantiate: function() {
          instance = module;
          $module
            .data(moduleNamespace, module)
          ;
        },

        destroy: function() {
          module.debug('Destroying previous instance', $module);
          $module
            .off(eventNamespace)
            .removeData(moduleNamespace)
          ;
        },

        refresh: function() {
          $title   = $module.find(selector.title);
          $content = $module.find(selector.content);
        },

        observeChanges: function() {
          if('MutationObserver' in window) {
            observer = new MutationObserver(function(mutations) {
              module.debug('DOM tree modified, updating selector cache');
              module.refresh();
            });
            observer.observe(element, {
              childList : true,
              subtree   : true
            });
            module.debug('Setting up mutation observer', observer);
          }
        },

        bind: {
          events: function() {
            module.debug('Binding delegated events');
            $module
              .on(settings.on + eventNamespace, selector.trigger, module.event.click)
            ;
          }
        },

        event: {
          click: function() {
            module.toggle.call(this);
          }
        },

        toggle: function(query) {
          var
            $activeTitle = (query !== undefined)
              ? (typeof query === 'number')
                ? $title.eq(query)
                : $(query).closest(selector.title)
              : $(this).closest(selector.title),
            $activeContent = $activeTitle.next($content),
            isAnimating = $activeContent.hasClass(className.animating),
            isActive    = $activeContent.hasClass(className.active),
            isOpen      = (isActive && !isAnimating),
            isOpening   = (!isActive && isAnimating)
          ;
          module.debug('Toggling visibility of content', $activeTitle);
          if(isOpen || isOpening) {
            if(settings.collapsible) {
              module.close.call($activeTitle);
            }
            else {
              module.debug('Cannot close accordion content collapsing is disabled');
            }
          }
          else {
            module.open.call($activeTitle);
          }
        },

        open: function(query) {
          var
            $activeTitle = (query !== undefined)
              ? (typeof query === 'number')
                ? $title.eq(query)
                : $(query).closest(selector.title)
              : $(this).closest(selector.title),
            $activeContent = $activeTitle.next($content),
            isAnimating = $activeContent.hasClass(className.animating),
            isActive    = $activeContent.hasClass(className.active),
            isOpen      = (isActive || isAnimating)
          ;
          if(isOpen) {
            module.debug('Accordion already open, skipping', $activeContent);
            return;
          }
          module.debug('Opening accordion content', $activeTitle);
          settings.onOpening.call($activeContent);
          if(settings.exclusive) {
            module.closeOthers.call($activeTitle);
          }
          $activeTitle
            .addClass(className.active)
          ;
          $activeContent
            .stop(true, true)
            .addClass(className.animating)
          ;
          if(settings.animateChildren) {
            if($.fn.transition !== undefined && $module.transition('is supported')) {
              $activeContent
                .children()
                  .transition({
                    animation   : 'fade in',
                    queue       : false,
                    useFailSafe : true,
                    debug       : settings.debug,
                    verbose     : settings.verbose,
                    duration    : settings.duration
                  })
              ;
            }
            else {
              $activeContent
                .children()
                  .stop(true, true)
                  .animate({
                    opacity: 1
                  }, settings.duration, module.resetOpacity)
              ;
            }
          }
          $activeContent
            .slideDown(settings.duration, settings.easing, function() {
              $activeContent
                .removeClass(className.animating)
                .addClass(className.active)
              ;
              module.reset.display.call(this);
              settings.onOpen.call(this);
              settings.onChange.call(this);
            })
          ;
        },

        close: function(query) {
          var
            $activeTitle = (query !== undefined)
              ? (typeof query === 'number')
                ? $title.eq(query)
                : $(query).closest(selector.title)
              : $(this).closest(selector.title),
            $activeContent = $activeTitle.next($content),
            isAnimating    = $activeContent.hasClass(className.animating),
            isActive       = $activeContent.hasClass(className.active),
            isOpening      = (!isActive && isAnimating),
            isClosing      = (isActive && isAnimating)
          ;
          if((isActive || isOpening) && !isClosing) {
            module.debug('Closing accordion content', $activeContent);
            settings.onClosing.call($activeContent);
            $activeTitle
              .removeClass(className.active)
            ;
            $activeContent
              .stop(true, true)
              .addClass(className.animating)
            ;
            if(settings.animateChildren) {
              if($.fn.transition !== undefined && $module.transition('is supported')) {
                $activeContent
                  .children()
                    .transition({
                      animation   : 'fade out',
                      queue       : false,
                      useFailSafe : true,
                      debug       : settings.debug,
                      verbose     : settings.verbose,
                      duration    : settings.duration
                    })
                ;
              }
              else {
                $activeContent
                  .children()
                    .stop(true, true)
                    .animate({
                      opacity: 0
                    }, settings.duration, module.resetOpacity)
                ;
              }
            }
            $activeContent
              .slideUp(settings.duration, settings.easing, function() {
                $activeContent
                  .removeClass(className.animating)
                  .removeClass(className.active)
                ;
                module.reset.display.call(this);
                settings.onClose.call(this);
                settings.onChange.call(this);
              })
            ;
          }
        },

        closeOthers: function(index) {
          var
            $activeTitle = (index !== undefined)
              ? $title.eq(index)
              : $(this).closest(selector.title),
            $parentTitles    = $activeTitle.parents(selector.content).prev(selector.title),
            $activeAccordion = $activeTitle.closest(selector.accordion),
            activeSelector   = selector.title + '.' + className.active + ':visible',
            activeContent    = selector.content + '.' + className.active + ':visible',
            $openTitles,
            $nestedTitles,
            $openContents
          ;
          if(settings.closeNested) {
            $openTitles   = $activeAccordion.find(activeSelector).not($parentTitles);
            $openContents = $openTitles.next($content);
          }
          else {
            $openTitles   = $activeAccordion.find(activeSelector).not($parentTitles);
            $nestedTitles = $activeAccordion.find(activeContent).find(activeSelector).not($parentTitles);
            $openTitles   = $openTitles.not($nestedTitles);
            $openContents = $openTitles.next($content);
          }
          if( ($openTitles.length > 0) ) {
            module.debug('Exclusive enabled, closing other content', $openTitles);
            $openTitles
              .removeClass(className.active)
            ;
            $openContents
              .removeClass(className.animating)
              .stop(true, true)
            ;
            if(settings.animateChildren) {
              if($.fn.transition !== undefined && $module.transition('is supported')) {
                $openContents
                  .children()
                    .transition({
                      animation   : 'fade out',
                      useFailSafe : true,
                      debug       : settings.debug,
                      verbose     : settings.verbose,
                      duration    : settings.duration
                    })
                ;
              }
              else {
                $openContents
                  .children()
                    .stop(true, true)
                    .animate({
                      opacity: 0
                    }, settings.duration, module.resetOpacity)
                ;
              }
            }
            $openContents
              .slideUp(settings.duration , settings.easing, function() {
                $(this).removeClass(className.active);
                module.reset.display.call(this);
              })
            ;
          }
        },

        reset: {

          display: function() {
            module.verbose('Removing inline display from element', this);
            $(this).css('display', '');
            if( $(this).attr('style') === '') {
              $(this)
                .attr('style', '')
                .removeAttr('style')
              ;
            }
          },

          opacity: function() {
            module.verbose('Removing inline opacity from element', this);
            $(this).css('opacity', '');
            if( $(this).attr('style') === '') {
              $(this)
                .attr('style', '')
                .removeAttr('style')
              ;
            }
          },

        },

        setting: function(name, value) {
          module.debug('Changing setting', name, value);
          if( $.isPlainObject(name) ) {
            $.extend(true, settings, name);
          }
          else if(value !== undefined) {
            settings[name] = value;
          }
          else {
            return settings[name];
          }
        },
        internal: function(name, value) {
          module.debug('Changing internal', name, value);
          if(value !== undefined) {
            if( $.isPlainObject(name) ) {
              $.extend(true, module, name);
            }
            else {
              module[name] = value;
            }
          }
          else {
            return module[name];
          }
        },
        debug: function() {
          if(settings.debug) {
            if(settings.performance) {
              module.performance.log(arguments);
            }
            else {
              module.debug = Function.prototype.bind.call(console.info, console, settings.name + ':');
              module.debug.apply(console, arguments);
            }
          }
        },
        verbose: function() {
          if(settings.verbose && settings.debug) {
            if(settings.performance) {
              module.performance.log(arguments);
            }
            else {
              module.verbose = Function.prototype.bind.call(console.info, console, settings.name + ':');
              module.verbose.apply(console, arguments);
            }
          }
        },
        error: function() {
          module.error = Function.prototype.bind.call(console.error, console, settings.name + ':');
          module.error.apply(console, arguments);
        },
        performance: {
          log: function(message) {
            var
              currentTime,
              executionTime,
              previousTime
            ;
            if(settings.performance) {
              currentTime   = new Date().getTime();
              previousTime  = time || currentTime;
              executionTime = currentTime - previousTime;
              time          = currentTime;
              performance.push({
                'Name'           : message[0],
                'Arguments'      : [].slice.call(message, 1) || '',
                'Element'        : element,
                'Execution Time' : executionTime
              });
            }
            clearTimeout(module.performance.timer);
            module.performance.timer = setTimeout(module.performance.display, 500);
          },
          display: function() {
            var
              title = settings.name + ':',
              totalTime = 0
            ;
            time = false;
            clearTimeout(module.performance.timer);
            $.each(performance, function(index, data) {
              totalTime += data['Execution Time'];
            });
            title += ' ' + totalTime + 'ms';
            if(moduleSelector) {
              title += ' \'' + moduleSelector + '\'';
            }
            if( (console.group !== undefined || console.table !== undefined) && performance.length > 0) {
              console.groupCollapsed(title);
              if(console.table) {
                console.table(performance);
              }
              else {
                $.each(performance, function(index, data) {
                  console.log(data['Name'] + ': ' + data['Execution Time']+'ms');
                });
              }
              console.groupEnd();
            }
            performance = [];
          }
        },
        invoke: function(query, passedArguments, context) {
          var
            object = instance,
            maxDepth,
            found,
            response
          ;
          passedArguments = passedArguments || queryArguments;
          context         = element         || context;
          if(typeof query == 'string' && object !== undefined) {
            query    = query.split(/[\. ]/);
            maxDepth = query.length - 1;
            $.each(query, function(depth, value) {
              var camelCaseValue = (depth != maxDepth)
                ? value + query[depth + 1].charAt(0).toUpperCase() + query[depth + 1].slice(1)
                : query
              ;
              if( $.isPlainObject( object[camelCaseValue] ) && (depth != maxDepth) ) {
                object = object[camelCaseValue];
              }
              else if( object[camelCaseValue] !== undefined ) {
                found = object[camelCaseValue];
                return false;
              }
              else if( $.isPlainObject( object[value] ) && (depth != maxDepth) ) {
                object = object[value];
              }
              else if( object[value] !== undefined ) {
                found = object[value];
                return false;
              }
              else {
                module.error(error.method, query);
                return false;
              }
            });
          }
          if ( $.isFunction( found ) ) {
            response = found.apply(context, passedArguments);
          }
          else if(found !== undefined) {
            response = found;
          }
          if($.isArray(returnedValue)) {
            returnedValue.push(response);
          }
          else if(returnedValue !== undefined) {
            returnedValue = [returnedValue, response];
          }
          else if(response !== undefined) {
            returnedValue = response;
          }
          return found;
        }
      };
      if(methodInvoked) {
        if(instance === undefined) {
          module.initialize();
        }
        module.invoke(query);
      }
      else {
        if(instance !== undefined) {
          instance.invoke('destroy');
        }
        module.initialize();
      }
    })
  ;
  return (returnedValue !== undefined)
    ? returnedValue
    : this
  ;
};

$.fn.accordion.settings = {

  name            : 'Accordion',
  namespace       : 'accordion',

  debug           : false,
  verbose         : false,
  performance     : true,

  on              : 'click', // event on title that opens accordion

  observeChanges  : true,  // whether accordion should automatically refresh on DOM insertion

  exclusive       : true,  // whether a single accordion content panel should be open at once
  collapsible     : true,  // whether accordion content can be closed
  closeNested     : false, // whether nested content should be closed when a panel is closed
  animateChildren : true,  // whether children opacity should be animated

  duration        : 350, // duration of animation
  easing          : 'easeOutQuad', // easing equation for animation


  onOpening       : function(){}, // callback before open animation
  onOpen          : function(){}, // callback after open animation
  onClosing       : function(){}, // callback before closing animation
  onClose         : function(){}, // callback after closing animation
  onChange        : function(){}, // callback after closing or opening animation

  error: {
    method : 'The method you called is not defined'
  },

  className   : {
    active    : 'active',
    animating : 'animating'
  },

  selector    : {
    accordion : '.accordion',
    title     : '.title',
    trigger   : '.title',
    content   : '.content'
  }

};

// Adds easing
$.extend( $.easing, {
  easeOutQuad: function (x, t, b, c, d) {
    return -c *(t/=d)*(t-2) + b;
  }
});

})( jQuery, window, document );


/*!
 * # Semantic UI 2.1.6 - Checkbox
 * http://github.com/semantic-org/semantic-ui/
 *
 *
 * Copyright 2015 Contributors
 * Released under the MIT license
 * http://opensource.org/licenses/MIT
 *
 */

;(function ( $, window, document, undefined ) {

"use strict";

$.fn.checkbox = function(parameters) {
  var
    $allModules    = $(this),
    moduleSelector = $allModules.selector || '',

    time           = new Date().getTime(),
    performance    = [],

    query          = arguments[0],
    methodInvoked  = (typeof query == 'string'),
    queryArguments = [].slice.call(arguments, 1),
    returnedValue
  ;

  $allModules
    .each(function() {
      var
        settings        = $.extend(true, {}, $.fn.checkbox.settings, parameters),

        className       = settings.className,
        namespace       = settings.namespace,
        selector        = settings.selector,
        error           = settings.error,

        eventNamespace  = '.' + namespace,
        moduleNamespace = 'module-' + namespace,

        $module         = $(this),
        $label          = $(this).children(selector.label),
        $input          = $(this).children(selector.input),
        input           = $input[0],

        initialLoad     = false,
        shortcutPressed = false,
        instance        = $module.data(moduleNamespace),

        observer,
        element         = this,
        module
      ;

      module      = {

        initialize: function() {
          module.verbose('Initializing checkbox', settings);

          module.create.label();
          module.bind.events();

          module.set.tabbable();
          module.hide.input();

          module.observeChanges();
          module.instantiate();
          module.setup();
        },

        instantiate: function() {
          module.verbose('Storing instance of module', module);
          instance = module;
          $module
            .data(moduleNamespace, module)
          ;
        },

        destroy: function() {
          module.verbose('Destroying module');
          module.unbind.events();
          module.show.input();
          $module.removeData(moduleNamespace);
        },

        fix: {
          reference: function() {
            if( $module.is(selector.input) ) {
              module.debug('Behavior called on <input> adjusting invoked element');
              $module = $module.closest(selector.checkbox);
              module.refresh();
            }
          }
        },

        setup: function() {
          module.set.initialLoad();
          if( module.is.indeterminate() ) {
            module.debug('Initial value is indeterminate');
            module.indeterminate();
          }
          else if( module.is.checked() ) {
            module.debug('Initial value is checked');
            module.check();
          }
          else {
            module.debug('Initial value is unchecked');
            module.uncheck();
          }
          module.remove.initialLoad();
        },

        refresh: function() {
          $label = $module.children(selector.label);
          $input = $module.children(selector.input);
          input  = $input[0];
        },

        hide: {
          input: function() {
            module.verbose('Modfying <input> z-index to be unselectable');
            $input.addClass(className.hidden);
          }
        },
        show: {
          input: function() {
            module.verbose('Modfying <input> z-index to be selectable');
            $input.removeClass(className.hidden);
          }
        },

        observeChanges: function() {
          if('MutationObserver' in window) {
            observer = new MutationObserver(function(mutations) {
              module.debug('DOM tree modified, updating selector cache');
              module.refresh();
            });
            observer.observe(element, {
              childList : true,
              subtree   : true
            });
            module.debug('Setting up mutation observer', observer);
          }
        },

        attachEvents: function(selector, event) {
          var
            $element = $(selector)
          ;
          event = $.isFunction(module[event])
            ? module[event]
            : module.toggle
          ;
          if($element.length > 0) {
            module.debug('Attaching checkbox events to element', selector, event);
            $element
              .on('click' + eventNamespace, event)
            ;
          }
          else {
            module.error(error.notFound);
          }
        },

        event: {
          click: function(event) {
            var
              $target = $(event.target)
            ;
            if( $target.is(selector.input) ) {
              module.verbose('Using default check action on initialized checkbox');
              return;
            }
            if( $target.is(selector.link) ) {
              module.debug('Clicking link inside checkbox, skipping toggle');
              return;
            }
            module.toggle();
            $input.focus();
            event.preventDefault();
          },
          keydown: function(event) {
            var
              key     = event.which,
              keyCode = {
                enter  : 13,
                space  : 32,
                escape : 27
              }
            ;
            if(key == keyCode.escape) {
              module.verbose('Escape key pressed blurring field');
              $input.blur();
              shortcutPressed = true;
            }
            else if(!event.ctrlKey && ( key == keyCode.space || key == keyCode.enter) ) {
              module.verbose('Enter/space key pressed, toggling checkbox');
              module.toggle();
              shortcutPressed = true;
            }
            else {
              shortcutPressed = false;
            }
          },
          keyup: function(event) {
            if(shortcutPressed) {
              event.preventDefault();
            }
          }
        },

        check: function() {
          if( !module.should.allowCheck() ) {
            return;
          }
          module.debug('Checking checkbox', $input);
          module.set.checked();
          if( !module.should.ignoreCallbacks() ) {
            settings.onChecked.call(input);
            settings.onChange.call(input);
          }
        },

        uncheck: function() {
          if( !module.should.allowUncheck() ) {
            return;
          }
          module.debug('Unchecking checkbox');
          module.set.unchecked();
          if( !module.should.ignoreCallbacks() ) {
            settings.onUnchecked.call(input);
            settings.onChange.call(input);
          }
        },

        indeterminate: function() {
          if( module.should.allowIndeterminate() ) {
            module.debug('Checkbox is already indeterminate');
            return;
          }
          module.debug('Making checkbox indeterminate');
          module.set.indeterminate();
          if( !module.should.ignoreCallbacks() ) {
            settings.onIndeterminate.call(input);
            settings.onChange.call(input);
          }
        },

        determinate: function() {
          if( module.should.allowDeterminate() ) {
            module.debug('Checkbox is already determinate');
            return;
          }
          module.debug('Making checkbox determinate');
          module.set.determinate();
          if( !module.should.ignoreCallbacks() ) {
            settings.onDeterminate.call(input);
            settings.onChange.call(input);
          }
        },

        enable: function() {
          if( module.is.enabled() ) {
            module.debug('Checkbox is already enabled');
            return;
          }
          module.debug('Enabling checkbox');
          module.set.enabled();
          settings.onEnable.call(input);
        },

        disable: function() {
          if( module.is.disabled() ) {
            module.debug('Checkbox is already disabled');
            return;
          }
          module.debug('Disabling checkbox');
          module.set.disabled();
          settings.onDisable.call(input);
        },

        get: {
          radios: function() {
            var
              name = module.get.name()
            ;
            return $('input[name="' + name + '"]').closest(selector.checkbox);
          },
          otherRadios: function() {
            return module.get.radios().not($module);
          },
          name: function() {
            return $input.attr('name');
          }
        },

        is: {
          initialLoad: function() {
            return initialLoad;
          },
          radio: function() {
            return ($input.hasClass(className.radio) || $input.attr('type') == 'radio');
          },
          indeterminate: function() {
            return $input.prop('indeterminate') !== undefined && $input.prop('indeterminate');
          },
          checked: function() {
            return $input.prop('checked') !== undefined && $input.prop('checked');
          },
          disabled: function() {
            return $input.prop('disabled') !== undefined && $input.prop('disabled');
          },
          enabled: function() {
            return !module.is.disabled();
          },
          determinate: function() {
            return !module.is.indeterminate();
          },
          unchecked: function() {
            return !module.is.checked();
          }
        },

        should: {
          allowCheck: function() {
            if(module.is.determinate() && module.is.checked() && !module.should.forceCallbacks() ) {
              module.debug('Should not allow check, checkbox is already checked');
              return false;
            }
            if(settings.beforeChecked.apply(input) === false) {
              module.debug('Should not allow check, beforeChecked cancelled');
              return false;
            }
            return true;
          },
          allowUncheck: function() {
            if(module.is.determinate() && module.is.unchecked() && !module.should.forceCallbacks() ) {
              module.debug('Should not allow uncheck, checkbox is already unchecked');
              return false;
            }
            if(settings.beforeUnchecked.apply(input) === false) {
              module.debug('Should not allow uncheck, beforeUnchecked cancelled');
              return false;
            }
            return true;
          },
          allowIndeterminate: function() {
            if(module.is.indeterminate() && !module.should.forceCallbacks() ) {
              module.debug('Should not allow indeterminate, checkbox is already indeterminate');
              return false;
            }
            if(settings.beforeIndeterminate.apply(input) === false) {
              module.debug('Should not allow indeterminate, beforeIndeterminate cancelled');
              return false;
            }
            return true;
          },
          allowDeterminate: function() {
            if(module.is.determinate() && !module.should.forceCallbacks() ) {
              module.debug('Should not allow determinate, checkbox is already determinate');
              return false;
            }
            if(settings.beforeDeterminate.apply(input) === false) {
              module.debug('Should not allow determinate, beforeDeterminate cancelled');
              return false;
            }
            return true;
          },
          forceCallbacks: function() {
            return (module.is.initialLoad() && settings.fireOnInit);
          },
          ignoreCallbacks: function() {
            return (initialLoad && !settings.fireOnInit);
          }
        },

        can: {
          change: function() {
            return !( $module.hasClass(className.disabled) || $module.hasClass(className.readOnly) || $input.prop('disabled') || $input.prop('readonly') );
          },
          uncheck: function() {
            return (typeof settings.uncheckable === 'boolean')
              ? settings.uncheckable
              : !module.is.radio()
            ;
          }
        },

        set: {
          initialLoad: function() {
            initialLoad = true;
          },
          checked: function() {
            module.verbose('Setting class to checked');
            $module
              .removeClass(className.indeterminate)
              .addClass(className.checked)
            ;
            if( module.is.radio() ) {
              module.uncheckOthers();
            }
            if(!module.is.indeterminate() && module.is.checked()) {
              module.debug('Input is already checked, skipping input property change');
              return;
            }
            module.verbose('Setting state to checked', input);
            $input
              .prop('indeterminate', false)
              .prop('checked', true)
            ;
            module.trigger.change();
          },
          unchecked: function() {
            module.verbose('Removing checked class');
            $module
              .removeClass(className.indeterminate)
              .removeClass(className.checked)
            ;
            if(!module.is.indeterminate() &&  module.is.unchecked() ) {
              module.debug('Input is already unchecked');
              return;
            }
            module.debug('Setting state to unchecked');
            $input
              .prop('indeterminate', false)
              .prop('checked', false)
            ;
            module.trigger.change();
          },
          indeterminate: function() {
            module.verbose('Setting class to indeterminate');
            $module
              .addClass(className.indeterminate)
            ;
            if( module.is.indeterminate() ) {
              module.debug('Input is already indeterminate, skipping input property change');
              return;
            }
            module.debug('Setting state to indeterminate');
            $input
              .prop('indeterminate', true)
            ;
            module.trigger.change();
          },
          determinate: function() {
            module.verbose('Removing indeterminate class');
            $module
              .removeClass(className.indeterminate)
            ;
            if( module.is.determinate() ) {
              module.debug('Input is already determinate, skipping input property change');
              return;
            }
            module.debug('Setting state to determinate');
            $input
              .prop('indeterminate', false)
            ;
          },
          disabled: function() {
            module.verbose('Setting class to disabled');
            $module
              .addClass(className.disabled)
            ;
            if( module.is.disabled() ) {
              module.debug('Input is already disabled, skipping input property change');
              return;
            }
            module.debug('Setting state to disabled');
            $input
              .prop('disabled', 'disabled')
            ;
            module.trigger.change();
          },
          enabled: function() {
            module.verbose('Removing disabled class');
            $module.removeClass(className.disabled);
            if( module.is.enabled() ) {
              module.debug('Input is already enabled, skipping input property change');
              return;
            }
            module.debug('Setting state to enabled');
            $input
              .prop('disabled', false)
            ;
            module.trigger.change();
          },
          tabbable: function() {
            module.verbose('Adding tabindex to checkbox');
            if( $input.attr('tabindex') === undefined) {
              $input.attr('tabindex', 0);
            }
          }
        },

        remove: {
          initialLoad: function() {
            initialLoad = false;
          }
        },

        trigger: {
          change: function() {
            var
              events       = document.createEvent('HTMLEvents'),
              inputElement = $input[0]
            ;
            if(inputElement) {
              module.verbose('Triggering native change event');
              events.initEvent('change', true, false);
              inputElement.dispatchEvent(events);
            }
          }
        },


        create: {
          label: function() {
            if($input.prevAll(selector.label).length > 0) {
              $input.prev(selector.label).detach().insertAfter($input);
              module.debug('Moving existing label', $label);
            }
            else if( !module.has.label() ) {
              $label = $('<label>').insertAfter($input);
              module.debug('Creating label', $label);
            }
          }
        },

        has: {
          label: function() {
            return ($label.length > 0);
          }
        },

        bind: {
          events: function() {
            module.verbose('Attaching checkbox events');
            $module
              .on('click'   + eventNamespace, module.event.click)
              .on('keydown' + eventNamespace, selector.input, module.event.keydown)
              .on('keyup'   + eventNamespace, selector.input, module.event.keyup)
            ;
          }
        },

        unbind: {
          events: function() {
            module.debug('Removing events');
            $module
              .off(eventNamespace)
            ;
          }
        },

        uncheckOthers: function() {
          var
            $radios = module.get.otherRadios()
          ;
          module.debug('Unchecking other radios', $radios);
          $radios.removeClass(className.checked);
        },

        toggle: function() {
          if( !module.can.change() ) {
            if(!module.is.radio()) {
              module.debug('Checkbox is read-only or disabled, ignoring toggle');
            }
            return;
          }
          if( module.is.indeterminate() || module.is.unchecked() ) {
            module.debug('Currently unchecked');
            module.check();
          }
          else if( module.is.checked() && module.can.uncheck() ) {
            module.debug('Currently checked');
            module.uncheck();
          }
        },
        setting: function(name, value) {
          module.debug('Changing setting', name, value);
          if( $.isPlainObject(name) ) {
            $.extend(true, settings, name);
          }
          else if(value !== undefined) {
            settings[name] = value;
          }
          else {
            return settings[name];
          }
        },
        internal: function(name, value) {
          if( $.isPlainObject(name) ) {
            $.extend(true, module, name);
          }
          else if(value !== undefined) {
            module[name] = value;
          }
          else {
            return module[name];
          }
        },
        debug: function() {
          if(settings.debug) {
            if(settings.performance) {
              module.performance.log(arguments);
            }
            else {
              module.debug = Function.prototype.bind.call(console.info, console, settings.name + ':');
              module.debug.apply(console, arguments);
            }
          }
        },
        verbose: function() {
          if(settings.verbose && settings.debug) {
            if(settings.performance) {
              module.performance.log(arguments);
            }
            else {
              module.verbose = Function.prototype.bind.call(console.info, console, settings.name + ':');
              module.verbose.apply(console, arguments);
            }
          }
        },
        error: function() {
          module.error = Function.prototype.bind.call(console.error, console, settings.name + ':');
          module.error.apply(console, arguments);
        },
        performance: {
          log: function(message) {
            var
              currentTime,
              executionTime,
              previousTime
            ;
            if(settings.performance) {
              currentTime   = new Date().getTime();
              previousTime  = time || currentTime;
              executionTime = currentTime - previousTime;
              time          = currentTime;
              performance.push({
                'Name'           : message[0],
                'Arguments'      : [].slice.call(message, 1) || '',
                'Element'        : element,
                'Execution Time' : executionTime
              });
            }
            clearTimeout(module.performance.timer);
            module.performance.timer = setTimeout(module.performance.display, 500);
          },
          display: function() {
            var
              title = settings.name + ':',
              totalTime = 0
            ;
            time = false;
            clearTimeout(module.performance.timer);
            $.each(performance, function(index, data) {
              totalTime += data['Execution Time'];
            });
            title += ' ' + totalTime + 'ms';
            if(moduleSelector) {
              title += ' \'' + moduleSelector + '\'';
            }
            if( (console.group !== undefined || console.table !== undefined) && performance.length > 0) {
              console.groupCollapsed(title);
              if(console.table) {
                console.table(performance);
              }
              else {
                $.each(performance, function(index, data) {
                  console.log(data['Name'] + ': ' + data['Execution Time']+'ms');
                });
              }
              console.groupEnd();
            }
            performance = [];
          }
        },
        invoke: function(query, passedArguments, context) {
          var
            object = instance,
            maxDepth,
            found,
            response
          ;
          passedArguments = passedArguments || queryArguments;
          context         = element         || context;
          if(typeof query == 'string' && object !== undefined) {
            query    = query.split(/[\. ]/);
            maxDepth = query.length - 1;
            $.each(query, function(depth, value) {
              var camelCaseValue = (depth != maxDepth)
                ? value + query[depth + 1].charAt(0).toUpperCase() + query[depth + 1].slice(1)
                : query
              ;
              if( $.isPlainObject( object[camelCaseValue] ) && (depth != maxDepth) ) {
                object = object[camelCaseValue];
              }
              else if( object[camelCaseValue] !== undefined ) {
                found = object[camelCaseValue];
                return false;
              }
              else if( $.isPlainObject( object[value] ) && (depth != maxDepth) ) {
                object = object[value];
              }
              else if( object[value] !== undefined ) {
                found = object[value];
                return false;
              }
              else {
                module.error(error.method, query);
                return false;
              }
            });
          }
          if ( $.isFunction( found ) ) {
            response = found.apply(context, passedArguments);
          }
          else if(found !== undefined) {
            response = found;
          }
          if($.isArray(returnedValue)) {
            returnedValue.push(response);
          }
          else if(returnedValue !== undefined) {
            returnedValue = [returnedValue, response];
          }
          else if(response !== undefined) {
            returnedValue = response;
          }
          return found;
        }
      };

      if(methodInvoked) {
        if(instance === undefined) {
          module.initialize();
        }
        module.invoke(query);
      }
      else {
        if(instance !== undefined) {
          instance.invoke('destroy');
        }
        module.initialize();
      }
    })
  ;

  return (returnedValue !== undefined)
    ? returnedValue
    : this
  ;
};

$.fn.checkbox.settings = {

  name                : 'Checkbox',
  namespace           : 'checkbox',

  debug               : false,
  verbose             : true,
  performance         : true,

  // delegated event context
  uncheckable         : 'auto',
  fireOnInit          : false,

  onChange            : function(){},

  beforeChecked       : function(){},
  beforeUnchecked     : function(){},
  beforeDeterminate   : function(){},
  beforeIndeterminate : function(){},

  onChecked           : function(){},
  onUnchecked         : function(){},

  onDeterminate       : function() {},
  onIndeterminate     : function() {},

  onEnabled           : function(){},
  onDisabled          : function(){},

  className       : {
    checked       : 'checked',
    indeterminate : 'indeterminate',
    disabled      : 'disabled',
    hidden        : 'hidden',
    radio         : 'radio',
    readOnly      : 'read-only'
  },

  error     : {
    method       : 'The method you called is not defined'
  },

  selector : {
    checkbox : '.ui.checkbox',
    label    : 'label, .box',
    input    : 'input[type="checkbox"], input[type="radio"]',
    link     : 'a[href]'
  }

};

})( jQuery, window, document );

/*!
 * # Semantic UI 2.1.6 - Dimmer
 * http://github.com/semantic-org/semantic-ui/
 *
 *
 * Copyright 2015 Contributors
 * Released under the MIT license
 * http://opensource.org/licenses/MIT
 *
 */

;(function ( $, window, document, undefined ) {

"use strict";

$.fn.dimmer = function(parameters) {
  var
    $allModules     = $(this),

    time            = new Date().getTime(),
    performance     = [],

    query           = arguments[0],
    methodInvoked   = (typeof query == 'string'),
    queryArguments  = [].slice.call(arguments, 1),

    returnedValue
  ;

  $allModules
    .each(function() {
      var
        settings        = ( $.isPlainObject(parameters) )
          ? $.extend(true, {}, $.fn.dimmer.settings, parameters)
          : $.extend({}, $.fn.dimmer.settings),

        selector        = settings.selector,
        namespace       = settings.namespace,
        className       = settings.className,
        error           = settings.error,

        eventNamespace  = '.' + namespace,
        moduleNamespace = 'module-' + namespace,
        moduleSelector  = $allModules.selector || '',

        clickEvent      = ('ontouchstart' in document.documentElement)
          ? 'touchstart'
          : 'click',

        $module = $(this),
        $dimmer,
        $dimmable,

        element   = this,
        instance  = $module.data(moduleNamespace),
        module
      ;

      module = {

        preinitialize: function() {
          if( module.is.dimmer() ) {

            $dimmable = $module.parent();
            $dimmer   = $module;
          }
          else {
            $dimmable = $module;
            if( module.has.dimmer() ) {
              if(settings.dimmerName) {
                $dimmer = $dimmable.find(selector.dimmer).filter('.' + settings.dimmerName);
              }
              else {
                $dimmer = $dimmable.find(selector.dimmer);
              }
            }
            else {
              $dimmer = module.create();
            }
          }
        },

        initialize: function() {
          module.debug('Initializing dimmer', settings);

          module.bind.events();
          module.set.dimmable();
          module.instantiate();
        },

        instantiate: function() {
          module.verbose('Storing instance of module', module);
          instance = module;
          $module
            .data(moduleNamespace, instance)
          ;
        },

        destroy: function() {
          module.verbose('Destroying previous module', $dimmer);
          module.unbind.events();
          module.remove.variation();
          $dimmable
            .off(eventNamespace)
          ;
        },

        bind: {
          events: function() {
            if(settings.on == 'hover') {
              $dimmable
                .on('mouseenter' + eventNamespace, module.show)
                .on('mouseleave' + eventNamespace, module.hide)
              ;
            }
            else if(settings.on == 'click') {
              $dimmable
                .on(clickEvent + eventNamespace, module.toggle)
              ;
            }
            if( module.is.page() ) {
              module.debug('Setting as a page dimmer', $dimmable);
              module.set.pageDimmer();
            }

            if( module.is.closable() ) {
              module.verbose('Adding dimmer close event', $dimmer);
              $dimmable
                .on(clickEvent + eventNamespace, selector.dimmer, module.event.click)
              ;
            }
          }
        },

        unbind: {
          events: function() {
            $module
              .removeData(moduleNamespace)
            ;
          }
        },

        event: {
          click: function(event) {
            module.verbose('Determining if event occured on dimmer', event);
            if( $dimmer.find(event.target).length === 0 || $(event.target).is(selector.content) ) {
              module.hide();
              event.stopImmediatePropagation();
            }
          }
        },

        addContent: function(element) {
          var
            $content = $(element)
          ;
          module.debug('Add content to dimmer', $content);
          if($content.parent()[0] !== $dimmer[0]) {
            $content.detach().appendTo($dimmer);
          }
        },

        create: function() {
          var
            $element = $( settings.template.dimmer() )
          ;
          if(settings.variation) {
            module.debug('Creating dimmer with variation', settings.variation);
            $element.addClass(settings.variation);
          }
          if(settings.dimmerName) {
            module.debug('Creating named dimmer', settings.dimmerName);
            $element.addClass(settings.dimmerName);
          }
          $element
            .appendTo($dimmable)
          ;
          return $element;
        },

        show: function(callback) {
          callback = $.isFunction(callback)
            ? callback
            : function(){}
          ;
          module.debug('Showing dimmer', $dimmer, settings);
          if( (!module.is.dimmed() || module.is.animating()) && module.is.enabled() ) {
            module.animate.show(callback);
            settings.onShow.call(element);
            settings.onChange.call(element);
          }
          else {
            module.debug('Dimmer is already shown or disabled');
          }
        },

        hide: function(callback) {
          callback = $.isFunction(callback)
            ? callback
            : function(){}
          ;
          if( module.is.dimmed() || module.is.animating() ) {
            module.debug('Hiding dimmer', $dimmer);
            module.animate.hide(callback);
            settings.onHide.call(element);
            settings.onChange.call(element);
          }
          else {
            module.debug('Dimmer is not visible');
          }
        },

        toggle: function() {
          module.verbose('Toggling dimmer visibility', $dimmer);
          if( !module.is.dimmed() ) {
            module.show();
          }
          else {
            module.hide();
          }
        },

        animate: {
          show: function(callback) {
            callback = $.isFunction(callback)
              ? callback
              : function(){}
            ;
            if(settings.useCSS && $.fn.transition !== undefined && $dimmer.transition('is supported')) {
              if(settings.opacity !== 'auto') {
                module.set.opacity();
              }
              $dimmer
                .transition({
                  animation   : settings.transition + ' in',
                  queue       : false,
                  duration    : module.get.duration(),
                  useFailSafe : true,
                  onStart     : function() {
                    module.set.dimmed();
                  },
                  onComplete  : function() {
                    module.set.active();
                    callback();
                  }
                })
              ;
            }
            else {
              module.verbose('Showing dimmer animation with javascript');
              module.set.dimmed();
              if(settings.opacity == 'auto') {
                settings.opacity = 0.8;
              }
              $dimmer
                .stop()
                .css({
                  opacity : 0,
                  width   : '100%',
                  height  : '100%'
                })
                .fadeTo(module.get.duration(), settings.opacity, function() {
                  $dimmer.removeAttr('style');
                  module.set.active();
                  callback();
                })
              ;
            }
          },
          hide: function(callback) {
            callback = $.isFunction(callback)
              ? callback
              : function(){}
            ;
            if(settings.useCSS && $.fn.transition !== undefined && $dimmer.transition('is supported')) {
              module.verbose('Hiding dimmer with css');
              $dimmer
                .transition({
                  animation   : settings.transition + ' out',
                  queue       : false,
                  duration    : module.get.duration(),
                  useFailSafe : true,
                  onStart     : function() {
                    module.remove.dimmed();
                  },
                  onComplete  : function() {
                    module.remove.active();
                    callback();
                  }
                })
              ;
            }
            else {
              module.verbose('Hiding dimmer with javascript');
              module.remove.dimmed();
              $dimmer
                .stop()
                .fadeOut(module.get.duration(), function() {
                  module.remove.active();
                  $dimmer.removeAttr('style');
                  callback();
                })
              ;
            }
          }
        },

        get: {
          dimmer: function() {
            return $dimmer;
          },
          duration: function() {
            if(typeof settings.duration == 'object') {
              if( module.is.active() ) {
                return settings.duration.hide;
              }
              else {
                return settings.duration.show;
              }
            }
            return settings.duration;
          }
        },

        has: {
          dimmer: function() {
            if(settings.dimmerName) {
              return ($module.find(selector.dimmer).filter('.' + settings.dimmerName).length > 0);
            }
            else {
              return ( $module.find(selector.dimmer).length > 0 );
            }
          }
        },

        is: {
          active: function() {
            return $dimmer.hasClass(className.active);
          },
          animating: function() {
            return ( $dimmer.is(':animated') || $dimmer.hasClass(className.animating) );
          },
          closable: function() {
            if(settings.closable == 'auto') {
              if(settings.on == 'hover') {
                return false;
              }
              return true;
            }
            return settings.closable;
          },
          dimmer: function() {
            return $module.hasClass(className.dimmer);
          },
          dimmable: function() {
            return $module.hasClass(className.dimmable);
          },
          dimmed: function() {
            return $dimmable.hasClass(className.dimmed);
          },
          disabled: function() {
            return $dimmable.hasClass(className.disabled);
          },
          enabled: function() {
            return !module.is.disabled();
          },
          page: function () {
            return $dimmable.is('body');
          },
          pageDimmer: function() {
            return $dimmer.hasClass(className.pageDimmer);
          }
        },

        can: {
          show: function() {
            return !$dimmer.hasClass(className.disabled);
          }
        },

        set: {
          opacity: function(opacity) {
            var
              color      = $dimmer.css('background-color'),
              colorArray = color.split(','),
              isRGBA     = (colorArray && colorArray.length == 4)
            ;
            opacity    = settings.opacity === 0 ? 0 : settings.opacity || opacity;
            if(isRGBA) {
              colorArray[3] = opacity + ')';
              color         = colorArray.join(',');
            }
            else {
              color = 'rgba(0, 0, 0, ' + opacity + ')';
            }
            module.debug('Setting opacity to', opacity);
            $dimmer.css('background-color', color);
          },
          active: function() {
            $dimmer.addClass(className.active);
          },
          dimmable: function() {
            $dimmable.addClass(className.dimmable);
          },
          dimmed: function() {
            $dimmable.addClass(className.dimmed);
          },
          pageDimmer: function() {
            $dimmer.addClass(className.pageDimmer);
          },
          disabled: function() {
            $dimmer.addClass(className.disabled);
          },
          variation: function(variation) {
            variation = variation || settings.variation;
            if(variation) {
              $dimmer.addClass(variation);
            }
          }
        },

        remove: {
          active: function() {
            $dimmer
              .removeClass(className.active)
            ;
          },
          dimmed: function() {
            $dimmable.removeClass(className.dimmed);
          },
          disabled: function() {
            $dimmer.removeClass(className.disabled);
          },
          variation: function(variation) {
            variation = variation || settings.variation;
            if(variation) {
              $dimmer.removeClass(variation);
            }
          }
        },

        setting: function(name, value) {
          module.debug('Changing setting', name, value);
          if( $.isPlainObject(name) ) {
            $.extend(true, settings, name);
          }
          else if(value !== undefined) {
            settings[name] = value;
          }
          else {
            return settings[name];
          }
        },
        internal: function(name, value) {
          if( $.isPlainObject(name) ) {
            $.extend(true, module, name);
          }
          else if(value !== undefined) {
            module[name] = value;
          }
          else {
            return module[name];
          }
        },
        debug: function() {
          if(settings.debug) {
            if(settings.performance) {
              module.performance.log(arguments);
            }
            else {
              module.debug = Function.prototype.bind.call(console.info, console, settings.name + ':');
              module.debug.apply(console, arguments);
            }
          }
        },
        verbose: function() {
          if(settings.verbose && settings.debug) {
            if(settings.performance) {
              module.performance.log(arguments);
            }
            else {
              module.verbose = Function.prototype.bind.call(console.info, console, settings.name + ':');
              module.verbose.apply(console, arguments);
            }
          }
        },
        error: function() {
          module.error = Function.prototype.bind.call(console.error, console, settings.name + ':');
          module.error.apply(console, arguments);
        },
        performance: {
          log: function(message) {
            var
              currentTime,
              executionTime,
              previousTime
            ;
            if(settings.performance) {
              currentTime   = new Date().getTime();
              previousTime  = time || currentTime;
              executionTime = currentTime - previousTime;
              time          = currentTime;
              performance.push({
                'Name'           : message[0],
                'Arguments'      : [].slice.call(message, 1) || '',
                'Element'        : element,
                'Execution Time' : executionTime
              });
            }
            clearTimeout(module.performance.timer);
            module.performance.timer = setTimeout(module.performance.display, 500);
          },
          display: function() {
            var
              title = settings.name + ':',
              totalTime = 0
            ;
            time = false;
            clearTimeout(module.performance.timer);
            $.each(performance, function(index, data) {
              totalTime += data['Execution Time'];
            });
            title += ' ' + totalTime + 'ms';
            if(moduleSelector) {
              title += ' \'' + moduleSelector + '\'';
            }
            if($allModules.length > 1) {
              title += ' ' + '(' + $allModules.length + ')';
            }
            if( (console.group !== undefined || console.table !== undefined) && performance.length > 0) {
              console.groupCollapsed(title);
              if(console.table) {
                console.table(performance);
              }
              else {
                $.each(performance, function(index, data) {
                  console.log(data['Name'] + ': ' + data['Execution Time']+'ms');
                });
              }
              console.groupEnd();
            }
            performance = [];
          }
        },
        invoke: function(query, passedArguments, context) {
          var
            object = instance,
            maxDepth,
            found,
            response
          ;
          passedArguments = passedArguments || queryArguments;
          context         = element         || context;
          if(typeof query == 'string' && object !== undefined) {
            query    = query.split(/[\. ]/);
            maxDepth = query.length - 1;
            $.each(query, function(depth, value) {
              var camelCaseValue = (depth != maxDepth)
                ? value + query[depth + 1].charAt(0).toUpperCase() + query[depth + 1].slice(1)
                : query
              ;
              if( $.isPlainObject( object[camelCaseValue] ) && (depth != maxDepth) ) {
                object = object[camelCaseValue];
              }
              else if( object[camelCaseValue] !== undefined ) {
                found = object[camelCaseValue];
                return false;
              }
              else if( $.isPlainObject( object[value] ) && (depth != maxDepth) ) {
                object = object[value];
              }
              else if( object[value] !== undefined ) {
                found = object[value];
                return false;
              }
              else {
                module.error(error.method, query);
                return false;
              }
            });
          }
          if ( $.isFunction( found ) ) {
            response = found.apply(context, passedArguments);
          }
          else if(found !== undefined) {
            response = found;
          }
          if($.isArray(returnedValue)) {
            returnedValue.push(response);
          }
          else if(returnedValue !== undefined) {
            returnedValue = [returnedValue, response];
          }
          else if(response !== undefined) {
            returnedValue = response;
          }
          return found;
        }
      };

      module.preinitialize();

      if(methodInvoked) {
        if(instance === undefined) {
          module.initialize();
        }
        module.invoke(query);
      }
      else {
        if(instance !== undefined) {
          instance.invoke('destroy');
        }
        module.initialize();
      }
    })
  ;

  return (returnedValue !== undefined)
    ? returnedValue
    : this
  ;
};

$.fn.dimmer.settings = {

  name        : 'Dimmer',
  namespace   : 'dimmer',

  debug       : false,
  verbose     : false,
  performance : true,

  // name to distinguish between multiple dimmers in context
  dimmerName  : false,

  // whether to add a variation type
  variation   : false,

  // whether to bind close events
  closable    : 'auto',

  // whether to use css animations
  useCSS      : true,

  // css animation to use
  transition  : 'fade',

  // event to bind to
  on          : false,

  // overriding opacity value
  opacity     : 'auto',

  // transition durations
  duration    : {
    show : 500,
    hide : 500
  },

  onChange    : function(){},
  onShow      : function(){},
  onHide      : function(){},

  error   : {
    method   : 'The method you called is not defined.'
  },

  className : {
    active     : 'active',
    animating  : 'animating',
    dimmable   : 'dimmable',
    dimmed     : 'dimmed',
    dimmer     : 'dimmer',
    disabled   : 'disabled',
    hide       : 'hide',
    pageDimmer : 'page',
    show       : 'show'
  },

  selector: {
    dimmer   : '> .ui.dimmer',
    content  : '.ui.dimmer > .content, .ui.dimmer > .content > .center'
  },

  template: {
    dimmer: function() {
     return $('<div />').attr('class', 'ui dimmer');
    }
  }

};

})( jQuery, window, document );
/*!
 * # Semantic UI 2.1.6 - Dropdown
 * http://github.com/semantic-org/semantic-ui/
 *
 *
 * Copyright 2015 Contributors
 * Released under the MIT license
 * http://opensource.org/licenses/MIT
 *
 */

;(function ( $, window, document, undefined ) {

"use strict";

$.fn.dropdown = function(parameters) {
  var
    $allModules    = $(this),
    $document      = $(document),

    moduleSelector = $allModules.selector || '',

    hasTouch       = ('ontouchstart' in document.documentElement),
    time           = new Date().getTime(),
    performance    = [],

    query          = arguments[0],
    methodInvoked  = (typeof query == 'string'),
    queryArguments = [].slice.call(arguments, 1),
    returnedValue
  ;

  $allModules
    .each(function(elementIndex) {
      var
        settings          = ( $.isPlainObject(parameters) )
          ? $.extend(true, {}, $.fn.dropdown.settings, parameters)
          : $.extend({}, $.fn.dropdown.settings),

        className       = settings.className,
        message         = settings.message,
        fields          = settings.fields,
        keys            = settings.keys,
        metadata        = settings.metadata,
        namespace       = settings.namespace,
        regExp          = settings.regExp,
        selector        = settings.selector,
        error           = settings.error,
        templates       = settings.templates,

        eventNamespace  = '.' + namespace,
        moduleNamespace = 'module-' + namespace,

        $module         = $(this),
        $context        = $(settings.context),
        $text           = $module.find(selector.text),
        $search         = $module.find(selector.search),
        $input          = $module.find(selector.input),
        $icon           = $module.find(selector.icon),

        $combo = ($module.prev().find(selector.text).length > 0)
          ? $module.prev().find(selector.text)
          : $module.prev(),

        $menu           = $module.children(selector.menu),
        $item           = $menu.find(selector.item),

        activated       = false,
        itemActivated   = false,
        internalChange  = false,
        element         = this,
        instance        = $module.data(moduleNamespace),

        initialLoad,
        pageLostFocus,
        elementNamespace,
        id,
        selectObserver,
        menuObserver,
        module
      ;

      module = {

        initialize: function() {
          module.debug('Initializing dropdown', settings);

          if( module.is.alreadySetup() ) {
            module.setup.reference();
          }
          else {
            module.setup.layout();
            module.refreshData();

            module.save.defaults();
            module.restore.selected();

            module.create.id();
            module.bind.events();

            module.observeChanges();
            module.instantiate();
          }

        },

        instantiate: function() {
          module.verbose('Storing instance of dropdown', module);
          instance = module;
          $module
            .data(moduleNamespace, module)
          ;
        },

        destroy: function() {
          module.verbose('Destroying previous dropdown', $module);
          module.remove.tabbable();
          $module
            .off(eventNamespace)
            .removeData(moduleNamespace)
          ;
          $menu
            .off(eventNamespace)
          ;
          $document
            .off(elementNamespace)
          ;
          if(selectObserver) {
            selectObserver.disconnect();
          }
          if(menuObserver) {
            menuObserver.disconnect();
          }
        },

        observeChanges: function() {
          if('MutationObserver' in window) {
            selectObserver = new MutationObserver(function(mutations) {
              module.debug('<select> modified, recreating menu');
              module.setup.select();
            });
            menuObserver = new MutationObserver(function(mutations) {
              module.debug('Menu modified, updating selector cache');
              module.refresh();
            });
            if(module.has.input()) {
              selectObserver.observe($input[0], {
                childList : true,
                subtree   : true
              });
            }
            if(module.has.menu()) {
              menuObserver.observe($menu[0], {
                childList : true,
                subtree   : true
              });
            }
            module.debug('Setting up mutation observer', selectObserver, menuObserver);
          }
        },

        create: {
          id: function() {
            id = (Math.random().toString(16) + '000000000').substr(2, 8);
            elementNamespace = '.' + id;
            module.verbose('Creating unique id for element', id);
          },
          userChoice: function(values) {
            var
              $userChoices,
              $userChoice,
              isUserValue,
              html
            ;
            values = values || module.get.userValues();
            if(!values) {
              return false;
            }
            values = $.isArray(values)
              ? values
              : [values]
            ;
            $.each(values, function(index, value) {
              if(module.get.item(value) === false) {
                html         = settings.templates.addition( module.add.variables(message.addResult, value) );
                $userChoice  = $('<div />')
                  .html(html)
                  .attr('data-' + metadata.value, value)
                  .attr('data-' + metadata.text, value)
                  .addClass(className.addition)
                  .addClass(className.item)
                ;
                $userChoices = ($userChoices === undefined)
                  ? $userChoice
                  : $userChoices.add($userChoice)
                ;
                module.verbose('Creating user choices for value', value, $userChoice);
              }
            });
            return $userChoices;
          },
          userLabels: function(value) {
            var
              userValues = module.get.userValues()
            ;
            if(userValues) {
              module.debug('Adding user labels', userValues);
              $.each(userValues, function(index, value) {
                module.verbose('Adding custom user value');
                module.add.label(value, value);
              });
            }
          },
          menu: function() {
            $menu = $('<div />')
              .addClass(className.menu)
              .appendTo($module)
            ;
          }
        },

        search: function(query) {
          query = (query !== undefined)
            ? query
            : module.get.query()
          ;
          module.verbose('Searching for query', query);
          module.filter(query);
        },

        select: {
          firstUnfiltered: function() {
            module.verbose('Selecting first non-filtered element');
            module.remove.selectedItem();
            $item
              .not(selector.unselectable)
                .eq(0)
                .addClass(className.selected)
            ;
          },
          nextAvailable: function($selected) {
            $selected = $selected.eq(0);
            var
              $nextAvailable = $selected.nextAll(selector.item).not(selector.unselectable).eq(0),
              $prevAvailable = $selected.prevAll(selector.item).not(selector.unselectable).eq(0),
              hasNext        = ($nextAvailable.length > 0)
            ;
            if(hasNext) {
              module.verbose('Moving selection to', $nextAvailable);
              $nextAvailable.addClass(className.selected);
            }
            else {
              module.verbose('Moving selection to', $prevAvailable);
              $prevAvailable.addClass(className.selected);
            }
          }
        },

        setup: {
          api: function() {
            var
              apiSettings = {
                debug : settings.debug,
                on    : false
              }
            ;
            module.verbose('First request, initializing API');
            $module
              .api(apiSettings)
            ;
          },
          layout: function() {
            if( $module.is('select') ) {
              module.setup.select();
              module.setup.returnedObject();
            }
            if( !module.has.menu() ) {
              module.create.menu();
            }
            if( module.is.search() && !module.has.search() ) {
              module.verbose('Adding search input');
              $search = $('<input />')
                .addClass(className.search)
                .prop('autocomplete', 'off')
                .insertBefore($text)
              ;
            }
            if(settings.allowTab) {
              module.set.tabbable();
            }
          },
          select: function() {
            var
              selectValues  = module.get.selectValues()
            ;
            module.debug('Dropdown initialized on a select', selectValues);
            if( $module.is('select') ) {
              $input = $module;
            }
            // see if select is placed correctly already
            if($input.parent(selector.dropdown).length > 0) {
              module.debug('UI dropdown already exists. Creating dropdown menu only');
              $module = $input.closest(selector.dropdown);
              if( !module.has.menu() ) {
                module.create.menu();
              }
              $menu = $module.children(selector.menu);
              module.setup.menu(selectValues);
            }
            else {
              module.debug('Creating entire dropdown from select');
              $module = $('<div />')
                .attr('class', $input.attr('class') )
                .addClass(className.selection)
                .addClass(className.dropdown)
                .html( templates.dropdown(selectValues) )
                .insertBefore($input)
              ;
              if($input.hasClass(className.multiple) && $input.prop('multiple') === false) {
                module.error(error.missingMultiple);
                $input.prop('multiple', true);
              }
              if($input.is('[multiple]')) {
                module.set.multiple();
              }
              if ($input.prop('disabled')) {
                module.debug('Disabling dropdown')
                $module.addClass(className.disabled)
              }
              $input
                .removeAttr('class')
                .detach()
                .prependTo($module)
              ;
            }
            module.refresh();
          },
          menu: function(values) {
            $menu.html( templates.menu(values, fields));
            $item = $menu.find(selector.item);
          },
          reference: function() {
            module.debug('Dropdown behavior was called on select, replacing with closest dropdown');
            // replace module reference
            $module = $module.parent(selector.dropdown);
            module.refresh();
            module.setup.returnedObject();
            // invoke method in context of current instance
            if(methodInvoked) {
              instance = module;
              module.invoke(query);
            }
          },
          returnedObject: function() {
            var
              $firstModules = $allModules.slice(0, elementIndex),
              $lastModules = $allModules.slice(elementIndex + 1)
            ;
            // adjust all modules to use correct reference
            $allModules = $firstModules.add($module).add($lastModules);
          }
        },

        refresh: function() {
          module.refreshSelectors();
          module.refreshData();
        },

        refreshSelectors: function() {
          module.verbose('Refreshing selector cache');
          $text   = $module.find(selector.text);
          $search = $module.find(selector.search);
          $input  = $module.find(selector.input);
          $icon   = $module.find(selector.icon);
          $combo  = ($module.prev().find(selector.text).length > 0)
            ? $module.prev().find(selector.text)
            : $module.prev()
          ;
          $menu    = $module.children(selector.menu);
          $item    = $menu.find(selector.item);
        },

        refreshData: function() {
          module.verbose('Refreshing cached metadata');
          $item
            .removeData(metadata.text)
            .removeData(metadata.value)
          ;
          $module
            .removeData(metadata.defaultText)
            .removeData(metadata.defaultValue)
            .removeData(metadata.placeholderText)
          ;
        },

        toggle: function() {
          module.verbose('Toggling menu visibility');
          if( !module.is.active() ) {
            module.show();
          }
          else {
            module.hide();
          }
        },

        show: function(callback) {
          callback = $.isFunction(callback)
            ? callback
            : function(){}
          ;
          if( module.can.show() && !module.is.active() ) {
            module.debug('Showing dropdown');
            if(module.is.multiple() && !module.has.search() && module.is.allFiltered()) {
              return true;
            }
            if(module.has.message() && !(module.has.maxSelections() || module.has.allResultsFiltered()) ) {
              module.remove.message();
            }
            if(settings.onShow.call(element) !== false) {
              module.animate.show(function() {
                if( module.can.click() ) {
                  module.bind.intent();
                }
                module.set.visible();
                callback.call(element);
              });
            }
          }
        },

        hide: function(callback) {
          callback = $.isFunction(callback)
            ? callback
            : function(){}
          ;
          if( module.is.active() ) {
            module.debug('Hiding dropdown');
            if(settings.onHide.call(element) !== false) {
              module.animate.hide(function() {
                module.remove.visible();
                callback.call(element);
              });
            }
          }
        },

        hideOthers: function() {
          module.verbose('Finding other dropdowns to hide');
          $allModules
            .not($module)
              .has(selector.menu + '.' + className.visible)
                .dropdown('hide')
          ;
        },

        hideMenu: function() {
          module.verbose('Hiding menu  instantaneously');
          module.remove.active();
          module.remove.visible();
          $menu.transition('hide');
        },

        hideSubMenus: function() {
          var
            $subMenus = $menu.children(selector.item).find(selector.menu)
          ;
          module.verbose('Hiding sub menus', $subMenus);
          $subMenus.transition('hide');
        },

        bind: {
          events: function() {
            if(hasTouch) {
              module.bind.touchEvents();
            }
            module.bind.keyboardEvents();
            module.bind.inputEvents();
            module.bind.mouseEvents();
          },
          touchEvents: function() {
            module.debug('Touch device detected binding additional touch events');
            if( module.is.searchSelection() ) {
              // do nothing special yet
            }
            else if( module.is.single() ) {
              $module
                .on('touchstart' + eventNamespace, module.event.test.toggle)
              ;
            }
            $menu
              .on('touchstart' + eventNamespace, selector.item, module.event.item.mouseenter)
            ;
          },
          keyboardEvents: function() {
            module.verbose('Binding keyboard events');
            $module
              .on('keydown' + eventNamespace, module.event.keydown)
            ;
            if( module.has.search() ) {
              $module
                .on(module.get.inputEvent() + eventNamespace, selector.search, module.event.input)
              ;
            }
            if( module.is.multiple() ) {
              $document
                .on('keydown' + elementNamespace, module.event.document.keydown)
              ;
            }
          },
          inputEvents: function() {
            module.verbose('Binding input change events');
            $module
              .on('change' + eventNamespace, selector.input, module.event.change)
            ;
          },
          mouseEvents: function() {
            module.verbose('Binding mouse events');
            if(module.is.multiple()) {
              $module
                .on('click'   + eventNamespace, selector.label,  module.event.label.click)
                .on('click'   + eventNamespace, selector.remove, module.event.remove.click)
              ;
            }
            if( module.is.searchSelection() ) {
              $module
                .on('mousedown' + eventNamespace, selector.menu,   module.event.menu.mousedown)
                .on('mouseup'   + eventNamespace, selector.menu,   module.event.menu.mouseup)
                .on('click'     + eventNamespace, selector.icon,   module.event.icon.click)
                .on('click'     + eventNamespace, selector.search, module.show)
                .on('focus'     + eventNamespace, selector.search, module.event.search.focus)
                .on('blur'      + eventNamespace, selector.search, module.event.search.blur)
                .on('click'     + eventNamespace, selector.text,   module.event.text.focus)
              ;
              if(module.is.multiple()) {
                $module
                  .on('click' + eventNamespace, module.event.click)
                ;
              }
            }
            else {
              if(settings.on == 'click') {
                $module
                  .on('click' + eventNamespace, selector.icon, module.event.icon.click)
                  .on('click' + eventNamespace, module.event.test.toggle)
                ;
              }
              else if(settings.on == 'hover') {
                $module
                  .on('mouseenter' + eventNamespace, module.delay.show)
                  .on('mouseleave' + eventNamespace, module.delay.hide)
                ;
              }
              else {
                $module
                  .on(settings.on + eventNamespace, module.toggle)
                ;
              }
              $module
                .on('mousedown' + eventNamespace, module.event.mousedown)
                .on('mouseup'   + eventNamespace, module.event.mouseup)
                .on('focus'     + eventNamespace, module.event.focus)
                .on('blur'      + eventNamespace, module.event.blur)
              ;
            }
            $menu
              .on('mouseenter' + eventNamespace, selector.item, module.event.item.mouseenter)
              .on('mouseleave' + eventNamespace, selector.item, module.event.item.mouseleave)
              .on('click'      + eventNamespace, selector.item, module.event.item.click)
            ;
          },
          intent: function() {
            module.verbose('Binding hide intent event to document');
            if(hasTouch) {
              $document
                .on('touchstart' + elementNamespace, module.event.test.touch)
                .on('touchmove'  + elementNamespace, module.event.test.touch)
              ;
            }
            $document
              .on('click' + elementNamespace, module.event.test.hide)
            ;
          }
        },

        unbind: {
          intent: function() {
            module.verbose('Removing hide intent event from document');
            if(hasTouch) {
              $document
                .off('touchstart' + elementNamespace)
                .off('touchmove' + elementNamespace)
              ;
            }
            $document
              .off('click' + elementNamespace)
            ;
          }
        },

        filter: function(query) {
          var
            searchTerm = (query !== undefined)
              ? query
              : module.get.query(),
            afterFiltered = function() {
              if(module.is.multiple()) {
                module.filterActive();
              }
              module.select.firstUnfiltered();
              if( module.has.allResultsFiltered() ) {
                if( settings.onNoResults.call(element, searchTerm) ) {
                  if(!settings.allowAdditions) {
                    module.verbose('All items filtered, showing message', searchTerm);
                    module.add.message(message.noResults);
                  }
                }
                else {
                  module.verbose('All items filtered, hiding dropdown', searchTerm);
                  module.hideMenu();
                }
              }
              else {
                module.remove.message();
              }
              if(settings.allowAdditions) {
                module.add.userSuggestion(query);
              }
              if(module.is.searchSelection() && module.can.show() && module.is.focusedOnSearch() ) {
                module.show();
              }
            }
          ;
          if(settings.useLabels && module.has.maxSelections()) {
            return;
          }
          if(settings.apiSettings) {
            if( module.can.useAPI() ) {
              module.queryRemote(searchTerm, function() {
                afterFiltered();
              });
            }
            else {
              module.error(error.noAPI);
            }
          }
          else {
            module.filterItems(searchTerm);
            afterFiltered();
          }
        },

        queryRemote: function(query, callback) {
          var
            apiSettings = {
              errorDuration        : false,
              throttle             : settings.throttle,
              urlData              : {
                query: query
              },
              onError: function() {
                module.add.message(message.serverError);
                callback();
              },
              onFailure: function() {
                module.add.message(message.serverError);
                callback();
              },
              onSuccess : function(response) {
                module.remove.message();
                module.setup.menu({
                  values: response[fields.remoteValues]
                });
                callback();
              }
            }
          ;
          if( !$module.api('get request') ) {
            module.setup.api();
          }
          apiSettings = $.extend(true, {}, apiSettings, settings.apiSettings);
          $module
            .api('setting', apiSettings)
            .api('query')
          ;
        },

        filterItems: function(query) {
          var
            searchTerm = (query !== undefined)
              ? query
              : module.get.query(),
            results          =  null,
            escapedTerm      = module.escape.regExp(searchTerm),
            beginsWithRegExp = new RegExp('^' + escapedTerm, 'igm')
          ;
          // avoid loop if we're matching nothing
          if( module.has.query() ) {
            results = [];

            module.verbose('Searching for matching values', searchTerm);
            $item
              .each(function(){
                var
                  $choice = $(this),
                  text,
                  value
                ;
                if(settings.match == 'both' || settings.match == 'text') {
                  text = String(module.get.choiceText($choice, false));
                  if(text.search(beginsWithRegExp) !== -1) {
                    results.push(this);
                    return true;
                  }
                  else if(settings.fullTextSearch && module.fuzzySearch(searchTerm, text)) {
                    results.push(this);
                    return true;
                  }
                }
                if(settings.match == 'both' || settings.match == 'value') {
                  value = String(module.get.choiceValue($choice, text));

                  if(value.search(beginsWithRegExp) !== -1) {
                    results.push(this);
                    return true;
                  }
                  else if(settings.fullTextSearch && module.fuzzySearch(searchTerm, value)) {
                    results.push(this);
                    return true;
                  }
                }
              })
            ;
          }
          module.debug('Showing only matched items', searchTerm);
          module.remove.filteredItem();
          if(results) {
            $item
              .not(results)
              .addClass(className.filtered)
            ;
          }
        },

        fuzzySearch: function(query, term) {
          var
            termLength  = term.length,
            queryLength = query.length
          ;
          query = query.toLowerCase();
          term  = term.toLowerCase();
          if(queryLength > termLength) {
            return false;
          }
          if(queryLength === termLength) {
            return (query === term);
          }
          search: for (var characterIndex = 0, nextCharacterIndex = 0; characterIndex < queryLength; characterIndex++) {
            var
              queryCharacter = query.charCodeAt(characterIndex)
            ;
            while(nextCharacterIndex < termLength) {
              if(term.charCodeAt(nextCharacterIndex++) === queryCharacter) {
                continue search;
              }
            }
            return false;
          }
          return true;
        },

        filterActive: function() {
          if(settings.useLabels) {
            $item.filter('.' + className.active)
              .addClass(className.filtered)
            ;
          }
        },

        focusSearch: function() {
          if( module.is.search() && !module.is.focusedOnSearch() ) {
            $search[0].focus();
          }
        },

        forceSelection: function() {
          var
            $currentlySelected = $item.not(className.filtered).filter('.' + className.selected).eq(0),
            $activeItem        = $item.not(className.filtered).filter('.' + className.active).eq(0),
            $selectedItem      = ($currentlySelected.length > 0)
              ? $currentlySelected
              : $activeItem,
            hasSelected = ($selectedItem.size() > 0)
          ;
          if( module.has.query() ) {
            if(hasSelected) {
              module.debug('Forcing partial selection to selected item', $selectedItem);
              module.event.item.click.call($selectedItem);
              return;
            }
            else {
              module.remove.searchTerm();
            }
          }
          module.hide();
        },

        event: {
          change: function() {
            if(!internalChange) {
              module.debug('Input changed, updating selection');
              module.set.selected();
            }
          },
          focus: function() {
            if(settings.showOnFocus && !activated && module.is.hidden() && !pageLostFocus) {
              module.show();
            }
          },
          click: function(event) {
            var
              $target = $(event.target)
            ;
            // focus search
            if($target.is($module) && !module.is.focusedOnSearch()) {
              module.focusSearch();
            }
          },
          blur: function(event) {
            pageLostFocus = (document.activeElement === this);
            if(!activated && !pageLostFocus) {
              module.remove.activeLabel();
              module.hide();
            }
          },
          // prevents focus callback from occurring on mousedown
          mousedown: function() {
            activated = true;
          },
          mouseup: function() {
            activated = false;
          },
          search: {
            focus: function() {
              activated = true;
              if(module.is.multiple()) {
                module.remove.activeLabel();
              }
              if(settings.showOnFocus) {
                module.search();
                module.show();
              }
            },
            blur: function(event) {
              pageLostFocus = (document.activeElement === this);
              if(!itemActivated && !pageLostFocus) {
                if(module.is.multiple()) {
                  module.remove.activeLabel();
                  module.hide();
                }
                else if(settings.forceSelection) {
                  module.forceSelection();
                }
                else {
                  module.hide();
                }
              }
              else if(pageLostFocus) {
                if(settings.forceSelection) {
                  module.forceSelection();
                }
              }
            }
          },
          icon: {
            click: function(event) {
              module.toggle();
              event.stopPropagation();
            }
          },
          text: {
            focus: function(event) {
              activated = true;
              module.focusSearch();
            }
          },
          input: function(event) {
            if(module.is.multiple() || module.is.searchSelection()) {
              module.set.filtered();
            }
            clearTimeout(module.timer);
            module.timer = setTimeout(module.search, settings.delay.search);
          },
          label: {
            click: function(event) {
              var
                $label        = $(this),
                $labels       = $module.find(selector.label),
                $activeLabels = $labels.filter('.' + className.active),
                $nextActive   = $label.nextAll('.' + className.active),
                $prevActive   = $label.prevAll('.' + className.active),
                $range = ($nextActive.length > 0)
                  ? $label.nextUntil($nextActive).add($activeLabels).add($label)
                  : $label.prevUntil($prevActive).add($activeLabels).add($label)
              ;
              if(event.shiftKey) {
                $activeLabels.removeClass(className.active);
                $range.addClass(className.active);
              }
              else if(event.ctrlKey) {
                $label.toggleClass(className.active);
              }
              else {
                $activeLabels.removeClass(className.active);
                $label.addClass(className.active);
              }
              settings.onLabelSelect.apply(this, $labels.filter('.' + className.active));
            }
          },
          remove: {
            click: function() {
              var
                $label = $(this).parent()
              ;
              if( $label.hasClass(className.active) ) {
                // remove all selected labels
                module.remove.activeLabels();
              }
              else {
                // remove this label only
                module.remove.activeLabels( $label );
              }
            }
          },
          test: {
            toggle: function(event) {
              var
                toggleBehavior = (module.is.multiple())
                  ? module.show
                  : module.toggle
              ;
              if( module.determine.eventOnElement(event, toggleBehavior) ) {
                event.preventDefault();
              }
            },
            touch: function(event) {
              module.determine.eventOnElement(event, function() {
                if(event.type == 'touchstart') {
                  module.timer = setTimeout(function() {
                    module.hide();
                  }, settings.delay.touch);
                }
                else if(event.type == 'touchmove') {
                  clearTimeout(module.timer);
                }
              });
              event.stopPropagation();
            },
            hide: function(event) {
              module.determine.eventInModule(event, module.hide);
            }
          },
          menu: {
            mousedown: function() {
              itemActivated = true;
            },
            mouseup: function() {
              itemActivated = false;
            }
          },
          item: {
            mouseenter: function(event) {
              var
                $subMenu    = $(this).children(selector.menu),
                $otherMenus = $(this).siblings(selector.item).children(selector.menu)
              ;
              if( $subMenu.length > 0 ) {
                clearTimeout(module.itemTimer);
                module.itemTimer = setTimeout(function() {
                  module.verbose('Showing sub-menu', $subMenu);
                  $.each($otherMenus, function() {
                    module.animate.hide(false, $(this));
                  });
                  module.animate.show(false,  $subMenu);
                }, settings.delay.show);
                event.preventDefault();
              }
            },
            mouseleave: function(event) {
              var
                $subMenu = $(this).children(selector.menu)
              ;
              if($subMenu.length > 0) {
                clearTimeout(module.itemTimer);
                module.itemTimer = setTimeout(function() {
                  module.verbose('Hiding sub-menu', $subMenu);
                  module.animate.hide(false,  $subMenu);
                }, settings.delay.hide);
              }
            },
            touchend: function() {
            },
            click: function (event) {
              var
                $choice        = $(this),
                $target        = (event)
                  ? $(event.target)
                  : $(''),
                $subMenu       = $choice.find(selector.menu),
                text           = module.get.choiceText($choice),
                value          = module.get.choiceValue($choice, text),
                hasSubMenu     = ($subMenu.length > 0),
                isBubbledEvent = ($subMenu.find($target).length > 0)
              ;
              if(!isBubbledEvent && (!hasSubMenu || settings.allowCategorySelection)) {
                if(!settings.useLabels) {
                  module.remove.filteredItem();
                  module.remove.searchTerm();
                  module.set.scrollPosition($choice);
                }
                module.determine.selectAction.call(this, text, value);
              }
            }
          },

          document: {
            // label selection should occur even when element has no focus
            keydown: function(event) {
              var
                pressedKey    = event.which,
                isShortcutKey = module.is.inObject(pressedKey, keys)
              ;
              if(isShortcutKey) {
                var
                  $label            = $module.find(selector.label),
                  $activeLabel      = $label.filter('.' + className.active),
                  activeValue       = $activeLabel.data(metadata.value),
                  labelIndex        = $label.index($activeLabel),
                  labelCount        = $label.length,
                  hasActiveLabel    = ($activeLabel.length > 0),
                  hasMultipleActive = ($activeLabel.length > 1),
                  isFirstLabel      = (labelIndex === 0),
                  isLastLabel       = (labelIndex + 1 == labelCount),
                  isSearch          = module.is.searchSelection(),
                  isFocusedOnSearch = module.is.focusedOnSearch(),
                  isFocused         = module.is.focused(),
                  caretAtStart      = (isFocusedOnSearch && module.get.caretPosition() === 0),
                  $nextLabel
                ;
                if(isSearch && !hasActiveLabel && !isFocusedOnSearch) {
                  return;
                }

                if(pressedKey == keys.leftArrow) {
                  // activate previous label
                  if((isFocused || caretAtStart) && !hasActiveLabel) {
                    module.verbose('Selecting previous label');
                    $label.last().addClass(className.active);
                  }
                  else if(hasActiveLabel) {
                    if(!event.shiftKey) {
                      module.verbose('Selecting previous label');
                      $label.removeClass(className.active);
                    }
                    else {
                      module.verbose('Adding previous label to selection');
                    }
                    if(isFirstLabel && !hasMultipleActive) {
                      $activeLabel.addClass(className.active);
                    }
                    else {
                      $activeLabel.prev(selector.siblingLabel)
                        .addClass(className.active)
                        .end()
                      ;
                    }
                    event.preventDefault();
                  }
                }
                else if(pressedKey == keys.rightArrow) {
                  // activate first label
                  if(isFocused && !hasActiveLabel) {
                    $label.first().addClass(className.active);
                  }
                  // activate next label
                  if(hasActiveLabel) {
                    if(!event.shiftKey) {
                      module.verbose('Selecting next label');
                      $label.removeClass(className.active);
                    }
                    else {
                      module.verbose('Adding next label to selection');
                    }
                    if(isLastLabel) {
                      if(isSearch) {
                        if(!isFocusedOnSearch) {
                          module.focusSearch();
                        }
                        else {
                          $label.removeClass(className.active);
                        }
                      }
                      else if(hasMultipleActive) {
                        $activeLabel.next(selector.siblingLabel).addClass(className.active);
                      }
                      else {
                        $activeLabel.addClass(className.active);
                      }
                    }
                    else {
                      $activeLabel.next(selector.siblingLabel).addClass(className.active);
                    }
                    event.preventDefault();
                  }
                }
                else if(pressedKey == keys.deleteKey || pressedKey == keys.backspace) {
                  if(hasActiveLabel) {
                    module.verbose('Removing active labels');
                    if(isLastLabel) {
                      if(isSearch && !isFocusedOnSearch) {
                        module.focusSearch();
                      }
                    }
                    $activeLabel.last().next(selector.siblingLabel).addClass(className.active);
                    module.remove.activeLabels($activeLabel);
                    event.preventDefault();
                  }
                  else if(caretAtStart && !hasActiveLabel && pressedKey == keys.backspace) {
                    module.verbose('Removing last label on input backspace');
                    $activeLabel = $label.last().addClass(className.active);
                    module.remove.activeLabels($activeLabel);
                  }
                }
                else {
                  $activeLabel.removeClass(className.active);
                }
              }
            }
          },

          keydown: function(event) {
            var
              pressedKey    = event.which,
              isShortcutKey = module.is.inObject(pressedKey, keys)
            ;
            if(isShortcutKey) {
              var
                $currentlySelected = $item.not(selector.unselectable).filter('.' + className.selected).eq(0),
                $activeItem        = $menu.children('.' + className.active).eq(0),
                $selectedItem      = ($currentlySelected.length > 0)
                  ? $currentlySelected
                  : $activeItem,
                $visibleItems = ($selectedItem.length > 0)
                  ? $selectedItem.siblings(':not(.' + className.filtered +')').andSelf()
                  : $menu.children(':not(.' + className.filtered +')'),
                $subMenu             = $selectedItem.children(selector.menu),
                $parentMenu          = $selectedItem.closest(selector.menu),
                inVisibleMenu        = ($parentMenu.hasClass(className.visible) || $parentMenu.hasClass(className.animating) || $parentMenu.parent(selector.menu).length > 0),
                hasSubMenu           = ($subMenu.length> 0),
                hasSelectedItem      = ($selectedItem.length > 0),
                selectedIsSelectable = ($selectedItem.not(selector.unselectable).length > 0),
                delimiterPressed     = (pressedKey == keys.delimiter && settings.allowAdditions && module.is.multiple()),
                $nextItem,
                isSubMenuItem,
                newIndex
              ;
              // visible menu keyboard shortcuts
              if( module.is.visible() ) {

                // enter (select or open sub-menu)
                if(pressedKey == keys.enter || delimiterPressed) {
                  if(pressedKey == keys.enter && hasSelectedItem && hasSubMenu && !settings.allowCategorySelection) {
                    module.verbose('Pressed enter on unselectable category, opening sub menu');
                    pressedKey = keys.rightArrow;
                  }
                  else if(selectedIsSelectable) {
                    module.verbose('Selecting item from keyboard shortcut', $selectedItem);
                    module.event.item.click.call($selectedItem, event);
                    if(module.is.searchSelection()) {
                      module.remove.searchTerm();
                    }
                  }
                  event.preventDefault();
                }

                // left arrow (hide sub-menu)
                if(pressedKey == keys.leftArrow) {

                  isSubMenuItem = ($parentMenu[0] !== $menu[0]);

                  if(isSubMenuItem) {
                    module.verbose('Left key pressed, closing sub-menu');
                    module.animate.hide(false,  $parentMenu);
                    $selectedItem
                      .removeClass(className.selected)
                    ;
                    $parentMenu
                      .closest(selector.item)
                        .addClass(className.selected)
                    ;
                    event.preventDefault();
                  }
                }

                // right arrow (show sub-menu)
                if(pressedKey == keys.rightArrow) {
                  if(hasSubMenu) {
                    module.verbose('Right key pressed, opening sub-menu');
                    module.animate.show(false,  $subMenu);
                    $selectedItem
                      .removeClass(className.selected)
                    ;
                    $subMenu
                      .find(selector.item).eq(0)
                        .addClass(className.selected)
                    ;
                    event.preventDefault();
                  }
                }

                // up arrow (traverse menu up)
                if(pressedKey == keys.upArrow) {
                  $nextItem = (hasSelectedItem && inVisibleMenu)
                    ? $selectedItem.prevAll(selector.item + ':not(' + selector.unselectable + ')').eq(0)
                    : $item.eq(0)
                  ;
                  if($visibleItems.index( $nextItem ) < 0) {
                    module.verbose('Up key pressed but reached top of current menu');
                    event.preventDefault();
                    return;
                  }
                  else {
                    module.verbose('Up key pressed, changing active item');
                    $selectedItem
                      .removeClass(className.selected)
                    ;
                    $nextItem
                      .addClass(className.selected)
                    ;
                    module.set.scrollPosition($nextItem);
                  }
                  event.preventDefault();
                }

                // down arrow (traverse menu down)
                if(pressedKey == keys.downArrow) {
                  $nextItem = (hasSelectedItem && inVisibleMenu)
                    ? $nextItem = $selectedItem.nextAll(selector.item + ':not(' + selector.unselectable + ')').eq(0)
                    : $item.eq(0)
                  ;
                  if($nextItem.length === 0) {
                    module.verbose('Down key pressed but reached bottom of current menu');
                    event.preventDefault();
                    return;
                  }
                  else {
                    module.verbose('Down key pressed, changing active item');
                    $item
                      .removeClass(className.selected)
                    ;
                    $nextItem
                      .addClass(className.selected)
                    ;
                    module.set.scrollPosition($nextItem);
                  }
                  event.preventDefault();
                }

                // page down (show next page)
                if(pressedKey == keys.pageUp) {
                  module.scrollPage('up');
                  event.preventDefault();
                }
                if(pressedKey == keys.pageDown) {
                  module.scrollPage('down');
                  event.preventDefault();
                }

                // escape (close menu)
                if(pressedKey == keys.escape) {
                  module.verbose('Escape key pressed, closing dropdown');
                  module.hide();
                }

              }
              else {
                // delimiter key
                if(delimiterPressed) {
                  event.preventDefault();
                }
                // down arrow (open menu)
                if(pressedKey == keys.downArrow) {
                  module.verbose('Down key pressed, showing dropdown');
                  module.show();
                  event.preventDefault();
                }
              }
            }
            else {
              if( module.is.selection() && !module.is.search() ) {
                module.set.selectedLetter( String.fromCharCode(pressedKey) );
              }
            }
          }
        },

        trigger: {
          change: function() {
            var
              events       = document.createEvent('HTMLEvents'),
              inputElement = $input[0]
            ;
            if(inputElement) {
              module.verbose('Triggering native change event');
              events.initEvent('change', true, false);
              inputElement.dispatchEvent(events);
            }
          }
        },

        determine: {
          selectAction: function(text, value) {
            module.verbose('Determining action', settings.action);
            if( $.isFunction( module.action[settings.action] ) ) {
              module.verbose('Triggering preset action', settings.action, text, value);
              module.action[ settings.action ].call(this, text, value);
            }
            else if( $.isFunction(settings.action) ) {
              module.verbose('Triggering user action', settings.action, text, value);
              settings.action.call(this, text, value);
            }
            else {
              module.error(error.action, settings.action);
            }
          },
          eventInModule: function(event, callback) {
            var
              $target    = $(event.target),
              inDocument = ($target.closest(document.documentElement).length > 0),
              inModule   = ($target.closest($module).length > 0)
            ;
            callback = $.isFunction(callback)
              ? callback
              : function(){}
            ;
            if(inDocument && !inModule) {
              module.verbose('Triggering event', callback);
              callback();
              return true;
            }
            else {
              module.verbose('Event occurred in dropdown, canceling callback');
              return false;
            }
          },
          eventOnElement: function(event, callback) {
            var
              $target    = $(event.target),
              $label     = $target.closest(selector.siblingLabel),
              notOnLabel = ($module.find($label).length === 0),
              notInMenu  = ($target.closest($menu).length === 0)
            ;
            callback = $.isFunction(callback)
              ? callback
              : function(){}
            ;
            if(notOnLabel && notInMenu) {
              module.verbose('Triggering event', callback);
              callback();
              return true;
            }
            else {
              module.verbose('Event occurred in dropdown menu, canceling callback');
              return false;
            }
          }
        },

        action: {

          nothing: function() {},

          activate: function(text, value) {
            value = (value !== undefined)
              ? value
              : text
            ;
            if( module.can.activate( $(this) ) ) {
              module.set.selected(value, $(this));
              if(module.is.multiple() && !module.is.allFiltered()) {
                return;
              }
              else {
                module.hideAndClear();
              }
            }
          },

          select: function(text, value) {
            // mimics action.activate but does not select text
            module.action.activate.call(this);
          },

          combo: function(text, value) {
            value = (value !== undefined)
              ? value
              : text
            ;
            module.set.selected(value, $(this));
            module.hideAndClear();
          },

          hide: function(text, value) {
            module.set.value(value);
            module.hideAndClear();
          }

        },

        get: {
          id: function() {
            return id;
          },
          defaultText: function() {
            return $module.data(metadata.defaultText);
          },
          defaultValue: function() {
            return $module.data(metadata.defaultValue);
          },
          placeholderText: function() {
            return $module.data(metadata.placeholderText) || '';
          },
          text: function() {
            return $text.text();
          },
          query: function() {
            return $.trim($search.val());
          },
          searchWidth: function(characterCount) {
            return (characterCount * settings.glyphWidth) + 'em';
          },
          selectionCount: function() {
            var
              values = module.get.values(),
              count
            ;
            count = ( module.is.multiple() )
              ? $.isArray(values)
                ? values.length
                : 0
              : (module.get.value() !== '')
                ? 1
                : 0
            ;
            return count;
          },
          transition: function($subMenu) {
            return (settings.transition == 'auto')
              ? module.is.upward($subMenu)
                ? 'slide up'
                : 'slide down'
              : settings.transition
            ;
          },
          userValues: function() {
            var
              values = module.get.values()
            ;
            if(!values) {
              return false;
            }
            values = $.isArray(values)
              ? values
              : [values]
            ;
            return $.grep(values, function(value) {
              return (module.get.item(value) === false);
            });
          },
          uniqueArray: function(array) {
            return $.grep(array, function (value, index) {
                return $.inArray(value, array) === index;
            });
          },
          caretPosition: function() {
            var
              input = $search.get(0),
              range,
              rangeLength
            ;
            if('selectionStart' in input) {
              return input.selectionStart;
            }
            else if (document.selection) {
              input.focus();
              range       = document.selection.createRange();
              rangeLength = range.text.length;
              range.moveStart('character', -input.value.length);
              return range.text.length - rangeLength;
            }
          },
          value: function() {
            var
              value = ($input.length > 0)
                ? $input.val()
                : $module.data(metadata.value)
            ;
            // prevents placeholder element from being selected when multiple
            if($.isArray(value) && value.length === 1 && value[0] === '') {
              return '';
            }
            return value;
          },
          values: function() {
            var
              value = module.get.value()
            ;
            if(value === '') {
              return '';
            }
            return ( !module.has.selectInput() && module.is.multiple() )
              ? (typeof value == 'string') // delimited string
                ? value.split(settings.delimiter)
                : ''
              : value
            ;
          },
          remoteValues: function() {
            var
              values = module.get.values(),
              remoteValues = false
            ;
            if(values) {
              if(typeof values == 'string') {
                values = [values];
              }
              remoteValues = {};
              $.each(values, function(index, value) {
                var
                  name = module.read.remoteData(value)
                ;
                module.verbose('Restoring value from session data', name, value);
                remoteValues[value] = (name)
                  ? name
                  : value
                ;
              });
            }
            return remoteValues;
          },
          choiceText: function($choice, preserveHTML) {
            preserveHTML = (preserveHTML !== undefined)
              ? preserveHTML
              : settings.preserveHTML
            ;
            if($choice) {
              if($choice.find(selector.menu).length > 0) {
                module.verbose('Retreiving text of element with sub-menu');
                $choice = $choice.clone();
                $choice.find(selector.menu).remove();
                $choice.find(selector.menuIcon).remove();
              }
              return ($choice.data(metadata.text) !== undefined)
                ? $choice.data(metadata.text)
                : (preserveHTML)
                  ? $.trim($choice.html())
                  : $.trim($choice.text())
              ;
            }
          },
          choiceValue: function($choice, choiceText) {
            choiceText = choiceText || module.get.choiceText($choice);
            if(!$choice) {
              return false;
            }
            return ($choice.data(metadata.value) !== undefined)
              ? String( $choice.data(metadata.value) )
              : (typeof choiceText === 'string')
                ? $.trim(choiceText.toLowerCase())
                : String(choiceText)
            ;
          },
          inputEvent: function() {
            var
              input = $search[0]
            ;
            if(input) {
              return (input.oninput !== undefined)
                ? 'input'
                : (input.onpropertychange !== undefined)
                  ? 'propertychange'
                  : 'keyup'
              ;
            }
            return false;
          },
          selectValues: function() {
            var
              select = {}
            ;
            select.values = [];
            $module
              .find('option')
                .each(function() {
                  var
                    $option  = $(this),
                    name     = $option.html(),
                    disabled = $option.attr('disabled'),
                    value    = ( $option.attr('value') !== undefined )
                      ? $option.attr('value')
                      : name
                  ;
                  if(settings.placeholder === 'auto' && value === '') {
                    select.placeholder = name;
                  }
                  else {
                    select.values.push({
                      name     : name,
                      value    : value,
                      disabled : disabled
                    });
                  }
                })
            ;
            if(settings.placeholder && settings.placeholder !== 'auto') {
              module.debug('Setting placeholder value to', settings.placeholder);
              select.placeholder = settings.placeholder;
            }
            if(settings.sortSelect) {
              select.values.sort(function(a, b) {
                return (a.name > b.name)
                  ? 1
                  : -1
                ;
              });
              module.debug('Retrieved and sorted values from select', select);
            }
            else {
              module.debug('Retreived values from select', select);
            }
            return select;
          },
          activeItem: function() {
            return $item.filter('.'  + className.active);
          },
          selectedItem: function() {
            var
              $selectedItem = $item.not(selector.unselectable).filter('.'  + className.selected)
            ;
            return ($selectedItem.length > 0)
              ? $selectedItem
              : $item.eq(0)
            ;
          },
          itemWithAdditions: function(value) {
            var
              $items       = module.get.item(value),
              $userItems   = module.create.userChoice(value),
              hasUserItems = ($userItems && $userItems.length > 0)
            ;
            if(hasUserItems) {
              $items = ($items.length > 0)
                ? $items.add($userItems)
                : $userItems
              ;
            }
            return $items;
          },
          item: function(value, strict) {
            var
              $selectedItem = false,
              shouldSearch,
              isMultiple
            ;
            value = (value !== undefined)
              ? value
              : ( module.get.values() !== undefined)
                ? module.get.values()
                : module.get.text()
            ;
            shouldSearch = (isMultiple)
              ? (value.length > 0)
              : (value !== undefined && value !== null)
            ;
            isMultiple = (module.is.multiple() && $.isArray(value));
            strict     = (value === '' || value === 0)
              ? true
              : strict || false
            ;
            if(shouldSearch) {
              $item
                .each(function() {
                  var
                    $choice       = $(this),
                    optionText    = module.get.choiceText($choice),
                    optionValue   = module.get.choiceValue($choice, optionText)
                  ;
                  // safe early exit
                  if(optionValue === null || optionValue === undefined) {
                    return;
                  }
                  if(isMultiple) {
                    if($.inArray( String(optionValue), value) !== -1 || $.inArray(optionText, value) !== -1) {
                      $selectedItem = ($selectedItem)
                        ? $selectedItem.add($choice)
                        : $choice
                      ;
                    }
                  }
                  else if(strict) {
                    module.verbose('Ambiguous dropdown value using strict type check', $choice, value);
                    if( optionValue === value || optionText === value) {
                      $selectedItem = $choice;
                      return true;
                    }
                  }
                  else {
                    if( String(optionValue) == String(value) || optionText == value) {
                      module.verbose('Found select item by value', optionValue, value);
                      $selectedItem = $choice;
                      return true;
                    }
                  }
                })
              ;
            }
            return $selectedItem;
          }
        },

        check: {
          maxSelections: function(selectionCount) {
            if(settings.maxSelections) {
              selectionCount = (selectionCount !== undefined)
                ? selectionCount
                : module.get.selectionCount()
              ;
              if(selectionCount >= settings.maxSelections) {
                module.debug('Maximum selection count reached');
                if(settings.useLabels) {
                  $item.addClass(className.filtered);
                  module.add.message(message.maxSelections);
                }
                return true;
              }
              else {
                module.verbose('No longer at maximum selection count');
                module.remove.message();
                module.remove.filteredItem();
                if(module.is.searchSelection()) {
                  module.filterItems();
                }
                return false;
              }
            }
            return true;
          }
        },

        restore: {
          defaults: function() {
            module.clear();
            module.restore.defaultText();
            module.restore.defaultValue();
          },
          defaultText: function() {
            var
              defaultText     = module.get.defaultText(),
              placeholderText = module.get.placeholderText
            ;
            if(defaultText === placeholderText) {
              module.debug('Restoring default placeholder text', defaultText);
              module.set.placeholderText(defaultText);
            }
            else {
              module.debug('Restoring default text', defaultText);
              module.set.text(defaultText);
            }
          },
          defaultValue: function() {
            var
              defaultValue = module.get.defaultValue()
            ;
            if(defaultValue !== undefined) {
              module.debug('Restoring default value', defaultValue);
              if(defaultValue !== '') {
                module.set.value(defaultValue);
                module.set.selected();
              }
              else {
                module.remove.activeItem();
                module.remove.selectedItem();
              }
            }
          },
          labels: function() {
            if(settings.allowAdditions) {
              if(!settings.useLabels) {
                module.error(error.labels);
                settings.useLabels = true;
              }
              module.debug('Restoring selected values');
              module.create.userLabels();
            }
            module.check.maxSelections();
          },
          selected: function() {
            module.restore.values();
            if(module.is.multiple()) {
              module.debug('Restoring previously selected values and labels');
              module.restore.labels();
            }
            else {
              module.debug('Restoring previously selected values');
            }
          },
          values: function() {
            // prevents callbacks from occuring on initial load
            module.set.initialLoad();
            if(settings.apiSettings) {
              if(settings.saveRemoteData) {
                module.restore.remoteValues();
              }
              else {
                module.clearValue();
              }
            }
            else {
              module.set.selected();
            }
            module.remove.initialLoad();
          },
          remoteValues: function() {
            var
              values = module.get.remoteValues()
            ;
            module.debug('Recreating selected from session data', values);
            if(values) {
              if( module.is.single() ) {
                $.each(values, function(value, name) {
                  module.set.text(name);
                });
              }
              else {
                $.each(values, function(value, name) {
                  module.add.label(value, name);
                });
              }
            }
          }
        },

        read: {
          remoteData: function(value) {
            var
              name
            ;
            if(window.Storage === undefined) {
              module.error(error.noStorage);
              return;
            }
            name = sessionStorage.getItem(value);
            return (name !== undefined)
              ? name
              : false
            ;
          }
        },

        save: {
          defaults: function() {
            module.save.defaultText();
            module.save.placeholderText();
            module.save.defaultValue();
          },
          defaultValue: function() {
            var
              value = module.get.value()
            ;
            module.verbose('Saving default value as', value);
            $module.data(metadata.defaultValue, value);
          },
          defaultText: function() {
            var
              text = module.get.text()
            ;
            module.verbose('Saving default text as', text);
            $module.data(metadata.defaultText, text);
          },
          placeholderText: function() {
            var
              text
            ;
            if(settings.placeholder !== false && $text.hasClass(className.placeholder)) {
              text = module.get.text();
              module.verbose('Saving placeholder text as', text);
              $module.data(metadata.placeholderText, text);
            }
          },
          remoteData: function(name, value) {
            if(window.Storage === undefined) {
              module.error(error.noStorage);
              return;
            }
            module.verbose('Saving remote data to session storage', value, name);
            sessionStorage.setItem(value, name);
          }
        },

        clear: function() {
          if(module.is.multiple()) {
            module.remove.labels();
          }
          else {
            module.remove.activeItem();
            module.remove.selectedItem();
          }
          module.set.placeholderText();
          module.clearValue();
        },

        clearValue: function() {
          module.set.value('');
        },

        scrollPage: function(direction, $selectedItem) {
          var
            $currentItem  = $selectedItem || module.get.selectedItem(),
            $menu         = $currentItem.closest(selector.menu),
            menuHeight    = $menu.outerHeight(),
            currentScroll = $menu.scrollTop(),
            itemHeight    = $item.eq(0).outerHeight(),
            itemsPerPage  = Math.floor(menuHeight / itemHeight),
            maxScroll     = $menu.prop('scrollHeight'),
            newScroll     = (direction == 'up')
              ? currentScroll - (itemHeight * itemsPerPage)
              : currentScroll + (itemHeight * itemsPerPage),
            $selectableItem = $item.not(selector.unselectable),
            isWithinRange,
            $nextSelectedItem,
            elementIndex
          ;
          elementIndex      = (direction == 'up')
            ? $selectableItem.index($currentItem) - itemsPerPage
            : $selectableItem.index($currentItem) + itemsPerPage
          ;
          isWithinRange = (direction == 'up')
            ? (elementIndex >= 0)
            : (elementIndex < $selectableItem.length)
          ;
          $nextSelectedItem = (isWithinRange)
            ? $selectableItem.eq(elementIndex)
            : (direction == 'up')
              ? $selectableItem.first()
              : $selectableItem.last()
          ;
          if($nextSelectedItem.length > 0) {
            module.debug('Scrolling page', direction, $nextSelectedItem);
            $currentItem
              .removeClass(className.selected)
            ;
            $nextSelectedItem
              .addClass(className.selected)
            ;
            $menu
              .scrollTop(newScroll)
            ;
          }
        },

        set: {
          filtered: function() {
            var
              isMultiple       = module.is.multiple(),
              isSearch         = module.is.searchSelection(),
              isSearchMultiple = (isMultiple && isSearch),
              searchValue      = (isSearch)
                ? module.get.query()
                : '',
              hasSearchValue   = (typeof searchValue === 'string' && searchValue.length > 0),
              searchWidth      = module.get.searchWidth(searchValue.length),
              valueIsSet       = searchValue !== ''
            ;
            if(isMultiple && hasSearchValue) {
              module.verbose('Adjusting input width', searchWidth, settings.glyphWidth);
              $search.css('width', searchWidth);
            }
            if(hasSearchValue || (isSearchMultiple && valueIsSet)) {
              module.verbose('Hiding placeholder text');
              $text.addClass(className.filtered);
            }
            else if(!isMultiple || (isSearchMultiple && !valueIsSet)) {
              module.verbose('Showing placeholder text');
              $text.removeClass(className.filtered);
            }
          },
          loading: function() {
            $module.addClass(className.loading);
          },
          placeholderText: function(text) {
            text = text || module.get.placeholderText();
            module.debug('Setting placeholder text', text);
            module.set.text(text);
            $text.addClass(className.placeholder);
          },
          tabbable: function() {
            if( module.has.search() ) {
              module.debug('Added tabindex to searchable dropdown');
              $search
                .val('')
                .attr('tabindex', 0)
              ;
              $menu
                .attr('tabindex', -1)
              ;
            }
            else {
              module.debug('Added tabindex to dropdown');
              if( $module.attr('tabindex') === undefined) {
                $module
                  .attr('tabindex', 0)
                ;
                $menu
                  .attr('tabindex', -1)
                ;
              }
            }
          },
          initialLoad: function() {
            module.verbose('Setting initial load');
            initialLoad = true;
          },
          activeItem: function($item) {
            if( settings.allowAdditions && $item.filter(selector.addition).length > 0 ) {
              $item.addClass(className.filtered);
            }
            else {
              $item.addClass(className.active);
            }
          },
          scrollPosition: function($item, forceScroll) {
            var
              edgeTolerance = 5,
              $menu,
              hasActive,
              offset,
              itemHeight,
              itemOffset,
              menuOffset,
              menuScroll,
              menuHeight,
              abovePage,
              belowPage
            ;

            $item       = $item || module.get.selectedItem();
            $menu       = $item.closest(selector.menu);
            hasActive   = ($item && $item.length > 0);
            forceScroll = (forceScroll !== undefined)
              ? forceScroll
              : false
            ;
            if($item && $menu.length > 0 && hasActive) {
              itemOffset = $item.position().top;

              $menu.addClass(className.loading);
              menuScroll = $menu.scrollTop();
              menuOffset = $menu.offset().top;
              itemOffset = $item.offset().top;
              offset     = menuScroll - menuOffset + itemOffset;
              if(!forceScroll) {
                menuHeight = $menu.height();
                belowPage  = menuScroll + menuHeight < (offset + edgeTolerance);
                abovePage  = ((offset - edgeTolerance) < menuScroll);
              }
              module.debug('Scrolling to active item', offset);
              if(forceScroll || abovePage || belowPage) {
                $menu.scrollTop(offset);
              }
              $menu.removeClass(className.loading);
            }
          },
          text: function(text) {
            if(settings.action !== 'select') {
              if(settings.action == 'combo') {
                module.debug('Changing combo button text', text, $combo);
                if(settings.preserveHTML) {
                  $combo.html(text);
                }
                else {
                  $combo.text(text);
                }
              }
              else {
                if(text !== module.get.placeholderText()) {
                  $text.removeClass(className.placeholder);
                }
                module.debug('Changing text', text, $text);
                $text
                  .removeClass(className.filtered)
                ;
                if(settings.preserveHTML) {
                  $text.html(text);
                }
                else {
                  $text.text(text);
                }
              }
            }
          },
          selectedLetter: function(letter) {
            var
              $selectedItem         = $item.filter('.' + className.selected),
              alreadySelectedLetter = $selectedItem.length > 0 && module.has.firstLetter($selectedItem, letter),
              $nextValue            = false,
              $nextItem
            ;
            // check next of same letter
            if(alreadySelectedLetter) {
              $nextItem = $selectedItem.nextAll($item).eq(0);
              if( module.has.firstLetter($nextItem, letter) ) {
                $nextValue  = $nextItem;
              }
            }
            // check all values
            if(!$nextValue) {
              $item
                .each(function(){
                  if(module.has.firstLetter($(this), letter)) {
                    $nextValue = $(this);
                    return false;
                  }
                })
              ;
            }
            // set next value
            if($nextValue) {
              module.verbose('Scrolling to next value with letter', letter);
              module.set.scrollPosition($nextValue);
              $selectedItem.removeClass(className.selected);
              $nextValue.addClass(className.selected);
            }
          },
          direction: function($menu) {
            if(settings.direction == 'auto') {
              if(module.is.onScreen($menu)) {
                module.remove.upward($menu);
              }
              else {
                module.set.upward($menu);
              }
            }
            else if(settings.direction == 'upward') {
              module.set.upward($menu);
            }
          },
          upward: function($menu) {
            var $element = $menu || $module;
            $element.addClass(className.upward);
          },
          value: function(value, text, $selected) {
            var
              hasInput     = ($input.length > 0),
              isAddition   = !module.has.value(value),
              currentValue = module.get.values(),
              stringValue  = (value !== undefined)
                ? String(value)
                : value,
              newValue
            ;
            if(hasInput) {
              if(stringValue == currentValue) {
                module.verbose('Skipping value update already same value', value, currentValue);
                if(!module.is.initialLoad()) {
                  return;
                }
              }

              if( module.is.single() && module.has.selectInput() && module.can.extendSelect() ) {
                module.debug('Adding user option', value);
                module.add.optionValue(value);
              }
              module.debug('Updating input value', value, currentValue);
              internalChange = true;
              $input
                .val(value)
              ;
              if(settings.fireOnInit === false && module.is.initialLoad()) {
                module.debug('Input native change event ignored on initial load');
              }
              else {
                module.trigger.change();
              }
              internalChange = false;
            }
            else {
              module.verbose('Storing value in metadata', value, $input);
              if(value !== currentValue) {
                $module.data(metadata.value, stringValue);
              }
            }
            if(settings.fireOnInit === false && module.is.initialLoad()) {
              module.verbose('No callback on initial load', settings.onChange);
            }
            else {
              settings.onChange.call(element, value, text, $selected);
            }
          },
          active: function() {
            $module
              .addClass(className.active)
            ;
          },
          multiple: function() {
            $module.addClass(className.multiple);
          },
          visible: function() {
            $module.addClass(className.visible);
          },
          exactly: function(value, $selectedItem) {
            module.debug('Setting selected to exact values');
            module.clear();
            module.set.selected(value, $selectedItem);
          },
          selected: function(value, $selectedItem) {
            var
              isMultiple = module.is.multiple(),
              $userSelectedItem
            ;
            $selectedItem = (settings.allowAdditions)
              ? $selectedItem || module.get.itemWithAdditions(value)
              : $selectedItem || module.get.item(value)
            ;
            if(!$selectedItem) {
              return;
            }
            module.debug('Setting selected menu item to', $selectedItem);
            if(module.is.single()) {
              module.remove.activeItem();
              module.remove.selectedItem();
            }
            else if(settings.useLabels) {
              module.remove.selectedItem();
            }
            // select each item
            $selectedItem
              .each(function() {
                var
                  $selected      = $(this),
                  selectedText   = module.get.choiceText($selected),
                  selectedValue  = module.get.choiceValue($selected, selectedText),

                  isFiltered     = $selected.hasClass(className.filtered),
                  isActive       = $selected.hasClass(className.active),
                  isUserValue    = $selected.hasClass(className.addition),
                  shouldAnimate  = (isMultiple && $selectedItem.length == 1)
                ;
                if(isMultiple) {
                  if(!isActive || isUserValue) {
                    if(settings.apiSettings && settings.saveRemoteData) {
                      module.save.remoteData(selectedText, selectedValue);
                    }
                    if(settings.useLabels) {
                      module.add.value(selectedValue, selectedText, $selected);
                      module.add.label(selectedValue, selectedText, shouldAnimate);
                      module.set.activeItem($selected);
                      module.filterActive();
                      module.select.nextAvailable($selectedItem);
                    }
                    else {
                      module.add.value(selectedValue, selectedText, $selected);
                      module.set.text(module.add.variables(message.count));
                      module.set.activeItem($selected);
                    }
                  }
                  else if(!isFiltered) {
                    module.debug('Selected active value, removing label');
                    module.remove.selected(selectedValue);
                  }
                }
                else {
                  if(settings.apiSettings && settings.saveRemoteData) {
                    module.save.remoteData(selectedText, selectedValue);
                  }
                  module.set.text(selectedText);
                  module.set.value(selectedValue, selectedText, $selected);
                  $selected
                    .addClass(className.active)
                    .addClass(className.selected)
                  ;
                }
              })
            ;
          }
        },

        add: {
          label: function(value, text, shouldAnimate) {
            var
              $next  = module.is.searchSelection()
                ? $search
                : $text,
              $label
            ;
            $label =  $('<a />')
              .addClass(className.label)
              .attr('data-value', value)
              .html(templates.label(value, text))
            ;
            $label = settings.onLabelCreate.call($label, value, text);

            if(module.has.label(value)) {
              module.debug('Label already exists, skipping', value);
              return;
            }
            if(settings.label.variation) {
              $label.addClass(settings.label.variation);
            }
            if(shouldAnimate === true) {
              module.debug('Animating in label', $label);
              $label
                .addClass(className.hidden)
                .insertBefore($next)
                .transition(settings.label.transition, settings.label.duration)
              ;
            }
            else {
              module.debug('Adding selection label', $label);
              $label
                .insertBefore($next)
              ;
            }
          },
          message: function(message) {
            var
              $message = $menu.children(selector.message),
              html     = settings.templates.message(module.add.variables(message))
            ;
            if($message.length > 0) {
              $message
                .html(html)
              ;
            }
            else {
              $message = $('<div/>')
                .html(html)
                .addClass(className.message)
                .appendTo($menu)
              ;
            }
          },
          optionValue: function(value) {
            var
              $option   = $input.find('option[value="' + value + '"]'),
              hasOption = ($option.length > 0)
            ;
            if(hasOption) {
              return;
            }
            // temporarily disconnect observer
            if(selectObserver) {
              selectObserver.disconnect();
              module.verbose('Temporarily disconnecting mutation observer', value);
            }
            if( module.is.single() ) {
              module.verbose('Removing previous user addition');
              $input.find('option.' + className.addition).remove();
            }
            $('<option/>')
              .prop('value', value)
              .addClass(className.addition)
              .html(value)
              .appendTo($input)
            ;
            module.verbose('Adding user addition as an <option>', value);
            if(selectObserver) {
              selectObserver.observe($input[0], {
                childList : true,
                subtree   : true
              });
            }
          },
          userSuggestion: function(value) {
            var
              $addition         = $menu.children(selector.addition),
              $existingItem     = module.get.item(value),
              alreadyHasValue   = $existingItem && $existingItem.not(selector.addition).length,
              hasUserSuggestion = $addition.length > 0,
              html
            ;
            if(settings.useLabels && module.has.maxSelections()) {
              return;
            }
            if(value === '' || alreadyHasValue) {
              $addition.remove();
              return;
            }
            $item
              .removeClass(className.selected)
            ;
            if(hasUserSuggestion) {
              html = settings.templates.addition( module.add.variables(message.addResult, value) );
              $addition
                .html(html)
                .attr('data-' + metadata.value, value)
                .attr('data-' + metadata.text, value)
                .removeClass(className.filtered)
                .addClass(className.selected)
              ;
              module.verbose('Replacing user suggestion with new value', $addition);
            }
            else {
              $addition = module.create.userChoice(value);
              $addition
                .prependTo($menu)
                .addClass(className.selected)
              ;
              module.verbose('Adding item choice to menu corresponding with user choice addition', $addition);
            }
          },
          variables: function(message, term) {
            var
              hasCount    = (message.search('{count}') !== -1),
              hasMaxCount = (message.search('{maxCount}') !== -1),
              hasTerm     = (message.search('{term}') !== -1),
              values,
              count,
              query
            ;
            module.verbose('Adding templated variables to message', message);
            if(hasCount) {
              count  = module.get.selectionCount();
              message = message.replace('{count}', count);
            }
            if(hasMaxCount) {
              count  = module.get.selectionCount();
              message = message.replace('{maxCount}', settings.maxSelections);
            }
            if(hasTerm) {
              query   = term || module.get.query();
              message = message.replace('{term}', query);
            }
            return message;
          },
          value: function(addedValue, addedText, $selectedItem) {
            var
              currentValue = module.get.values(),
              newValue
            ;
            if(addedValue === '') {
              module.debug('Cannot select blank values from multiselect');
              return;
            }
            // extend current array
            if($.isArray(currentValue)) {
              newValue = currentValue.concat([addedValue]);
              newValue = module.get.uniqueArray(newValue);
            }
            else {
              newValue = [addedValue];
            }
            // add values
            if( module.has.selectInput() ) {
              if(module.can.extendSelect()) {
                module.debug('Adding value to select', addedValue, newValue, $input);
                module.add.optionValue(addedValue);
              }
            }
            else {
              newValue = newValue.join(settings.delimiter);
              module.debug('Setting hidden input to delimited value', newValue, $input);
            }

            if(settings.fireOnInit === false && module.is.initialLoad()) {
              module.verbose('Skipping onadd callback on initial load', settings.onAdd);
            }
            else {
              settings.onAdd.call(element, addedValue, addedText, $selectedItem);
            }
            module.set.value(newValue, addedValue, addedText, $selectedItem);
            module.check.maxSelections();
          }
        },

        remove: {
          active: function() {
            $module.removeClass(className.active);
          },
          activeLabel: function() {
            $module.find(selector.label).removeClass(className.active);
          },
          loading: function() {
            $module.removeClass(className.loading);
          },
          initialLoad: function() {
            initialLoad = false;
          },
          upward: function($menu) {
            var $element = $menu || $module;
            $element.removeClass(className.upward);
          },
          visible: function() {
            $module.removeClass(className.visible);
          },
          activeItem: function() {
            $item.removeClass(className.active);
          },
          filteredItem: function() {
            if(settings.useLabels && module.has.maxSelections() ) {
              return;
            }
            if(settings.useLabels && module.is.multiple()) {
              $item.not('.' + className.active).removeClass(className.filtered);
            }
            else {
              $item.removeClass(className.filtered);
            }
          },
          optionValue: function(value) {
            var
              $option   = $input.find('option[value="' + value + '"]'),
              hasOption = ($option.length > 0)
            ;
            if(!hasOption || !$option.hasClass(className.addition)) {
              return;
            }
            // temporarily disconnect observer
            if(selectObserver) {
              selectObserver.disconnect();
              module.verbose('Temporarily disconnecting mutation observer', value);
            }
            $option.remove();
            module.verbose('Removing user addition as an <option>', value);
            if(selectObserver) {
              selectObserver.observe($input[0], {
                childList : true,
                subtree   : true
              });
            }
          },
          message: function() {
            $menu.children(selector.message).remove();
          },
          searchTerm: function() {
            module.verbose('Cleared search term');
            $search.val('');
            module.set.filtered();
          },
          selected: function(value, $selectedItem) {
            $selectedItem = (settings.allowAdditions)
              ? $selectedItem || module.get.itemWithAdditions(value)
              : $selectedItem || module.get.item(value)
            ;

            if(!$selectedItem) {
              return false;
            }

            $selectedItem
              .each(function() {
                var
                  $selected     = $(this),
                  selectedText  = module.get.choiceText($selected),
                  selectedValue = module.get.choiceValue($selected, selectedText)
                ;
                if(module.is.multiple()) {
                  if(settings.useLabels) {
                    module.remove.value(selectedValue, selectedText, $selected);
                    module.remove.label(selectedValue);
                  }
                  else {
                    module.remove.value(selectedValue, selectedText, $selected);
                    if(module.get.selectionCount() === 0) {
                      module.set.placeholderText();
                    }
                    else {
                      module.set.text(module.add.variables(message.count));
                    }
                  }
                }
                else {
                  module.remove.value(selectedValue, selectedText, $selected);
                }
                $selected
                  .removeClass(className.filtered)
                  .removeClass(className.active)
                ;
                if(settings.useLabels) {
                  $selected.removeClass(className.selected);
                }
              })
            ;
          },
          selectedItem: function() {
            $item.removeClass(className.selected);
          },
          value: function(removedValue, removedText, $removedItem) {
            var
              values = module.get.values(),
              newValue
            ;
            if( module.has.selectInput() ) {
              module.verbose('Input is <select> removing selected option', removedValue);
              newValue = module.remove.arrayValue(removedValue, values);
              module.remove.optionValue(removedValue);
            }
            else {
              module.verbose('Removing from delimited values', removedValue);
              newValue = module.remove.arrayValue(removedValue, values);
              newValue = newValue.join(settings.delimiter);
            }
            if(settings.fireOnInit === false && module.is.initialLoad()) {
              module.verbose('No callback on initial load', settings.onRemove);
            }
            else {
              settings.onRemove.call(element, removedValue, removedText, $removedItem);
            }
            module.set.value(newValue, removedText, $removedItem);
            module.check.maxSelections();
          },
          arrayValue: function(removedValue, values) {
            if( !$.isArray(values) ) {
              values = [values];
            }
            values = $.grep(values, function(value){
              return (removedValue != value);
            });
            module.verbose('Removed value from delimited string', removedValue, values);
            return values;
          },
          label: function(value, shouldAnimate) {
            var
              $labels       = $module.find(selector.label),
              $removedLabel = $labels.filter('[data-value="' + value +'"]')
            ;
            module.verbose('Removing label', $removedLabel);
            $removedLabel.remove();
          },
          activeLabels: function($activeLabels) {
            $activeLabels = $activeLabels || $module.find(selector.label).filter('.' + className.active);
            module.verbose('Removing active label selections', $activeLabels);
            module.remove.labels($activeLabels);
          },
          labels: function($labels) {
            $labels = $labels || $module.find(selector.label);
            module.verbose('Removing labels', $labels);
            $labels
              .each(function(){
                var
                  $label      = $(this),
                  value       = $label.data(metadata.value),
                  stringValue = (value !== undefined)
                    ? String(value)
                    : value,
                  isUserValue = module.is.userValue(stringValue)
                ;
                if(settings.onLabelRemove.call($label, value) === false) {
                  module.debug('Label remove callback cancelled removal');
                  return;
                }
                if(isUserValue) {
                  module.remove.value(stringValue);
                  module.remove.label(stringValue);
                }
                else {
                  // selected will also remove label
                  module.remove.selected(stringValue);
                }
              })
            ;
          },
          tabbable: function() {
            if( module.has.search() ) {
              module.debug('Searchable dropdown initialized');
              $search
                .removeAttr('tabindex')
              ;
              $menu
                .removeAttr('tabindex')
              ;
            }
            else {
              module.debug('Simple selection dropdown initialized');
              $module
                .removeAttr('tabindex')
              ;
              $menu
                .removeAttr('tabindex')
              ;
            }
          }
        },

        has: {
          search: function() {
            return ($search.length > 0);
          },
          selectInput: function() {
            return ( $input.is('select') );
          },
          firstLetter: function($item, letter) {
            var
              text,
              firstLetter
            ;
            if(!$item || $item.length === 0 || typeof letter !== 'string') {
              return false;
            }
            text        = module.get.choiceText($item, false);
            letter      = letter.toLowerCase();
            firstLetter = String(text).charAt(0).toLowerCase();
            return (letter == firstLetter);
          },
          input: function() {
            return ($input.length > 0);
          },
          items: function() {
            return ($item.length > 0);
          },
          menu: function() {
            return ($menu.length > 0);
          },
          message: function() {
            return ($menu.children(selector.message).length !== 0);
          },
          label: function(value) {
            var
              $labels = $module.find(selector.label)
            ;
            return ($labels.filter('[data-value="' + value +'"]').length > 0);
          },
          maxSelections: function() {
            return (settings.maxSelections && module.get.selectionCount() >= settings.maxSelections);
          },
          allResultsFiltered: function() {
            return ($item.filter(selector.unselectable).length === $item.length);
          },
          query: function() {
            return (module.get.query() !== '');
          },
          value: function(value) {
            var
              values   = module.get.values(),
              hasValue = $.isArray(values)
               ? values && ($.inArray(value, values) !== -1)
               : (values == value)
            ;
            return (hasValue)
              ? true
              : false
            ;
          }
        },

        is: {
          active: function() {
            return $module.hasClass(className.active);
          },
          alreadySetup: function() {
            return ($module.is('select') && $module.parent(selector.dropdown).length > 0  && $module.prev().length === 0);
          },
          animating: function($subMenu) {
            return ($subMenu)
              ? $subMenu.transition && $subMenu.transition('is animating')
              : $menu.transition    && $menu.transition('is animating')
            ;
          },
          disabled: function() {
            return $module.hasClass(className.disabled);
          },
          focused: function() {
            return (document.activeElement === $module[0]);
          },
          focusedOnSearch: function() {
            return (document.activeElement === $search[0]);
          },
          allFiltered: function() {
            return( (module.is.multiple() || module.has.search()) && !module.has.message() && module.has.allResultsFiltered() );
          },
          hidden: function($subMenu) {
            return !module.is.visible($subMenu);
          },
          initialLoad: function() {
            return initialLoad;
          },
          onScreen: function($subMenu) {
            var
              $currentMenu   = $subMenu || $menu,
              canOpenDownward = true,
              onScreen = {},
              calculations
            ;
            $currentMenu.addClass(className.loading);
            calculations = {
              context: {
                scrollTop : $context.scrollTop(),
                height    : $context.outerHeight()
              },
              menu : {
                offset: $currentMenu.offset(),
                height: $currentMenu.outerHeight()
              }
            };
            onScreen = {
              above : (calculations.context.scrollTop) <= calculations.menu.offset.top - calculations.menu.height,
              below : (calculations.context.scrollTop + calculations.context.height) >= calculations.menu.offset.top + calculations.menu.height
            };
            if(onScreen.below) {
              module.verbose('Dropdown can fit in context downward', onScreen);
              canOpenDownward = true;
            }
            else if(!onScreen.below && !onScreen.above) {
              module.verbose('Dropdown cannot fit in either direction, favoring downward', onScreen);
              canOpenDownward = true;
            }
            else {
              module.verbose('Dropdown cannot fit below, opening upward', onScreen);
              canOpenDownward = false;
            }
            $currentMenu.removeClass(className.loading);
            return canOpenDownward;
          },
          inObject: function(needle, object) {
            var
              found = false
            ;
            $.each(object, function(index, property) {
              if(property == needle) {
                found = true;
                return true;
              }
            });
            return found;
          },
          multiple: function() {
            return $module.hasClass(className.multiple);
          },
          single: function() {
            return !module.is.multiple();
          },
          selectMutation: function(mutations) {
            var
              selectChanged = false
            ;
            $.each(mutations, function(index, mutation) {
              if(mutation.target && $(mutation.target).is('select')) {
                selectChanged = true;
                return true;
              }
            });
            return selectChanged;
          },
          search: function() {
            return $module.hasClass(className.search);
          },
          searchSelection: function() {
            return ( module.has.search() && $search.parent(selector.dropdown).length === 1 );
          },
          selection: function() {
            return $module.hasClass(className.selection);
          },
          userValue: function(value) {
            return ($.inArray(value, module.get.userValues()) !== -1);
          },
          upward: function($menu) {
            var $element = $menu || $module;
            return $element.hasClass(className.upward);
          },
          visible: function($subMenu) {
            return ($subMenu)
              ? $subMenu.hasClass(className.visible)
              : $menu.hasClass(className.visible)
            ;
          }
        },

        can: {
          activate: function($item) {
            if(settings.useLabels) {
              return true;
            }
            if(!module.has.maxSelections()) {
              return true;
            }
            if(module.has.maxSelections() && $item.hasClass(className.active)) {
              return true;
            }
            return false;
          },
          click: function() {
            return (hasTouch || settings.on == 'click');
          },
          extendSelect: function() {
            return settings.allowAdditions || settings.apiSettings;
          },
          show: function() {
            return !module.is.disabled() && (module.has.items() || module.has.message());
          },
          useAPI: function() {
            return $.fn.api !== undefined;
          }
        },

        animate: {
          show: function(callback, $subMenu) {
            var
              $currentMenu = $subMenu || $menu,
              start = ($subMenu)
                ? function() {}
                : function() {
                  module.hideSubMenus();
                  module.hideOthers();
                  module.set.active();
                },
              transition
            ;
            callback = $.isFunction(callback)
              ? callback
              : function(){}
            ;
            module.verbose('Doing menu show animation', $currentMenu);
            module.set.direction($subMenu);
            transition = module.get.transition($subMenu);
            if( module.is.selection() ) {
              module.set.scrollPosition(module.get.selectedItem(), true);
            }
            if( module.is.hidden($currentMenu) || module.is.animating($currentMenu) ) {
              if(transition == 'none') {
                start();
                $currentMenu.transition('show');
                callback.call(element);
              }
              else if($.fn.transition !== undefined && $module.transition('is supported')) {
                $currentMenu
                  .transition({
                    animation  : transition + ' in',
                    debug      : settings.debug,
                    verbose    : settings.verbose,
                    duration   : settings.duration,
                    queue      : true,
                    onStart    : start,
                    onComplete : function() {
                      callback.call(element);
                    }
                  })
                ;
              }
              else {
                module.error(error.noTransition, transition);
              }
            }
          },
          hide: function(callback, $subMenu) {
            var
              $currentMenu = $subMenu || $menu,
              duration = ($subMenu)
                ? (settings.duration * 0.9)
                : settings.duration,
              start = ($subMenu)
                ? function() {}
                : function() {
                  if( module.can.click() ) {
                    module.unbind.intent();
                  }
                  module.remove.active();
                },
              transition = module.get.transition($subMenu)
            ;
            callback = $.isFunction(callback)
              ? callback
              : function(){}
            ;
            if( module.is.visible($currentMenu) || module.is.animating($currentMenu) ) {
              module.verbose('Doing menu hide animation', $currentMenu);

              if(transition == 'none') {
                start();
                $currentMenu.transition('hide');
                callback.call(element);
              }
              else if($.fn.transition !== undefined && $module.transition('is supported')) {
                $currentMenu
                  .transition({
                    animation  : transition + ' out',
                    duration   : settings.duration,
                    debug      : settings.debug,
                    verbose    : settings.verbose,
                    queue      : true,
                    onStart    : start,
                    onComplete : function() {
                      if(settings.direction == 'auto') {
                        module.remove.upward($subMenu);
                      }
                      callback.call(element);
                    }
                  })
                ;
              }
              else {
                module.error(error.transition);
              }
            }
          }
        },

        hideAndClear: function() {
          module.remove.searchTerm();
          if( module.has.maxSelections() ) {
            return;
          }
          if(module.has.search()) {
            module.hide(function() {
              module.remove.filteredItem();
            });
          }
          else {
            module.hide();
          }
        },

        delay: {
          show: function() {
            module.verbose('Delaying show event to ensure user intent');
            clearTimeout(module.timer);
            module.timer = setTimeout(module.show, settings.delay.show);
          },
          hide: function() {
            module.verbose('Delaying hide event to ensure user intent');
            clearTimeout(module.timer);
            module.timer = setTimeout(module.hide, settings.delay.hide);
          }
        },

        escape: {
          regExp: function(text) {
            text =  String(text);
            return text.replace(regExp.escape, '\\$&');
          }
        },

        setting: function(name, value) {
          module.debug('Changing setting', name, value);
          if( $.isPlainObject(name) ) {
            $.extend(true, settings, name);
          }
          else if(value !== undefined) {
            settings[name] = value;
          }
          else {
            return settings[name];
          }
        },
        internal: function(name, value) {
          if( $.isPlainObject(name) ) {
            $.extend(true, module, name);
          }
          else if(value !== undefined) {
            module[name] = value;
          }
          else {
            return module[name];
          }
        },
        debug: function() {
          if(settings.debug) {
            if(settings.performance) {
              module.performance.log(arguments);
            }
            else {
              module.debug = Function.prototype.bind.call(console.info, console, settings.name + ':');
              module.debug.apply(console, arguments);
            }
          }
        },
        verbose: function() {
          if(settings.verbose && settings.debug) {
            if(settings.performance) {
              module.performance.log(arguments);
            }
            else {
              module.verbose = Function.prototype.bind.call(console.info, console, settings.name + ':');
              module.verbose.apply(console, arguments);
            }
          }
        },
        error: function() {
          module.error = Function.prototype.bind.call(console.error, console, settings.name + ':');
          module.error.apply(console, arguments);
        },
        performance: {
          log: function(message) {
            var
              currentTime,
              executionTime,
              previousTime
            ;
            if(settings.performance) {
              currentTime   = new Date().getTime();
              previousTime  = time || currentTime;
              executionTime = currentTime - previousTime;
              time          = currentTime;
              performance.push({
                'Name'           : message[0],
                'Arguments'      : [].slice.call(message, 1) || '',
                'Element'        : element,
                'Execution Time' : executionTime
              });
            }
            clearTimeout(module.performance.timer);
            module.performance.timer = setTimeout(module.performance.display, 500);
          },
          display: function() {
            var
              title = settings.name + ':',
              totalTime = 0
            ;
            time = false;
            clearTimeout(module.performance.timer);
            $.each(performance, function(index, data) {
              totalTime += data['Execution Time'];
            });
            title += ' ' + totalTime + 'ms';
            if(moduleSelector) {
              title += ' \'' + moduleSelector + '\'';
            }
            if( (console.group !== undefined || console.table !== undefined) && performance.length > 0) {
              console.groupCollapsed(title);
              if(console.table) {
                console.table(performance);
              }
              else {
                $.each(performance, function(index, data) {
                  console.log(data['Name'] + ': ' + data['Execution Time']+'ms');
                });
              }
              console.groupEnd();
            }
            performance = [];
          }
        },
        invoke: function(query, passedArguments, context) {
          var
            object = instance,
            maxDepth,
            found,
            response
          ;
          passedArguments = passedArguments || queryArguments;
          context         = element         || context;
          if(typeof query == 'string' && object !== undefined) {
            query    = query.split(/[\. ]/);
            maxDepth = query.length - 1;
            $.each(query, function(depth, value) {
              var camelCaseValue = (depth != maxDepth)
                ? value + query[depth + 1].charAt(0).toUpperCase() + query[depth + 1].slice(1)
                : query
              ;
              if( $.isPlainObject( object[camelCaseValue] ) && (depth != maxDepth) ) {
                object = object[camelCaseValue];
              }
              else if( object[camelCaseValue] !== undefined ) {
                found = object[camelCaseValue];
                return false;
              }
              else if( $.isPlainObject( object[value] ) && (depth != maxDepth) ) {
                object = object[value];
              }
              else if( object[value] !== undefined ) {
                found = object[value];
                return false;
              }
              else {
                module.error(error.method, query);
                return false;
              }
            });
          }
          if ( $.isFunction( found ) ) {
            response = found.apply(context, passedArguments);
          }
          else if(found !== undefined) {
            response = found;
          }
          if($.isArray(returnedValue)) {
            returnedValue.push(response);
          }
          else if(returnedValue !== undefined) {
            returnedValue = [returnedValue, response];
          }
          else if(response !== undefined) {
            returnedValue = response;
          }
          return found;
        }
      };

      if(methodInvoked) {
        if(instance === undefined) {
          module.initialize();
        }
        module.invoke(query);
      }
      else {
        if(instance !== undefined) {
          instance.invoke('destroy');
        }
        module.initialize();
      }
    })
  ;
  return (returnedValue !== undefined)
    ? returnedValue
    : $allModules
  ;
};

$.fn.dropdown.settings = {

  debug                  : false,
  verbose                : false,
  performance            : true,

  on                     : 'click',    // what event should show menu action on item selection
  action                 : 'activate', // action on item selection (nothing, activate, select, combo, hide, function(){})


  apiSettings            : false,
  saveRemoteData         : true,      // Whether remote name/value pairs should be stored in sessionStorage to allow remote data to be restored on page refresh
  throttle               : 200,       // How long to wait after last user input to search remotely

  context                : window,      // Context to use when determining if on screen
  direction              : 'auto',     // Whether dropdown should always open in one direction
  keepOnScreen           : true,       // Whether dropdown should check whether it is on screen before showing

  match                  : 'both',     // what to match against with search selection (both, text, or label)
  fullTextSearch         : false,      // search anywhere in value

  placeholder            : 'auto',     // whether to convert blank <select> values to placeholder text
  preserveHTML           : true,       // preserve html when selecting value
  sortSelect             : false,      // sort selection on init

  forceSelection         : true,       // force a choice on blur with search selection
  allowAdditions         : false,      // whether multiple select should allow user added values

  maxSelections          : false,      // When set to a number limits the number of selections to this count
  useLabels              : true,       // whether multiple select should filter currently active selections from choices
  delimiter              : ',',        // when multiselect uses normal <input> the values will be delimited with this character

  showOnFocus            : true,       // show menu on focus
  allowTab               : true,       // add tabindex to element
  allowCategorySelection : false,      // allow elements with sub-menus to be selected

  fireOnInit             : false,      // Whether callbacks should fire when initializing dropdown values

  transition             : 'auto',     // auto transition will slide down or up based on direction
  duration               : 200,        // duration of transition

  glyphWidth             : 1.0714,     // widest glyph width in em (W is 1.0714 em) used to calculate multiselect input width

  // label settings on multi-select
  label: {
    transition : 'scale',
    duration   : 200,
    variation  : false
  },

  // delay before event
  delay : {
    hide   : 300,
    show   : 200,
    search : 20,
    touch  : 50
  },

  /* Callbacks */
  onChange      : function(value, text, $selected){},
  onAdd         : function(value, text, $selected){},
  onRemove      : function(value, text, $selected){},

  onLabelSelect : function($selectedLabels){},
  onLabelCreate : function(value, text) { return $(this); },
  onLabelRemove : function(value) { return true; },
  onNoResults   : function(searchTerm) { return true; },
  onShow        : function(){},
  onHide        : function(){},

  /* Component */
  name           : 'Dropdown',
  namespace      : 'dropdown',

  message: {
    addResult     : 'Add <b>{term}</b>',
    count         : '{count} selected',
    maxSelections : 'Max {maxCount} selections',
    noResults     : 'No results found.',
    serverError   : 'There was an error contacting the server'
  },

  error : {
    action          : 'You called a dropdown action that was not defined',
    alreadySetup    : 'Once a select has been initialized behaviors must be called on the created ui dropdown',
    labels          : 'Allowing user additions currently requires the use of labels.',
    missingMultiple : '<select> requires multiple property to be set to correctly preserve multiple values',
    method          : 'The method you called is not defined.',
    noAPI           : 'The API module is required to load resources remotely',
    noStorage       : 'Saving remote data requires session storage',
    noTransition    : 'This module requires ui transitions <https://github.com/Semantic-Org/UI-Transition>'
  },

  regExp : {
    escape   : /[-[\]{}()*+?.,\\^$|#\s]/g,
  },

  metadata : {
    defaultText     : 'defaultText',
    defaultValue    : 'defaultValue',
    placeholderText : 'placeholder',
    text            : 'text',
    value           : 'value'
  },

  // property names for remote query
  fields: {
    remoteValues : 'results', // grouping for api results
    values       : 'values', // grouping for all dropdown values
    name         : 'name',   // displayed dropdown text
    value        : 'value'   // actual dropdown value
  },

  keys : {
    backspace  : 8,
    delimiter  : 188, // comma
    deleteKey  : 46,
    enter      : 13,
    escape     : 27,
    pageUp     : 33,
    pageDown   : 34,
    leftArrow  : 37,
    upArrow    : 38,
    rightArrow : 39,
    downArrow  : 40
  },

  selector : {
    addition     : '.addition',
    dropdown     : '.ui.dropdown',
    icon         : '> .dropdown.icon',
    input        : '> input[type="hidden"], > select',
    item         : '.item',
    label        : '> .label',
    remove       : '> .label > .delete.icon',
    siblingLabel : '.label',
    menu         : '.menu',
    message      : '.message',
    menuIcon     : '.dropdown.icon',
    search       : 'input.search, .menu > .search > input',
    text         : '> .text:not(.icon)',
    unselectable : '.disabled, .filtered'
  },

  className : {
    active      : 'active',
    addition    : 'addition',
    animating   : 'animating',
    disabled    : 'disabled',
    dropdown    : 'ui dropdown',
    filtered    : 'filtered',
    hidden      : 'hidden transition',
    item        : 'item',
    label       : 'ui label',
    loading     : 'loading',
    menu        : 'menu',
    message     : 'message',
    multiple    : 'multiple',
    placeholder : 'default',
    search      : 'search',
    selected    : 'selected',
    selection   : 'selection',
    upward      : 'upward',
    visible     : 'visible'
  }

};

/* Templates */
$.fn.dropdown.settings.templates = {

  // generates dropdown from select values
  dropdown: function(select) {
    var
      placeholder = select.placeholder || false,
      values      = select.values || {},
      html        = ''
    ;
    html +=  '<i class="dropdown icon"></i>';
    if(select.placeholder) {
      html += '<div class="default text">' + placeholder + '</div>';
    }
    else {
      html += '<div class="text"></div>';
    }
    html += '<div class="menu">';
    $.each(select.values, function(index, option) {
      html += (option.disabled)
        ? '<div class="disabled item" data-value="' + option.value + '">' + option.name + '</div>'
        : '<div class="item" data-value="' + option.value + '">' + option.name + '</div>'
      ;
    });
    html += '</div>';
    return html;
  },

  // generates just menu from select
  menu: function(response, fields) {
    var
      values = response[fields.values] || {},
      html   = ''
    ;
    $.each(values, function(index, option) {
      html += '<div class="item" data-value="' + option[fields.value] + '">' + option[fields.name] + '</div>';
    });
    return html;
  },

  // generates label for multiselect
  label: function(value, text) {
    return text + '<i class="delete icon"></i>';
  },


  // generates messages like "No results"
  message: function(message) {
    return message;
  },

  // generates user addition to selection menu
  addition: function(choice) {
    return choice;
  }

};

})( jQuery, window, document );

/*!
 * # Semantic UI 2.1.6 - Video
 * http://github.com/semantic-org/semantic-ui/
 *
 *
 * Copyright 2015 Contributors
 * Released under the MIT license
 * http://opensource.org/licenses/MIT
 *
 */

;(function ($, window, document, undefined) {

"use strict";

$.fn.embed = function(parameters) {

  var
    $allModules     = $(this),

    moduleSelector  = $allModules.selector || '',

    time            = new Date().getTime(),
    performance     = [],

    query           = arguments[0],
    methodInvoked   = (typeof query == 'string'),
    queryArguments  = [].slice.call(arguments, 1),

    returnedValue
  ;

  $allModules
    .each(function() {
      var
        settings        = ( $.isPlainObject(parameters) )
          ? $.extend(true, {}, $.fn.embed.settings, parameters)
          : $.extend({}, $.fn.embed.settings),

        selector        = settings.selector,
        className       = settings.className,
        sources         = settings.sources,
        error           = settings.error,
        metadata        = settings.metadata,
        namespace       = settings.namespace,
        templates       = settings.templates,

        eventNamespace  = '.' + namespace,
        moduleNamespace = 'module-' + namespace,

        $window         = $(window),
        $module         = $(this),
        $placeholder    = $module.find(selector.placeholder),
        $icon           = $module.find(selector.icon),
        $embed          = $module.find(selector.embed),

        element         = this,
        instance        = $module.data(moduleNamespace),
        module
      ;

      module = {

        initialize: function() {
          module.debug('Initializing embed');
          module.determine.autoplay();
          module.create();
          module.bind.events();
          module.instantiate();
        },

        instantiate: function() {
          module.verbose('Storing instance of module', module);
          instance = module;
          $module
            .data(moduleNamespace, module)
          ;
        },

        destroy: function() {
          module.verbose('Destroying previous instance of embed');
          module.reset();
          $module
            .removeData(moduleNamespace)
            .off(eventNamespace)
          ;
        },

        refresh: function() {
          module.verbose('Refreshing selector cache');
          $placeholder = $module.find(selector.placeholder);
          $icon        = $module.find(selector.icon);
          $embed       = $module.find(selector.embed);
        },

        bind: {
          events: function() {
            if( module.has.placeholder() ) {
              module.debug('Adding placeholder events');
              $module
                .on('click' + eventNamespace, selector.placeholder, module.createAndShow)
                .on('click' + eventNamespace, selector.icon, module.createAndShow)
              ;
            }
          }
        },

        create: function() {
          var
            placeholder = module.get.placeholder()
          ;
          if(placeholder) {
            module.createPlaceholder();
          }
          else {
            module.createAndShow();
          }
        },

        createPlaceholder: function(placeholder) {
          var
            icon  = module.get.icon(),
            url   = module.get.url(),
            embed = module.generate.embed(url)
          ;
          placeholder = placeholder || module.get.placeholder();
          $module.html( templates.placeholder(placeholder, icon) );
          module.debug('Creating placeholder for embed', placeholder, icon);
        },

        createEmbed: function(url) {
          module.refresh();
          url = url || module.get.url();
          $embed = $('<div/>')
            .addClass(className.embed)
            .html( module.generate.embed(url) )
            .appendTo($module)
          ;
          settings.onCreate.call(element, url);
          module.debug('Creating embed object', $embed);
        },

        createAndShow: function() {
          module.createEmbed();
          module.show();
        },

        // sets new embed
        change: function(source, id, url) {
          module.debug('Changing video to ', source, id, url);
          $module
            .data(metadata.source, source)
            .data(metadata.id, id)
            .data(metadata.url, url)
          ;
          module.create();
        },

        // clears embed
        reset: function() {
          module.debug('Clearing embed and showing placeholder');
          module.remove.active();
          module.remove.embed();
          module.showPlaceholder();
          settings.onReset.call(element);
        },

        // shows current embed
        show: function() {
          module.debug('Showing embed');
          module.set.active();
          settings.onDisplay.call(element);
        },

        hide: function() {
          module.debug('Hiding embed');
          module.showPlaceholder();
        },

        showPlaceholder: function() {
          module.debug('Showing placeholder image');
          module.remove.active();
          settings.onPlaceholderDisplay.call(element);
        },

        get: {
          id: function() {
            return settings.id || $module.data(metadata.id);
          },
          placeholder: function() {
            return settings.placeholder || $module.data(metadata.placeholder);
          },
          icon: function() {
            return (settings.icon)
              ? settings.icon
              : ($module.data(metadata.icon) !== undefined)
                ? $module.data(metadata.icon)
                : module.determine.icon()
            ;
          },
          source: function(url) {
            return (settings.source)
              ? settings.source
              : ($module.data(metadata.source) !== undefined)
                ? $module.data(metadata.source)
                : module.determine.source()
            ;
          },
          type: function() {
            var source = module.get.source();
            return (sources[source] !== undefined)
              ? sources[source].type
              : false
            ;
          },
          url: function() {
            return (settings.url)
              ? settings.url
              : ($module.data(metadata.url) !== undefined)
                ? $module.data(metadata.url)
                : module.determine.url()
            ;
          }
        },

        determine: {
          autoplay: function() {
            if(module.should.autoplay()) {
              settings.autoplay = true;
            }
          },
          source: function(url) {
            var
              matchedSource = false
            ;
            url = url || module.get.url();
            if(url) {
              $.each(sources, function(name, source) {
                if(url.search(source.domain) !== -1) {
                  matchedSource = name;
                  return false;
                }
              });
            }
            return matchedSource;
          },
          icon: function() {
            var
              source = module.get.source()
            ;
            return (sources[source] !== undefined)
              ? sources[source].icon
              : false
            ;
          },
          url: function() {
            var
              id     = settings.id     || $module.data(metadata.id),
              source = settings.source || $module.data(metadata.source),
              url
            ;
            url = (sources[source] !== undefined)
              ? sources[source].url.replace('{id}', id)
              : false
            ;
            if(url) {
              $module.data(metadata.url, url);
            }
            return url;
          }
        },


        set: {
          active: function() {
            $module.addClass(className.active);
          }
        },

        remove: {
          active: function() {
            $module.removeClass(className.active);
          },
          embed: function() {
            $embed.empty();
          }
        },

        encode: {
          parameters: function(parameters) {
            var
              urlString = [],
              index
            ;
            for (index in parameters) {
              urlString.push( encodeURIComponent(index) + '=' + encodeURIComponent( parameters[index] ) );
            }
            return urlString.join('&amp;');
          }
        },

        generate: {
          embed: function(url) {
            module.debug('Generating embed html');
            var
              source = module.get.source(),
              html,
              parameters
            ;
            url = module.get.url(url);
            if(url) {
              parameters = module.generate.parameters(source);
              html       = templates.iframe(url, parameters);
            }
            else {
              module.error(error.noURL, $module);
            }
            return html;
          },
          parameters: function(source, extraParameters) {
            var
              parameters = (sources[source] && sources[source].parameters !== undefined)
                ? sources[source].parameters(settings)
                : {}
            ;
            extraParameters = extraParameters || settings.parameters;
            if(extraParameters) {
              parameters = $.extend({}, parameters, extraParameters);
            }
            parameters = settings.onEmbed(parameters);
            return module.encode.parameters(parameters);
          }
        },

        has: {
          placeholder: function() {
            return settings.placeholder || $module.data(metadata.placeholder);
          }
        },

        should: {
          autoplay: function() {
            return (settings.autoplay === 'auto')
              ? (settings.placeholder || $module.data(metadata.placeholder) !== undefined)
              : settings.autoplay
            ;
          }
        },

        is: {
          video: function() {
            return module.get.type() == 'video';
          }
        },

        setting: function(name, value) {
          module.debug('Changing setting', name, value);
          if( $.isPlainObject(name) ) {
            $.extend(true, settings, name);
          }
          else if(value !== undefined) {
            settings[name] = value;
          }
          else {
            return settings[name];
          }
        },
        internal: function(name, value) {
          if( $.isPlainObject(name) ) {
            $.extend(true, module, name);
          }
          else if(value !== undefined) {
            module[name] = value;
          }
          else {
            return module[name];
          }
        },
        debug: function() {
          if(settings.debug) {
            if(settings.performance) {
              module.performance.log(arguments);
            }
            else {
              module.debug = Function.prototype.bind.call(console.info, console, settings.name + ':');
              module.debug.apply(console, arguments);
            }
          }
        },
        verbose: function() {
          if(settings.verbose && settings.debug) {
            if(settings.performance) {
              module.performance.log(arguments);
            }
            else {
              module.verbose = Function.prototype.bind.call(console.info, console, settings.name + ':');
              module.verbose.apply(console, arguments);
            }
          }
        },
        error: function() {
          module.error = Function.prototype.bind.call(console.error, console, settings.name + ':');
          module.error.apply(console, arguments);
        },
        performance: {
          log: function(message) {
            var
              currentTime,
              executionTime,
              previousTime
            ;
            if(settings.performance) {
              currentTime   = new Date().getTime();
              previousTime  = time || currentTime;
              executionTime = currentTime - previousTime;
              time          = currentTime;
              performance.push({
                'Name'           : message[0],
                'Arguments'      : [].slice.call(message, 1) || '',
                'Element'        : element,
                'Execution Time' : executionTime
              });
            }
            clearTimeout(module.performance.timer);
            module.performance.timer = setTimeout(module.performance.display, 500);
          },
          display: function() {
            var
              title = settings.name + ':',
              totalTime = 0
            ;
            time = false;
            clearTimeout(module.performance.timer);
            $.each(performance, function(index, data) {
              totalTime += data['Execution Time'];
            });
            title += ' ' + totalTime + 'ms';
            if(moduleSelector) {
              title += ' \'' + moduleSelector + '\'';
            }
            if($allModules.length > 1) {
              title += ' ' + '(' + $allModules.length + ')';
            }
            if( (console.group !== undefined || console.table !== undefined) && performance.length > 0) {
              console.groupCollapsed(title);
              if(console.table) {
                console.table(performance);
              }
              else {
                $.each(performance, function(index, data) {
                  console.log(data['Name'] + ': ' + data['Execution Time']+'ms');
                });
              }
              console.groupEnd();
            }
            performance = [];
          }
        },
        invoke: function(query, passedArguments, context) {
          var
            object = instance,
            maxDepth,
            found,
            response
          ;
          passedArguments = passedArguments || queryArguments;
          context         = element         || context;
          if(typeof query == 'string' && object !== undefined) {
            query    = query.split(/[\. ]/);
            maxDepth = query.length - 1;
            $.each(query, function(depth, value) {
              var camelCaseValue = (depth != maxDepth)
                ? value + query[depth + 1].charAt(0).toUpperCase() + query[depth + 1].slice(1)
                : query
              ;
              if( $.isPlainObject( object[camelCaseValue] ) && (depth != maxDepth) ) {
                object = object[camelCaseValue];
              }
              else if( object[camelCaseValue] !== undefined ) {
                found = object[camelCaseValue];
                return false;
              }
              else if( $.isPlainObject( object[value] ) && (depth != maxDepth) ) {
                object = object[value];
              }
              else if( object[value] !== undefined ) {
                found = object[value];
                return false;
              }
              else {
                module.error(error.method, query);
                return false;
              }
            });
          }
          if ( $.isFunction( found ) ) {
            response = found.apply(context, passedArguments);
          }
          else if(found !== undefined) {
            response = found;
          }
          if($.isArray(returnedValue)) {
            returnedValue.push(response);
          }
          else if(returnedValue !== undefined) {
            returnedValue = [returnedValue, response];
          }
          else if(response !== undefined) {
            returnedValue = response;
          }
          return found;
        }
      };

      if(methodInvoked) {
        if(instance === undefined) {
          module.initialize();
        }
        module.invoke(query);
      }
      else {
        if(instance !== undefined) {
          instance.invoke('destroy');
        }
        module.initialize();
      }
    })
  ;
  return (returnedValue !== undefined)
    ? returnedValue
    : this
  ;
};

$.fn.embed.settings = {

  name        : 'Embed',
  namespace   : 'embed',

  debug       : false,
  verbose     : false,
  performance : true,

  icon     : false,
  source   : false,
  url      : false,
  id       : false,

  // standard video settings
  autoplay  : 'auto',
  color     : '#444444',
  hd        : true,
  brandedUI : false,

  // additional parameters to include with the embed
  parameters: false,

  onDisplay            : function() {},
  onPlaceholderDisplay : function() {},
  onReset              : function() {},
  onCreate             : function(url) {},
  onEmbed              : function(parameters) {
    return parameters;
  },

  metadata    : {
    id          : 'id',
    icon        : 'icon',
    placeholder : 'placeholder',
    source      : 'source',
    url         : 'url'
  },

  error : {
    noURL  : 'No URL specified',
    method : 'The method you called is not defined'
  },

  className : {
    active : 'active',
    embed  : 'embed'
  },

  selector : {
    embed       : '.embed',
    placeholder : '.placeholder',
    icon        : '.icon'
  },

  sources: {
    youtube: {
      name   : 'youtube',
      type   : 'video',
      icon   : 'video play',
      domain : 'youtube.com',
      url    : '//www.youtube.com/embed/{id}',
      parameters: function(settings) {
        return {
          autohide       : !settings.brandedUI,
          autoplay       : settings.autoplay,
          color          : settings.colors || undefined,
          hq             : settings.hd,
          jsapi          : settings.api,
          modestbranding : !settings.brandedUI
        };
      }
    },
    vimeo: {
      name   : 'vimeo',
      type   : 'video',
      icon   : 'video play',
      domain : 'vimeo.com',
      url    : '//player.vimeo.com/video/{id}',
      parameters: function(settings) {
        return {
          api      : settings.api,
          autoplay : settings.autoplay,
          byline   : settings.brandedUI,
          color    : settings.colors || undefined,
          portrait : settings.brandedUI,
          title    : settings.brandedUI
        };
      }
    }
  },

  templates: {
    iframe : function(url, parameters) {
      return ''
        + '<iframe src="' + url + '?' + parameters + '"'
        + ' width="100%" height="100%"'
        + ' frameborder="0" scrolling="no" webkitAllowFullScreen mozallowfullscreen allowFullScreen></iframe>'
      ;
    },
    placeholder : function(image, icon) {
      var
        html = ''
      ;
      if(icon) {
        html += '<i class="' + icon + ' icon"></i>';
      }
      if(image) {
        html += '<img class="placeholder" src="' + image + '">';
      }
      return html;
    }
  },

  // NOT YET IMPLEMENTED
  api     : true,
  onPause : function() {},
  onPlay  : function() {},
  onStop  : function() {}

};



})( jQuery, window, document );

/*!
 * # Semantic UI 2.1.6 - Modal
 * http://github.com/semantic-org/semantic-ui/
 *
 *
 * Copyright 2015 Contributors
 * Released under the MIT license
 * http://opensource.org/licenses/MIT
 *
 */

;(function ( $, window, document, undefined ) {

"use strict";

$.fn.modal = function(parameters) {
  var
    $allModules    = $(this),
    $window        = $(window),
    $document      = $(document),
    $body          = $('body'),

    moduleSelector = $allModules.selector || '',

    time           = new Date().getTime(),
    performance    = [],

    query          = arguments[0],
    methodInvoked  = (typeof query == 'string'),
    queryArguments = [].slice.call(arguments, 1),

    requestAnimationFrame = window.requestAnimationFrame
      || window.mozRequestAnimationFrame
      || window.webkitRequestAnimationFrame
      || window.msRequestAnimationFrame
      || function(callback) { setTimeout(callback, 0); },

    returnedValue
  ;

  $allModules
    .each(function() {
      var
        settings    = ( $.isPlainObject(parameters) )
          ? $.extend(true, {}, $.fn.modal.settings, parameters)
          : $.extend({}, $.fn.modal.settings),

        selector        = settings.selector,
        className       = settings.className,
        namespace       = settings.namespace,
        error           = settings.error,

        eventNamespace  = '.' + namespace,
        moduleNamespace = 'module-' + namespace,

        $module         = $(this),
        $context        = $(settings.context),
        $close          = $module.find(selector.close),

        $allModals,
        $otherModals,
        $focusedElement,
        $dimmable,
        $dimmer,

        element         = this,
        instance        = $module.data(moduleNamespace),

        elementNamespace,
        id,
        observer,
        module
      ;
      module  = {

        initialize: function() {
          module.verbose('Initializing dimmer', $context);

          module.create.id();
          module.create.dimmer();
          module.refreshModals();

          module.bind.events();
          if(settings.observeChanges) {
            module.observeChanges();
          }
          module.instantiate();
        },

        instantiate: function() {
          module.verbose('Storing instance of modal');
          instance = module;
          $module
            .data(moduleNamespace, instance)
          ;
        },

        create: {
          dimmer: function() {
            var
              defaultSettings = {
                debug      : settings.debug,
                dimmerName : 'modals',
                duration   : {
                  show     : settings.duration,
                  hide     : settings.duration
                }
              },
              dimmerSettings = $.extend(true, defaultSettings, settings.dimmerSettings)
            ;
            if(settings.inverted) {
              dimmerSettings.variation = (dimmerSettings.variation !== undefined)
                ? dimmerSettings.variation + ' inverted'
                : 'inverted'
              ;
            }
            if($.fn.dimmer === undefined) {
              module.error(error.dimmer);
              return;
            }
            module.debug('Creating dimmer with settings', dimmerSettings);
            $dimmable = $context.dimmer(dimmerSettings);
            if(settings.detachable) {
              module.verbose('Modal is detachable, moving content into dimmer');
              $dimmable.dimmer('add content', $module);
            }
            else {
              module.set.undetached();
            }
            if(settings.blurring) {
              $dimmable.addClass(className.blurring);
            }
            $dimmer = $dimmable.dimmer('get dimmer');
          },
          id: function() {
            id = (Math.random().toString(16) + '000000000').substr(2,8);
            elementNamespace = '.' + id;
            module.verbose('Creating unique id for element', id);
          }
        },

        destroy: function() {
          module.verbose('Destroying previous modal');
          $module
            .removeData(moduleNamespace)
            .off(eventNamespace)
          ;
          $window.off(elementNamespace);
          $close.off(eventNamespace);
          $context.dimmer('destroy');
        },

        observeChanges: function() {
          if('MutationObserver' in window) {
            observer = new MutationObserver(function(mutations) {
              module.debug('DOM tree modified, refreshing');
              module.refresh();
            });
            observer.observe(element, {
              childList : true,
              subtree   : true
            });
            module.debug('Setting up mutation observer', observer);
          }
        },

        refresh: function() {
          module.remove.scrolling();
          module.cacheSizes();
          module.set.screenHeight();
          module.set.type();
          module.set.position();
        },

        refreshModals: function() {
          $otherModals = $module.siblings(selector.modal);
          $allModals   = $otherModals.add($module);
        },

        attachEvents: function(selector, event) {
          var
            $toggle = $(selector)
          ;
          event = $.isFunction(module[event])
            ? module[event]
            : module.toggle
          ;
          if($toggle.length > 0) {
            module.debug('Attaching modal events to element', selector, event);
            $toggle
              .off(eventNamespace)
              .on('click' + eventNamespace, event)
            ;
          }
          else {
            module.error(error.notFound, selector);
          }
        },

        bind: {
          events: function() {
            module.verbose('Attaching events');
            $module
              .on('click' + eventNamespace, selector.close, module.event.close)
              .on('click' + eventNamespace, selector.approve, module.event.approve)
              .on('click' + eventNamespace, selector.deny, module.event.deny)
            ;
            $window
              .on('resize' + elementNamespace, module.event.resize)
            ;
          }
        },

        get: {
          id: function() {
            return (Math.random().toString(16) + '000000000').substr(2,8);
          }
        },

        event: {
          approve: function() {
            if(settings.onApprove.call(element, $(this)) === false) {
              module.verbose('Approve callback returned false cancelling hide');
              return;
            }
            module.hide();
          },
          deny: function() {
            if(settings.onDeny.call(element, $(this)) === false) {
              module.verbose('Deny callback returned false cancelling hide');
              return;
            }
            module.hide();
          },
          close: function() {
            module.hide();
          },
          click: function(event) {
            var
              $target   = $(event.target),
              isInModal = ($target.closest(selector.modal).length > 0),
              isInDOM   = $.contains(document.documentElement, event.target)
            ;
            if(!isInModal && isInDOM) {
              module.debug('Dimmer clicked, hiding all modals');
              if( module.is.active() ) {
                module.remove.clickaway();
                if(settings.allowMultiple) {
                  module.hide();
                }
                else {
                  module.hideAll();
                }
              }
            }
          },
          debounce: function(method, delay) {
            clearTimeout(module.timer);
            module.timer = setTimeout(method, delay);
          },
          keyboard: function(event) {
            var
              keyCode   = event.which,
              escapeKey = 27
            ;
            if(keyCode == escapeKey) {
              if(settings.closable) {
                module.debug('Escape key pressed hiding modal');
                module.hide();
              }
              else {
                module.debug('Escape key pressed, but closable is set to false');
              }
              event.preventDefault();
            }
          },
          resize: function() {
            if( $dimmable.dimmer('is active') ) {
              requestAnimationFrame(module.refresh);
            }
          }
        },

        toggle: function() {
          if( module.is.active() || module.is.animating() ) {
            module.hide();
          }
          else {
            module.show();
          }
        },

        show: function(callback) {
          callback = $.isFunction(callback)
            ? callback
            : function(){}
          ;
          module.refreshModals();
          module.showModal(callback);
        },

        hide: function(callback) {
          callback = $.isFunction(callback)
            ? callback
            : function(){}
          ;
          module.refreshModals();
          module.hideModal(callback);
        },

        showModal: function(callback) {
          callback = $.isFunction(callback)
            ? callback
            : function(){}
          ;
          if( module.is.animating() || !module.is.active() ) {

            module.showDimmer();
            module.cacheSizes();
            module.set.position();
            module.set.screenHeight();
            module.set.type();
            module.set.clickaway();

            if( !settings.allowMultiple && module.others.active() ) {
              module.hideOthers(module.showModal);
            }
            else {
              settings.onShow.call(element);
              if(settings.transition && $.fn.transition !== undefined && $module.transition('is supported')) {
                module.debug('Showing modal with css animations');
                $module
                  .transition({
                    debug       : settings.debug,
                    animation   : settings.transition + ' in',
                    queue       : settings.queue,
                    duration    : settings.duration,
                    useFailSafe : true,
                    onComplete : function() {
                      settings.onVisible.apply(element);
                      module.add.keyboardShortcuts();
                      module.save.focus();
                      module.set.active();
                      if(settings.autofocus) {
                        module.set.autofocus();
                      }
                      callback();
                    }
                  })
                ;
              }
              else {
                module.error(error.noTransition);
              }
            }
          }
          else {
            module.debug('Modal is already visible');
          }
        },

        hideModal: function(callback, keepDimmed) {
          callback = $.isFunction(callback)
            ? callback
            : function(){}
          ;
          module.debug('Hiding modal');
          if(settings.onHide.call(element, $(this)) === false) {
            module.verbose('Hide callback returned false cancelling hide');
            return;
          }

          if( module.is.animating() || module.is.active() ) {
            if(settings.transition && $.fn.transition !== undefined && $module.transition('is supported')) {
              module.remove.active();
              $module
                .transition({
                  debug       : settings.debug,
                  animation   : settings.transition + ' out',
                  queue       : settings.queue,
                  duration    : settings.duration,
                  useFailSafe : true,
                  onStart     : function() {
                    if(!module.others.active() && !keepDimmed) {
                      module.hideDimmer();
                    }
                    module.remove.keyboardShortcuts();
                  },
                  onComplete : function() {
                    settings.onHidden.call(element);
                    module.restore.focus();
                    callback();
                  }
                })
              ;
            }
            else {
              module.error(error.noTransition);
            }
          }
        },

        showDimmer: function() {
          if($dimmable.dimmer('is animating') || !$dimmable.dimmer('is active') ) {
            module.debug('Showing dimmer');
            $dimmable.dimmer('show');
          }
          else {
            module.debug('Dimmer already visible');
          }
        },

        hideDimmer: function() {
          if( $dimmable.dimmer('is animating') || ($dimmable.dimmer('is active')) ) {
            $dimmable.dimmer('hide', function() {
              module.remove.clickaway();
              module.remove.screenHeight();
            });
          }
          else {
            module.debug('Dimmer is not visible cannot hide');
            return;
          }
        },

        hideAll: function(callback) {
          var
            $visibleModals = $allModals.filter('.' + className.active + ', .' + className.animating)
          ;
          callback = $.isFunction(callback)
            ? callback
            : function(){}
          ;
          if( $visibleModals.length > 0 ) {
            module.debug('Hiding all visible modals');
            module.hideDimmer();
            $visibleModals
              .modal('hide modal', callback)
            ;
          }
        },

        hideOthers: function(callback) {
          var
            $visibleModals = $otherModals.filter('.' + className.active + ', .' + className.animating)
          ;
          callback = $.isFunction(callback)
            ? callback
            : function(){}
          ;
          if( $visibleModals.length > 0 ) {
            module.debug('Hiding other modals', $otherModals);
            $visibleModals
              .modal('hide modal', callback, true)
            ;
          }
        },

        others: {
          active: function() {
            return ($otherModals.filter('.' + className.active).length > 0);
          },
          animating: function() {
            return ($otherModals.filter('.' + className.animating).length > 0);
          }
        },


        add: {
          keyboardShortcuts: function() {
            module.verbose('Adding keyboard shortcuts');
            $document
              .on('keyup' + eventNamespace, module.event.keyboard)
            ;
          }
        },

        save: {
          focus: function() {
            $focusedElement = $(document.activeElement).blur();
          }
        },

        restore: {
          focus: function() {
            if($focusedElement && $focusedElement.length > 0) {
              $focusedElement.focus();
            }
          }
        },

        remove: {
          active: function() {
            $module.removeClass(className.active);
          },
          clickaway: function() {
            if(settings.closable) {
              $dimmer
                .off('click' + elementNamespace)
              ;
            }
          },
          bodyStyle: function() {
            if($body.attr('style') === '') {
              module.verbose('Removing style attribute');
              $body.removeAttr('style');
            }
          },
          screenHeight: function() {
            module.debug('Removing page height');
            $body
              .css('height', '')
            ;
          },
          keyboardShortcuts: function() {
            module.verbose('Removing keyboard shortcuts');
            $document
              .off('keyup' + eventNamespace)
            ;
          },
          scrolling: function() {
            $dimmable.removeClass(className.scrolling);
            $module.removeClass(className.scrolling);
          }
        },

        cacheSizes: function() {
          var
            modalHeight = $module.outerHeight()
          ;
          if(module.cache === undefined || modalHeight !== 0) {
            module.cache = {
              pageHeight    : $(document).outerHeight(),
              height        : modalHeight + settings.offset,
              contextHeight : (settings.context == 'body')
                ? $(window).height()
                : $dimmable.height()
            };
          }
          module.debug('Caching modal and container sizes', module.cache);
        },

        can: {
          fit: function() {
            return ( ( module.cache.height + (settings.padding * 2) ) < module.cache.contextHeight);
          }
        },

        is: {
          active: function() {
            return $module.hasClass(className.active);
          },
          animating: function() {
            return $module.transition('is supported')
              ? $module.transition('is animating')
              : $module.is(':visible')
            ;
          },
          scrolling: function() {
            return $dimmable.hasClass(className.scrolling);
          },
          modernBrowser: function() {
            // appName for IE11 reports 'Netscape' can no longer use
            return !(window.ActiveXObject || "ActiveXObject" in window);
          }
        },

        set: {
          autofocus: function() {
            var
              $inputs    = $module.find(':input').filter(':visible'),
              $autofocus = $inputs.filter('[autofocus]'),
              $input     = ($autofocus.length > 0)
                ? $autofocus.first()
                : $inputs.first()
            ;
            if($input.length > 0) {
              $input.focus();
            }
          },
          clickaway: function() {
            if(settings.closable) {
              $dimmer
                .on('click' + elementNamespace, module.event.click)
              ;
            }
          },
          screenHeight: function() {
            if( module.can.fit() ) {
              $body.css('height', '');
            }
            else {
              module.debug('Modal is taller than page content, resizing page height');
              $body
                .css('height', module.cache.height + (settings.padding * 2) )
              ;
            }
          },
          active: function() {
            $module.addClass(className.active);
          },
          scrolling: function() {
            $dimmable.addClass(className.scrolling);
            $module.addClass(className.scrolling);
          },
          type: function() {
            if(module.can.fit()) {
              module.verbose('Modal fits on screen');
              if(!module.others.active() && !module.others.animating()) {
                module.remove.scrolling();
              }
            }
            else {
              module.verbose('Modal cannot fit on screen setting to scrolling');
              module.set.scrolling();
            }
          },
          position: function() {
            module.verbose('Centering modal on page', module.cache);
            if(module.can.fit()) {
              $module
                .css({
                  top: '',
                  marginTop: -(module.cache.height / 2)
                })
              ;
            }
            else {
              $module
                .css({
                  marginTop : '',
                  top       : $document.scrollTop()
                })
              ;
            }
          },
          undetached: function() {
            $dimmable.addClass(className.undetached);
          }
        },

        setting: function(name, value) {
          module.debug('Changing setting', name, value);
          if( $.isPlainObject(name) ) {
            $.extend(true, settings, name);
          }
          else if(value !== undefined) {
            settings[name] = value;
          }
          else {
            return settings[name];
          }
        },
        internal: function(name, value) {
          if( $.isPlainObject(name) ) {
            $.extend(true, module, name);
          }
          else if(value !== undefined) {
            module[name] = value;
          }
          else {
            return module[name];
          }
        },
        debug: function() {
          if(settings.debug) {
            if(settings.performance) {
              module.performance.log(arguments);
            }
            else {
              module.debug = Function.prototype.bind.call(console.info, console, settings.name + ':');
              module.debug.apply(console, arguments);
            }
          }
        },
        verbose: function() {
          if(settings.verbose && settings.debug) {
            if(settings.performance) {
              module.performance.log(arguments);
            }
            else {
              module.verbose = Function.prototype.bind.call(console.info, console, settings.name + ':');
              module.verbose.apply(console, arguments);
            }
          }
        },
        error: function() {
          module.error = Function.prototype.bind.call(console.error, console, settings.name + ':');
          module.error.apply(console, arguments);
        },
        performance: {
          log: function(message) {
            var
              currentTime,
              executionTime,
              previousTime
            ;
            if(settings.performance) {
              currentTime   = new Date().getTime();
              previousTime  = time || currentTime;
              executionTime = currentTime - previousTime;
              time          = currentTime;
              performance.push({
                'Name'           : message[0],
                'Arguments'      : [].slice.call(message, 1) || '',
                'Element'        : element,
                'Execution Time' : executionTime
              });
            }
            clearTimeout(module.performance.timer);
            module.performance.timer = setTimeout(module.performance.display, 500);
          },
          display: function() {
            var
              title = settings.name + ':',
              totalTime = 0
            ;
            time = false;
            clearTimeout(module.performance.timer);
            $.each(performance, function(index, data) {
              totalTime += data['Execution Time'];
            });
            title += ' ' + totalTime + 'ms';
            if(moduleSelector) {
              title += ' \'' + moduleSelector + '\'';
            }
            if( (console.group !== undefined || console.table !== undefined) && performance.length > 0) {
              console.groupCollapsed(title);
              if(console.table) {
                console.table(performance);
              }
              else {
                $.each(performance, function(index, data) {
                  console.log(data['Name'] + ': ' + data['Execution Time']+'ms');
                });
              }
              console.groupEnd();
            }
            performance = [];
          }
        },
        invoke: function(query, passedArguments, context) {
          var
            object = instance,
            maxDepth,
            found,
            response
          ;
          passedArguments = passedArguments || queryArguments;
          context         = element         || context;
          if(typeof query == 'string' && object !== undefined) {
            query    = query.split(/[\. ]/);
            maxDepth = query.length - 1;
            $.each(query, function(depth, value) {
              var camelCaseValue = (depth != maxDepth)
                ? value + query[depth + 1].charAt(0).toUpperCase() + query[depth + 1].slice(1)
                : query
              ;
              if( $.isPlainObject( object[camelCaseValue] ) && (depth != maxDepth) ) {
                object = object[camelCaseValue];
              }
              else if( object[camelCaseValue] !== undefined ) {
                found = object[camelCaseValue];
                return false;
              }
              else if( $.isPlainObject( object[value] ) && (depth != maxDepth) ) {
                object = object[value];
              }
              else if( object[value] !== undefined ) {
                found = object[value];
                return false;
              }
              else {
                return false;
              }
            });
          }
          if ( $.isFunction( found ) ) {
            response = found.apply(context, passedArguments);
          }
          else if(found !== undefined) {
            response = found;
          }
          if($.isArray(returnedValue)) {
            returnedValue.push(response);
          }
          else if(returnedValue !== undefined) {
            returnedValue = [returnedValue, response];
          }
          else if(response !== undefined) {
            returnedValue = response;
          }
          return found;
        }
      };

      if(methodInvoked) {
        if(instance === undefined) {
          module.initialize();
        }
        module.invoke(query);
      }
      else {
        if(instance !== undefined) {
          instance.invoke('destroy');
        }
        module.initialize();
      }
    })
  ;

  return (returnedValue !== undefined)
    ? returnedValue
    : this
  ;
};

$.fn.modal.settings = {

  name           : 'Modal',
  namespace      : 'modal',

  debug          : false,
  verbose        : false,
  performance    : true,

  observeChanges : false,

  allowMultiple  : false,
  detachable     : true,
  closable       : true,
  autofocus      : true,

  inverted       : false,
  blurring       : false,

  dimmerSettings : {
    closable : false,
    useCSS   : true
  },


  context    : 'body',

  queue      : false,
  duration   : 500,
  offset     : 0,
  transition : 'scale',

  // padding with edge of page
  padding    : 50,

  // called before show animation
  onShow     : function(){},

  // called after show animation
  onVisible  : function(){},

  // called before hide animation
  onHide     : function(){ return true; },

  // called after hide animation
  onHidden   : function(){},

  // called after approve selector match
  onApprove  : function(){ return true; },

  // called after deny selector match
  onDeny     : function(){ return true; },

  selector    : {
    close    : '> .close',
    approve  : '.actions .positive, .actions .approve, .actions .ok',
    deny     : '.actions .negative, .actions .deny, .actions .cancel',
    modal    : '.ui.modal'
  },
  error : {
    dimmer    : 'UI Dimmer, a required component is not included in this page',
    method    : 'The method you called is not defined.',
    notFound  : 'The element you specified could not be found'
  },
  className : {
    active     : 'active',
    animating  : 'animating',
    blurring   : 'blurring',
    scrolling  : 'scrolling',
    undetached : 'undetached'
  }
};


})( jQuery, window, document );

/*!
 * # Semantic UI 2.1.6 - Nag
 * http://github.com/semantic-org/semantic-ui/
 *
 *
 * Copyright 2015 Contributors
 * Released under the MIT license
 * http://opensource.org/licenses/MIT
 *
 */

;(function ($, window, document, undefined) {

"use strict";

$.fn.nag = function(parameters) {
  var
    $allModules    = $(this),
    moduleSelector = $allModules.selector || '',

    time           = new Date().getTime(),
    performance    = [],

    query          = arguments[0],
    methodInvoked  = (typeof query == 'string'),
    queryArguments = [].slice.call(arguments, 1),
    returnedValue
  ;
  $allModules
    .each(function() {
      var
        settings          = ( $.isPlainObject(parameters) )
          ? $.extend(true, {}, $.fn.nag.settings, parameters)
          : $.extend({}, $.fn.nag.settings),

        className       = settings.className,
        selector        = settings.selector,
        error           = settings.error,
        namespace       = settings.namespace,

        eventNamespace  = '.' + namespace,
        moduleNamespace = namespace + '-module',

        $module         = $(this),

        $close          = $module.find(selector.close),
        $context        = (settings.context)
          ? $(settings.context)
          : $('body'),

        element         = this,
        instance        = $module.data(moduleNamespace),

        moduleOffset,
        moduleHeight,

        contextWidth,
        contextHeight,
        contextOffset,

        yOffset,
        yPosition,

        timer,
        module,

        requestAnimationFrame = window.requestAnimationFrame
          || window.mozRequestAnimationFrame
          || window.webkitRequestAnimationFrame
          || window.msRequestAnimationFrame
          || function(callback) { setTimeout(callback, 0); }
      ;
      module = {

        initialize: function() {
          module.verbose('Initializing element');

          $module
            .on('click' + eventNamespace, selector.close, module.dismiss)
            .data(moduleNamespace, module)
          ;

          if(settings.detachable && $module.parent()[0] !== $context[0]) {
            $module
              .detach()
              .prependTo($context)
            ;
          }

          if(settings.displayTime > 0) {
            setTimeout(module.hide, settings.displayTime);
          }
          module.show();
        },

        destroy: function() {
          module.verbose('Destroying instance');
          $module
            .removeData(moduleNamespace)
            .off(eventNamespace)
          ;
        },

        show: function() {
          if( module.should.show() && !$module.is(':visible') ) {
            module.debug('Showing nag', settings.animation.show);
            if(settings.animation.show == 'fade') {
              $module
                .fadeIn(settings.duration, settings.easing)
              ;
            }
            else {
              $module
                .slideDown(settings.duration, settings.easing)
              ;
            }
          }
        },

        hide: function() {
          module.debug('Showing nag', settings.animation.hide);
          if(settings.animation.show == 'fade') {
            $module
              .fadeIn(settings.duration, settings.easing)
            ;
          }
          else {
            $module
              .slideUp(settings.duration, settings.easing)
            ;
          }
        },

        onHide: function() {
          module.debug('Removing nag', settings.animation.hide);
          $module.remove();
          if (settings.onHide) {
            settings.onHide();
          }
        },

        dismiss: function(event) {
          if(settings.storageMethod) {
            module.storage.set(settings.key, settings.value);
          }
          module.hide();
          event.stopImmediatePropagation();
          event.preventDefault();
        },

        should: {
          show: function() {
            if(settings.persist) {
              module.debug('Persistent nag is set, can show nag');
              return true;
            }
            if( module.storage.get(settings.key) != settings.value.toString() ) {
              module.debug('Stored value is not set, can show nag', module.storage.get(settings.key));
              return true;
            }
            module.debug('Stored value is set, cannot show nag', module.storage.get(settings.key));
            return false;
          }
        },

        get: {
          storageOptions: function() {
            var
              options = {}
            ;
            if(settings.expires) {
              options.expires = settings.expires;
            }
            if(settings.domain) {
              options.domain = settings.domain;
            }
            if(settings.path) {
              options.path = settings.path;
            }
            return options;
          }
        },

        clear: function() {
          module.storage.remove(settings.key);
        },

        storage: {
          set: function(key, value) {
            var
              options = module.get.storageOptions()
            ;
            if(settings.storageMethod == 'localstorage' && window.localStorage !== undefined) {
              window.localStorage.setItem(key, value);
              module.debug('Value stored using local storage', key, value);
            }
            else if(settings.storageMethod == 'sessionstorage' && window.sessionStorage !== undefined) {
              window.sessionStorage.setItem(key, value);
              module.debug('Value stored using session storage', key, value);
            }
            else if($.cookie !== undefined) {
              $.cookie(key, value, options);
              module.debug('Value stored using cookie', key, value, options);
            }
            else {
              module.error(error.noCookieStorage);
              return;
            }
          },
          get: function(key, value) {
            var
              storedValue
            ;
            if(settings.storageMethod == 'localstorage' && window.localStorage !== undefined) {
              storedValue = window.localStorage.getItem(key);
            }
            else if(settings.storageMethod == 'sessionstorage' && window.sessionStorage !== undefined) {
              storedValue = window.sessionStorage.getItem(key);
            }
            // get by cookie
            else if($.cookie !== undefined) {
              storedValue = $.cookie(key);
            }
            else {
              module.error(error.noCookieStorage);
            }
            if(storedValue == 'undefined' || storedValue == 'null' || storedValue === undefined || storedValue === null) {
              storedValue = undefined;
            }
            return storedValue;
          },
          remove: function(key) {
            var
              options = module.get.storageOptions()
            ;
            if(settings.storageMethod == 'localstorage' && window.localStorage !== undefined) {
              window.localStorage.removeItem(key);
            }
            else if(settings.storageMethod == 'sessionstorage' && window.sessionStorage !== undefined) {
              window.sessionStorage.removeItem(key);
            }
            // store by cookie
            else if($.cookie !== undefined) {
              $.removeCookie(key, options);
            }
            else {
              module.error(error.noStorage);
            }
          }
        },

        setting: function(name, value) {
          module.debug('Changing setting', name, value);
          if( $.isPlainObject(name) ) {
            $.extend(true, settings, name);
          }
          else if(value !== undefined) {
            settings[name] = value;
          }
          else {
            return settings[name];
          }
        },
        internal: function(name, value) {
          if( $.isPlainObject(name) ) {
            $.extend(true, module, name);
          }
          else if(value !== undefined) {
            module[name] = value;
          }
          else {
            return module[name];
          }
        },
        debug: function() {
          if(settings.debug) {
            if(settings.performance) {
              module.performance.log(arguments);
            }
            else {
              module.debug = Function.prototype.bind.call(console.info, console, settings.name + ':');
              module.debug.apply(console, arguments);
            }
          }
        },
        verbose: function() {
          if(settings.verbose && settings.debug) {
            if(settings.performance) {
              module.performance.log(arguments);
            }
            else {
              module.verbose = Function.prototype.bind.call(console.info, console, settings.name + ':');
              module.verbose.apply(console, arguments);
            }
          }
        },
        error: function() {
          module.error = Function.prototype.bind.call(console.error, console, settings.name + ':');
          module.error.apply(console, arguments);
        },
        performance: {
          log: function(message) {
            var
              currentTime,
              executionTime,
              previousTime
            ;
            if(settings.performance) {
              currentTime   = new Date().getTime();
              previousTime  = time || currentTime;
              executionTime = currentTime - previousTime;
              time          = currentTime;
              performance.push({
                'Name'           : message[0],
                'Arguments'      : [].slice.call(message, 1) || '',
                'Element'        : element,
                'Execution Time' : executionTime
              });
            }
            clearTimeout(module.performance.timer);
            module.performance.timer = setTimeout(module.performance.display, 500);
          },
          display: function() {
            var
              title = settings.name + ':',
              totalTime = 0
            ;
            time = false;
            clearTimeout(module.performance.timer);
            $.each(performance, function(index, data) {
              totalTime += data['Execution Time'];
            });
            title += ' ' + totalTime + 'ms';
            if(moduleSelector) {
              title += ' \'' + moduleSelector + '\'';
            }
            if( (console.group !== undefined || console.table !== undefined) && performance.length > 0) {
              console.groupCollapsed(title);
              if(console.table) {
                console.table(performance);
              }
              else {
                $.each(performance, function(index, data) {
                  console.log(data['Name'] + ': ' + data['Execution Time']+'ms');
                });
              }
              console.groupEnd();
            }
            performance = [];
          }
        },
        invoke: function(query, passedArguments, context) {
          var
            object = instance,
            maxDepth,
            found,
            response
          ;
          passedArguments = passedArguments || queryArguments;
          context         = element         || context;
          if(typeof query == 'string' && object !== undefined) {
            query    = query.split(/[\. ]/);
            maxDepth = query.length - 1;
            $.each(query, function(depth, value) {
              var camelCaseValue = (depth != maxDepth)
                ? value + query[depth + 1].charAt(0).toUpperCase() + query[depth + 1].slice(1)
                : query
              ;
              if( $.isPlainObject( object[camelCaseValue] ) && (depth != maxDepth) ) {
                object = object[camelCaseValue];
              }
              else if( object[camelCaseValue] !== undefined ) {
                found = object[camelCaseValue];
                return false;
              }
              else if( $.isPlainObject( object[value] ) && (depth != maxDepth) ) {
                object = object[value];
              }
              else if( object[value] !== undefined ) {
                found = object[value];
                return false;
              }
              else {
                module.error(error.method, query);
                return false;
              }
            });
          }
          if ( $.isFunction( found ) ) {
            response = found.apply(context, passedArguments);
          }
          else if(found !== undefined) {
            response = found;
          }
          if($.isArray(returnedValue)) {
            returnedValue.push(response);
          }
          else if(returnedValue !== undefined) {
            returnedValue = [returnedValue, response];
          }
          else if(response !== undefined) {
            returnedValue = response;
          }
          return found;
        }
      };

      if(methodInvoked) {
        if(instance === undefined) {
          module.initialize();
        }
        module.invoke(query);
      }
      else {
        if(instance !== undefined) {
          instance.invoke('destroy');
        }
        module.initialize();
      }
    })
  ;

  return (returnedValue !== undefined)
    ? returnedValue
    : this
  ;
};

$.fn.nag.settings = {

  name        : 'Nag',

  debug       : false,
  verbose     : false,
  performance : true,

  namespace   : 'Nag',

  // allows cookie to be overriden
  persist     : false,

  // set to zero to require manually dismissal, otherwise hides on its own
  displayTime : 0,

  animation   : {
    show : 'slide',
    hide : 'slide'
  },

  context       : false,
  detachable    : false,

  expires       : 30,
  domain        : false,
  path          : '/',

  // type of storage to use
  storageMethod : 'cookie',

  // value to store in dismissed localstorage/cookie
  key           : 'nag',
  value         : 'dismiss',

  error: {
    noCookieStorage : '$.cookie is not included. A storage solution is required.',
    noStorage       : 'Neither $.cookie or store is defined. A storage solution is required for storing state',
    method          : 'The method you called is not defined.'
  },

  className     : {
    bottom : 'bottom',
    fixed  : 'fixed'
  },

  selector      : {
    close : '.close.icon'
  },

  speed         : 500,
  easing        : 'easeOutQuad',

  onHide: function() {}

};

})( jQuery, window, document );

/*!
 * # Semantic UI 2.1.6 - Popup
 * http://github.com/semantic-org/semantic-ui/
 *
 *
 * Copyright 2015 Contributors
 * Released under the MIT license
 * http://opensource.org/licenses/MIT
 *
 */

;(function ($, window, document, undefined) {

"use strict";

$.fn.popup = function(parameters) {
  var
    $allModules    = $(this),
    $document      = $(document),
    $window        = $(window),
    $body          = $('body'),

    moduleSelector = $allModules.selector || '',

    hasTouch       = (true),
    time           = new Date().getTime(),
    performance    = [],

    query          = arguments[0],
    methodInvoked  = (typeof query == 'string'),
    queryArguments = [].slice.call(arguments, 1),

    returnedValue
  ;
  $allModules
    .each(function() {
      var
        settings        = ( $.isPlainObject(parameters) )
          ? $.extend(true, {}, $.fn.popup.settings, parameters)
          : $.extend({}, $.fn.popup.settings),

        selector           = settings.selector,
        className          = settings.className,
        error              = settings.error,
        metadata           = settings.metadata,
        namespace          = settings.namespace,

        eventNamespace     = '.' + settings.namespace,
        moduleNamespace    = 'module-' + namespace,

        $module            = $(this),
        $context           = $(settings.context),
        $target            = (settings.target)
          ? $(settings.target)
          : $module,

        $popup,
        $offsetParent,

        searchDepth        = 0,
        triedPositions     = false,
        openedWithTouch    = false,

        element            = this,
        instance           = $module.data(moduleNamespace),

        elementNamespace,
        id,
        module
      ;

      module = {

        // binds events
        initialize: function() {
          module.debug('Initializing', $module);
          module.createID();
          module.bind.events();
          if( !module.exists() && settings.preserve) {
            module.create();
          }
          module.instantiate();
        },

        instantiate: function() {
          module.verbose('Storing instance', module);
          instance = module;
          $module
            .data(moduleNamespace, instance)
          ;
        },

        refresh: function() {
          if(settings.popup) {
            $popup = $(settings.popup).eq(0);
          }
          else {
            if(settings.inline) {
              $popup = $target.nextAll(selector.popup).eq(0);
              settings.popup = $popup;
            }
          }
          if(settings.popup) {
            $popup.addClass(className.loading);
            $offsetParent = module.get.offsetParent();
            $popup.removeClass(className.loading);
            if(settings.movePopup && module.has.popup() && module.get.offsetParent($popup)[0] !== $offsetParent[0]) {
              module.debug('Moving popup to the same offset parent as activating element');
              $popup
                .detach()
                .appendTo($offsetParent)
              ;
            }
          }
          else {
            $offsetParent = (settings.inline)
              ? module.get.offsetParent($target)
              : module.has.popup()
                ? module.get.offsetParent($popup)
                : $body
            ;
          }
          if( $offsetParent.is('html') && $offsetParent[0] !== $body[0] ) {
            module.debug('Setting page as offset parent');
            $offsetParent = $body;
          }
          if( module.get.variation() ) {
            module.set.variation();
          }
        },

        reposition: function() {
          module.refresh();
          module.set.position();
        },

        destroy: function() {
          module.debug('Destroying previous module');
          // remove element only if was created dynamically
          if($popup && !settings.preserve) {
            module.removePopup();
          }
          // clear all timeouts
          clearTimeout(module.hideTimer);
          clearTimeout(module.showTimer);
          // remove events
          $window.off(elementNamespace);
          $module
            .off(eventNamespace)
            .removeData(moduleNamespace)
          ;
        },

        event: {
          start:  function(event) {
            var
              delay = ($.isPlainObject(settings.delay))
                ? settings.delay.show
                : settings.delay
            ;
            clearTimeout(module.hideTimer);
            if(!openedWithTouch) {
              module.showTimer = setTimeout(module.show, delay);
            }
          },
          end:  function() {
            var
              delay = ($.isPlainObject(settings.delay))
                ? settings.delay.hide
                : settings.delay
            ;
            clearTimeout(module.showTimer);
            module.hideTimer = setTimeout(module.hide, delay);
          },
          touchstart: function(event) {
            openedWithTouch = true;
            module.show();
          },
          resize: function() {
            if( module.is.visible() ) {
              module.set.position();
            }
          },
          hideGracefully: function(event) {
            // don't close on clicks inside popup
            if(event && $(event.target).closest(selector.popup).length === 0) {
              module.debug('Click occurred outside popup hiding popup');
              module.hide();
            }
            else {
              module.debug('Click was inside popup, keeping popup open');
            }
          }
        },

        // generates popup html from metadata
        create: function() {
          var
            html      = module.get.html(),
            title     = module.get.title(),
            content   = module.get.content()
          ;

          if(html || content || title) {
            module.debug('Creating pop-up html');
            if(!html) {
              html = settings.templates.popup({
                title   : title,
                content : content
              });
            }
            $popup = $('<div/>')
              .addClass(className.popup)
              .data(metadata.activator, $module)
              .html(html)
            ;
            if(settings.inline) {
              module.verbose('Inserting popup element inline', $popup);
              $popup
                .insertAfter($module)
              ;
            }
            else {
              module.verbose('Appending popup element to body', $popup);
              $popup
                .appendTo( $context )
              ;
            }
            module.refresh();
            module.set.variation();

            if(settings.hoverable) {
              module.bind.popup();
            }
            settings.onCreate.call($popup, element);
          }
          else if($target.next(selector.popup).length !== 0) {
            module.verbose('Pre-existing popup found');
            settings.inline = true;
            settings.popups  = $target.next(selector.popup).data(metadata.activator, $module);
            module.refresh();
            if(settings.hoverable) {
              module.bind.popup();
            }
          }
          else if(settings.popup) {
            $(settings.popup).data(metadata.activator, $module);
            module.verbose('Used popup specified in settings');
            module.refresh();
            if(settings.hoverable) {
              module.bind.popup();
            }
          }
          else {
            module.debug('No content specified skipping display', element);
          }
        },

        createID: function() {
          id = (Math.random().toString(16) + '000000000').substr(2,8);
          elementNamespace = '.' + id;
          module.verbose('Creating unique id for element', id);
        },

        // determines popup state
        toggle: function() {
          module.debug('Toggling pop-up');
          if( module.is.hidden() ) {
            module.debug('Popup is hidden, showing pop-up');
            module.unbind.close();
            module.show();
          }
          else {
            module.debug('Popup is visible, hiding pop-up');
            module.hide();
          }
        },

        show: function(callback) {
          callback = callback || function(){};
          module.debug('Showing pop-up', settings.transition);
          if(module.is.hidden() && !( module.is.active() && module.is.dropdown()) ) {
            if( !module.exists() ) {
              module.create();
            }
            if(settings.onShow.call($popup, element) === false) {
              module.debug('onShow callback returned false, cancelling popup animation');
              return;
            }
            else if(!settings.preserve && !settings.popup) {
              module.refresh();
            }
            if( $popup && module.set.position() ) {
              module.save.conditions();
              if(settings.exclusive) {
                module.hideAll();
              }
              module.animate.show(callback);
            }
          }
        },


        hide: function(callback) {
          callback = callback || function(){};
          if( module.is.visible() || module.is.animating() ) {
            if(settings.onHide.call($popup, element) === false) {
              module.debug('onHide callback returned false, cancelling popup animation');
              return;
            }
            module.remove.visible();
            module.unbind.close();
            module.restore.conditions();
            module.animate.hide(callback);
          }
        },

        hideAll: function() {
          $(selector.popup)
            .filter('.' + className.visible)
            .each(function() {
              $(this)
                .data(metadata.activator)
                .popup('hide')
              ;
            })
          ;
        },
        exists: function() {
          if(!$popup) {
            return false;
          }
          if(settings.inline || settings.popup) {
            return ( module.has.popup() );
          }
          else {
            return ( $popup.closest($context).length >= 1 )
              ? true
              : false
            ;
          }
        },

        removePopup: function() {
          if( module.has.popup() && !settings.popup) {
            module.debug('Removing popup', $popup);
            $popup.remove();
            $popup = undefined;
            settings.onRemove.call($popup, element);
          }
        },

        save: {
          conditions: function() {
            module.cache = {
              title: $module.attr('title')
            };
            if (module.cache.title) {
              $module.removeAttr('title');
            }
            module.verbose('Saving original attributes', module.cache.title);
          }
        },
        restore: {
          conditions: function() {
            if(module.cache && module.cache.title) {
              $module.attr('title', module.cache.title);
              module.verbose('Restoring original attributes', module.cache.title);
            }
            return true;
          }
        },
        animate: {
          show: function(callback) {
            callback = $.isFunction(callback) ? callback : function(){};
            if(settings.transition && $.fn.transition !== undefined && $module.transition('is supported')) {
              module.set.visible();
              $popup
                .transition({
                  animation  : settings.transition + ' in',
                  queue      : false,
                  debug      : settings.debug,
                  verbose    : settings.verbose,
                  duration   : settings.duration,
                  onComplete : function() {
                    module.bind.close();
                    callback.call($popup, element);
                    settings.onVisible.call($popup, element);
                  }
                })
              ;
            }
            else {
              module.error(error.noTransition);
            }
          },
          hide: function(callback) {
            callback = $.isFunction(callback) ? callback : function(){};
            module.debug('Hiding pop-up');
            if(settings.onHide.call($popup, element) === false) {
              module.debug('onHide callback returned false, cancelling popup animation');
              return;
            }
            if(settings.transition && $.fn.transition !== undefined && $module.transition('is supported')) {
              $popup
                .transition({
                  animation  : settings.transition + ' out',
                  queue      : false,
                  duration   : settings.duration,
                  debug      : settings.debug,
                  verbose    : settings.verbose,
                  onComplete : function() {
                    module.reset();
                    callback.call($popup, element);
                    settings.onHidden.call($popup, element);
                  }
                })
              ;
            }
            else {
              module.error(error.noTransition);
            }
          }
        },

        change: {
          content: function(html) {
            $popup.html(html);
          }
        },

        get: {
          html: function() {
            $module.removeData(metadata.html);
            return $module.data(metadata.html) || settings.html;
          },
          title: function() {
            $module.removeData(metadata.title);
            return $module.data(metadata.title) || settings.title;
          },
          content: function() {
            $module.removeData(metadata.content);
            return $module.data(metadata.content) || $module.attr('title') || settings.content;
          },
          variation: function() {
            $module.removeData(metadata.variation);
            return $module.data(metadata.variation) || settings.variation;
          },
          popup: function() {
            return $popup;
          },
          popupOffset: function() {
            return $popup.offset();
          },
          calculations: function() {
            var
              targetElement  = $target[0],
              targetPosition = (settings.inline || (settings.popup && settings.movePopup))
                ? $target.position()
                : $target.offset(),
              calculations = {},
              screen
            ;
            calculations = {
              // element which is launching popup
              target : {
                element : $target[0],
                width   : $target.outerWidth(),
                height  : $target.outerHeight(),
                top     : targetPosition.top,
                left    : targetPosition.left,
                margin  : {}
              },
              // popup itself
              popup : {
                width  : $popup.outerWidth(),
                height : $popup.outerHeight()
              },
              // offset container (or 3d context)
              parent : {
                width  : $offsetParent.outerWidth(),
                height : $offsetParent.outerHeight()
              },
              // screen boundaries
              screen : {
                scroll: {
                  top  : $window.scrollTop(),
                  left : $window.scrollLeft()
                },
                width  : $window.width(),
                height : $window.height()
              }
            };

            // add in container calcs if fluid
            if( settings.setFluidWidth && module.is.fluid() ) {
              calculations.container = {
                width: $popup.parent().outerWidth()
              };
              calculations.popup.width = calculations.container.width;
            }

            // add in margins if inline
            calculations.target.margin.top = (settings.inline)
              ? parseInt( window.getComputedStyle(targetElement).getPropertyValue('margin-top'), 10)
              : 0
            ;
            calculations.target.margin.left = (settings.inline)
              ? module.is.rtl()
                ? parseInt( window.getComputedStyle(targetElement).getPropertyValue('margin-right'), 10)
                : parseInt( window.getComputedStyle(targetElement).getPropertyValue('margin-left') , 10)
              : 0
            ;
            // calculate screen boundaries
            screen = calculations.screen;
            calculations.boundary = {
              top    : screen.scroll.top,
              bottom : screen.scroll.top + screen.height,
              left   : screen.scroll.left,
              right  : screen.scroll.left + screen.width
            };
            return calculations;
          },
          id: function() {
            return id;
          },
          startEvent: function() {
            if(settings.on == 'hover') {
              return 'mouseenter';
            }
            else if(settings.on == 'focus') {
              return 'focus';
            }
            return false;
          },
          scrollEvent: function() {
            return 'scroll';
          },
          endEvent: function() {
            if(settings.on == 'hover') {
              return 'mouseleave';
            }
            else if(settings.on == 'focus') {
              return 'blur';
            }
            return false;
          },
          distanceFromBoundary: function(offset, calculations) {
            var
              distanceFromBoundary = {},
              popup,
              boundary
            ;
            offset       = offset       || module.get.offset();
            calculations = calculations || module.get.calculations();

            // shorthand
            popup        = calculations.popup;
            boundary     = calculations.boundary;

            if(offset) {
              distanceFromBoundary = {
                top    : (offset.top - boundary.top),
                left   : (offset.left - boundary.left),
                right  : (boundary.right - (offset.left + popup.width) ),
                bottom : (boundary.bottom - (offset.top + popup.height) )
              };
              module.verbose('Distance from boundaries determined', offset, distanceFromBoundary);
            }
            return distanceFromBoundary;
          },
          offsetParent: function($target) {
            var
              element = ($target !== undefined)
                ? $target[0]
                : $module[0],
              parentNode = element.parentNode,
              $node    = $(parentNode)
            ;
            if(parentNode) {
              var
                is2D     = ($node.css('transform') === 'none'),
                isStatic = ($node.css('position') === 'static'),
                isHTML   = $node.is('html')
              ;
              while(parentNode && !isHTML && isStatic && is2D) {
                parentNode = parentNode.parentNode;
                $node    = $(parentNode);
                is2D     = ($node.css('transform') === 'none');
                isStatic = ($node.css('position') === 'static');
                isHTML   = $node.is('html');
              }
            }
            return ($node && $node.length > 0)
              ? $node
              : $()
            ;
          },
          positions: function() {
            return {
              'top left'      : false,
              'top center'    : false,
              'top right'     : false,
              'bottom left'   : false,
              'bottom center' : false,
              'bottom right'  : false,
              'left center'   : false,
              'right center'  : false
            };
          },
          nextPosition: function(position) {
            var
              positions          = position.split(' '),
              verticalPosition   = positions[0],
              horizontalPosition = positions[1],
              opposite = {
                top    : 'bottom',
                bottom : 'top',
                left   : 'right',
                right  : 'left'
              },
              adjacent = {
                left   : 'center',
                center : 'right',
                right  : 'left'
              },
              backup = {
                'top left'      : 'top center',
                'top center'    : 'top right',
                'top right'     : 'right center',
                'right center'  : 'bottom right',
                'bottom right'  : 'bottom center',
                'bottom center' : 'bottom left',
                'bottom left'   : 'left center',
                'left center'   : 'top left'
              },
              adjacentsAvailable = (verticalPosition == 'top' || verticalPosition == 'bottom'),
              oppositeTried = false,
              adjacentTried = false,
              nextPosition  = false
            ;
            if(!triedPositions) {
              module.verbose('All available positions available');
              triedPositions = module.get.positions();
            }

            module.debug('Recording last position tried', position);
            triedPositions[position] = true;

            if(settings.prefer === 'opposite') {
              nextPosition  = [opposite[verticalPosition], horizontalPosition];
              nextPosition  = nextPosition.join(' ');
              oppositeTried = (triedPositions[nextPosition] === true);
              module.debug('Trying opposite strategy', nextPosition);
            }
            if((settings.prefer === 'adjacent') && adjacentsAvailable ) {
              nextPosition  = [verticalPosition, adjacent[horizontalPosition]];
              nextPosition  = nextPosition.join(' ');
              adjacentTried = (triedPositions[nextPosition] === true);
              module.debug('Trying adjacent strategy', nextPosition);
            }
            if(adjacentTried || oppositeTried) {
              module.debug('Using backup position', nextPosition);
              nextPosition = backup[position];
            }
            return nextPosition;
          }
        },

        set: {
          position: function(position, calculations) {

            // exit conditions
            if($target.length === 0 || $popup.length === 0) {
              module.error(error.notFound);
              return;
            }
            var
              offset,
              distanceAway,
              target,
              popup,
              parent,
              positioning,
              popupOffset,
              distanceFromBoundary
            ;

            calculations = calculations || module.get.calculations();
            position     = position     || $module.data(metadata.position) || settings.position;

            offset       = $module.data(metadata.offset) || settings.offset;
            distanceAway = settings.distanceAway;

            // shorthand
            target = calculations.target;
            popup  = calculations.popup;
            parent = calculations.parent;

            if(target.width === 0 && target.height === 0 && !(target.element instanceof SVGGraphicsElement)) {
              module.debug('Popup target is hidden, no action taken');
              return false;
            }

            if(settings.inline) {
              module.debug('Adding margin to calculation', target.margin);
              if(position == 'left center' || position == 'right center') {
                offset       +=  target.margin.top;
                distanceAway += -target.margin.left;
              }
              else if (position == 'top left' || position == 'top center' || position == 'top right') {
                offset       += target.margin.left;
                distanceAway -= target.margin.top;
              }
              else {
                offset       += target.margin.left;
                distanceAway += target.margin.top;
              }
            }

            module.debug('Determining popup position from calculations', position, calculations);

            if (module.is.rtl()) {
              position = position.replace(/left|right/g, function (match) {
                return (match == 'left')
                  ? 'right'
                  : 'left'
                ;
              });
              module.debug('RTL: Popup position updated', position);
            }

            // if last attempt use specified last resort position
            if(searchDepth == settings.maxSearchDepth && typeof settings.lastResort === 'string') {
              position = settings.lastResort;
            }

            switch (position) {
              case 'top left':
                positioning = {
                  top    : 'auto',
                  bottom : parent.height - target.top + distanceAway,
                  left   : target.left + offset,
                  right  : 'auto'
                };
              break;
              case 'top center':
                positioning = {
                  bottom : parent.height - target.top + distanceAway,
                  left   : target.left + (target.width / 2) - (popup.width / 2) + offset,
                  top    : 'auto',
                  right  : 'auto'
                };
              break;
              case 'top right':
                positioning = {
                  bottom :  parent.height - target.top + distanceAway,
                  right  :  parent.width - target.left - target.width - offset,
                  top    : 'auto',
                  left   : 'auto'
                };
              break;
              case 'left center':
                positioning = {
                  top    : target.top + (target.height / 2) - (popup.height / 2) + offset,
                  right  : parent.width - target.left + distanceAway,
                  left   : 'auto',
                  bottom : 'auto'
                };
              break;
              case 'right center':
                positioning = {
                  top    : target.top + (target.height / 2) - (popup.height / 2) + offset,
                  left   : target.left + target.width + distanceAway,
                  bottom : 'auto',
                  right  : 'auto'
                };
              break;
              case 'bottom left':
                positioning = {
                  top    : target.top + target.height + distanceAway,
                  left   : target.left + offset,
                  bottom : 'auto',
                  right  : 'auto'
                };
              break;
              case 'bottom center':
                positioning = {
                  top    : target.top + target.height + distanceAway,
                  left   : target.left + (target.width / 2) - (popup.width / 2) + offset,
                  bottom : 'auto',
                  right  : 'auto'
                };
              break;
              case 'bottom right':
                positioning = {
                  top    : target.top + target.height + distanceAway,
                  right  : parent.width - target.left  - target.width - offset,
                  left   : 'auto',
                  bottom : 'auto'
                };
              break;
            }
            if(positioning === undefined) {
              module.error(error.invalidPosition, position);
            }

            module.debug('Calculated popup positioning values', positioning);

            // tentatively place on stage
            $popup
              .css(positioning)
              .removeClass(className.position)
              .addClass(position)
              .addClass(className.loading)
            ;

            popupOffset = module.get.popupOffset();

            // see if any boundaries are surpassed with this tentative position
            distanceFromBoundary = module.get.distanceFromBoundary(popupOffset, calculations);

            if( module.is.offstage(distanceFromBoundary, position) ) {
              module.debug('Position is outside viewport', position);
              if(searchDepth < settings.maxSearchDepth) {
                searchDepth++;
                position = module.get.nextPosition(position);
                module.debug('Trying new position', position);
                return ($popup)
                  ? module.set.position(position, calculations)
                  : false
                ;
              }
              else {
                if(settings.lastResort) {
                  module.debug('No position found, showing with last position');
                }
                else {
                  module.debug('Popup could not find a position to display', $popup);
                  module.error(error.cannotPlace, element);
                  module.remove.attempts();
                  module.remove.loading();
                  module.reset();
                  return false;
                }
              }
            }
            module.debug('Position is on stage', position);
            module.remove.attempts();
            module.remove.loading();
            if( settings.setFluidWidth && module.is.fluid() ) {
              module.set.fluidWidth(calculations);
            }
            return true;
          },

          fluidWidth: function(calculations) {
            calculations = calculations || module.get.calculations();
            module.debug('Automatically setting element width to parent width', calculations.parent.width);
            $popup.css('width', calculations.container.width);
          },

          variation: function(variation) {
            variation = variation || module.get.variation();
            if(variation && module.has.popup() ) {
              module.verbose('Adding variation to popup', variation);
              $popup.addClass(variation);
            }
          },

          visible: function() {
            $module.addClass(className.visible);
          }
        },

        remove: {
          loading: function() {
            $popup.removeClass(className.loading);
          },
          variation: function(variation) {
            variation = variation || module.get.variation();
            if(variation) {
              module.verbose('Removing variation', variation);
              $popup.removeClass(variation);
            }
          },
          visible: function() {
            $module.removeClass(className.visible);
          },
          attempts: function() {
            module.verbose('Resetting all searched positions');
            searchDepth    = 0;
            triedPositions = false;
          }
        },

        bind: {
          events: function() {
            module.debug('Binding popup events to module');
            if(settings.on == 'click') {
              $module
                .on('click' + eventNamespace, module.toggle)
              ;
            }
            if(settings.on == 'hover' && hasTouch) {
              $module
                .on('touchstart' + eventNamespace, module.event.touchstart)
              ;
            }
            if( module.get.startEvent() ) {
              $module
                .on(module.get.startEvent() + eventNamespace, module.event.start)
                .on(module.get.endEvent() + eventNamespace, module.event.end)
              ;
            }
            if(settings.target) {
              module.debug('Target set to element', $target);
            }
            $window.on('resize' + elementNamespace, module.event.resize);
          },
          popup: function() {
            module.verbose('Allowing hover events on popup to prevent closing');
            if( $popup && module.has.popup() ) {
              $popup
                .on('mouseenter' + eventNamespace, module.event.start)
                .on('mouseleave' + eventNamespace, module.event.end)
              ;
            }
          },
          close: function() {
            if(settings.hideOnScroll === true || (settings.hideOnScroll == 'auto' && settings.on != 'click'))   {
              $document
                .one(module.get.scrollEvent() + elementNamespace, module.event.hideGracefully)
              ;
              $context
                .one(module.get.scrollEvent() + elementNamespace, module.event.hideGracefully)
              ;
            }
            if(settings.on == 'hover' && openedWithTouch) {
              module.verbose('Binding popup close event to document');
              $document
                .on('touchstart' + elementNamespace, function(event) {
                  module.verbose('Touched away from popup');
                  module.event.hideGracefully.call(element, event);
                })
              ;
            }
            if(settings.on == 'click' && settings.closable) {
              module.verbose('Binding popup close event to document');
              $document
                .on('click' + elementNamespace, function(event) {
                  module.verbose('Clicked away from popup');
                  module.event.hideGracefully.call(element, event);
                })
              ;
            }
          }
        },

        unbind: {
          close: function() {
            if(settings.hideOnScroll === true || (settings.hideOnScroll == 'auto' && settings.on != 'click')) {
              $document
                .off('scroll' + elementNamespace, module.hide)
              ;
              $context
                .off('scroll' + elementNamespace, module.hide)
              ;
            }
            if(settings.on == 'hover' && openedWithTouch) {
              $document
                .off('touchstart' + elementNamespace)
              ;
              openedWithTouch = false;
            }
            if(settings.on == 'click' && settings.closable) {
              module.verbose('Removing close event from document');
              $document
                .off('click' + elementNamespace)
              ;
            }
          }
        },

        has: {
          popup: function() {
            return ($popup && $popup.length > 0);
          }
        },

        is: {
          offstage: function(distanceFromBoundary, position) {
            var
              offstage = []
            ;
            // return boundaries that have been surpassed
            $.each(distanceFromBoundary, function(direction, distance) {
              if(distance < -settings.jitter) {
                module.debug('Position exceeds allowable distance from edge', direction, distance, position);
                offstage.push(direction);
              }
            });
            if(offstage.length > 0) {
              return true;
            }
            else {
              return false;
            }
          },
          active: function() {
            return $module.hasClass(className.active);
          },
          animating: function() {
            return ( $popup && $popup.hasClass(className.animating) );
          },
          fluid: function() {
            return ( $popup && $popup.hasClass(className.fluid));
          },
          visible: function() {
            return $popup && $popup.hasClass(className.visible);
          },
          dropdown: function() {
            return $module.hasClass(className.dropdown);
          },
          hidden: function() {
            return !module.is.visible();
          },
          rtl: function () {
            return $module.css('direction') == 'rtl';
          }
        },

        reset: function() {
          module.remove.visible();
          if(settings.preserve) {
            if($.fn.transition !== undefined) {
              $popup
                .transition('remove transition')
              ;
            }
          }
          else {
            module.removePopup();
          }
        },

        setting: function(name, value) {
          if( $.isPlainObject(name) ) {
            $.extend(true, settings, name);
          }
          else if(value !== undefined) {
            settings[name] = value;
          }
          else {
            return settings[name];
          }
        },
        internal: function(name, value) {
          if( $.isPlainObject(name) ) {
            $.extend(true, module, name);
          }
          else if(value !== undefined) {
            module[name] = value;
          }
          else {
            return module[name];
          }
        },
        debug: function() {
          if(settings.debug) {
            if(settings.performance) {
              module.performance.log(arguments);
            }
            else {
              module.debug = Function.prototype.bind.call(console.info, console, settings.name + ':');
              module.debug.apply(console, arguments);
            }
          }
        },
        verbose: function() {
          if(settings.verbose && settings.debug) {
            if(settings.performance) {
              module.performance.log(arguments);
            }
            else {
              module.verbose = Function.prototype.bind.call(console.info, console, settings.name + ':');
              module.verbose.apply(console, arguments);
            }
          }
        },
        error: function() {
          module.error = Function.prototype.bind.call(console.error, console, settings.name + ':');
          module.error.apply(console, arguments);
        },
        performance: {
          log: function(message) {
            var
              currentTime,
              executionTime,
              previousTime
            ;
            if(settings.performance) {
              currentTime   = new Date().getTime();
              previousTime  = time || currentTime;
              executionTime = currentTime - previousTime;
              time          = currentTime;
              performance.push({
                'Name'           : message[0],
                'Arguments'      : [].slice.call(message, 1) || '',
                'Element'        : element,
                'Execution Time' : executionTime
              });
            }
            clearTimeout(module.performance.timer);
            module.performance.timer = setTimeout(module.performance.display, 500);
          },
          display: function() {
            var
              title = settings.name + ':',
              totalTime = 0
            ;
            time = false;
            clearTimeout(module.performance.timer);
            $.each(performance, function(index, data) {
              totalTime += data['Execution Time'];
            });
            title += ' ' + totalTime + 'ms';
            if(moduleSelector) {
              title += ' \'' + moduleSelector + '\'';
            }
            if( (console.group !== undefined || console.table !== undefined) && performance.length > 0) {
              console.groupCollapsed(title);
              if(console.table) {
                console.table(performance);
              }
              else {
                $.each(performance, function(index, data) {
                  console.log(data['Name'] + ': ' + data['Execution Time']+'ms');
                });
              }
              console.groupEnd();
            }
            performance = [];
          }
        },
        invoke: function(query, passedArguments, context) {
          var
            object = instance,
            maxDepth,
            found,
            response
          ;
          passedArguments = passedArguments || queryArguments;
          context         = element         || context;
          if(typeof query == 'string' && object !== undefined) {
            query    = query.split(/[\. ]/);
            maxDepth = query.length - 1;
            $.each(query, function(depth, value) {
              var camelCaseValue = (depth != maxDepth)
                ? value + query[depth + 1].charAt(0).toUpperCase() + query[depth + 1].slice(1)
                : query
              ;
              if( $.isPlainObject( object[camelCaseValue] ) && (depth != maxDepth) ) {
                object = object[camelCaseValue];
              }
              else if( object[camelCaseValue] !== undefined ) {
                found = object[camelCaseValue];
                return false;
              }
              else if( $.isPlainObject( object[value] ) && (depth != maxDepth) ) {
                object = object[value];
              }
              else if( object[value] !== undefined ) {
                found = object[value];
                return false;
              }
              else {
                return false;
              }
            });
          }
          if ( $.isFunction( found ) ) {
            response = found.apply(context, passedArguments);
          }
          else if(found !== undefined) {
            response = found;
          }
          if($.isArray(returnedValue)) {
            returnedValue.push(response);
          }
          else if(returnedValue !== undefined) {
            returnedValue = [returnedValue, response];
          }
          else if(response !== undefined) {
            returnedValue = response;
          }
          return found;
        }
      };

      if(methodInvoked) {
        if(instance === undefined) {
          module.initialize();
        }
        module.invoke(query);
      }
      else {
        if(instance !== undefined) {
          instance.invoke('destroy');
        }
        module.initialize();
      }
    })
  ;

  return (returnedValue !== undefined)
    ? returnedValue
    : this
  ;
};

$.fn.popup.settings = {

  name         : 'Popup',

  // module settings
  debug        : false,
  verbose      : false,
  performance  : true,
  namespace    : 'popup',

  // callback only when element added to dom
  onCreate     : function(){},

  // callback before element removed from dom
  onRemove     : function(){},

  // callback before show animation
  onShow       : function(){},

  // callback after show animation
  onVisible    : function(){},

  // callback before hide animation
  onHide       : function(){},

  // callback after hide animation
  onHidden     : function(){},

  // when to show popup
  on           : 'hover',

  // whether to add touchstart events when using hover
  addTouchEvents : true,

  // default position relative to element
  position     : 'top left',

  // name of variation to use
  variation    : '',

  // whether popup should be moved to context
  movePopup      : true,

  // element which popup should be relative to
  target         : false,

  // jq selector or element that should be used as popup
  popup          : false,

  // popup should remain inline next to activator
  inline         : false,

  // popup should be removed from page on hide
  preserve       : false,

  // popup should not close when being hovered on
  hoverable      : false,

  // explicitly set content
  content      : false,

  // explicitly set html
  html         : false,

  // explicitly set title
  title        : false,

  // whether automatically close on clickaway when on click
  closable     : true,

  // automatically hide on scroll
  hideOnScroll : 'auto',

  // hide other popups on show
  exclusive    : false,

  // context to attach popups
  context      : 'body',

  // position to prefer when calculating new position
  prefer       : 'opposite',

  // specify position to appear even if it doesn't fit
  lastResort   : false,

  // delay used to prevent accidental refiring of animations due to user error
  delay        : {
    show : 50,
    hide : 70
  },

  // whether fluid variation should assign width explicitly
  setFluidWidth  : true,

  // transition settings
  duration       : 200,
  transition     : 'scale',

  // distance away from activating element in px
  distanceAway   : 0,

  // number of pixels an element is allowed to be "offstage" for a position to be chosen (allows for rounding)
  jitter         : 2,

  // offset on aligning axis from calculated position
  offset         : 0,

  // maximum times to look for a position before failing (9 positions total)
  maxSearchDepth : 15,

  error: {
    invalidPosition : 'The position you specified is not a valid position',
    cannotPlace     : 'Popup does not fit within the boundaries of the viewport',
    method          : 'The method you called is not defined.',
    noTransition    : 'This module requires ui transitions <https://github.com/Semantic-Org/UI-Transition>',
    notFound        : 'The target or popup you specified does not exist on the page'
  },

  metadata: {
    activator : 'activator',
    content   : 'content',
    html      : 'html',
    offset    : 'offset',
    position  : 'position',
    title     : 'title',
    variation : 'variation'
  },

  className   : {
    active    : 'active',
    animating : 'animating',
    dropdown  : 'dropdown',
    fluid     : 'fluid',
    loading   : 'loading',
    popup     : 'ui popup',
    position  : 'top left center bottom right',
    visible   : 'visible'
  },

  selector    : {
    popup    : '.ui.popup'
  },

  templates: {
    escape: function(string) {
      var
        badChars     = /[&<>"'`]/g,
        shouldEscape = /[&<>"'`]/,
        escape       = {
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#x27;",
          "`": "&#x60;"
        },
        escapedChar  = function(chr) {
          return escape[chr];
        }
      ;
      if(shouldEscape.test(string)) {
        return string.replace(badChars, escapedChar);
      }
      return string;
    },
    popup: function(text) {
      var
        html   = '',
        escape = $.fn.popup.settings.templates.escape
      ;
      if(typeof text !== undefined) {
        if(typeof text.title !== undefined && text.title) {
          text.title = escape(text.title);
          html += '<div class="header">' + text.title + '</div>';
        }
        if(typeof text.content !== undefined && text.content) {
          text.content = escape(text.content);
          html += '<div class="content">' + text.content + '</div>';
        }
      }
      return html;
    }
  }

};


})( jQuery, window, document );

/*!
 * # Semantic UI 2.1.6 - Progress
 * http://github.com/semantic-org/semantic-ui/
 *
 *
 * Copyright 2015 Contributors
 * Released under the MIT license
 * http://opensource.org/licenses/MIT
 *
 */

;(function ( $, window, document, undefined ) {

"use strict";

$.fn.progress = function(parameters) {
  var
    $allModules    = $(this),

    moduleSelector = $allModules.selector || '',

    time           = new Date().getTime(),
    performance    = [],

    query          = arguments[0],
    methodInvoked  = (typeof query == 'string'),
    queryArguments = [].slice.call(arguments, 1),

    returnedValue
  ;

  $allModules
    .each(function() {
      var
        settings          = ( $.isPlainObject(parameters) )
          ? $.extend(true, {}, $.fn.progress.settings, parameters)
          : $.extend({}, $.fn.progress.settings),

        className       = settings.className,
        metadata        = settings.metadata,
        namespace       = settings.namespace,
        selector        = settings.selector,
        error           = settings.error,

        eventNamespace  = '.' + namespace,
        moduleNamespace = 'module-' + namespace,

        $module         = $(this),
        $bar            = $(this).find(selector.bar),
        $progress       = $(this).find(selector.progress),
        $label          = $(this).find(selector.label),

        element         = this,
        instance        = $module.data(moduleNamespace),

        animating = false,
        transitionEnd,
        module
      ;

      module = {

        initialize: function() {
          module.debug('Initializing progress bar', settings);

          module.set.duration();
          module.set.transitionEvent();

          module.read.metadata();
          module.read.settings();

          module.instantiate();
        },

        instantiate: function() {
          module.verbose('Storing instance of progress', module);
          instance = module;
          $module
            .data(moduleNamespace, module)
          ;
        },
        destroy: function() {
          module.verbose('Destroying previous progress for', $module);
          clearInterval(instance.interval);
          module.remove.state();
          $module.removeData(moduleNamespace);
          instance = undefined;
        },

        reset: function() {
          module.set.percent(0);
          module.set.value(0);
        },

        complete: function() {
          if(module.percent === undefined || module.percent < 100) {
            module.set.percent(100);
          }
        },

        read: {
          metadata: function() {
            var
              data = {
                percent : $module.data(metadata.percent),
                total   : $module.data(metadata.total),
                value   : $module.data(metadata.value)
              }
            ;
            if(data.percent) {
              module.debug('Current percent value set from metadata', data.percent);
              module.set.percent(data.percent);
            }
            if(data.total) {
              module.debug('Total value set from metadata', data.total);
              module.set.total(data.total);
            }
            if(data.value) {
              module.debug('Current value set from metadata', data.value);
              module.set.value(data.value);
              module.set.progress(data.value);
            }
          },
          settings: function() {
            if(settings.total !== false) {
              module.debug('Current total set in settings', settings.total);
              module.set.total(settings.total);
            }
            if(settings.value !== false) {
              module.debug('Current value set in settings', settings.value);
              module.set.value(settings.value);
              module.set.progress(module.value);
            }
            if(settings.percent !== false) {
              module.debug('Current percent set in settings', settings.percent);
              module.set.percent(settings.percent);
            }
          }
        },

        increment: function(incrementValue) {
          var
            maxValue,
            startValue,
            newValue
          ;
          if( module.has.total() ) {
            startValue     = module.get.value();
            incrementValue = incrementValue || 1;

            newValue       = startValue + incrementValue;
            maxValue       = module.get.total();

            module.debug('Incrementing value', startValue, newValue, maxValue);
            if(newValue > maxValue ) {
              module.debug('Value cannot increment above total', maxValue);
              newValue = maxValue;
            }
          }
          else {
            startValue     = module.get.percent();
            incrementValue = incrementValue || module.get.randomValue();

            newValue       = startValue + incrementValue;
            maxValue       = 100;

            module.debug('Incrementing percentage by', startValue, newValue);
            if(newValue > maxValue ) {
              module.debug('Value cannot increment above 100 percent');
              newValue = maxValue;
            }
          }
          module.set.progress(newValue);
        },
        decrement: function(decrementValue) {
          var
            total     = module.get.total(),
            startValue,
            newValue
          ;
          if(total) {
            startValue     =  module.get.value();
            decrementValue =  decrementValue || 1;
            newValue       =  startValue - decrementValue;
            module.debug('Decrementing value by', decrementValue, startValue);
          }
          else {
            startValue     =  module.get.percent();
            decrementValue =  decrementValue || module.get.randomValue();
            newValue       =  startValue - decrementValue;
            module.debug('Decrementing percentage by', decrementValue, startValue);
          }

          if(newValue < 0) {
            module.debug('Value cannot decrement below 0');
            newValue = 0;
          }
          module.set.progress(newValue);
        },

        has: {
          total: function() {
            return (module.get.total() !== false);
          }
        },

        get: {
          text: function(templateText) {
            var
              value   = module.value                || 0,
              total   = module.total                || 0,
              percent = (animating)
                ? module.get.displayPercent()
                : module.percent || 0,
              left = (module.total > 0)
                ? (total - value)
                : (100 - percent)
            ;
            templateText = templateText || '';
            templateText = templateText
              .replace('{value}', value)
              .replace('{total}', total)
              .replace('{left}', left)
              .replace('{percent}', percent)
            ;
            module.debug('Adding variables to progress bar text', templateText);
            return templateText;
          },


          randomValue: function() {
            module.debug('Generating random increment percentage');
            return Math.floor((Math.random() * settings.random.max) + settings.random.min);
          },

          numericValue: function(value) {
            return (typeof value === 'string')
              ? (value.replace(/[^\d.]/g, '') !== '')
                ? +(value.replace(/[^\d.]/g, ''))
                : false
              : value
            ;
          },

          transitionEnd: function() {
            var
              element     = document.createElement('element'),
              transitions = {
                'transition'       :'transitionend',
                'OTransition'      :'oTransitionEnd',
                'MozTransition'    :'transitionend',
                'WebkitTransition' :'webkitTransitionEnd'
              },
              transition
            ;
            for(transition in transitions){
              if( element.style[transition] !== undefined ){
                return transitions[transition];
              }
            }
          },

          // gets current displayed percentage (if animating values this is the intermediary value)
          displayPercent: function() {
            var
              barWidth       = $bar.width(),
              totalWidth     = $module.width(),
              minDisplay     = parseInt($bar.css('min-width'), 10),
              displayPercent = (barWidth > minDisplay)
                ? (barWidth / totalWidth * 100)
                : module.percent
            ;
            return (settings.precision > 0)
              ? Math.round(displayPercent * (10 * settings.precision)) / (10 * settings.precision)
              : Math.round(displayPercent)
            ;
          },

          percent: function() {
            return module.percent || 0;
          },
          value: function() {
            return module.value || 0;
          },
          total: function() {
            return module.total || false;
          }
        },

        is: {
          success: function() {
            return $module.hasClass(className.success);
          },
          warning: function() {
            return $module.hasClass(className.warning);
          },
          error: function() {
            return $module.hasClass(className.error);
          },
          active: function() {
            return $module.hasClass(className.active);
          },
          visible: function() {
            return $module.is(':visible');
          }
        },

        remove: {
          state: function() {
            module.verbose('Removing stored state');
            delete module.total;
            delete module.percent;
            delete module.value;
          },
          active: function() {
            module.verbose('Removing active state');
            $module.removeClass(className.active);
          },
          success: function() {
            module.verbose('Removing success state');
            $module.removeClass(className.success);
          },
          warning: function() {
            module.verbose('Removing warning state');
            $module.removeClass(className.warning);
          },
          error: function() {
            module.verbose('Removing error state');
            $module.removeClass(className.error);
          }
        },

        set: {
          barWidth: function(value) {
            if(value > 100) {
              module.error(error.tooHigh, value);
            }
            else if (value < 0) {
              module.error(error.tooLow, value);
            }
            else {
              $bar
                .css('width', value + '%')
              ;
              $module
                .attr('data-percent', parseInt(value, 10))
              ;
            }
          },
          duration: function(duration) {
            duration = duration || settings.duration;
            duration = (typeof duration == 'number')
              ? duration + 'ms'
              : duration
            ;
            module.verbose('Setting progress bar transition duration', duration);
            $bar
              .css({
                'transition-duration':  duration
              })
            ;
          },
          percent: function(percent) {
            percent = (typeof percent == 'string')
              ? +(percent.replace('%', ''))
              : percent
            ;
            // round display percentage
            percent = (settings.precision > 0)
              ? Math.round(percent * (10 * settings.precision)) / (10 * settings.precision)
              : Math.round(percent)
            ;
            module.percent = percent;
            if( !module.has.total() ) {
              module.value = (settings.precision > 0)
                ? Math.round( (percent / 100) * module.total * (10 * settings.precision)) / (10 * settings.precision)
                : Math.round( (percent / 100) * module.total * 10) / 10
              ;
              if(settings.limitValues) {
                module.value = (module.value > 100)
                  ? 100
                  : (module.value < 0)
                    ? 0
                    : module.value
                ;
              }
            }
            module.set.barWidth(percent);
            module.set.labelInterval();
            module.set.labels();
            settings.onChange.call(element, percent, module.value, module.total);
          },
          labelInterval: function() {
            var
              animationCallback = function() {
                module.verbose('Bar finished animating, removing continuous label updates');
                clearInterval(module.interval);
                animating = false;
                module.set.labels();
              }
            ;
            clearInterval(module.interval);
            $bar.one(transitionEnd + eventNamespace, animationCallback);
            module.timer = setTimeout(animationCallback, settings.duration + 100);
            animating = true;
            module.interval = setInterval(module.set.labels, settings.framerate);
          },
          labels: function() {
            module.verbose('Setting both bar progress and outer label text');
            module.set.barLabel();
            module.set.state();
          },
          label: function(text) {
            text = text || '';
            if(text) {
              text = module.get.text(text);
              module.debug('Setting label to text', text);
              $label.text(text);
            }
          },
          state: function(percent) {
            percent = (percent !== undefined)
              ? percent
              : module.percent
            ;
            if(percent === 100) {
              if(settings.autoSuccess && !(module.is.warning() || module.is.error())) {
                module.set.success();
                module.debug('Automatically triggering success at 100%');
              }
              else {
                module.verbose('Reached 100% removing active state');
                module.remove.active();
              }
            }
            else if(percent > 0) {
              module.verbose('Adjusting active progress bar label', percent);
              module.set.active();
            }
            else {
              module.remove.active();
              module.set.label(settings.text.active);
            }
          },
          barLabel: function(text) {
            if(text !== undefined) {
              $progress.text( module.get.text(text) );
            }
            else if(settings.label == 'ratio' && module.total) {
              module.debug('Adding ratio to bar label');
              $progress.text( module.get.text(settings.text.ratio) );
            }
            else if(settings.label == 'percent') {
              module.debug('Adding percentage to bar label');
              $progress.text( module.get.text(settings.text.percent) );
            }
          },
          active: function(text) {
            text = text || settings.text.active;
            module.debug('Setting active state');
            if(settings.showActivity && !module.is.active() ) {
              $module.addClass(className.active);
            }
            module.remove.warning();
            module.remove.error();
            module.remove.success();
            if(text) {
              module.set.label(text);
            }
            settings.onActive.call(element, module.value, module.total);
          },
          success : function(text) {
            text = text || settings.text.success;
            module.debug('Setting success state');
            $module.addClass(className.success);
            module.remove.active();
            module.remove.warning();
            module.remove.error();
            module.complete();
            if(text) {
              module.set.label(text);
            }
            settings.onSuccess.call(element, module.total);
          },
          warning : function(text) {
            text = text || settings.text.warning;
            module.debug('Setting warning state');
            $module.addClass(className.warning);
            module.remove.active();
            module.remove.success();
            module.remove.error();
            module.complete();
            if(text) {
              module.set.label(text);
            }
            settings.onWarning.call(element, module.value, module.total);
          },
          error : function(text) {
            text = text || settings.text.error;
            module.debug('Setting error state');
            $module.addClass(className.error);
            module.remove.active();
            module.remove.success();
            module.remove.warning();
            module.complete();
            if(text) {
              module.set.label(text);
            }
            settings.onError.call(element, module.value, module.total);
          },
          transitionEvent: function() {
            transitionEnd = module.get.transitionEnd();
          },
          total: function(totalValue) {
            module.total = totalValue;
          },
          value: function(value) {
            module.value = value;
          },
          progress: function(value) {
            var
              numericValue = module.get.numericValue(value),
              percentComplete
            ;
            if(numericValue === false) {
              module.error(error.nonNumeric, value);
            }
            if( module.has.total() ) {
              module.set.value(numericValue);
              percentComplete = (numericValue / module.total) * 100;
              module.debug('Calculating percent complete from total', percentComplete);
              module.set.percent( percentComplete );
            }
            else {
              percentComplete = numericValue;
              module.debug('Setting value to exact percentage value', percentComplete);
              module.set.percent( percentComplete );
            }
          }
        },

        setting: function(name, value) {
          module.debug('Changing setting', name, value);
          if( $.isPlainObject(name) ) {
            $.extend(true, settings, name);
          }
          else if(value !== undefined) {
            settings[name] = value;
          }
          else {
            return settings[name];
          }
        },
        internal: function(name, value) {
          if( $.isPlainObject(name) ) {
            $.extend(true, module, name);
          }
          else if(value !== undefined) {
            module[name] = value;
          }
          else {
            return module[name];
          }
        },
        debug: function() {
          if(settings.debug) {
            if(settings.performance) {
              module.performance.log(arguments);
            }
            else {
              module.debug = Function.prototype.bind.call(console.info, console, settings.name + ':');
              module.debug.apply(console, arguments);
            }
          }
        },
        verbose: function() {
          if(settings.verbose && settings.debug) {
            if(settings.performance) {
              module.performance.log(arguments);
            }
            else {
              module.verbose = Function.prototype.bind.call(console.info, console, settings.name + ':');
              module.verbose.apply(console, arguments);
            }
          }
        },
        error: function() {
          module.error = Function.prototype.bind.call(console.error, console, settings.name + ':');
          module.error.apply(console, arguments);
        },
        performance: {
          log: function(message) {
            var
              currentTime,
              executionTime,
              previousTime
            ;
            if(settings.performance) {
              currentTime   = new Date().getTime();
              previousTime  = time || currentTime;
              executionTime = currentTime - previousTime;
              time          = currentTime;
              performance.push({
                'Name'           : message[0],
                'Arguments'      : [].slice.call(message, 1) || '',
                'Element'        : element,
                'Execution Time' : executionTime
              });
            }
            clearTimeout(module.performance.timer);
            module.performance.timer = setTimeout(module.performance.display, 500);
          },
          display: function() {
            var
              title = settings.name + ':',
              totalTime = 0
            ;
            time = false;
            clearTimeout(module.performance.timer);
            $.each(performance, function(index, data) {
              totalTime += data['Execution Time'];
            });
            title += ' ' + totalTime + 'ms';
            if(moduleSelector) {
              title += ' \'' + moduleSelector + '\'';
            }
            if( (console.group !== undefined || console.table !== undefined) && performance.length > 0) {
              console.groupCollapsed(title);
              if(console.table) {
                console.table(performance);
              }
              else {
                $.each(performance, function(index, data) {
                  console.log(data['Name'] + ': ' + data['Execution Time']+'ms');
                });
              }
              console.groupEnd();
            }
            performance = [];
          }
        },
        invoke: function(query, passedArguments, context) {
          var
            object = instance,
            maxDepth,
            found,
            response
          ;
          passedArguments = passedArguments || queryArguments;
          context         = element         || context;
          if(typeof query == 'string' && object !== undefined) {
            query    = query.split(/[\. ]/);
            maxDepth = query.length - 1;
            $.each(query, function(depth, value) {
              var camelCaseValue = (depth != maxDepth)
                ? value + query[depth + 1].charAt(0).toUpperCase() + query[depth + 1].slice(1)
                : query
              ;
              if( $.isPlainObject( object[camelCaseValue] ) && (depth != maxDepth) ) {
                object = object[camelCaseValue];
              }
              else if( object[camelCaseValue] !== undefined ) {
                found = object[camelCaseValue];
                return false;
              }
              else if( $.isPlainObject( object[value] ) && (depth != maxDepth) ) {
                object = object[value];
              }
              else if( object[value] !== undefined ) {
                found = object[value];
                return false;
              }
              else {
                module.error(error.method, query);
                return false;
              }
            });
          }
          if ( $.isFunction( found ) ) {
            response = found.apply(context, passedArguments);
          }
          else if(found !== undefined) {
            response = found;
          }
          if($.isArray(returnedValue)) {
            returnedValue.push(response);
          }
          else if(returnedValue !== undefined) {
            returnedValue = [returnedValue, response];
          }
          else if(response !== undefined) {
            returnedValue = response;
          }
          return found;
        }
      };

      if(methodInvoked) {
        if(instance === undefined) {
          module.initialize();
        }
        module.invoke(query);
      }
      else {
        if(instance !== undefined) {
          instance.invoke('destroy');
        }
        module.initialize();
      }
    })
  ;

  return (returnedValue !== undefined)
    ? returnedValue
    : this
  ;
};

$.fn.progress.settings = {

  name         : 'Progress',
  namespace    : 'progress',

  debug        : false,
  verbose      : false,
  performance  : true,

  random       : {
    min : 2,
    max : 5
  },

  duration     : 300,

  autoSuccess  : true,
  showActivity : true,
  limitValues  : true,

  label        : 'percent',
  precision    : 0,
  framerate    : (1000 / 30), /// 30 fps

  percent      : false,
  total        : false,
  value        : false,

  onChange     : function(percent, value, total){},
  onSuccess    : function(total){},
  onActive     : function(value, total){},
  onError      : function(value, total){},
  onWarning    : function(value, total){},

  error    : {
    method     : 'The method you called is not defined.',
    nonNumeric : 'Progress value is non numeric',
    tooHigh    : 'Value specified is above 100%',
    tooLow     : 'Value specified is below 0%'
  },

  regExp: {
    variable: /\{\$*[A-z0-9]+\}/g
  },

  metadata: {
    percent : 'percent',
    total   : 'total',
    value   : 'value'
  },

  selector : {
    bar      : '> .bar',
    label    : '> .label',
    progress : '.bar > .progress'
  },

  text : {
    active  : false,
    error   : false,
    success : false,
    warning : false,
    percent : '{percent}%',
    ratio   : '{value} of {total}'
  },

  className : {
    active  : 'active',
    error   : 'error',
    success : 'success',
    warning : 'warning'
  }

};


})( jQuery, window, document );
/*!
 * # Semantic UI 2.1.6 - Rating
 * http://github.com/semantic-org/semantic-ui/
 *
 *
 * Copyright 2015 Contributors
 * Released under the MIT license
 * http://opensource.org/licenses/MIT
 *
 */

;(function ($, window, document, undefined) {

"use strict";

$.fn.rating = function(parameters) {
  var
    $allModules     = $(this),
    moduleSelector  = $allModules.selector || '',

    time            = new Date().getTime(),
    performance     = [],

    query           = arguments[0],
    methodInvoked   = (typeof query == 'string'),
    queryArguments  = [].slice.call(arguments, 1),
    returnedValue
  ;
  $allModules
    .each(function() {
      var
        settings        = ( $.isPlainObject(parameters) )
          ? $.extend(true, {}, $.fn.rating.settings, parameters)
          : $.extend({}, $.fn.rating.settings),

        namespace       = settings.namespace,
        className       = settings.className,
        metadata        = settings.metadata,
        selector        = settings.selector,
        error           = settings.error,

        eventNamespace  = '.' + namespace,
        moduleNamespace = 'module-' + namespace,

        element         = this,
        instance        = $(this).data(moduleNamespace),

        $module         = $(this),
        $icon           = $module.find(selector.icon),

        module
      ;

      module = {

        initialize: function() {
          module.verbose('Initializing rating module', settings);

          if($icon.length === 0) {
            module.setup.layout();
          }

          if(settings.interactive) {
            module.enable();
          }
          else {
            module.disable();
          }
          module.set.rating( module.get.initialRating() );
          module.instantiate();
        },

        instantiate: function() {
          module.verbose('Instantiating module', settings);
          instance = module;
          $module
            .data(moduleNamespace, module)
          ;
        },

        destroy: function() {
          module.verbose('Destroying previous instance', instance);
          module.remove.events();
          $module
            .removeData(moduleNamespace)
          ;
        },

        refresh: function() {
          $icon   = $module.find(selector.icon);
        },

        setup: {
          layout: function() {
            var
              maxRating = module.get.maxRating(),
              html      = $.fn.rating.settings.templates.icon(maxRating)
            ;
            module.debug('Generating icon html dynamically');
            $module
              .html(html)
            ;
            module.refresh();
          }
        },

        event: {
          mouseenter: function() {
            var
              $activeIcon = $(this)
            ;
            $activeIcon
              .nextAll()
                .removeClass(className.selected)
            ;
            $module
              .addClass(className.selected)
            ;
            $activeIcon
              .addClass(className.selected)
                .prevAll()
                .addClass(className.selected)
            ;
          },
          mouseleave: function() {
            $module
              .removeClass(className.selected)
            ;
            $icon
              .removeClass(className.selected)
            ;
          },
          click: function() {
            var
              $activeIcon   = $(this),
              currentRating = module.get.rating(),
              rating        = $icon.index($activeIcon) + 1,
              canClear      = (settings.clearable == 'auto')
               ? ($icon.length === 1)
               : settings.clearable
            ;
            if(canClear && currentRating == rating) {
              module.clearRating();
            }
            else {
              module.set.rating( rating );
            }
          }
        },

        clearRating: function() {
          module.debug('Clearing current rating');
          module.set.rating(0);
        },

        bind: {
          events: function() {
            module.verbose('Binding events');
            $module
              .on('mouseenter' + eventNamespace, selector.icon, module.event.mouseenter)
              .on('mouseleave' + eventNamespace, selector.icon, module.event.mouseleave)
              .on('click'      + eventNamespace, selector.icon, module.event.click)
            ;
          }
        },

        remove: {
          events: function() {
            module.verbose('Removing events');
            $module
              .off(eventNamespace)
            ;
          }
        },

        enable: function() {
          module.debug('Setting rating to interactive mode');
          module.bind.events();
          $module
            .removeClass(className.disabled)
          ;
        },

        disable: function() {
          module.debug('Setting rating to read-only mode');
          module.remove.events();
          $module
            .addClass(className.disabled)
          ;
        },

        get: {
          initialRating: function() {
            if($module.data(metadata.rating) !== undefined) {
              $module.removeData(metadata.rating);
              return $module.data(metadata.rating);
            }
            return settings.initialRating;
          },
          maxRating: function() {
            if($module.data(metadata.maxRating) !== undefined) {
              $module.removeData(metadata.maxRating);
              return $module.data(metadata.maxRating);
            }
            return settings.maxRating;
          },
          rating: function() {
            var
              currentRating = $icon.filter('.' + className.active).length
            ;
            module.verbose('Current rating retrieved', currentRating);
            return currentRating;
          }
        },

        set: {
          rating: function(rating) {
            var
              ratingIndex = (rating - 1 >= 0)
                ? (rating - 1)
                : 0,
              $activeIcon = $icon.eq(ratingIndex)
            ;
            $module
              .removeClass(className.selected)
            ;
            $icon
              .removeClass(className.selected)
              .removeClass(className.active)
            ;
            if(rating > 0) {
              module.verbose('Setting current rating to', rating);
              $activeIcon
                .prevAll()
                .andSelf()
                  .addClass(className.active)
              ;
            }
            settings.onRate.call(element, rating);
          }
        },

        setting: function(name, value) {
          module.debug('Changing setting', name, value);
          if( $.isPlainObject(name) ) {
            $.extend(true, settings, name);
          }
          else if(value !== undefined) {
            settings[name] = value;
          }
          else {
            return settings[name];
          }
        },
        internal: function(name, value) {
          if( $.isPlainObject(name) ) {
            $.extend(true, module, name);
          }
          else if(value !== undefined) {
            module[name] = value;
          }
          else {
            return module[name];
          }
        },
        debug: function() {
          if(settings.debug) {
            if(settings.performance) {
              module.performance.log(arguments);
            }
            else {
              module.debug = Function.prototype.bind.call(console.info, console, settings.name + ':');
              module.debug.apply(console, arguments);
            }
          }
        },
        verbose: function() {
          if(settings.verbose && settings.debug) {
            if(settings.performance) {
              module.performance.log(arguments);
            }
            else {
              module.verbose = Function.prototype.bind.call(console.info, console, settings.name + ':');
              module.verbose.apply(console, arguments);
            }
          }
        },
        error: function() {
          module.error = Function.prototype.bind.call(console.error, console, settings.name + ':');
          module.error.apply(console, arguments);
        },
        performance: {
          log: function(message) {
            var
              currentTime,
              executionTime,
              previousTime
            ;
            if(settings.performance) {
              currentTime   = new Date().getTime();
              previousTime  = time || currentTime;
              executionTime = currentTime - previousTime;
              time          = currentTime;
              performance.push({
                'Name'           : message[0],
                'Arguments'      : [].slice.call(message, 1) || '',
                'Element'        : element,
                'Execution Time' : executionTime
              });
            }
            clearTimeout(module.performance.timer);
            module.performance.timer = setTimeout(module.performance.display, 500);
          },
          display: function() {
            var
              title = settings.name + ':',
              totalTime = 0
            ;
            time = false;
            clearTimeout(module.performance.timer);
            $.each(performance, function(index, data) {
              totalTime += data['Execution Time'];
            });
            title += ' ' + totalTime + 'ms';
            if(moduleSelector) {
              title += ' \'' + moduleSelector + '\'';
            }
            if($allModules.length > 1) {
              title += ' ' + '(' + $allModules.length + ')';
            }
            if( (console.group !== undefined || console.table !== undefined) && performance.length > 0) {
              console.groupCollapsed(title);
              if(console.table) {
                console.table(performance);
              }
              else {
                $.each(performance, function(index, data) {
                  console.log(data['Name'] + ': ' + data['Execution Time']+'ms');
                });
              }
              console.groupEnd();
            }
            performance = [];
          }
        },
        invoke: function(query, passedArguments, context) {
          var
            object = instance,
            maxDepth,
            found,
            response
          ;
          passedArguments = passedArguments || queryArguments;
          context         = element         || context;
          if(typeof query == 'string' && object !== undefined) {
            query    = query.split(/[\. ]/);
            maxDepth = query.length - 1;
            $.each(query, function(depth, value) {
              var camelCaseValue = (depth != maxDepth)
                ? value + query[depth + 1].charAt(0).toUpperCase() + query[depth + 1].slice(1)
                : query
              ;
              if( $.isPlainObject( object[camelCaseValue] ) && (depth != maxDepth) ) {
                object = object[camelCaseValue];
              }
              else if( object[camelCaseValue] !== undefined ) {
                found = object[camelCaseValue];
                return false;
              }
              else if( $.isPlainObject( object[value] ) && (depth != maxDepth) ) {
                object = object[value];
              }
              else if( object[value] !== undefined ) {
                found = object[value];
                return false;
              }
              else {
                return false;
              }
            });
          }
          if ( $.isFunction( found ) ) {
            response = found.apply(context, passedArguments);
          }
          else if(found !== undefined) {
            response = found;
          }
          if($.isArray(returnedValue)) {
            returnedValue.push(response);
          }
          else if(returnedValue !== undefined) {
            returnedValue = [returnedValue, response];
          }
          else if(response !== undefined) {
            returnedValue = response;
          }
          return found;
        }
      };
      if(methodInvoked) {
        if(instance === undefined) {
          module.initialize();
        }
        module.invoke(query);
      }
      else {
        if(instance !== undefined) {
          instance.invoke('destroy');
        }
        module.initialize();
      }
    })
  ;

  return (returnedValue !== undefined)
    ? returnedValue
    : this
  ;
};

$.fn.rating.settings = {

  name          : 'Rating',
  namespace     : 'rating',

  debug         : false,
  verbose       : false,
  performance   : true,

  initialRating : 0,
  interactive   : true,
  maxRating     : 4,
  clearable     : 'auto',

  onRate        : function(rating){},

  error         : {
    method    : 'The method you called is not defined',
    noMaximum : 'No maximum rating specified. Cannot generate HTML automatically'
  },


  metadata: {
    rating    : 'rating',
    maxRating : 'maxRating'
  },

  className : {
    active   : 'active',
    disabled : 'disabled',
    selected : 'selected',
    loading  : 'loading'
  },

  selector  : {
    icon : '.icon'
  },

  templates: {
    icon: function(maxRating) {
      var
        icon = 1,
        html = ''
      ;
      while(icon <= maxRating) {
        html += '<i class="icon"></i>';
        icon++;
      }
      return html;
    }
  }

};

})( jQuery, window, document );

/*!
 * # Semantic UI 2.1.6 - Search
 * http://github.com/semantic-org/semantic-ui/
 *
 *
 * Copyright 2015 Contributors
 * Released under the MIT license
 * http://opensource.org/licenses/MIT
 *
 */

;(function ($, window, document, undefined) {

"use strict";

$.fn.search = function(parameters) {
  var
    $allModules     = $(this),
    moduleSelector  = $allModules.selector || '',

    time            = new Date().getTime(),
    performance     = [],

    query           = arguments[0],
    methodInvoked   = (typeof query == 'string'),
    queryArguments  = [].slice.call(arguments, 1),
    returnedValue
  ;
  $(this)
    .each(function() {
      var
        settings          = ( $.isPlainObject(parameters) )
          ? $.extend(true, {}, $.fn.search.settings, parameters)
          : $.extend({}, $.fn.search.settings),

        className       = settings.className,
        metadata        = settings.metadata,
        regExp          = settings.regExp,
        fields          = settings.fields,
        selector        = settings.selector,
        error           = settings.error,
        namespace       = settings.namespace,

        eventNamespace  = '.' + namespace,
        moduleNamespace = namespace + '-module',

        $module         = $(this),
        $prompt         = $module.find(selector.prompt),
        $searchButton   = $module.find(selector.searchButton),
        $results        = $module.find(selector.results),
        $result         = $module.find(selector.result),
        $category       = $module.find(selector.category),

        element         = this,
        instance        = $module.data(moduleNamespace),

        module
      ;

      module = {

        initialize: function() {
          module.verbose('Initializing module');
          module.determine.searchFields();
          module.bind.events();
          module.set.type();
          module.create.results();
          module.instantiate();
        },
        instantiate: function() {
          module.verbose('Storing instance of module', module);
          instance = module;
          $module
            .data(moduleNamespace, module)
          ;
        },
        destroy: function() {
          module.verbose('Destroying instance');
          $module
            .off(eventNamespace)
            .removeData(moduleNamespace)
          ;
        },

        bind: {
          events: function() {
            module.verbose('Binding events to search');
            if(settings.automatic) {
              $module
                .on(module.get.inputEvent() + eventNamespace, selector.prompt, module.event.input)
              ;
              $prompt
                .attr('autocomplete', 'off')
              ;
            }
            $module
              // prompt
              .on('focus'     + eventNamespace, selector.prompt, module.event.focus)
              .on('blur'      + eventNamespace, selector.prompt, module.event.blur)
              .on('keydown'   + eventNamespace, selector.prompt, module.handleKeyboard)
              // search button
              .on('click'     + eventNamespace, selector.searchButton, module.query)
              // results
              .on('mousedown' + eventNamespace, selector.results, module.event.result.mousedown)
              .on('mouseup'   + eventNamespace, selector.results, module.event.result.mouseup)
              .on('click'     + eventNamespace, selector.result,  module.event.result.click)
            ;
          }
        },

        determine: {
          searchFields: function() {
            // this makes sure $.extend does not add specified search fields to default fields
            // this is the only setting which should not extend defaults
            if(parameters && parameters.searchFields !== undefined) {
              settings.searchFields = parameters.searchFields;
            }
          }
        },

        event: {
          input: function() {
            clearTimeout(module.timer);
            module.timer = setTimeout(module.query, settings.searchDelay);
          },
          focus: function() {
            module.set.focus();
            if( module.has.minimumCharacters() ) {
              module.query();
              if( module.can.show() ) {
                module.showResults();
              }
            }
          },
          blur: function(event) {
            var
              pageLostFocus = (document.activeElement === this)
            ;
            if(!pageLostFocus && !module.resultsClicked) {
              module.cancel.query();
              module.remove.focus();
              module.timer = setTimeout(module.hideResults, settings.hideDelay);
            }
          },
          result: {
            mousedown: function() {
              module.resultsClicked = true;
            },
            mouseup: function() {
              module.resultsClicked = false;
            },
            click: function(event) {
              module.debug('Search result selected');
              var
                $result = $(this),
                $title  = $result.find(selector.title).eq(0),
                $link   = $result.find('a[href]').eq(0),
                href    = $link.attr('href')   || false,
                target  = $link.attr('target') || false,
                title   = $title.html(),
                // title is used for result lookup
                value   = ($title.length > 0)
                  ? $title.text()
                  : false,
                results = module.get.results(),
                result  = $result.data(metadata.result) || module.get.result(value, results),
                returnedValue
              ;
              if( $.isFunction(settings.onSelect) ) {
                if(settings.onSelect.call(element, result, results) === false) {
                  module.debug('Custom onSelect callback cancelled default select action');
                  return;
                }
              }
              module.hideResults();
              if(value) {
                module.set.value(value);
              }
              if(href) {
                module.verbose('Opening search link found in result', $link);
                if(target == '_blank' || event.ctrlKey) {
                  window.open(href);
                }
                else {
                  window.location.href = (href);
                }
              }
            }
          }
        },
        handleKeyboard: function(event) {
          var
            // force selector refresh
            $result      = $module.find(selector.result),
            $category    = $module.find(selector.category),
            currentIndex = $result.index( $result.filter('.' + className.active) ),
            resultSize   = $result.length,

            keyCode      = event.which,
            keys         = {
              backspace : 8,
              enter     : 13,
              escape    : 27,
              upArrow   : 38,
              downArrow : 40
            },
            newIndex
          ;
          // search shortcuts
          if(keyCode == keys.escape) {
            module.verbose('Escape key pressed, blurring search field');
            module.trigger.blur();
          }
          if( module.is.visible() ) {
            if(keyCode == keys.enter) {
              module.verbose('Enter key pressed, selecting active result');
              if( $result.filter('.' + className.active).length > 0 ) {
                module.event.result.click.call($result.filter('.' + className.active), event);
                event.preventDefault();
                return false;
              }
            }
            else if(keyCode == keys.upArrow) {
              module.verbose('Up key pressed, changing active result');
              newIndex = (currentIndex - 1 < 0)
                ? currentIndex
                : currentIndex - 1
              ;
              $category
                .removeClass(className.active)
              ;
              $result
                .removeClass(className.active)
                .eq(newIndex)
                  .addClass(className.active)
                  .closest($category)
                    .addClass(className.active)
              ;
              event.preventDefault();
            }
            else if(keyCode == keys.downArrow) {
              module.verbose('Down key pressed, changing active result');
              newIndex = (currentIndex + 1 >= resultSize)
                ? currentIndex
                : currentIndex + 1
              ;
              $category
                .removeClass(className.active)
              ;
              $result
                .removeClass(className.active)
                .eq(newIndex)
                  .addClass(className.active)
                  .closest($category)
                    .addClass(className.active)
              ;
              event.preventDefault();
            }
          }
          else {
            // query shortcuts
            if(keyCode == keys.enter) {
              module.verbose('Enter key pressed, executing query');
              module.query();
              module.set.buttonPressed();
              $prompt.one('keyup', module.remove.buttonFocus);
            }
          }
        },

        setup: {
          api: function() {
            var
              apiSettings = {
                debug     : settings.debug,
                on        : false,
                cache     : 'local',
                action    : 'search',
                onError   : module.error
              },
              searchHTML
            ;
            module.verbose('First request, initializing API');
            $module.api(apiSettings);
          }
        },

        can: {
          useAPI: function() {
            return $.fn.api !== undefined;
          },
          show: function() {
            return module.is.focused() && !module.is.visible() && !module.is.empty();
          },
          transition: function() {
            return settings.transition && $.fn.transition !== undefined && $module.transition('is supported');
          }
        },

        is: {
          empty: function() {
            return ($results.html() === '');
          },
          visible: function() {
            return ($results.filter(':visible').length > 0);
          },
          focused: function() {
            return ($prompt.filter(':focus').length > 0);
          }
        },

        trigger: {
          blur: function() {
            var
              events        = document.createEvent('HTMLEvents'),
              promptElement = $prompt[0]
            ;
            if(promptElement) {
              module.verbose('Triggering native blur event');
              events.initEvent('blur', false, false);
              promptElement.dispatchEvent(events);
            }
          }
        },

        get: {
          inputEvent: function() {
            var
              prompt = $prompt[0],
              inputEvent   = (prompt !== undefined && prompt.oninput !== undefined)
                ? 'input'
                : (prompt !== undefined && prompt.onpropertychange !== undefined)
                  ? 'propertychange'
                  : 'keyup'
            ;
            return inputEvent;
          },
          value: function() {
            return $prompt.val();
          },
          results: function() {
            var
              results = $module.data(metadata.results)
            ;
            return results;
          },
          result: function(value, results) {
            var
              lookupFields = ['title', 'id'],
              result       = false
            ;
            value = (value !== undefined)
              ? value
              : module.get.value()
            ;
            results = (results !== undefined)
              ? results
              : module.get.results()
            ;
            if(settings.type === 'category') {
              module.debug('Finding result that matches', value);
              $.each(results, function(index, category) {
                if($.isArray(category.results)) {
                  result = module.search.object(value, category.results, lookupFields)[0];
                  // don't continue searching if a result is found
                  if(result) {
                    return false;
                  }
                }
              });
            }
            else {
              module.debug('Finding result in results object', value);
              result = module.search.object(value, results, lookupFields)[0];
            }
            return result || false;
          },
        },

        set: {
          focus: function() {
            $module.addClass(className.focus);
          },
          loading: function() {
            $module.addClass(className.loading);
          },
          value: function(value) {
            module.verbose('Setting search input value', value);
            $prompt
              .val(value)
            ;
          },
          type: function(type) {
            type = type || settings.type;
            if(settings.type == 'category') {
              $module.addClass(settings.type);
            }
          },
          buttonPressed: function() {
            $searchButton.addClass(className.pressed);
          }
        },

        remove: {
          loading: function() {
            $module.removeClass(className.loading);
          },
          focus: function() {
            $module.removeClass(className.focus);
          },
          buttonPressed: function() {
            $searchButton.removeClass(className.pressed);
          }
        },

        query: function() {
          var
            searchTerm = module.get.value(),
            cache = module.read.cache(searchTerm)
          ;
          if( module.has.minimumCharacters() )  {
            if(cache) {
              module.debug('Reading result from cache', searchTerm);
              module.save.results(cache.results);
              module.addResults(cache.html);
              module.inject.id(cache.results);
            }
            else {
              module.debug('Querying for', searchTerm);
              if($.isPlainObject(settings.source) || $.isArray(settings.source)) {
                module.search.local(searchTerm);
              }
              else if( module.can.useAPI() ) {
                module.search.remote(searchTerm);
              }
              else {
                module.error(error.source);
              }
            }
            settings.onSearchQuery.call(element, searchTerm);
          }
          else {
            module.hideResults();
          }
        },

        search: {
          local: function(searchTerm) {
            var
              results = module.search.object(searchTerm, settings.content),
              searchHTML
            ;
            module.set.loading();
            module.save.results(results);
            module.debug('Returned local search results', results);

            searchHTML = module.generateResults({
              results: results
            });
            module.remove.loading();
            module.addResults(searchHTML);
            module.inject.id(results);
            module.write.cache(searchTerm, {
              html    : searchHTML,
              results : results
            });
          },
          remote: function(searchTerm) {
            var
              apiSettings = {
                onSuccess : function(response) {
                  module.parse.response.call(element, response, searchTerm);
                },
                onFailure: function() {
                  module.displayMessage(error.serverError);
                },
                urlData: {
                  query: searchTerm
                }
              }
            ;
            if( !$module.api('get request') ) {
              module.setup.api();
            }
            $.extend(true, apiSettings, settings.apiSettings);
            module.debug('Executing search', apiSettings);
            module.cancel.query();
            $module
              .api('setting', apiSettings)
              .api('query')
            ;
          },
          object: function(searchTerm, source, searchFields) {
            var
              results      = [],
              fuzzyResults = [],
              searchExp    = searchTerm.toString().replace(regExp.escape, '\\$&'),
              matchRegExp  = new RegExp(regExp.beginsWith + searchExp, 'i'),

              // avoid duplicates when pushing results
              addResult = function(array, result) {
                var
                  notResult      = ($.inArray(result, results) == -1),
                  notFuzzyResult = ($.inArray(result, fuzzyResults) == -1)
                ;
                if(notResult && notFuzzyResult) {
                  array.push(result);
                }
              }
            ;
            source = source || settings.source;
            searchFields = (searchFields !== undefined)
              ? searchFields
              : settings.searchFields
            ;

            // search fields should be array to loop correctly
            if(!$.isArray(searchFields)) {
              searchFields = [searchFields];
            }

            // exit conditions if no source
            if(source === undefined || source === false) {
              module.error(error.source);
              return [];
            }

            // iterate through search fields looking for matches
            $.each(searchFields, function(index, field) {
              $.each(source, function(label, content) {
                var
                  fieldExists = (typeof content[field] == 'string')
                ;
                if(fieldExists) {
                  if( content[field].search(matchRegExp) !== -1) {
                    // content starts with value (first in results)
                    addResult(results, content);
                  }
                  else if(settings.searchFullText && module.fuzzySearch(searchTerm, content[field]) ) {
                    // content fuzzy matches (last in results)
                    addResult(fuzzyResults, content);
                  }
                }
              });
            });
            return $.merge(results, fuzzyResults);
          }
        },

        fuzzySearch: function(query, term) {
          var
            termLength  = term.length,
            queryLength = query.length
          ;
          if(typeof query !== 'string') {
            return false;
          }
          query = query.toLowerCase();
          term  = term.toLowerCase();
          if(queryLength > termLength) {
            return false;
          }
          if(queryLength === termLength) {
            return (query === term);
          }
          search: for (var characterIndex = 0, nextCharacterIndex = 0; characterIndex < queryLength; characterIndex++) {
            var
              queryCharacter = query.charCodeAt(characterIndex)
            ;
            while(nextCharacterIndex < termLength) {
              if(term.charCodeAt(nextCharacterIndex++) === queryCharacter) {
                continue search;
              }
            }
            return false;
          }
          return true;
        },

        parse: {
          response: function(response, searchTerm) {
            var
              searchHTML = module.generateResults(response)
            ;
            module.verbose('Parsing server response', response);
            if(response !== undefined) {
              if(searchTerm !== undefined && response[fields.results] !== undefined) {
                module.addResults(searchHTML);
                module.inject.id(response[fields.results]);
                module.write.cache(searchTerm, {
                  html    : searchHTML,
                  results : response[fields.results]
                });
                module.save.results(response[fields.results]);
              }
            }
          }
        },

        cancel: {
          query: function() {
            if( module.can.useAPI() ) {
              $module.api('abort');
            }
          }
        },

        has: {
          minimumCharacters: function() {
            var
              searchTerm    = module.get.value(),
              numCharacters = searchTerm.length
            ;
            return (numCharacters >= settings.minCharacters);
          }
        },

        clear: {
          cache: function(value) {
            var
              cache = $module.data(metadata.cache)
            ;
            if(!value) {
              module.debug('Clearing cache', value);
              $module.removeData(metadata.cache);
            }
            else if(value && cache && cache[value]) {
              module.debug('Removing value from cache', value);
              delete cache[value];
              $module.data(metadata.cache, cache);
            }
          }
        },

        read: {
          cache: function(name) {
            var
              cache = $module.data(metadata.cache)
            ;
            if(settings.cache) {
              module.verbose('Checking cache for generated html for query', name);
              return (typeof cache == 'object') && (cache[name] !== undefined)
                ? cache[name]
                : false
              ;
            }
            return false;
          }
        },

        create: {
          id: function(resultIndex, categoryIndex) {
            var
              resultID      = (resultIndex + 1), // not zero indexed
              categoryID    = (categoryIndex + 1),
              firstCharCode,
              letterID,
              id
            ;
            if(categoryIndex !== undefined) {
              // start char code for "A"
              letterID = String.fromCharCode(97 + categoryIndex);
              id          = letterID + resultID;
              module.verbose('Creating category result id', id);
            }
            else {
              id = resultID;
              module.verbose('Creating result id', id);
            }
            return id;
          },
          results: function() {
            if($results.length === 0) {
              $results = $('<div />')
                .addClass(className.results)
                .appendTo($module)
              ;
            }
          }
        },

        inject: {
          result: function(result, resultIndex, categoryIndex) {
            module.verbose('Injecting result into results');
            var
              $selectedResult = (categoryIndex !== undefined)
                ? $results
                    .children().eq(categoryIndex)
                      .children(selector.result).eq(resultIndex)
                : $results
                    .children(selector.result).eq(resultIndex)
            ;
            module.verbose('Injecting results metadata', $selectedResult);
            $selectedResult
              .data(metadata.result, result)
            ;
          },
          id: function(results) {
            module.debug('Injecting unique ids into results');
            var
              // since results may be object, we must use counters
              categoryIndex = 0,
              resultIndex   = 0
            ;
            if(settings.type === 'category') {
              // iterate through each category result
              $.each(results, function(index, category) {
                resultIndex = 0;
                $.each(category.results, function(index, value) {
                  var
                    result = category.results[index]
                  ;
                  if(result.id === undefined) {
                    result.id = module.create.id(resultIndex, categoryIndex);
                  }
                  module.inject.result(result, resultIndex, categoryIndex);
                  resultIndex++;
                });
                categoryIndex++;
              });
            }
            else {
              // top level
              $.each(results, function(index, value) {
                var
                  result = results[index]
                ;
                if(result.id === undefined) {
                  result.id = module.create.id(resultIndex);
                }
                module.inject.result(result, resultIndex);
                resultIndex++;
              });
            }
            return results;
          }
        },

        save: {
          results: function(results) {
            module.verbose('Saving current search results to metadata', results);
            $module.data(metadata.results, results);
          }
        },

        write: {
          cache: function(name, value) {
            var
              cache = ($module.data(metadata.cache) !== undefined)
                ? $module.data(metadata.cache)
                : {}
            ;
            if(settings.cache) {
              module.verbose('Writing generated html to cache', name, value);
              cache[name] = value;
              $module
                .data(metadata.cache, cache)
              ;
            }
          }
        },

        addResults: function(html) {
          if( $.isFunction(settings.onResultsAdd) ) {
            if( settings.onResultsAdd.call($results, html) === false ) {
              module.debug('onResultsAdd callback cancelled default action');
              return false;
            }
          }
          $results
            .html(html)
          ;
          if( module.can.show() ) {
            module.showResults();
          }
        },

        showResults: function() {
          if(!module.is.visible()) {
            if( module.can.transition() ) {
              module.debug('Showing results with css animations');
              $results
                .transition({
                  animation  : settings.transition + ' in',
                  debug      : settings.debug,
                  verbose    : settings.verbose,
                  duration   : settings.duration,
                  queue      : true
                })
              ;
            }
            else {
              module.debug('Showing results with javascript');
              $results
                .stop()
                .fadeIn(settings.duration, settings.easing)
              ;
            }
            settings.onResultsOpen.call($results);
          }
        },
        hideResults: function() {
          if( module.is.visible() ) {
            if( module.can.transition() ) {
              module.debug('Hiding results with css animations');
              $results
                .transition({
                  animation  : settings.transition + ' out',
                  debug      : settings.debug,
                  verbose    : settings.verbose,
                  duration   : settings.duration,
                  queue      : true
                })
              ;
            }
            else {
              module.debug('Hiding results with javascript');
              $results
                .stop()
                .fadeOut(settings.duration, settings.easing)
              ;
            }
            settings.onResultsClose.call($results);
          }
        },

        generateResults: function(response) {
          module.debug('Generating html from response', response);
          var
            template       = settings.templates[settings.type],
            isProperObject = ($.isPlainObject(response[fields.results]) && !$.isEmptyObject(response[fields.results])),
            isProperArray  = ($.isArray(response[fields.results]) && response[fields.results].length > 0),
            html           = ''
          ;
          if(isProperObject || isProperArray ) {
            if(settings.maxResults > 0) {
              if(isProperObject) {
                if(settings.type == 'standard') {
                  module.error(error.maxResults);
                }
              }
              else {
                response[fields.results] = response[fields.results].slice(0, settings.maxResults);
              }
            }
            if($.isFunction(template)) {
              html = template(response, fields);
            }
            else {
              module.error(error.noTemplate, false);
            }
          }
          else {
            html = module.displayMessage(error.noResults, 'empty');
          }
          settings.onResults.call(element, response);
          return html;
        },

        displayMessage: function(text, type) {
          type = type || 'standard';
          module.debug('Displaying message', text, type);
          module.addResults( settings.templates.message(text, type) );
          return settings.templates.message(text, type);
        },

        setting: function(name, value) {
          if( $.isPlainObject(name) ) {
            $.extend(true, settings, name);
          }
          else if(value !== undefined) {
            settings[name] = value;
          }
          else {
            return settings[name];
          }
        },
        internal: function(name, value) {
          if( $.isPlainObject(name) ) {
            $.extend(true, module, name);
          }
          else if(value !== undefined) {
            module[name] = value;
          }
          else {
            return module[name];
          }
        },
        debug: function() {
          if(settings.debug) {
            if(settings.performance) {
              module.performance.log(arguments);
            }
            else {
              module.debug = Function.prototype.bind.call(console.info, console, settings.name + ':');
              module.debug.apply(console, arguments);
            }
          }
        },
        verbose: function() {
          if(settings.verbose && settings.debug) {
            if(settings.performance) {
              module.performance.log(arguments);
            }
            else {
              module.verbose = Function.prototype.bind.call(console.info, console, settings.name + ':');
              module.verbose.apply(console, arguments);
            }
          }
        },
        error: function() {
          module.error = Function.prototype.bind.call(console.error, console, settings.name + ':');
          module.error.apply(console, arguments);
        },
        performance: {
          log: function(message) {
            var
              currentTime,
              executionTime,
              previousTime
            ;
            if(settings.performance) {
              currentTime   = new Date().getTime();
              previousTime  = time || currentTime;
              executionTime = currentTime - previousTime;
              time          = currentTime;
              performance.push({
                'Name'           : message[0],
                'Arguments'      : [].slice.call(message, 1) || '',
                'Element'        : element,
                'Execution Time' : executionTime
              });
            }
            clearTimeout(module.performance.timer);
            module.performance.timer = setTimeout(module.performance.display, 500);
          },
          display: function() {
            var
              title = settings.name + ':',
              totalTime = 0
            ;
            time = false;
            clearTimeout(module.performance.timer);
            $.each(performance, function(index, data) {
              totalTime += data['Execution Time'];
            });
            title += ' ' + totalTime + 'ms';
            if(moduleSelector) {
              title += ' \'' + moduleSelector + '\'';
            }
            if($allModules.length > 1) {
              title += ' ' + '(' + $allModules.length + ')';
            }
            if( (console.group !== undefined || console.table !== undefined) && performance.length > 0) {
              console.groupCollapsed(title);
              if(console.table) {
                console.table(performance);
              }
              else {
                $.each(performance, function(index, data) {
                  console.log(data['Name'] + ': ' + data['Execution Time']+'ms');
                });
              }
              console.groupEnd();
            }
            performance = [];
          }
        },
        invoke: function(query, passedArguments, context) {
          var
            object = instance,
            maxDepth,
            found,
            response
          ;
          passedArguments = passedArguments || queryArguments;
          context         = element         || context;
          if(typeof query == 'string' && object !== undefined) {
            query    = query.split(/[\. ]/);
            maxDepth = query.length - 1;
            $.each(query, function(depth, value) {
              var camelCaseValue = (depth != maxDepth)
                ? value + query[depth + 1].charAt(0).toUpperCase() + query[depth + 1].slice(1)
                : query
              ;
              if( $.isPlainObject( object[camelCaseValue] ) && (depth != maxDepth) ) {
                object = object[camelCaseValue];
              }
              else if( object[camelCaseValue] !== undefined ) {
                found = object[camelCaseValue];
                return false;
              }
              else if( $.isPlainObject( object[value] ) && (depth != maxDepth) ) {
                object = object[value];
              }
              else if( object[value] !== undefined ) {
                found = object[value];
                return false;
              }
              else {
                return false;
              }
            });
          }
          if( $.isFunction( found ) ) {
            response = found.apply(context, passedArguments);
          }
          else if(found !== undefined) {
            response = found;
          }
          if($.isArray(returnedValue)) {
            returnedValue.push(response);
          }
          else if(returnedValue !== undefined) {
            returnedValue = [returnedValue, response];
          }
          else if(response !== undefined) {
            returnedValue = response;
          }
          return found;
        }
      };
      if(methodInvoked) {
        if(instance === undefined) {
          module.initialize();
        }
        module.invoke(query);
      }
      else {
        if(instance !== undefined) {
          instance.invoke('destroy');
        }
        module.initialize();
      }

    })
  ;

  return (returnedValue !== undefined)
    ? returnedValue
    : this
  ;
};

$.fn.search.settings = {

  name           : 'Search',
  namespace      : 'search',

  debug          : false,
  verbose        : false,
  performance    : true,

  type           : 'standard',
  // template to use (specified in settings.templates)

  minCharacters  : 1,
  // minimum characters required to search

  apiSettings    : false,
  // API config

  source         : false,
  // object to search

  searchFields   : [
    'title',
    'description'
  ],
  // fields to search

  displayField   : '',
  // field to display in standard results template

  searchFullText : true,
  // whether to include fuzzy results in local search

  automatic      : true,
  // whether to add events to prompt automatically

  hideDelay      : 0,
  // delay before hiding menu after blur

  searchDelay    : 200,
  // delay before searching

  maxResults     : 7,
  // maximum results returned from local

  cache          : true,
  // whether to store lookups in local cache

  // transition settings
  transition     : 'scale',
  duration       : 200,
  easing         : 'easeOutExpo',

  // callbacks
  onSelect       : false,
  onResultsAdd   : false,

  onSearchQuery  : function(query){},
  onResults      : function(response){},

  onResultsOpen  : function(){},
  onResultsClose : function(){},

  className: {
    active  : 'active',
    empty   : 'empty',
    focus   : 'focus',
    loading : 'loading',
    results : 'results',
    pressed : 'down'
  },

  error : {
    source      : 'Cannot search. No source used, and Semantic API module was not included',
    noResults   : 'Your search returned no results',
    logging     : 'Error in debug logging, exiting.',
    noEndpoint  : 'No search endpoint was specified',
    noTemplate  : 'A valid template name was not specified.',
    serverError : 'There was an issue querying the server.',
    maxResults  : 'Results must be an array to use maxResults setting',
    method      : 'The method you called is not defined.'
  },

  metadata: {
    cache   : 'cache',
    results : 'results',
    result  : 'result'
  },

  regExp: {
    escape     : /[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g,
    beginsWith : '(?:\s|^)'
  },

  // maps api response attributes to internal representation
  fields: {
    categories      : 'results',     // array of categories (category view)
    categoryName    : 'name',        // name of category (category view)
    categoryResults : 'results',     // array of results (category view)
    description     : 'description', // result description
    image           : 'image',       // result image
    price           : 'price',       // result price
    results         : 'results',     // array of results (standard)
    title           : 'title',       // result title
    url             : 'url',         // result url
    action          : 'action',      // "view more" object name
    actionText      : 'text',        // "view more" text
    actionURL       : 'url'          // "view more" url
  },

  selector : {
    prompt       : '.prompt',
    searchButton : '.search.button',
    results      : '.results',
    category     : '.category',
    result       : '.result',
    title        : '.title, .name'
  },

  templates: {
    escape: function(string) {
      var
        badChars     = /[&<>"'`]/g,
        shouldEscape = /[&<>"'`]/,
        escape       = {
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#x27;",
          "`": "&#x60;"
        },
        escapedChar  = function(chr) {
          return escape[chr];
        }
      ;
      if(shouldEscape.test(string)) {
        return string.replace(badChars, escapedChar);
      }
      return string;
    },
    message: function(message, type) {
      var
        html = ''
      ;
      if(message !== undefined && type !== undefined) {
        html +=  ''
          + '<div class="message ' + type + '">'
        ;
        // message type
        if(type == 'empty') {
          html += ''
            + '<div class="header">No Results</div class="header">'
            + '<div class="description">' + message + '</div class="description">'
          ;
        }
        else {
          html += ' <div class="description">' + message + '</div>';
        }
        html += '</div>';
      }
      return html;
    },
    category: function(response, fields) {
      var
        html = '',
        escape = $.fn.search.settings.templates.escape
      ;
      if(response[fields.categoryResults] !== undefined) {

        // each category
        $.each(response[fields.categoryResults], function(index, category) {
          if(category[fields.results] !== undefined && category.results.length > 0) {

            html  += '<div class="category">';

            if(category[fields.categoryName] !== undefined) {
              html += '<div class="name">' + category[fields.categoryName] + '</div>';
            }

            // each item inside category
            $.each(category.results, function(index, result) {
              if(result[fields.url]) {
                html  += '<a class="result" href="' + result[fields.url] + '">';
              }
              else {
                html  += '<a class="result">';
              }
              if(result[fields.image] !== undefined) {
                html += ''
                  + '<div class="image">'
                  + ' <img src="' + result[fields.image] + '">'
                  + '</div>'
                ;
              }
              html += '<div class="content">';
              if(result[fields.price] !== undefined) {
                html += '<div class="price">' + result[fields.price] + '</div>';
              }
              if(result[fields.title] !== undefined) {
                html += '<div class="title">' + result[fields.title] + '</div>';
              }
              if(result[fields.description] !== undefined) {
                html += '<div class="description">' + result[fields.description] + '</div>';
              }
              html  += ''
                + '</div>'
              ;
              html += '</a>';
            });
            html  += ''
              + '</div>'
            ;
          }
        });
        if(response[fields.action]) {
          html += ''
          + '<a href="' + response[fields.action][fields.actionURL] + '" class="action">'
          +   response[fields.action][fields.actionText]
          + '</a>';
        }
        return html;
      }
      return false;
    },
    standard: function(response, fields) {
      var
        html = ''
      ;
      if(response[fields.results] !== undefined) {

        // each result
        $.each(response[fields.results], function(index, result) {
          if(result[fields.url]) {
            html  += '<a class="result" href="' + result[fields.url] + '">';
          }
          else {
            html  += '<a class="result">';
          }
          if(result[fields.image] !== undefined) {
            html += ''
              + '<div class="image">'
              + ' <img src="' + result[fields.image] + '">'
              + '</div>'
            ;
          }
          html += '<div class="content">';
          if(result[fields.price] !== undefined) {
            html += '<div class="price">' + result[fields.price] + '</div>';
          }
          if(result[fields.title] !== undefined) {
            html += '<div class="title">' + result[fields.title] + '</div>';
          }
          if(result[fields.description] !== undefined) {
            html += '<div class="description">' + result[fields.description] + '</div>';
          }
          html  += ''
            + '</div>'
          ;
          html += '</a>';
        });

        if(response[fields.action]) {
          html += ''
          + '<a href="' + response[fields.action][fields.actionURL] + '" class="action">'
          +   response[fields.action][fields.actionText]
          + '</a>';
        }
        return html;
      }
      return false;
    }
  }
};

})( jQuery, window, document );

/*!
 * # Semantic UI 2.1.6 - Shape
 * http://github.com/semantic-org/semantic-ui/
 *
 *
 * Copyright 2015 Contributors
 * Released under the MIT license
 * http://opensource.org/licenses/MIT
 *
 */

;(function ( $, window, document, undefined ) {

"use strict";

$.fn.shape = function(parameters) {
  var
    $allModules     = $(this),
    $body           = $('body'),

    time            = new Date().getTime(),
    performance     = [],

    query           = arguments[0],
    methodInvoked   = (typeof query == 'string'),
    queryArguments  = [].slice.call(arguments, 1),

    requestAnimationFrame = window.requestAnimationFrame
      || window.mozRequestAnimationFrame
      || window.webkitRequestAnimationFrame
      || window.msRequestAnimationFrame
      || function(callback) { setTimeout(callback, 0); },

    returnedValue
  ;

  $allModules
    .each(function() {
      var
        moduleSelector = $allModules.selector || '',
        settings       = ( $.isPlainObject(parameters) )
          ? $.extend(true, {}, $.fn.shape.settings, parameters)
          : $.extend({}, $.fn.shape.settings),

        // internal aliases
        namespace     = settings.namespace,
        selector      = settings.selector,
        error         = settings.error,
        className     = settings.className,

        // define namespaces for modules
        eventNamespace  = '.' + namespace,
        moduleNamespace = 'module-' + namespace,

        // selector cache
        $module       = $(this),
        $sides        = $module.find(selector.sides),
        $side         = $module.find(selector.side),

        // private variables
        nextIndex = false,
        $activeSide,
        $nextSide,

        // standard module
        element       = this,
        instance      = $module.data(moduleNamespace),
        module
      ;

      module = {

        initialize: function() {
          module.verbose('Initializing module for', element);
          module.set.defaultSide();
          module.instantiate();
        },

        instantiate: function() {
          module.verbose('Storing instance of module', module);
          instance = module;
          $module
            .data(moduleNamespace, instance)
          ;
        },

        destroy: function() {
          module.verbose('Destroying previous module for', element);
          $module
            .removeData(moduleNamespace)
            .off(eventNamespace)
          ;
        },

        refresh: function() {
          module.verbose('Refreshing selector cache for', element);
          $module = $(element);
          $sides  = $(this).find(selector.shape);
          $side   = $(this).find(selector.side);
        },

        repaint: function() {
          module.verbose('Forcing repaint event');
          var
            shape          = $sides[0] || document.createElement('div'),
            fakeAssignment = shape.offsetWidth
          ;
        },

        animate: function(propertyObject, callback) {
          module.verbose('Animating box with properties', propertyObject);
          callback = callback || function(event) {
            module.verbose('Executing animation callback');
            if(event !== undefined) {
              event.stopPropagation();
            }
            module.reset();
            module.set.active();
          };
          settings.beforeChange.call($nextSide[0]);
          if(module.get.transitionEvent()) {
            module.verbose('Starting CSS animation');
            $module
              .addClass(className.animating)
            ;
            $sides
              .css(propertyObject)
              .one(module.get.transitionEvent(), callback)
            ;
            module.set.duration(settings.duration);
            requestAnimationFrame(function() {
              $module
                .addClass(className.animating)
              ;
              $activeSide
                .addClass(className.hidden)
              ;
            });
          }
          else {
            callback();
          }
        },

        queue: function(method) {
          module.debug('Queueing animation of', method);
          $sides
            .one(module.get.transitionEvent(), function() {
              module.debug('Executing queued animation');
              setTimeout(function(){
                $module.shape(method);
              }, 0);
            })
          ;
        },

        reset: function() {
          module.verbose('Animating states reset');
          $module
            .removeClass(className.animating)
            .attr('style', '')
            .removeAttr('style')
          ;
          // removeAttr style does not consistently work in safari
          $sides
            .attr('style', '')
            .removeAttr('style')
          ;
          $side
            .attr('style', '')
            .removeAttr('style')
            .removeClass(className.hidden)
          ;
          $nextSide
            .removeClass(className.animating)
            .attr('style', '')
            .removeAttr('style')
          ;
        },

        is: {
          complete: function() {
            return ($side.filter('.' + className.active)[0] == $nextSide[0]);
          },
          animating: function() {
            return $module.hasClass(className.animating);
          }
        },

        set: {

          defaultSide: function() {
            $activeSide = $module.find('.' + settings.className.active);
            $nextSide   = ( $activeSide.next(selector.side).length > 0 )
              ? $activeSide.next(selector.side)
              : $module.find(selector.side).first()
            ;
            nextIndex = false;
            module.verbose('Active side set to', $activeSide);
            module.verbose('Next side set to', $nextSide);
          },

          duration: function(duration) {
            duration = duration || settings.duration;
            duration = (typeof duration == 'number')
              ? duration + 'ms'
              : duration
            ;
            module.verbose('Setting animation duration', duration);
            if(settings.duration || settings.duration === 0) {
              $sides.add($side)
                .css({
                  '-webkit-transition-duration': duration,
                  '-moz-transition-duration': duration,
                  '-ms-transition-duration': duration,
                  '-o-transition-duration': duration,
                  'transition-duration': duration
                })
              ;
            }
          },

          currentStageSize: function() {
            var
              $activeSide = $module.find('.' + settings.className.active),
              width       = $activeSide.outerWidth(true),
              height      = $activeSide.outerHeight(true)
            ;
            $module
              .css({
                width: width,
                height: height
              })
            ;
          },

          stageSize: function() {
            var
              $clone      = $module.clone().addClass(className.loading),
              $activeSide = $clone.find('.' + settings.className.active),
              $nextSide   = (nextIndex)
                ? $clone.find(selector.side).eq(nextIndex)
                : ( $activeSide.next(selector.side).length > 0 )
                  ? $activeSide.next(selector.side)
                  : $clone.find(selector.side).first(),
              newSize = {}
            ;
            module.set.currentStageSize();
            $activeSide.removeClass(className.active);
            $nextSide.addClass(className.active);
            $clone.insertAfter($module);
            newSize = {
              width  : $nextSide.outerWidth(true),
              height : $nextSide.outerHeight(true)
            };
            $clone.remove();
            $module
              .css(newSize)
            ;
            module.verbose('Resizing stage to fit new content', newSize);
          },

          nextSide: function(selector) {
            nextIndex = selector;
            $nextSide = $side.filter(selector);
            nextIndex = $side.index($nextSide);
            if($nextSide.length === 0) {
              module.set.defaultSide();
              module.error(error.side);
            }
            module.verbose('Next side manually set to', $nextSide);
          },

          active: function() {
            module.verbose('Setting new side to active', $nextSide);
            $side
              .removeClass(className.active)
            ;
            $nextSide
              .addClass(className.active)
            ;
            settings.onChange.call($nextSide[0]);
            module.set.defaultSide();
          }
        },

        flip: {

          up: function() {
            if(module.is.complete() && !module.is.animating() && !settings.allowRepeats) {
              module.debug('Side already visible', $nextSide);
              return;
            }
            if( !module.is.animating()) {
              module.debug('Flipping up', $nextSide);
              module.set.stageSize();
              module.stage.above();
              module.animate( module.get.transform.up() );
            }
            else {
              module.queue('flip up');
            }
          },

          down: function() {
            if(module.is.complete() && !module.is.animating() && !settings.allowRepeats) {
              module.debug('Side already visible', $nextSide);
              return;
            }
            if( !module.is.animating()) {
              module.debug('Flipping down', $nextSide);
              module.set.stageSize();
              module.stage.below();
              module.animate( module.get.transform.down() );
            }
            else {
              module.queue('flip down');
            }
          },

          left: function() {
            if(module.is.complete() && !module.is.animating() && !settings.allowRepeats) {
              module.debug('Side already visible', $nextSide);
              return;
            }
            if( !module.is.animating()) {
              module.debug('Flipping left', $nextSide);
              module.set.stageSize();
              module.stage.left();
              module.animate(module.get.transform.left() );
            }
            else {
              module.queue('flip left');
            }
          },

          right: function() {
            if(module.is.complete() && !module.is.animating() && !settings.allowRepeats) {
              module.debug('Side already visible', $nextSide);
              return;
            }
            if( !module.is.animating()) {
              module.debug('Flipping right', $nextSide);
              module.set.stageSize();
              module.stage.right();
              module.animate(module.get.transform.right() );
            }
            else {
              module.queue('flip right');
            }
          },

          over: function() {
            if(module.is.complete() && !module.is.animating() && !settings.allowRepeats) {
              module.debug('Side already visible', $nextSide);
              return;
            }
            if( !module.is.animating()) {
              module.debug('Flipping over', $nextSide);
              module.set.stageSize();
              module.stage.behind();
              module.animate(module.get.transform.over() );
            }
            else {
              module.queue('flip over');
            }
          },

          back: function() {
            if(module.is.complete() && !module.is.animating() && !settings.allowRepeats) {
              module.debug('Side already visible', $nextSide);
              return;
            }
            if( !module.is.animating()) {
              module.debug('Flipping back', $nextSide);
              module.set.stageSize();
              module.stage.behind();
              module.animate(module.get.transform.back() );
            }
            else {
              module.queue('flip back');
            }
          }

        },

        get: {

          transform: {
            up: function() {
              var
                translate = {
                  y: -(($activeSide.outerHeight(true) - $nextSide.outerHeight(true)) / 2),
                  z: -($activeSide.outerHeight(true) / 2)
                }
              ;
              return {
                transform: 'translateY(' + translate.y + 'px) translateZ('+ translate.z + 'px) rotateX(-90deg)'
              };
            },

            down: function() {
              var
                translate = {
                  y: -(($activeSide.outerHeight(true) - $nextSide.outerHeight(true)) / 2),
                  z: -($activeSide.outerHeight(true) / 2)
                }
              ;
              return {
                transform: 'translateY(' + translate.y + 'px) translateZ('+ translate.z + 'px) rotateX(90deg)'
              };
            },

            left: function() {
              var
                translate = {
                  x : -(($activeSide.outerWidth(true) - $nextSide.outerWidth(true)) / 2),
                  z : -($activeSide.outerWidth(true) / 2)
                }
              ;
              return {
                transform: 'translateX(' + translate.x + 'px) translateZ(' + translate.z + 'px) rotateY(90deg)'
              };
            },

            right: function() {
              var
                translate = {
                  x : -(($activeSide.outerWidth(true) - $nextSide.outerWidth(true)) / 2),
                  z : -($activeSide.outerWidth(true) / 2)
                }
              ;
              return {
                transform: 'translateX(' + translate.x + 'px) translateZ(' + translate.z + 'px) rotateY(-90deg)'
              };
            },

            over: function() {
              var
                translate = {
                  x : -(($activeSide.outerWidth(true) - $nextSide.outerWidth(true)) / 2)
                }
              ;
              return {
                transform: 'translateX(' + translate.x + 'px) rotateY(180deg)'
              };
            },

            back: function() {
              var
                translate = {
                  x : -(($activeSide.outerWidth(true) - $nextSide.outerWidth(true)) / 2)
                }
              ;
              return {
                transform: 'translateX(' + translate.x + 'px) rotateY(-180deg)'
              };
            }
          },

          transitionEvent: function() {
            var
              element     = document.createElement('element'),
              transitions = {
                'transition'       :'transitionend',
                'OTransition'      :'oTransitionEnd',
                'MozTransition'    :'transitionend',
                'WebkitTransition' :'webkitTransitionEnd'
              },
              transition
            ;
            for(transition in transitions){
              if( element.style[transition] !== undefined ){
                return transitions[transition];
              }
            }
          },

          nextSide: function() {
            return ( $activeSide.next(selector.side).length > 0 )
              ? $activeSide.next(selector.side)
              : $module.find(selector.side).first()
            ;
          }

        },

        stage: {

          above: function() {
            var
              box = {
                origin : (($activeSide.outerHeight(true) - $nextSide.outerHeight(true)) / 2),
                depth  : {
                  active : ($nextSide.outerHeight(true) / 2),
                  next   : ($activeSide.outerHeight(true) / 2)
                }
              }
            ;
            module.verbose('Setting the initial animation position as above', $nextSide, box);
            $sides
              .css({
                'transform' : 'translateZ(-' + box.depth.active + 'px)'
              })
            ;
            $activeSide
              .css({
                'transform' : 'rotateY(0deg) translateZ(' + box.depth.active + 'px)'
              })
            ;
            $nextSide
              .addClass(className.animating)
              .css({
                'top'       : box.origin + 'px',
                'transform' : 'rotateX(90deg) translateZ(' + box.depth.next + 'px)'
              })
            ;
          },

          below: function() {
            var
              box = {
                origin : (($activeSide.outerHeight(true) - $nextSide.outerHeight(true)) / 2),
                depth  : {
                  active : ($nextSide.outerHeight(true) / 2),
                  next   : ($activeSide.outerHeight(true) / 2)
                }
              }
            ;
            module.verbose('Setting the initial animation position as below', $nextSide, box);
            $sides
              .css({
                'transform' : 'translateZ(-' + box.depth.active + 'px)'
              })
            ;
            $activeSide
              .css({
                'transform' : 'rotateY(0deg) translateZ(' + box.depth.active + 'px)'
              })
            ;
            $nextSide
              .addClass(className.animating)
              .css({
                'top'       : box.origin + 'px',
                'transform' : 'rotateX(-90deg) translateZ(' + box.depth.next + 'px)'
              })
            ;
          },

          left: function() {
            var
              height = {
                active : $activeSide.outerWidth(true),
                next   : $nextSide.outerWidth(true)
              },
              box = {
                origin : ( ( height.active - height.next ) / 2),
                depth  : {
                  active : (height.next / 2),
                  next   : (height.active / 2)
                }
              }
            ;
            module.verbose('Setting the initial animation position as left', $nextSide, box);
            $sides
              .css({
                'transform' : 'translateZ(-' + box.depth.active + 'px)'
              })
            ;
            $activeSide
              .css({
                'transform' : 'rotateY(0deg) translateZ(' + box.depth.active + 'px)'
              })
            ;
            $nextSide
              .addClass(className.animating)
              .css({
                'left'      : box.origin + 'px',
                'transform' : 'rotateY(-90deg) translateZ(' + box.depth.next + 'px)'
              })
            ;
          },

          right: function() {
            var
              height = {
                active : $activeSide.outerWidth(true),
                next   : $nextSide.outerWidth(true)
              },
              box = {
                origin : ( ( height.active - height.next ) / 2),
                depth  : {
                  active : (height.next / 2),
                  next   : (height.active / 2)
                }
              }
            ;
            module.verbose('Setting the initial animation position as left', $nextSide, box);
            $sides
              .css({
                'transform' : 'translateZ(-' + box.depth.active + 'px)'
              })
            ;
            $activeSide
              .css({
                'transform' : 'rotateY(0deg) translateZ(' + box.depth.active + 'px)'
              })
            ;
            $nextSide
              .addClass(className.animating)
              .css({
                'left'      : box.origin + 'px',
                'transform' : 'rotateY(90deg) translateZ(' + box.depth.next + 'px)'
              })
            ;
          },

          behind: function() {
            var
              height = {
                active : $activeSide.outerWidth(true),
                next   : $nextSide.outerWidth(true)
              },
              box = {
                origin : ( ( height.active - height.next ) / 2),
                depth  : {
                  active : (height.next / 2),
                  next   : (height.active / 2)
                }
              }
            ;
            module.verbose('Setting the initial animation position as behind', $nextSide, box);
            $activeSide
              .css({
                'transform' : 'rotateY(0deg)'
              })
            ;
            $nextSide
              .addClass(className.animating)
              .css({
                'left'      : box.origin + 'px',
                'transform' : 'rotateY(-180deg)'
              })
            ;
          }
        },
        setting: function(name, value) {
          module.debug('Changing setting', name, value);
          if( $.isPlainObject(name) ) {
            $.extend(true, settings, name);
          }
          else if(value !== undefined) {
            settings[name] = value;
          }
          else {
            return settings[name];
          }
        },
        internal: function(name, value) {
          if( $.isPlainObject(name) ) {
            $.extend(true, module, name);
          }
          else if(value !== undefined) {
            module[name] = value;
          }
          else {
            return module[name];
          }
        },
        debug: function() {
          if(settings.debug) {
            if(settings.performance) {
              module.performance.log(arguments);
            }
            else {
              module.debug = Function.prototype.bind.call(console.info, console, settings.name + ':');
              module.debug.apply(console, arguments);
            }
          }
        },
        verbose: function() {
          if(settings.verbose && settings.debug) {
            if(settings.performance) {
              module.performance.log(arguments);
            }
            else {
              module.verbose = Function.prototype.bind.call(console.info, console, settings.name + ':');
              module.verbose.apply(console, arguments);
            }
          }
        },
        error: function() {
          module.error = Function.prototype.bind.call(console.error, console, settings.name + ':');
          module.error.apply(console, arguments);
        },
        performance: {
          log: function(message) {
            var
              currentTime,
              executionTime,
              previousTime
            ;
            if(settings.performance) {
              currentTime   = new Date().getTime();
              previousTime  = time || currentTime;
              executionTime = currentTime - previousTime;
              time          = currentTime;
              performance.push({
                'Name'           : message[0],
                'Arguments'      : [].slice.call(message, 1) || '',
                'Element'        : element,
                'Execution Time' : executionTime
              });
            }
            clearTimeout(module.performance.timer);
            module.performance.timer = setTimeout(module.performance.display, 500);
          },
          display: function() {
            var
              title = settings.name + ':',
              totalTime = 0
            ;
            time = false;
            clearTimeout(module.performance.timer);
            $.each(performance, function(index, data) {
              totalTime += data['Execution Time'];
            });
            title += ' ' + totalTime + 'ms';
            if(moduleSelector) {
              title += ' \'' + moduleSelector + '\'';
            }
            if($allModules.length > 1) {
              title += ' ' + '(' + $allModules.length + ')';
            }
            if( (console.group !== undefined || console.table !== undefined) && performance.length > 0) {
              console.groupCollapsed(title);
              if(console.table) {
                console.table(performance);
              }
              else {
                $.each(performance, function(index, data) {
                  console.log(data['Name'] + ': ' + data['Execution Time']+'ms');
                });
              }
              console.groupEnd();
            }
            performance = [];
          }
        },
        invoke: function(query, passedArguments, context) {
          var
            object = instance,
            maxDepth,
            found,
            response
          ;
          passedArguments = passedArguments || queryArguments;
          context         = element         || context;
          if(typeof query == 'string' && object !== undefined) {
            query    = query.split(/[\. ]/);
            maxDepth = query.length - 1;
            $.each(query, function(depth, value) {
              var camelCaseValue = (depth != maxDepth)
                ? value + query[depth + 1].charAt(0).toUpperCase() + query[depth + 1].slice(1)
                : query
              ;
              if( $.isPlainObject( object[camelCaseValue] ) && (depth != maxDepth) ) {
                object = object[camelCaseValue];
              }
              else if( object[camelCaseValue] !== undefined ) {
                found = object[camelCaseValue];
                return false;
              }
              else if( $.isPlainObject( object[value] ) && (depth != maxDepth) ) {
                object = object[value];
              }
              else if( object[value] !== undefined ) {
                found = object[value];
                return false;
              }
              else {
                return false;
              }
            });
          }
          if ( $.isFunction( found ) ) {
            response = found.apply(context, passedArguments);
          }
          else if(found !== undefined) {
            response = found;
          }
          if($.isArray(returnedValue)) {
            returnedValue.push(response);
          }
          else if(returnedValue !== undefined) {
            returnedValue = [returnedValue, response];
          }
          else if(response !== undefined) {
            returnedValue = response;
          }
          return found;
        }
      };

      if(methodInvoked) {
        if(instance === undefined) {
          module.initialize();
        }
        module.invoke(query);
      }
      else {
        if(instance !== undefined) {
          instance.invoke('destroy');
        }
        module.initialize();
      }
    })
  ;

  return (returnedValue !== undefined)
    ? returnedValue
    : this
  ;
};

$.fn.shape.settings = {

  // module info
  name : 'Shape',

  // debug content outputted to console
  debug      : false,

  // verbose debug output
  verbose    : false,

  // performance data output
  performance: true,

  // event namespace
  namespace  : 'shape',

  // callback occurs on side change
  beforeChange : function() {},
  onChange     : function() {},

  // allow animation to same side
  allowRepeats: false,

  // animation duration
  duration   : false,

  // possible errors
  error: {
    side   : 'You tried to switch to a side that does not exist.',
    method : 'The method you called is not defined'
  },

  // classnames used
  className   : {
    animating : 'animating',
    hidden    : 'hidden',
    loading   : 'loading',
    active    : 'active'
  },

  // selectors used
  selector    : {
    sides : '.sides',
    side  : '.side'
  }

};


})( jQuery, window, document );
/*!
 * # Semantic UI 2.1.6 - Sidebar
 * http://github.com/semantic-org/semantic-ui/
 *
 *
 * Copyright 2015 Contributors
 * Released under the MIT license
 * http://opensource.org/licenses/MIT
 *
 */

;(function ( $, window, document, undefined ) {

"use strict";

$.fn.sidebar = function(parameters) {
  var
    $allModules     = $(this),
    $window         = $(window),
    $document       = $(document),
    $html           = $('html'),
    $head           = $('head'),

    moduleSelector  = $allModules.selector || '',

    time            = new Date().getTime(),
    performance     = [],

    query           = arguments[0],
    methodInvoked   = (typeof query == 'string'),
    queryArguments  = [].slice.call(arguments, 1),

    requestAnimationFrame = window.requestAnimationFrame
      || window.mozRequestAnimationFrame
      || window.webkitRequestAnimationFrame
      || window.msRequestAnimationFrame
      || function(callback) { setTimeout(callback, 0); },

    returnedValue
  ;

  $allModules
    .each(function() {
      var
        settings        = ( $.isPlainObject(parameters) )
          ? $.extend(true, {}, $.fn.sidebar.settings, parameters)
          : $.extend({}, $.fn.sidebar.settings),

        selector        = settings.selector,
        className       = settings.className,
        namespace       = settings.namespace,
        regExp          = settings.regExp,
        error           = settings.error,

        eventNamespace  = '.' + namespace,
        moduleNamespace = 'module-' + namespace,

        $module         = $(this),
        $context        = $(settings.context),

        $sidebars       = $module.children(selector.sidebar),
        $fixed          = $context.children(selector.fixed),
        $pusher         = $context.children(selector.pusher),
        $style,

        element         = this,
        instance        = $module.data(moduleNamespace),

        elementNamespace,
        id,
        currentScroll,
        transitionEvent,

        module
      ;

      module      = {

        initialize: function() {
          module.debug('Initializing sidebar', parameters);

          module.create.id();

          transitionEvent = module.get.transitionEvent();

          if(module.is.ios()) {
            module.set.ios();
          }

          // avoids locking rendering if initialized in onReady
          if(settings.delaySetup) {
            requestAnimationFrame(module.setup.layout);
          }
          else {
            module.setup.layout();
          }

          requestAnimationFrame(function() {
            module.setup.cache();
          });

          module.instantiate();
        },

        instantiate: function() {
          module.verbose('Storing instance of module', module);
          instance = module;
          $module
            .data(moduleNamespace, module)
          ;
        },

        create: {
          id: function() {
            id = (Math.random().toString(16) + '000000000').substr(2,8);
            elementNamespace = '.' + id;
            module.verbose('Creating unique id for element', id);
          }
        },

        destroy: function() {
          module.verbose('Destroying previous module for', $module);
          $module
            .off(eventNamespace)
            .removeData(moduleNamespace)
          ;
          if(module.is.ios()) {
            module.remove.ios();
          }
          // bound by uuid
          $context.off(elementNamespace);
          $window.off(elementNamespace);
          $document.off(elementNamespace);
        },

        event: {
          clickaway: function(event) {
            var
              clickedInPusher = ($pusher.find(event.target).length > 0 || $pusher.is(event.target)),
              clickedContext  = ($context.is(event.target))
            ;
            if(clickedInPusher) {
              module.verbose('User clicked on dimmed page');
              module.hide();
            }
            if(clickedContext) {
              module.verbose('User clicked on dimmable context (scaled out page)');
              module.hide();
            }
          },
          touch: function(event) {
            //event.stopPropagation();
          },
          containScroll: function(event) {
            if(element.scrollTop <= 0)  {
              element.scrollTop = 1;
            }
            if((element.scrollTop + element.offsetHeight) >= element.scrollHeight) {
              element.scrollTop = element.scrollHeight - element.offsetHeight - 1;
            }
          },
          scroll: function(event) {
            if( $(event.target).closest(selector.sidebar).length === 0 ) {
              event.preventDefault();
            }
          }
        },

        bind: {
          clickaway: function() {
            module.verbose('Adding clickaway events to context', $context);
            if(settings.closable) {
              $context
                .on('click'    + elementNamespace, module.event.clickaway)
                .on('touchend' + elementNamespace, module.event.clickaway)
              ;
            }
          },
          scrollLock: function() {
            if(settings.scrollLock) {
              module.debug('Disabling page scroll');
              $window
                .on('DOMMouseScroll' + elementNamespace, module.event.scroll)
              ;
            }
            module.verbose('Adding events to contain sidebar scroll');
            $document
              .on('touchmove' + elementNamespace, module.event.touch)
            ;
            $module
              .on('scroll' + eventNamespace, module.event.containScroll)
            ;
          }
        },
        unbind: {
          clickaway: function() {
            module.verbose('Removing clickaway events from context', $context);
            $context.off(elementNamespace);
          },
          scrollLock: function() {
            module.verbose('Removing scroll lock from page');
            $document.off(elementNamespace);
            $window.off(elementNamespace);
            $module.off('scroll' + eventNamespace);
          }
        },

        add: {
          inlineCSS: function() {
            var
              width     = module.cache.width  || $module.outerWidth(),
              height    = module.cache.height || $module.outerHeight(),
              isRTL     = module.is.rtl(),
              direction = module.get.direction(),
              distance  = {
                left   : width,
                right  : -width,
                top    : height,
                bottom : -height
              },
              style
            ;

            if(isRTL){
              module.verbose('RTL detected, flipping widths');
              distance.left = -width;
              distance.right = width;
            }

            style  = '<style>';

            if(direction === 'left' || direction === 'right') {
              module.debug('Adding CSS rules for animation distance', width);
              style  += ''
                + ' .ui.visible.' + direction + '.sidebar ~ .fixed,'
                + ' .ui.visible.' + direction + '.sidebar ~ .pusher {'
                + '   -webkit-transform: translate3d('+ distance[direction] + 'px, 0, 0);'
                + '           transform: translate3d('+ distance[direction] + 'px, 0, 0);'
                + ' }'
              ;
            }
            else if(direction === 'top' || direction == 'bottom') {
              style  += ''
                + ' .ui.visible.' + direction + '.sidebar ~ .fixed,'
                + ' .ui.visible.' + direction + '.sidebar ~ .pusher {'
                + '   -webkit-transform: translate3d(0, ' + distance[direction] + 'px, 0);'
                + '           transform: translate3d(0, ' + distance[direction] + 'px, 0);'
                + ' }'
              ;
            }

            /* IE is only browser not to create context with transforms */
            /* https://www.w3.org/Bugs/Public/show_bug.cgi?id=16328 */
            if( module.is.ie() ) {
              if(direction === 'left' || direction === 'right') {
                module.debug('Adding CSS rules for animation distance', width);
                style  += ''
                  + ' body.pushable > .ui.visible.' + direction + '.sidebar ~ .pusher:after {'
                  + '   -webkit-transform: translate3d('+ distance[direction] + 'px, 0, 0);'
                  + '           transform: translate3d('+ distance[direction] + 'px, 0, 0);'
                  + ' }'
                ;
              }
              else if(direction === 'top' || direction == 'bottom') {
                style  += ''
                  + ' body.pushable > .ui.visible.' + direction + '.sidebar ~ .pusher:after {'
                  + '   -webkit-transform: translate3d(0, ' + distance[direction] + 'px, 0);'
                  + '           transform: translate3d(0, ' + distance[direction] + 'px, 0);'
                  + ' }'
                ;
              }
              /* opposite sides visible forces content overlay */
              style += ''
                + ' body.pushable > .ui.visible.left.sidebar ~ .ui.visible.right.sidebar ~ .pusher:after,'
                + ' body.pushable > .ui.visible.right.sidebar ~ .ui.visible.left.sidebar ~ .pusher:after {'
                + '   -webkit-transform: translate3d(0px, 0, 0);'
                + '           transform: translate3d(0px, 0, 0);'
                + ' }'
              ;
            }
            style += '</style>';
            $style = $(style)
              .appendTo($head)
            ;
            module.debug('Adding sizing css to head', $style);
          }
        },

        refresh: function() {
          module.verbose('Refreshing selector cache');
          $context  = $(settings.context);
          $sidebars = $context.children(selector.sidebar);
          $pusher   = $context.children(selector.pusher);
          $fixed    = $context.children(selector.fixed);
          module.clear.cache();
        },

        refreshSidebars: function() {
          module.verbose('Refreshing other sidebars');
          $sidebars = $context.children(selector.sidebar);
        },

        repaint: function() {
          module.verbose('Forcing repaint event');
          element.style.display = 'none';
          var ignored = element.offsetHeight;
          element.scrollTop = element.scrollTop;
          element.style.display = '';
        },

        setup: {
          cache: function() {
            module.cache = {
              width  : $module.outerWidth(),
              height : $module.outerHeight(),
              rtl    : ($module.css('direction') == 'rtl')
            };
          },
          layout: function() {
            if( $context.children(selector.pusher).length === 0 ) {
              module.debug('Adding wrapper element for sidebar');
              module.error(error.pusher);
              $pusher = $('<div class="pusher" />');
              $context
                .children()
                  .not(selector.omitted)
                  .not($sidebars)
                  .wrapAll($pusher)
              ;
              module.refresh();
            }
            if($module.nextAll(selector.pusher).length === 0 || $module.nextAll(selector.pusher)[0] !== $pusher[0]) {
              module.debug('Moved sidebar to correct parent element');
              module.error(error.movedSidebar, element);
              $module.detach().prependTo($context);
              module.refresh();
            }
            module.clear.cache();
            module.set.pushable();
            module.set.direction();
          }
        },

        attachEvents: function(selector, event) {
          var
            $toggle = $(selector)
          ;
          event = $.isFunction(module[event])
            ? module[event]
            : module.toggle
          ;
          if($toggle.length > 0) {
            module.debug('Attaching sidebar events to element', selector, event);
            $toggle
              .on('click' + eventNamespace, event)
            ;
          }
          else {
            module.error(error.notFound, selector);
          }
        },

        show: function(callback) {
          callback = $.isFunction(callback)
            ? callback
            : function(){}
          ;
          if(module.is.hidden()) {
            module.refreshSidebars();
            if(settings.overlay)  {
              module.error(error.overlay);
              settings.transition = 'overlay';
            }
            module.refresh();
            if(module.othersActive()) {
              module.debug('Other sidebars currently visible');
              if(settings.exclusive) {
                // if not overlay queue animation after hide
                if(settings.transition != 'overlay') {
                  module.hideOthers(module.show);
                  return;
                }
                else {
                  module.hideOthers();
                }
              }
              else {
                settings.transition = 'overlay';
              }
            }
            module.pushPage(function() {
              callback.call(element);
              settings.onShow.call(element);
            });
            settings.onChange.call(element);
            settings.onVisible.call(element);
          }
          else {
            module.debug('Sidebar is already visible');
          }
        },

        hide: function(callback) {
          callback = $.isFunction(callback)
            ? callback
            : function(){}
          ;
          if(module.is.visible() || module.is.animating()) {
            module.debug('Hiding sidebar', callback);
            module.refreshSidebars();
            module.pullPage(function() {
              callback.call(element);
              settings.onHidden.call(element);
            });
            settings.onChange.call(element);
            settings.onHide.call(element);
          }
        },

        othersAnimating: function() {
          return ($sidebars.not($module).filter('.' + className.animating).length > 0);
        },
        othersVisible: function() {
          return ($sidebars.not($module).filter('.' + className.visible).length > 0);
        },
        othersActive: function() {
          return(module.othersVisible() || module.othersAnimating());
        },

        hideOthers: function(callback) {
          var
            $otherSidebars = $sidebars.not($module).filter('.' + className.visible),
            sidebarCount   = $otherSidebars.length,
            callbackCount  = 0
          ;
          callback = callback || function(){};
          $otherSidebars
            .sidebar('hide', function() {
              callbackCount++;
              if(callbackCount == sidebarCount) {
                callback();
              }
            })
          ;
        },

        toggle: function() {
          module.verbose('Determining toggled direction');
          if(module.is.hidden()) {
            module.show();
          }
          else {
            module.hide();
          }
        },

        pushPage: function(callback) {
          var
            transition = module.get.transition(),
            $transition = (transition === 'overlay' || module.othersActive())
              ? $module
              : $pusher,
            animate,
            dim,
            transitionEnd
          ;
          callback = $.isFunction(callback)
            ? callback
            : function(){}
          ;
          if(settings.transition == 'scale down') {
            module.scrollToTop();
          }
          module.set.transition(transition);
          module.repaint();
          animate = function() {
            module.bind.clickaway();
            module.add.inlineCSS();
            module.set.animating();
            module.set.visible();
          };
          dim = function() {
            module.set.dimmed();
          };
          transitionEnd = function(event) {
            if( event.target == $transition[0] ) {
              $transition.off(transitionEvent + elementNamespace, transitionEnd);
              module.remove.animating();
              module.bind.scrollLock();
              callback.call(element);
            }
          };
          $transition.off(transitionEvent + elementNamespace);
          $transition.on(transitionEvent + elementNamespace, transitionEnd);
          requestAnimationFrame(animate);
          if(settings.dimPage && !module.othersVisible()) {
            requestAnimationFrame(dim);
          }
        },

        pullPage: function(callback) {
          var
            transition = module.get.transition(),
            $transition = (transition == 'overlay' || module.othersActive())
              ? $module
              : $pusher,
            animate,
            transitionEnd
          ;
          callback = $.isFunction(callback)
            ? callback
            : function(){}
          ;
          module.verbose('Removing context push state', module.get.direction());

          module.unbind.clickaway();
          module.unbind.scrollLock();

          animate = function() {
            module.set.transition(transition);
            module.set.animating();
            module.remove.visible();
            if(settings.dimPage && !module.othersVisible()) {
              $pusher.removeClass(className.dimmed);
            }
          };
          transitionEnd = function(event) {
            if( event.target == $transition[0] ) {
              $transition.off(transitionEvent + elementNamespace, transitionEnd);
              module.remove.animating();
              module.remove.transition();
              module.remove.inlineCSS();
              if(transition == 'scale down' || (settings.returnScroll && module.is.mobile()) ) {
                module.scrollBack();
              }
              callback.call(element);
            }
          };
          $transition.off(transitionEvent + elementNamespace);
          $transition.on(transitionEvent + elementNamespace, transitionEnd);
          requestAnimationFrame(animate);
        },

        scrollToTop: function() {
          module.verbose('Scrolling to top of page to avoid animation issues');
          currentScroll = $(window).scrollTop();
          $module.scrollTop(0);
          window.scrollTo(0, 0);
        },

        scrollBack: function() {
          module.verbose('Scrolling back to original page position');
          window.scrollTo(0, currentScroll);
        },

        clear: {
          cache: function() {
            module.verbose('Clearing cached dimensions');
            module.cache = {};
          }
        },

        set: {

          // ios only (scroll on html not document). This prevent auto-resize canvas/scroll in ios
          ios: function() {
            $html.addClass(className.ios);
          },

          // container
          pushed: function() {
            $context.addClass(className.pushed);
          },
          pushable: function() {
            $context.addClass(className.pushable);
          },

          // pusher
          dimmed: function() {
            $pusher.addClass(className.dimmed);
          },

          // sidebar
          active: function() {
            $module.addClass(className.active);
          },
          animating: function() {
            $module.addClass(className.animating);
          },
          transition: function(transition) {
            transition = transition || module.get.transition();
            $module.addClass(transition);
          },
          direction: function(direction) {
            direction = direction || module.get.direction();
            $module.addClass(className[direction]);
          },
          visible: function() {
            $module.addClass(className.visible);
          },
          overlay: function() {
            $module.addClass(className.overlay);
          }
        },
        remove: {

          inlineCSS: function() {
            module.debug('Removing inline css styles', $style);
            if($style && $style.length > 0) {
              $style.remove();
            }
          },

          // ios scroll on html not document
          ios: function() {
            $html.removeClass(className.ios);
          },

          // context
          pushed: function() {
            $context.removeClass(className.pushed);
          },
          pushable: function() {
            $context.removeClass(className.pushable);
          },

          // sidebar
          active: function() {
            $module.removeClass(className.active);
          },
          animating: function() {
            $module.removeClass(className.animating);
          },
          transition: function(transition) {
            transition = transition || module.get.transition();
            $module.removeClass(transition);
          },
          direction: function(direction) {
            direction = direction || module.get.direction();
            $module.removeClass(className[direction]);
          },
          visible: function() {
            $module.removeClass(className.visible);
          },
          overlay: function() {
            $module.removeClass(className.overlay);
          }
        },

        get: {
          direction: function() {
            if($module.hasClass(className.top)) {
              return className.top;
            }
            else if($module.hasClass(className.right)) {
              return className.right;
            }
            else if($module.hasClass(className.bottom)) {
              return className.bottom;
            }
            return className.left;
          },
          transition: function() {
            var
              direction = module.get.direction(),
              transition
            ;
            transition = ( module.is.mobile() )
              ? (settings.mobileTransition == 'auto')
                ? settings.defaultTransition.mobile[direction]
                : settings.mobileTransition
              : (settings.transition == 'auto')
                ? settings.defaultTransition.computer[direction]
                : settings.transition
            ;
            module.verbose('Determined transition', transition);
            return transition;
          },
          transitionEvent: function() {
            var
              element     = document.createElement('element'),
              transitions = {
                'transition'       :'transitionend',
                'OTransition'      :'oTransitionEnd',
                'MozTransition'    :'transitionend',
                'WebkitTransition' :'webkitTransitionEnd'
              },
              transition
            ;
            for(transition in transitions){
              if( element.style[transition] !== undefined ){
                return transitions[transition];
              }
            }
          }
        },

        is: {

          ie: function() {
            var
              isIE11 = (!(window.ActiveXObject) && 'ActiveXObject' in window),
              isIE   = ('ActiveXObject' in window)
            ;
            return (isIE11 || isIE);
          },

          ios: function() {
            var
              userAgent      = navigator.userAgent,
              isIOS          = userAgent.match(regExp.ios),
              isMobileChrome = userAgent.match(regExp.mobileChrome)
            ;
            if(isIOS && !isMobileChrome) {
              module.verbose('Browser was found to be iOS', userAgent);
              return true;
            }
            else {
              return false;
            }
          },
          mobile: function() {
            var
              userAgent    = navigator.userAgent,
              isMobile     = userAgent.match(regExp.mobile)
            ;
            if(isMobile) {
              module.verbose('Browser was found to be mobile', userAgent);
              return true;
            }
            else {
              module.verbose('Browser is not mobile, using regular transition', userAgent);
              return false;
            }
          },
          hidden: function() {
            return !module.is.visible();
          },
          visible: function() {
            return $module.hasClass(className.visible);
          },
          // alias
          open: function() {
            return module.is.visible();
          },
          closed: function() {
            return module.is.hidden();
          },
          vertical: function() {
            return $module.hasClass(className.top);
          },
          animating: function() {
            return $context.hasClass(className.animating);
          },
          rtl: function () {
            if(module.cache.rtl === undefined) {
              module.cache.rtl = ($module.css('direction') == 'rtl');
            }
            return module.cache.rtl;
          }
        },

        setting: function(name, value) {
          module.debug('Changing setting', name, value);
          if( $.isPlainObject(name) ) {
            $.extend(true, settings, name);
          }
          else if(value !== undefined) {
            settings[name] = value;
          }
          else {
            return settings[name];
          }
        },
        internal: function(name, value) {
          if( $.isPlainObject(name) ) {
            $.extend(true, module, name);
          }
          else if(value !== undefined) {
            module[name] = value;
          }
          else {
            return module[name];
          }
        },
        debug: function() {
          if(settings.debug) {
            if(settings.performance) {
              module.performance.log(arguments);
            }
            else {
              module.debug = Function.prototype.bind.call(console.info, console, settings.name + ':');
              module.debug.apply(console, arguments);
            }
          }
        },
        verbose: function() {
          if(settings.verbose && settings.debug) {
            if(settings.performance) {
              module.performance.log(arguments);
            }
            else {
              module.verbose = Function.prototype.bind.call(console.info, console, settings.name + ':');
              module.verbose.apply(console, arguments);
            }
          }
        },
        error: function() {
          module.error = Function.prototype.bind.call(console.error, console, settings.name + ':');
          module.error.apply(console, arguments);
        },
        performance: {
          log: function(message) {
            var
              currentTime,
              executionTime,
              previousTime
            ;
            if(settings.performance) {
              currentTime   = new Date().getTime();
              previousTime  = time || currentTime;
              executionTime = currentTime - previousTime;
              time          = currentTime;
              performance.push({
                'Name'           : message[0],
                'Arguments'      : [].slice.call(message, 1) || '',
                'Element'        : element,
                'Execution Time' : executionTime
              });
            }
            clearTimeout(module.performance.timer);
            module.performance.timer = setTimeout(module.performance.display, 500);
          },
          display: function() {
            var
              title = settings.name + ':',
              totalTime = 0
            ;
            time = false;
            clearTimeout(module.performance.timer);
            $.each(performance, function(index, data) {
              totalTime += data['Execution Time'];
            });
            title += ' ' + totalTime + 'ms';
            if(moduleSelector) {
              title += ' \'' + moduleSelector + '\'';
            }
            if( (console.group !== undefined || console.table !== undefined) && performance.length > 0) {
              console.groupCollapsed(title);
              if(console.table) {
                console.table(performance);
              }
              else {
                $.each(performance, function(index, data) {
                  console.log(data['Name'] + ': ' + data['Execution Time']+'ms');
                });
              }
              console.groupEnd();
            }
            performance = [];
          }
        },
        invoke: function(query, passedArguments, context) {
          var
            object = instance,
            maxDepth,
            found,
            response
          ;
          passedArguments = passedArguments || queryArguments;
          context         = element         || context;
          if(typeof query == 'string' && object !== undefined) {
            query    = query.split(/[\. ]/);
            maxDepth = query.length - 1;
            $.each(query, function(depth, value) {
              var camelCaseValue = (depth != maxDepth)
                ? value + query[depth + 1].charAt(0).toUpperCase() + query[depth + 1].slice(1)
                : query
              ;
              if( $.isPlainObject( object[camelCaseValue] ) && (depth != maxDepth) ) {
                object = object[camelCaseValue];
              }
              else if( object[camelCaseValue] !== undefined ) {
                found = object[camelCaseValue];
                return false;
              }
              else if( $.isPlainObject( object[value] ) && (depth != maxDepth) ) {
                object = object[value];
              }
              else if( object[value] !== undefined ) {
                found = object[value];
                return false;
              }
              else {
                module.error(error.method, query);
                return false;
              }
            });
          }
          if ( $.isFunction( found ) ) {
            response = found.apply(context, passedArguments);
          }
          else if(found !== undefined) {
            response = found;
          }
          if($.isArray(returnedValue)) {
            returnedValue.push(response);
          }
          else if(returnedValue !== undefined) {
            returnedValue = [returnedValue, response];
          }
          else if(response !== undefined) {
            returnedValue = response;
          }
          return found;
        }
      }
    ;

    if(methodInvoked) {
      if(instance === undefined) {
        module.initialize();
      }
      module.invoke(query);
    }
    else {
      if(instance !== undefined) {
        module.invoke('destroy');
      }
      module.initialize();
    }
  });

  return (returnedValue !== undefined)
    ? returnedValue
    : this
  ;
};

$.fn.sidebar.settings = {

  name              : 'Sidebar',
  namespace         : 'sidebar',

  debug             : false,
  verbose           : false,
  performance       : true,

  transition        : 'auto',
  mobileTransition  : 'auto',

  defaultTransition : {
    computer: {
      left   : 'uncover',
      right  : 'uncover',
      top    : 'overlay',
      bottom : 'overlay'
    },
    mobile: {
      left   : 'uncover',
      right  : 'uncover',
      top    : 'overlay',
      bottom : 'overlay'
    }
  },

  context           : 'body',
  exclusive         : false,
  closable          : true,
  dimPage           : true,
  scrollLock        : false,
  returnScroll      : false,
  delaySetup        : false,

  duration          : 500,

  onChange          : function(){},
  onShow            : function(){},
  onHide            : function(){},

  onHidden          : function(){},
  onVisible         : function(){},

  className         : {
    active    : 'active',
    animating : 'animating',
    dimmed    : 'dimmed',
    ios       : 'ios',
    pushable  : 'pushable',
    pushed    : 'pushed',
    right     : 'right',
    top       : 'top',
    left      : 'left',
    bottom    : 'bottom',
    visible   : 'visible'
  },

  selector: {
    fixed   : '.fixed',
    omitted : 'script, link, style, .ui.modal, .ui.dimmer, .ui.nag, .ui.fixed',
    pusher  : '.pusher',
    sidebar : '.ui.sidebar'
  },

  regExp: {
    ios          : /(iPad|iPhone|iPod)/g,
    mobileChrome : /(CriOS)/g,
    mobile       : /Mobile|iP(hone|od|ad)|Android|BlackBerry|IEMobile|Kindle|NetFront|Silk-Accelerated|(hpw|web)OS|Fennec|Minimo|Opera M(obi|ini)|Blazer|Dolfin|Dolphin|Skyfire|Zune/g
  },

  error   : {
    method       : 'The method you called is not defined.',
    pusher       : 'Had to add pusher element. For optimal performance make sure body content is inside a pusher element',
    movedSidebar : 'Had to move sidebar. For optimal performance make sure sidebar and pusher are direct children of your body tag',
    overlay      : 'The overlay setting is no longer supported, use animation: overlay',
    notFound     : 'There were no elements that matched the specified selector'
  }

};


})( jQuery, window, document );

/*!
 * # Semantic UI 2.1.6 - Sticky
 * http://github.com/semantic-org/semantic-ui/
 *
 *
 * Copyright 2015 Contributors
 * Released under the MIT license
 * http://opensource.org/licenses/MIT
 *
 */

;(function ( $, window, document, undefined ) {

"use strict";

$.fn.sticky = function(parameters) {
  var
    $allModules    = $(this),
    moduleSelector = $allModules.selector || '',

    time           = new Date().getTime(),
    performance    = [],

    query          = arguments[0],
    methodInvoked  = (typeof query == 'string'),
    queryArguments = [].slice.call(arguments, 1),
    returnedValue
  ;

  $allModules
    .each(function() {
      var
        settings              = ( $.isPlainObject(parameters) )
          ? $.extend(true, {}, $.fn.sticky.settings, parameters)
          : $.extend({}, $.fn.sticky.settings),

        className             = settings.className,
        namespace             = settings.namespace,
        error                 = settings.error,

        eventNamespace        = '.' + namespace,
        moduleNamespace       = 'module-' + namespace,

        $module               = $(this),
        $window               = $(window),
        $scroll               = $(settings.scrollContext),
        $container,
        $context,

        selector              = $module.selector || '',
        instance              = $module.data(moduleNamespace),

        requestAnimationFrame = window.requestAnimationFrame
          || window.mozRequestAnimationFrame
          || window.webkitRequestAnimationFrame
          || window.msRequestAnimationFrame
          || function(callback) { setTimeout(callback, 0); },

        element         = this,
        observer,
        module
      ;

      module      = {

        initialize: function() {

          module.determineContainer();
          module.determineContext();
          module.verbose('Initializing sticky', settings, $container);

          module.save.positions();
          module.checkErrors();
          module.bind.events();

          if(settings.observeChanges) {
            module.observeChanges();
          }
          module.instantiate();
        },

        instantiate: function() {
          module.verbose('Storing instance of module', module);
          instance = module;
          $module
            .data(moduleNamespace, module)
          ;
        },

        destroy: function() {
          module.verbose('Destroying previous instance');
          module.reset();
          if(observer) {
            observer.disconnect();
          }
          $window
            .off('load' + eventNamespace, module.event.load)
            .off('resize' + eventNamespace, module.event.resize)
          ;
          $scroll
            .off('scrollchange' + eventNamespace, module.event.scrollchange)
          ;
          $module.removeData(moduleNamespace);
        },

        observeChanges: function() {
          var
            context = $context[0]
          ;
          if('MutationObserver' in window) {
            observer = new MutationObserver(function(mutations) {
              clearTimeout(module.timer);
              module.timer = setTimeout(function() {
                module.verbose('DOM tree modified, updating sticky menu', mutations);
                module.refresh();
              }, 100);
            });
            observer.observe(element, {
              childList : true,
              subtree   : true
            });
            observer.observe(context, {
              childList : true,
              subtree   : true
            });
            module.debug('Setting up mutation observer', observer);
          }
        },

        determineContainer: function() {
          $container = $module.offsetParent();
        },

        determineContext: function() {
          if(settings.context) {
            $context = $(settings.context);
          }
          else {
            $context = $container;
          }
          if($context.length === 0) {
            module.error(error.invalidContext, settings.context, $module);
            return;
          }
        },

        checkErrors: function() {
          if( module.is.hidden() ) {
            module.error(error.visible, $module);
          }
          if(module.cache.element.height > module.cache.context.height) {
            module.reset();
            module.error(error.elementSize, $module);
            return;
          }
        },

        bind: {
          events: function() {
            $window
              .on('load' + eventNamespace, module.event.load)
              .on('resize' + eventNamespace, module.event.resize)
            ;
            // pub/sub pattern
            $scroll
              .off('scroll' + eventNamespace)
              .on('scroll' + eventNamespace, module.event.scroll)
              .on('scrollchange' + eventNamespace, module.event.scrollchange)
            ;
          }
        },

        event: {
          load: function() {
            module.verbose('Page contents finished loading');
            requestAnimationFrame(module.refresh);
          },
          resize: function() {
            module.verbose('Window resized');
            requestAnimationFrame(module.refresh);
          },
          scroll: function() {
            requestAnimationFrame(function() {
              $scroll.triggerHandler('scrollchange' + eventNamespace, $scroll.scrollTop() );
            });
          },
          scrollchange: function(event, scrollPosition) {
            module.stick(scrollPosition);
            settings.onScroll.call(element);
          }
        },

        refresh: function(hardRefresh) {
          module.reset();
          if(!settings.context) {
            module.determineContext();
          }
          if(hardRefresh) {
            module.determineContainer();
          }
          module.save.positions();
          module.stick();
          settings.onReposition.call(element);
        },

        supports: {
          sticky: function() {
            var
              $element = $('<div/>'),
              element = $element[0]
            ;
            $element.addClass(className.supported);
            return($element.css('position').match('sticky'));
          }
        },

        save: {
          lastScroll: function(scroll) {
            module.lastScroll = scroll;
          },
          elementScroll: function(scroll) {
            module.elementScroll = scroll;
          },
          positions: function() {
            var
              scrollContext = {
                height : $scroll.height()
              },
              element = {
                margin: {
                  top    : parseInt($module.css('margin-top'), 10),
                  bottom : parseInt($module.css('margin-bottom'), 10),
                },
                offset : $module.offset(),
                width  : $module.outerWidth(),
                height : $module.outerHeight()
              },
              context = {
                offset : $context.offset(),
                height : $context.outerHeight()
              },
              container = {
                height: $container.outerHeight()
              }
            ;
            if( !module.is.standardScroll() ) {
              module.debug('Non-standard scroll. Removing scroll offset from element offset');

              scrollContext.top  = $scroll.scrollTop();
              scrollContext.left = $scroll.scrollLeft();

              element.offset.top  += scrollContext.top;
              context.offset.top  += scrollContext.top;
              element.offset.left += scrollContext.left;
              context.offset.left += scrollContext.left;
            }
            module.cache = {
              fits : ( element.height < scrollContext.height ),
              scrollContext : {
                height : scrollContext.height
              },
              element: {
                margin : element.margin,
                top    : element.offset.top - element.margin.top,
                left   : element.offset.left,
                width  : element.width,
                height : element.height,
                bottom : element.offset.top + element.height
              },
              context: {
                top           : context.offset.top,
                height        : context.height,
                bottom        : context.offset.top + context.height
              }
            };
            module.set.containerSize();
            module.set.size();
            module.stick();
            module.debug('Caching element positions', module.cache);
          }
        },

        get: {
          direction: function(scroll) {
            var
              direction = 'down'
            ;
            scroll = scroll || $scroll.scrollTop();
            if(module.lastScroll !== undefined) {
              if(module.lastScroll < scroll) {
                direction = 'down';
              }
              else if(module.lastScroll > scroll) {
                direction = 'up';
              }
            }
            return direction;
          },
          scrollChange: function(scroll) {
            scroll = scroll || $scroll.scrollTop();
            return (module.lastScroll)
              ? (scroll - module.lastScroll)
              : 0
            ;
          },
          currentElementScroll: function() {
            if(module.elementScroll) {
              return module.elementScroll;
            }
            return ( module.is.top() )
              ? Math.abs(parseInt($module.css('top'), 10))    || 0
              : Math.abs(parseInt($module.css('bottom'), 10)) || 0
            ;
          },

          elementScroll: function(scroll) {
            scroll = scroll || $scroll.scrollTop();
            var
              element        = module.cache.element,
              scrollContext  = module.cache.scrollContext,
              delta          = module.get.scrollChange(scroll),
              maxScroll      = (element.height - scrollContext.height + settings.offset),
              elementScroll  = module.get.currentElementScroll(),
              possibleScroll = (elementScroll + delta)
            ;
            if(module.cache.fits || possibleScroll < 0) {
              elementScroll = 0;
            }
            else if(possibleScroll > maxScroll ) {
              elementScroll = maxScroll;
            }
            else {
              elementScroll = possibleScroll;
            }
            return elementScroll;
          }
        },

        remove: {
          lastScroll: function() {
            delete module.lastScroll;
          },
          elementScroll: function(scroll) {
            delete module.elementScroll;
          },
          offset: function() {
            $module.css('margin-top', '');
          }
        },

        set: {
          offset: function() {
            module.verbose('Setting offset on element', settings.offset);
            $module
              .css('margin-top', settings.offset)
            ;
          },
          containerSize: function() {
            var
              tagName = $container.get(0).tagName
            ;
            if(tagName === 'HTML' || tagName == 'body') {
              // this can trigger for too many reasons
              //module.error(error.container, tagName, $module);
              module.determineContainer();
            }
            else {
              if( Math.abs($container.outerHeight() - module.cache.context.height) > settings.jitter) {
                module.debug('Context has padding, specifying exact height for container', module.cache.context.height);
                $container.css({
                  height: module.cache.context.height
                });
              }
            }
          },
          minimumSize: function() {
            var
              element   = module.cache.element
            ;
            $container
              .css('min-height', element.height)
            ;
          },
          scroll: function(scroll) {
            module.debug('Setting scroll on element', scroll);
            if(module.elementScroll == scroll) {
              return;
            }
            if( module.is.top() ) {
              $module
                .css('bottom', '')
                .css('top', -scroll)
              ;
            }
            if( module.is.bottom() ) {
              $module
                .css('top', '')
                .css('bottom', scroll)
              ;
            }
          },
          size: function() {
            if(module.cache.element.height !== 0 && module.cache.element.width !== 0) {
              element.style.setProperty('width',  module.cache.element.width  + 'px', 'important');
              element.style.setProperty('height', module.cache.element.height + 'px', 'important');
            }
          }
        },

        is: {
          standardScroll: function() {
            return ($scroll[0] == window);
          },
          top: function() {
            return $module.hasClass(className.top);
          },
          bottom: function() {
            return $module.hasClass(className.bottom);
          },
          initialPosition: function() {
            return (!module.is.fixed() && !module.is.bound());
          },
          hidden: function() {
            return (!$module.is(':visible'));
          },
          bound: function() {
            return $module.hasClass(className.bound);
          },
          fixed: function() {
            return $module.hasClass(className.fixed);
          }
        },

        stick: function(scroll) {
          var
            cachedPosition = scroll || $scroll.scrollTop(),
            cache          = module.cache,
            fits           = cache.fits,
            element        = cache.element,
            scrollContext  = cache.scrollContext,
            context        = cache.context,
            offset         = (module.is.bottom() && settings.pushing)
              ? settings.bottomOffset
              : settings.offset,
            scroll         = {
              top    : cachedPosition + offset,
              bottom : cachedPosition + offset + scrollContext.height
            },
            direction      = module.get.direction(scroll.top),
            elementScroll  = (fits)
              ? 0
              : module.get.elementScroll(scroll.top),

            // shorthand
            doesntFit      = !fits,
            elementVisible = (element.height !== 0)
          ;

          if(elementVisible) {

            if( module.is.initialPosition() ) {
              if(scroll.top >= context.bottom) {
                module.debug('Initial element position is bottom of container');
                module.bindBottom();
              }
              else if(scroll.top > element.top) {
                if( (element.height + scroll.top - elementScroll) >= context.bottom ) {
                  module.debug('Initial element position is bottom of container');
                  module.bindBottom();
                }
                else {
                  module.debug('Initial element position is fixed');
                  module.fixTop();
                }
              }

            }
            else if( module.is.fixed() ) {

              // currently fixed top
              if( module.is.top() ) {
                if( scroll.top <= element.top ) {
                  module.debug('Fixed element reached top of container');
                  module.setInitialPosition();
                }
                else if( (element.height + scroll.top - elementScroll) >= context.bottom ) {
                  module.debug('Fixed element reached bottom of container');
                  module.bindBottom();
                }
                // scroll element if larger than screen
                else if(doesntFit) {
                  module.set.scroll(elementScroll);
                  module.save.lastScroll(scroll.top);
                  module.save.elementScroll(elementScroll);
                }
              }

              // currently fixed bottom
              else if(module.is.bottom() ) {

                // top edge
                if( (scroll.bottom - element.height) <= element.top) {
                  module.debug('Bottom fixed rail has reached top of container');
                  module.setInitialPosition();
                }
                // bottom edge
                else if(scroll.bottom >= context.bottom) {
                  module.debug('Bottom fixed rail has reached bottom of container');
                  module.bindBottom();
                }
                // scroll element if larger than screen
                else if(doesntFit) {
                  module.set.scroll(elementScroll);
                  module.save.lastScroll(scroll.top);
                  module.save.elementScroll(elementScroll);
                }

              }
            }
            else if( module.is.bottom() ) {
              if( scroll.top <= element.top ) {
                module.debug('Jumped from bottom fixed to top fixed, most likely used home/end button');
                module.setInitialPosition();
              }
              else {
                if(settings.pushing) {
                  if(module.is.bound() && scroll.bottom <= context.bottom ) {
                    module.debug('Fixing bottom attached element to bottom of browser.');
                    module.fixBottom();
                  }
                }
                else {
                  if(module.is.bound() && (scroll.top <= context.bottom - element.height) ) {
                    module.debug('Fixing bottom attached element to top of browser.');
                    module.fixTop();
                  }
                }
              }
            }
          }
        },

        bindTop: function() {
          module.debug('Binding element to top of parent container');
          module.remove.offset();
          $module
            .css({
              left         : '',
              top          : '',
              marginBottom : ''
            })
            .removeClass(className.fixed)
            .removeClass(className.bottom)
            .addClass(className.bound)
            .addClass(className.top)
          ;
          settings.onTop.call(element);
          settings.onUnstick.call(element);
        },
        bindBottom: function() {
          module.debug('Binding element to bottom of parent container');
          module.remove.offset();
          $module
            .css({
              left         : '',
              top          : ''
            })
            .removeClass(className.fixed)
            .removeClass(className.top)
            .addClass(className.bound)
            .addClass(className.bottom)
          ;
          settings.onBottom.call(element);
          settings.onUnstick.call(element);
        },

        setInitialPosition: function() {
          module.debug('Returning to initial position');
          module.unfix();
          module.unbind();
        },


        fixTop: function() {
          module.debug('Fixing element to top of page');
          module.set.minimumSize();
          module.set.offset();
          $module
            .css({
              left         : module.cache.element.left,
              bottom       : '',
              marginBottom : ''
            })
            .removeClass(className.bound)
            .removeClass(className.bottom)
            .addClass(className.fixed)
            .addClass(className.top)
          ;
          settings.onStick.call(element);
        },

        fixBottom: function() {
          module.debug('Sticking element to bottom of page');
          module.set.minimumSize();
          module.set.offset();
          $module
            .css({
              left         : module.cache.element.left,
              bottom       : '',
              marginBottom : ''
            })
            .removeClass(className.bound)
            .removeClass(className.top)
            .addClass(className.fixed)
            .addClass(className.bottom)
          ;
          settings.onStick.call(element);
        },

        unbind: function() {
          if( module.is.bound() ) {
            module.debug('Removing container bound position on element');
            module.remove.offset();
            $module
              .removeClass(className.bound)
              .removeClass(className.top)
              .removeClass(className.bottom)
            ;
          }
        },

        unfix: function() {
          if( module.is.fixed() ) {
            module.debug('Removing fixed position on element');
            module.remove.offset();
            $module
              .removeClass(className.fixed)
              .removeClass(className.top)
              .removeClass(className.bottom)
            ;
            settings.onUnstick.call(element);
          }
        },

        reset: function() {
          module.debug('Reseting elements position');
          module.unbind();
          module.unfix();
          module.resetCSS();
          module.remove.offset();
          module.remove.lastScroll();
        },

        resetCSS: function() {
          $module
            .css({
              width  : '',
              height : ''
            })
          ;
          $container
            .css({
              height: ''
            })
          ;
        },

        setting: function(name, value) {
          if( $.isPlainObject(name) ) {
            $.extend(true, settings, name);
          }
          else if(value !== undefined) {
            settings[name] = value;
          }
          else {
            return settings[name];
          }
        },
        internal: function(name, value) {
          if( $.isPlainObject(name) ) {
            $.extend(true, module, name);
          }
          else if(value !== undefined) {
            module[name] = value;
          }
          else {
            return module[name];
          }
        },
        debug: function() {
          if(settings.debug) {
            if(settings.performance) {
              module.performance.log(arguments);
            }
            else {
              module.debug = Function.prototype.bind.call(console.info, console, settings.name + ':');
              module.debug.apply(console, arguments);
            }
          }
        },
        verbose: function() {
          if(settings.verbose && settings.debug) {
            if(settings.performance) {
              module.performance.log(arguments);
            }
            else {
              module.verbose = Function.prototype.bind.call(console.info, console, settings.name + ':');
              module.verbose.apply(console, arguments);
            }
          }
        },
        error: function() {
          module.error = Function.prototype.bind.call(console.error, console, settings.name + ':');
          module.error.apply(console, arguments);
        },
        performance: {
          log: function(message) {
            var
              currentTime,
              executionTime,
              previousTime
            ;
            if(settings.performance) {
              currentTime   = new Date().getTime();
              previousTime  = time || currentTime;
              executionTime = currentTime - previousTime;
              time          = currentTime;
              performance.push({
                'Name'           : message[0],
                'Arguments'      : [].slice.call(message, 1) || '',
                'Element'        : element,
                'Execution Time' : executionTime
              });
            }
            clearTimeout(module.performance.timer);
            module.performance.timer = setTimeout(module.performance.display, 0);
          },
          display: function() {
            var
              title = settings.name + ':',
              totalTime = 0
            ;
            time = false;
            clearTimeout(module.performance.timer);
            $.each(performance, function(index, data) {
              totalTime += data['Execution Time'];
            });
            title += ' ' + totalTime + 'ms';
            if(moduleSelector) {
              title += ' \'' + moduleSelector + '\'';
            }
            if( (console.group !== undefined || console.table !== undefined) && performance.length > 0) {
              console.groupCollapsed(title);
              if(console.table) {
                console.table(performance);
              }
              else {
                $.each(performance, function(index, data) {
                  console.log(data['Name'] + ': ' + data['Execution Time']+'ms');
                });
              }
              console.groupEnd();
            }
            performance = [];
          }
        },
        invoke: function(query, passedArguments, context) {
          var
            object = instance,
            maxDepth,
            found,
            response
          ;
          passedArguments = passedArguments || queryArguments;
          context         = element         || context;
          if(typeof query == 'string' && object !== undefined) {
            query    = query.split(/[\. ]/);
            maxDepth = query.length - 1;
            $.each(query, function(depth, value) {
              var camelCaseValue = (depth != maxDepth)
                ? value + query[depth + 1].charAt(0).toUpperCase() + query[depth + 1].slice(1)
                : query
              ;
              if( $.isPlainObject( object[camelCaseValue] ) && (depth != maxDepth) ) {
                object = object[camelCaseValue];
              }
              else if( object[camelCaseValue] !== undefined ) {
                found = object[camelCaseValue];
                return false;
              }
              else if( $.isPlainObject( object[value] ) && (depth != maxDepth) ) {
                object = object[value];
              }
              else if( object[value] !== undefined ) {
                found = object[value];
                return false;
              }
              else {
                return false;
              }
            });
          }
          if ( $.isFunction( found ) ) {
            response = found.apply(context, passedArguments);
          }
          else if(found !== undefined) {
            response = found;
          }
          if($.isArray(returnedValue)) {
            returnedValue.push(response);
          }
          else if(returnedValue !== undefined) {
            returnedValue = [returnedValue, response];
          }
          else if(response !== undefined) {
            returnedValue = response;
          }
          return found;
        }
      };

      if(methodInvoked) {
        if(instance === undefined) {
          module.initialize();
        }
        module.invoke(query);
      }
      else {
        if(instance !== undefined) {
          instance.invoke('destroy');
        }
        module.initialize();
      }
    })
  ;

  return (returnedValue !== undefined)
    ? returnedValue
    : this
  ;
};

$.fn.sticky.settings = {

  name           : 'Sticky',
  namespace      : 'sticky',

  debug          : false,
  verbose        : true,
  performance    : true,

  // whether to stick in the opposite direction on scroll up
  pushing        : false,

  context        : false,

  // Context to watch scroll events
  scrollContext  : window,

  // Offset to adjust scroll
  offset         : 0,

  // Offset to adjust scroll when attached to bottom of screen
  bottomOffset   : 0,

  jitter         : 5, // will only set container height if difference between context and container is larger than this number

  // Whether to automatically observe changes with Mutation Observers
  observeChanges : false,

  // Called when position is recalculated
  onReposition   : function(){},

  // Called on each scroll
  onScroll       : function(){},

  // Called when element is stuck to viewport
  onStick        : function(){},

  // Called when element is unstuck from viewport
  onUnstick      : function(){},

  // Called when element reaches top of context
  onTop          : function(){},

  // Called when element reaches bottom of context
  onBottom       : function(){},

  error         : {
    container      : 'Sticky element must be inside a relative container',
    visible        : 'Element is hidden, you must call refresh after element becomes visible',
    method         : 'The method you called is not defined.',
    invalidContext : 'Context specified does not exist',
    elementSize    : 'Sticky element is larger than its container, cannot create sticky.'
  },

  className : {
    bound     : 'bound',
    fixed     : 'fixed',
    supported : 'native',
    top       : 'top',
    bottom    : 'bottom'
  }

};

})( jQuery, window, document );
/*!
 * # Semantic UI 2.1.6 - Tab
 * http://github.com/semantic-org/semantic-ui/
 *
 *
 * Copyright 2015 Contributors
 * Released under the MIT license
 * http://opensource.org/licenses/MIT
 *
 */

;(function ($, window, document, undefined) {

"use strict";

$.fn.tab = function(parameters) {

  var
    // use window context if none specified
    $allModules     = $.isFunction(this)
        ? $(window)
        : $(this),

    moduleSelector  = $allModules.selector || '',
    time            = new Date().getTime(),
    performance     = [],

    query           = arguments[0],
    methodInvoked   = (typeof query == 'string'),
    queryArguments  = [].slice.call(arguments, 1),

    initializedHistory = false,
    returnedValue
  ;

  $allModules
    .each(function() {
      var

        settings        = ( $.isPlainObject(parameters) )
          ? $.extend(true, {}, $.fn.tab.settings, parameters)
          : $.extend({}, $.fn.tab.settings),

        className       = settings.className,
        metadata        = settings.metadata,
        selector        = settings.selector,
        error           = settings.error,

        eventNamespace  = '.' + settings.namespace,
        moduleNamespace = 'module-' + settings.namespace,

        $module         = $(this),
        $context,
        $tabs,

        cache           = {},
        firstLoad       = true,
        recursionDepth  = 0,
        element         = this,
        instance        = $module.data(moduleNamespace),

        activeTabPath,
        parameterArray,
        module,

        historyEvent

      ;

      module = {

        initialize: function() {
          module.debug('Initializing tab menu item', $module);
          module.fix.callbacks();
          module.determineTabs();

          module.debug('Determining tabs', settings.context, $tabs);
          // set up automatic routing
          if(settings.auto) {
            module.set.auto();
          }
          module.bind.events();

          if(settings.history && !initializedHistory) {
            module.initializeHistory();
            initializedHistory = true;
          }

          module.instantiate();
        },

        instantiate: function () {
          module.verbose('Storing instance of module', module);
          instance = module;
          $module
            .data(moduleNamespace, module)
          ;
        },

        destroy: function() {
          module.debug('Destroying tabs', $module);
          $module
            .removeData(moduleNamespace)
            .off(eventNamespace)
          ;
        },

        bind: {
          events: function() {
            // if using $.tab don't add events
            if( !$.isWindow( element ) ) {
              module.debug('Attaching tab activation events to element', $module);
              $module
                .on('click' + eventNamespace, module.event.click)
              ;
            }
          }
        },

        determineTabs: function() {
          var
            $reference
          ;

          // determine tab context
          if(settings.context === 'parent') {
            if($module.closest(selector.ui).length > 0) {
              $reference = $module.closest(selector.ui);
              module.verbose('Using closest UI element as parent', $reference);
            }
            else {
              $reference = $module;
            }
            $context = $reference.parent();
            module.verbose('Determined parent element for creating context', $context);
          }
          else if(settings.context) {
            $context = $(settings.context);
            module.verbose('Using selector for tab context', settings.context, $context);
          }
          else {
            $context = $('body');
          }
          // find tabs
          if(settings.childrenOnly) {
            $tabs = $context.children(selector.tabs);
            module.debug('Searching tab context children for tabs', $context, $tabs);
          }
          else {
            $tabs = $context.find(selector.tabs);
            module.debug('Searching tab context for tabs', $context, $tabs);
          }
        },

        fix: {
          callbacks: function() {
            if( $.isPlainObject(parameters) && (parameters.onTabLoad || parameters.onTabInit) ) {
              if(parameters.onTabLoad) {
                parameters.onLoad = parameters.onTabLoad;
                delete parameters.onTabLoad;
                module.error(error.legacyLoad, parameters.onLoad);
              }
              if(parameters.onTabInit) {
                parameters.onFirstLoad = parameters.onTabInit;
                delete parameters.onTabInit;
                module.error(error.legacyInit, parameters.onFirstLoad);
              }
              settings = $.extend(true, {}, $.fn.tab.settings, parameters);
            }
          }
        },

        initializeHistory: function() {
          module.debug('Initializing page state');
          if( $.address === undefined ) {
            module.error(error.state);
            return false;
          }
          else {
            if(settings.historyType == 'state') {
              module.debug('Using HTML5 to manage state');
              if(settings.path !== false) {
                $.address
                  .history(true)
                  .state(settings.path)
                ;
              }
              else {
                module.error(error.path);
                return false;
              }
            }
            $.address
              .bind('change', module.event.history.change)
            ;
          }
        },

        event: {
          click: function(event) {
            var
              tabPath = $(this).data(metadata.tab)
            ;
            if(tabPath !== undefined) {
              if(settings.history) {
                module.verbose('Updating page state', event);
                $.address.value(tabPath);
              }
              else {
                module.verbose('Changing tab', event);
                module.changeTab(tabPath);
              }
              event.preventDefault();
            }
            else {
              module.debug('No tab specified');
            }
          },
          history: {
            change: function(event) {
              var
                tabPath   = event.pathNames.join('/') || module.get.initialPath(),
                pageTitle = settings.templates.determineTitle(tabPath) || false
              ;
              module.performance.display();
              module.debug('History change event', tabPath, event);
              historyEvent = event;
              if(tabPath !== undefined) {
                module.changeTab(tabPath);
              }
              if(pageTitle) {
                $.address.title(pageTitle);
              }
            }
          }
        },

        refresh: function() {
          if(activeTabPath) {
            module.debug('Refreshing tab', activeTabPath);
            module.changeTab(activeTabPath);
          }
        },

        cache: {

          read: function(cacheKey) {
            return (cacheKey !== undefined)
              ? cache[cacheKey]
              : false
            ;
          },
          add: function(cacheKey, content) {
            cacheKey = cacheKey || activeTabPath;
            module.debug('Adding cached content for', cacheKey);
            cache[cacheKey] = content;
          },
          remove: function(cacheKey) {
            cacheKey = cacheKey || activeTabPath;
            module.debug('Removing cached content for', cacheKey);
            delete cache[cacheKey];
          }
        },

        set: {
          auto: function() {
            var
              url = (typeof settings.path == 'string')
                ? settings.path.replace(/\/$/, '') + '/{$tab}'
                : '/{$tab}'
            ;
            module.verbose('Setting up automatic tab retrieval from server', url);
            if($.isPlainObject(settings.apiSettings)) {
              settings.apiSettings.url = url;
            }
            else {
              settings.apiSettings = {
                url: url
              };
            }
          },
          loading: function(tabPath) {
            var
              $tab      = module.get.tabElement(tabPath),
              isLoading = $tab.hasClass(className.loading)
            ;
            if(!isLoading) {
              module.verbose('Setting loading state for', $tab);
              $tab
                .addClass(className.loading)
                .siblings($tabs)
                  .removeClass(className.active + ' ' + className.loading)
              ;
              if($tab.length > 0) {
                settings.onRequest.call($tab[0], tabPath);
              }
            }
          },
          state: function(state) {
            $.address.value(state);
          }
        },

        changeTab: function(tabPath) {
          var
            pushStateAvailable = (window.history && window.history.pushState),
            shouldIgnoreLoad   = (pushStateAvailable && settings.ignoreFirstLoad && firstLoad),
            remoteContent      = (settings.auto || $.isPlainObject(settings.apiSettings) ),
            // only add default path if not remote content
            pathArray = (remoteContent && !shouldIgnoreLoad)
              ? module.utilities.pathToArray(tabPath)
              : module.get.defaultPathArray(tabPath)
          ;
          tabPath = module.utilities.arrayToPath(pathArray);
          $.each(pathArray, function(index, tab) {
            var
              currentPathArray   = pathArray.slice(0, index + 1),
              currentPath        = module.utilities.arrayToPath(currentPathArray),

              isTab              = module.is.tab(currentPath),
              isLastIndex        = (index + 1 == pathArray.length),

              $tab               = module.get.tabElement(currentPath),
              $anchor,
              nextPathArray,
              nextPath,
              isLastTab
            ;
            module.verbose('Looking for tab', tab);
            if(isTab) {
              module.verbose('Tab was found', tab);
              // scope up
              activeTabPath  = currentPath;
              parameterArray = module.utilities.filterArray(pathArray, currentPathArray);

              if(isLastIndex) {
                isLastTab = true;
              }
              else {
                nextPathArray = pathArray.slice(0, index + 2);
                nextPath      = module.utilities.arrayToPath(nextPathArray);
                isLastTab     = ( !module.is.tab(nextPath) );
                if(isLastTab) {
                  module.verbose('Tab parameters found', nextPathArray);
                }
              }
              if(isLastTab && remoteContent) {
                if(!shouldIgnoreLoad) {
                  module.activate.navigation(currentPath);
                  module.fetch.content(currentPath, tabPath);
                }
                else {
                  module.debug('Ignoring remote content on first tab load', currentPath);
                  firstLoad = false;
                  module.cache.add(tabPath, $tab.html());
                  module.activate.all(currentPath);
                  settings.onFirstLoad.call($tab[0], currentPath, parameterArray, historyEvent);
                  settings.onLoad.call($tab[0], currentPath, parameterArray, historyEvent);
                }
                return false;
              }
              else {
                module.debug('Opened local tab', currentPath);
                module.activate.all(currentPath);
                if( !module.cache.read(currentPath) ) {
                  module.cache.add(currentPath, true);
                  module.debug('First time tab loaded calling tab init');
                  settings.onFirstLoad.call($tab[0], currentPath, parameterArray, historyEvent);
                }
                settings.onLoad.call($tab[0], currentPath, parameterArray, historyEvent);
              }

            }
            else if(tabPath.search('/') == -1 && tabPath !== '') {
              // look for in page anchor
              $anchor     = $('#' + tabPath + ', a[name="' + tabPath + '"]');
              currentPath = $anchor.closest('[data-tab]').data(metadata.tab);
              $tab        = module.get.tabElement(currentPath);
              // if anchor exists use parent tab
              if($anchor && $anchor.length > 0 && currentPath) {
                module.debug('Anchor link used, opening parent tab', $tab, $anchor);
                if( !$tab.hasClass(className.active) ) {
                  setTimeout(function() {
                    module.scrollTo($anchor);
                  }, 0);
                }
                module.activate.all(currentPath);
                if( !module.cache.read(currentPath) ) {
                  module.cache.add(currentPath, true);
                  module.debug('First time tab loaded calling tab init');
                  settings.onFirstLoad.call($tab[0], currentPath, parameterArray, historyEvent);
                }
                settings.onLoad.call($tab[0], currentPath, parameterArray, historyEvent);
                return false;
              }
            }
            else {
              module.error(error.missingTab, $module, $context, currentPath);
              return false;
            }
          });
        },

        scrollTo: function($element) {
          var
            scrollOffset = ($element && $element.length > 0)
              ? $element.offset().top
              : false
          ;
          if(scrollOffset !== false) {
            module.debug('Forcing scroll to an in-page link in a hidden tab', scrollOffset, $element);
            $(document).scrollTop(scrollOffset);
          }
        },

        update: {
          content: function(tabPath, html, evaluateScripts) {
            var
              $tab = module.get.tabElement(tabPath),
              tab  = $tab[0]
            ;
            evaluateScripts = (evaluateScripts !== undefined)
              ? evaluateScripts
              : settings.evaluateScripts
            ;
            if(evaluateScripts) {
              module.debug('Updating HTML and evaluating inline scripts', tabPath, html);
              $tab.html(html);
            }
            else {
              module.debug('Updating HTML', tabPath, html);
              tab.innerHTML = html;
            }
          }
        },

        fetch: {

          content: function(tabPath, fullTabPath) {
            var
              $tab        = module.get.tabElement(tabPath),
              apiSettings = {
                dataType         : 'html',
                encodeParameters : false,
                on               : 'now',
                cache            : settings.alwaysRefresh,
                headers          : {
                  'X-Remote': true
                },
                onSuccess : function(response) {
                  module.cache.add(fullTabPath, response);
                  module.update.content(tabPath, response);
                  if(tabPath == activeTabPath) {
                    module.debug('Content loaded', tabPath);
                    module.activate.tab(tabPath);
                  }
                  else {
                    module.debug('Content loaded in background', tabPath);
                  }
                  settings.onFirstLoad.call($tab[0], tabPath, parameterArray, historyEvent);
                  settings.onLoad.call($tab[0], tabPath, parameterArray, historyEvent);
                },
                urlData: {
                  tab: fullTabPath
                }
              },
              request         = $tab.api('get request') || false,
              existingRequest = ( request && request.state() === 'pending' ),
              requestSettings,
              cachedContent
            ;

            fullTabPath   = fullTabPath || tabPath;
            cachedContent = module.cache.read(fullTabPath);


            if(settings.cache && cachedContent) {
              module.activate.tab(tabPath);
              module.debug('Adding cached content', fullTabPath);
              if(settings.evaluateScripts == 'once') {
                module.update.content(tabPath, cachedContent, false);
              }
              else {
                module.update.content(tabPath, cachedContent);
              }
              settings.onLoad.call($tab[0], tabPath, parameterArray, historyEvent);
            }
            else if(existingRequest) {
              module.set.loading(tabPath);
              module.debug('Content is already loading', fullTabPath);
            }
            else if($.api !== undefined) {
              requestSettings = $.extend(true, {}, settings.apiSettings, apiSettings);
              module.debug('Retrieving remote content', fullTabPath, requestSettings);
              module.set.loading(tabPath);
              $tab.api(requestSettings);
            }
            else {
              module.error(error.api);
            }
          }
        },

        activate: {
          all: function(tabPath) {
            module.activate.tab(tabPath);
            module.activate.navigation(tabPath);
          },
          tab: function(tabPath) {
            var
              $tab     = module.get.tabElement(tabPath),
              isActive = $tab.hasClass(className.active)
            ;
            module.verbose('Showing tab content for', $tab);
            if(!isActive) {
              $tab
                .addClass(className.active)
                .siblings($tabs)
                  .removeClass(className.active + ' ' + className.loading)
              ;
              if($tab.length > 0) {
                settings.onVisible.call($tab[0], tabPath);
              }
            }
          },
          navigation: function(tabPath) {
            var
              $navigation = module.get.navElement(tabPath),
              isActive    = $navigation.hasClass(className.active)
            ;
            module.verbose('Activating tab navigation for', $navigation, tabPath);
            if(!isActive) {
              $navigation
                .addClass(className.active)
                .siblings($allModules)
                  .removeClass(className.active + ' ' + className.loading)
              ;
            }
          }
        },

        deactivate: {
          all: function() {
            module.deactivate.navigation();
            module.deactivate.tabs();
          },
          navigation: function() {
            $allModules
              .removeClass(className.active)
            ;
          },
          tabs: function() {
            $tabs
              .removeClass(className.active + ' ' + className.loading)
            ;
          }
        },

        is: {
          tab: function(tabName) {
            return (tabName !== undefined)
              ? ( module.get.tabElement(tabName).length > 0 )
              : false
            ;
          }
        },

        get: {
          initialPath: function() {
            return $allModules.eq(0).data(metadata.tab) || $tabs.eq(0).data(metadata.tab);
          },
          path: function() {
            return $.address.value();
          },
          // adds default tabs to tab path
          defaultPathArray: function(tabPath) {
            return module.utilities.pathToArray( module.get.defaultPath(tabPath) );
          },
          defaultPath: function(tabPath) {
            var
              $defaultNav = $allModules.filter('[data-' + metadata.tab + '^="' + tabPath + '/"]').eq(0),
              defaultTab  = $defaultNav.data(metadata.tab) || false
            ;
            if( defaultTab ) {
              module.debug('Found default tab', defaultTab);
              if(recursionDepth < settings.maxDepth) {
                recursionDepth++;
                return module.get.defaultPath(defaultTab);
              }
              module.error(error.recursion);
            }
            else {
              module.debug('No default tabs found for', tabPath, $tabs);
            }
            recursionDepth = 0;
            return tabPath;
          },
          navElement: function(tabPath) {
            tabPath = tabPath || activeTabPath;
            return $allModules.filter('[data-' + metadata.tab + '="' + tabPath + '"]');
          },
          tabElement: function(tabPath) {
            var
              $fullPathTab,
              $simplePathTab,
              tabPathArray,
              lastTab
            ;
            tabPath        = tabPath || activeTabPath;
            tabPathArray   = module.utilities.pathToArray(tabPath);
            lastTab        = module.utilities.last(tabPathArray);
            $fullPathTab   = $tabs.filter('[data-' + metadata.tab + '="' + tabPath + '"]');
            $simplePathTab = $tabs.filter('[data-' + metadata.tab + '="' + lastTab + '"]');
            return ($fullPathTab.length > 0)
              ? $fullPathTab
              : $simplePathTab
            ;
          },
          tab: function() {
            return activeTabPath;
          }
        },

        utilities: {
          filterArray: function(keepArray, removeArray) {
            return $.grep(keepArray, function(keepValue) {
              return ( $.inArray(keepValue, removeArray) == -1);
            });
          },
          last: function(array) {
            return $.isArray(array)
              ? array[ array.length - 1]
              : false
            ;
          },
          pathToArray: function(pathName) {
            if(pathName === undefined) {
              pathName = activeTabPath;
            }
            return typeof pathName == 'string'
              ? pathName.split('/')
              : [pathName]
            ;
          },
          arrayToPath: function(pathArray) {
            return $.isArray(pathArray)
              ? pathArray.join('/')
              : false
            ;
          }
        },

        setting: function(name, value) {
          module.debug('Changing setting', name, value);
          if( $.isPlainObject(name) ) {
            $.extend(true, settings, name);
          }
          else if(value !== undefined) {
            settings[name] = value;
          }
          else {
            return settings[name];
          }
        },
        internal: function(name, value) {
          if( $.isPlainObject(name) ) {
            $.extend(true, module, name);
          }
          else if(value !== undefined) {
            module[name] = value;
          }
          else {
            return module[name];
          }
        },
        debug: function() {
          if(settings.debug) {
            if(settings.performance) {
              module.performance.log(arguments);
            }
            else {
              module.debug = Function.prototype.bind.call(console.info, console, settings.name + ':');
              module.debug.apply(console, arguments);
            }
          }
        },
        verbose: function() {
          if(settings.verbose && settings.debug) {
            if(settings.performance) {
              module.performance.log(arguments);
            }
            else {
              module.verbose = Function.prototype.bind.call(console.info, console, settings.name + ':');
              module.verbose.apply(console, arguments);
            }
          }
        },
        error: function() {
          module.error = Function.prototype.bind.call(console.error, console, settings.name + ':');
          module.error.apply(console, arguments);
        },
        performance: {
          log: function(message) {
            var
              currentTime,
              executionTime,
              previousTime
            ;
            if(settings.performance) {
              currentTime   = new Date().getTime();
              previousTime  = time || currentTime;
              executionTime = currentTime - previousTime;
              time          = currentTime;
              performance.push({
                'Name'           : message[0],
                'Arguments'      : [].slice.call(message, 1) || '',
                'Element'        : element,
                'Execution Time' : executionTime
              });
            }
            clearTimeout(module.performance.timer);
            module.performance.timer = setTimeout(module.performance.display, 500);
          },
          display: function() {
            var
              title = settings.name + ':',
              totalTime = 0
            ;
            time = false;
            clearTimeout(module.performance.timer);
            $.each(performance, function(index, data) {
              totalTime += data['Execution Time'];
            });
            title += ' ' + totalTime + 'ms';
            if(moduleSelector) {
              title += ' \'' + moduleSelector + '\'';
            }
            if( (console.group !== undefined || console.table !== undefined) && performance.length > 0) {
              console.groupCollapsed(title);
              if(console.table) {
                console.table(performance);
              }
              else {
                $.each(performance, function(index, data) {
                  console.log(data['Name'] + ': ' + data['Execution Time']+'ms');
                });
              }
              console.groupEnd();
            }
            performance = [];
          }
        },
        invoke: function(query, passedArguments, context) {
          var
            object = instance,
            maxDepth,
            found,
            response
          ;
          passedArguments = passedArguments || queryArguments;
          context         = element         || context;
          if(typeof query == 'string' && object !== undefined) {
            query    = query.split(/[\. ]/);
            maxDepth = query.length - 1;
            $.each(query, function(depth, value) {
              var camelCaseValue = (depth != maxDepth)
                ? value + query[depth + 1].charAt(0).toUpperCase() + query[depth + 1].slice(1)
                : query
              ;
              if( $.isPlainObject( object[camelCaseValue] ) && (depth != maxDepth) ) {
                object = object[camelCaseValue];
              }
              else if( object[camelCaseValue] !== undefined ) {
                found = object[camelCaseValue];
                return false;
              }
              else if( $.isPlainObject( object[value] ) && (depth != maxDepth) ) {
                object = object[value];
              }
              else if( object[value] !== undefined ) {
                found = object[value];
                return false;
              }
              else {
                module.error(error.method, query);
                return false;
              }
            });
          }
          if ( $.isFunction( found ) ) {
            response = found.apply(context, passedArguments);
          }
          else if(found !== undefined) {
            response = found;
          }
          if($.isArray(returnedValue)) {
            returnedValue.push(response);
          }
          else if(returnedValue !== undefined) {
            returnedValue = [returnedValue, response];
          }
          else if(response !== undefined) {
            returnedValue = response;
          }
          return found;
        }
      };
      if(methodInvoked) {
        if(instance === undefined) {
          module.initialize();
        }
        module.invoke(query);
      }
      else {
        if(instance !== undefined) {
          instance.invoke('destroy');
        }
        module.initialize();
      }
    })
  ;
  return (returnedValue !== undefined)
    ? returnedValue
    : this
  ;

};

// shortcut for tabbed content with no defined navigation
$.tab = function() {
  $(window).tab.apply(this, arguments);
};

$.fn.tab.settings = {

  name            : 'Tab',
  namespace       : 'tab',

  debug           : false,
  verbose         : false,
  performance     : true,

  auto            : false,  // uses pjax style endpoints fetching content from same url with remote-content headers
  history         : false,  // use browser history
  historyType     : 'hash', // #/ or html5 state
  path            : false,  // base path of url

  context         : false,  // specify a context that tabs must appear inside
  childrenOnly    : false,  // use only tabs that are children of context
  maxDepth        : 25,     // max depth a tab can be nested

  alwaysRefresh   : false,  // load tab content new every tab click
  cache           : true,   // cache the content requests to pull locally
  ignoreFirstLoad : false,  // don't load remote content on first load

  apiSettings     : false,  // settings for api call
  evaluateScripts : 'once', // whether inline scripts should be parsed (true/false/once). Once will not re-evaluate on cached content

  onFirstLoad : function(tabPath, parameterArray, historyEvent) {}, // called first time loaded
  onLoad      : function(tabPath, parameterArray, historyEvent) {}, // called on every load
  onVisible   : function(tabPath, parameterArray, historyEvent) {}, // called every time tab visible
  onRequest   : function(tabPath, parameterArray, historyEvent) {}, // called ever time a tab beings loading remote content

  templates    : {
    determineTitle: function(tabArray) {} // returns page title for path
  },

  error: {
    api        : 'You attempted to load content without API module',
    method     : 'The method you called is not defined',
    missingTab : 'Activated tab cannot be found. Tabs are case-sensitive.',
    noContent  : 'The tab you specified is missing a content url.',
    path       : 'History enabled, but no path was specified',
    recursion  : 'Max recursive depth reached',
    legacyInit : 'onTabInit has been renamed to onFirstLoad in 2.0, please adjust your code.',
    legacyLoad : 'onTabLoad has been renamed to onLoad in 2.0. Please adjust your code',
    state      : 'History requires Asual\'s Address library <https://github.com/asual/jquery-address>'
  },

  metadata : {
    tab    : 'tab',
    loaded : 'loaded',
    promise: 'promise'
  },

  className   : {
    loading : 'loading',
    active  : 'active'
  },

  selector    : {
    tabs : '.ui.tab',
    ui   : '.ui'
  }

};

})( jQuery, window, document );

/*!
 * # Semantic UI 2.1.6 - Transition
 * http://github.com/semantic-org/semantic-ui/
 *
 *
 * Copyright 2015 Contributors
 * Released under the MIT license
 * http://opensource.org/licenses/MIT
 *
 */

;(function ( $, window, document, undefined ) {

"use strict";

$.fn.transition = function() {
  var
    $allModules     = $(this),
    moduleSelector  = $allModules.selector || '',

    time            = new Date().getTime(),
    performance     = [],

    moduleArguments = arguments,
    query           = moduleArguments[0],
    queryArguments  = [].slice.call(arguments, 1),
    methodInvoked   = (typeof query === 'string'),

    requestAnimationFrame = window.requestAnimationFrame
      || window.mozRequestAnimationFrame
      || window.webkitRequestAnimationFrame
      || window.msRequestAnimationFrame
      || function(callback) { setTimeout(callback, 0); },

    returnedValue
  ;
  $allModules
    .each(function(index) {
      var
        $module  = $(this),
        element  = this,

        // set at run time
        settings,
        instance,

        error,
        className,
        metadata,
        animationEnd,
        animationName,

        namespace,
        moduleNamespace,
        eventNamespace,
        module
      ;

      module = {

        initialize: function() {

          // get full settings
          settings        = module.get.settings.apply(element, moduleArguments);

          // shorthand
          className       = settings.className;
          error           = settings.error;
          metadata        = settings.metadata;

          // define namespace
          eventNamespace  = '.' + settings.namespace;
          moduleNamespace = 'module-' + settings.namespace;
          instance        = $module.data(moduleNamespace) || module;

          // get vendor specific events
          animationEnd    = module.get.animationEndEvent();

          if(methodInvoked) {
            methodInvoked = module.invoke(query);
          }

          // method not invoked, lets run an animation
          if(methodInvoked === false) {
            module.verbose('Converted arguments into settings object', settings);
            if(settings.interval) {
              module.delay(settings.animate);
            }
            else  {
              module.animate();
            }
            module.instantiate();
          }
        },

        instantiate: function() {
          module.verbose('Storing instance of module', module);
          instance = module;
          $module
            .data(moduleNamespace, instance)
          ;
        },

        destroy: function() {
          module.verbose('Destroying previous module for', element);
          $module
            .removeData(moduleNamespace)
          ;
        },

        refresh: function() {
          module.verbose('Refreshing display type on next animation');
          delete module.displayType;
        },

        forceRepaint: function() {
          module.verbose('Forcing element repaint');
          var
            $parentElement = $module.parent(),
            $nextElement = $module.next()
          ;
          if($nextElement.length === 0) {
            $module.detach().appendTo($parentElement);
          }
          else {
            $module.detach().insertBefore($nextElement);
          }
        },

        repaint: function() {
          module.verbose('Repainting element');
          var
            fakeAssignment = element.offsetWidth
          ;
        },

        delay: function(interval) {
          var
            direction = module.get.animationDirection(),
            shouldReverse,
            delay
          ;
          if(!direction) {
            direction = module.can.transition()
              ? module.get.direction()
              : 'static'
            ;
          }
          interval = (interval !== undefined)
            ? interval
            : settings.interval
          ;
          shouldReverse = (settings.reverse == 'auto' && direction == className.outward);
          delay = (shouldReverse || settings.reverse == true)
            ? ($allModules.length - index) * settings.interval
            : index * settings.interval
          ;
          module.debug('Delaying animation by', delay);
          setTimeout(module.animate, delay);
        },

        animate: function(overrideSettings) {
          settings = overrideSettings || settings;
          if(!module.is.supported()) {
            module.error(error.support);
            return false;
          }
          module.debug('Preparing animation', settings.animation);
          if(module.is.animating()) {
            if(settings.queue) {
              if(!settings.allowRepeats && module.has.direction() && module.is.occurring() && module.queuing !== true) {
                module.debug('Animation is currently occurring, preventing queueing same animation', settings.animation);
              }
              else {
                module.queue(settings.animation);
              }
              return false;
            }
            else if(!settings.allowRepeats && module.is.occurring()) {
              module.debug('Animation is already occurring, will not execute repeated animation', settings.animation);
              return false;
            }
            else {
              module.debug('New animation started, completing previous early', settings.animation);
              instance.complete();
            }
          }
          if( module.can.animate() ) {
            module.set.animating(settings.animation);
          }
          else {
            module.error(error.noAnimation, settings.animation, element);
          }
        },

        reset: function() {
          module.debug('Resetting animation to beginning conditions');
          module.remove.animationCallbacks();
          module.restore.conditions();
          module.remove.animating();
        },

        queue: function(animation) {
          module.debug('Queueing animation of', animation);
          module.queuing = true;
          $module
            .one(animationEnd + '.queue' + eventNamespace, function() {
              module.queuing = false;
              module.repaint();
              module.animate.apply(this, settings);
            })
          ;
        },

        complete: function (event) {
          module.debug('Animation complete', settings.animation);
          module.remove.completeCallback();
          module.remove.failSafe();
          if(!module.is.looping()) {
            if( module.is.outward() ) {
              module.verbose('Animation is outward, hiding element');
              module.restore.conditions();
              module.hide();
            }
            else if( module.is.inward() ) {
              module.verbose('Animation is outward, showing element');
              module.restore.conditions();
              module.show();
            }
            else {
              module.verbose('Static animation completed');
              module.restore.conditions();
              settings.onComplete.call(element);
            }
          }
        },

        force: {
          visible: function() {
            var
              style          = $module.attr('style'),
              userStyle      = module.get.userStyle(),
              displayType    = module.get.displayType(),
              overrideStyle  = userStyle + 'display: ' + displayType + ' !important;',
              currentDisplay = $module.css('display'),
              emptyStyle     = (style === undefined || style === '')
            ;
            if(currentDisplay !== displayType) {
              module.verbose('Overriding default display to show element', displayType);
              $module
                .attr('style', overrideStyle)
              ;
            }
            else if(emptyStyle) {
              $module.removeAttr('style');
            }
          },
          hidden: function() {
            var
              style          = $module.attr('style'),
              currentDisplay = $module.css('display'),
              emptyStyle     = (style === undefined || style === '')
            ;
            if(currentDisplay !== 'none' && !module.is.hidden()) {
              module.verbose('Overriding default display to hide element');
              $module
                .css('display', 'none')
              ;
            }
            else if(emptyStyle) {
              $module
                .removeAttr('style')
              ;
            }
          }
        },

        has: {
          direction: function(animation) {
            var
              hasDirection = false
            ;
            animation = animation || settings.animation;
            if(typeof animation === 'string') {
              animation = animation.split(' ');
              $.each(animation, function(index, word){
                if(word === className.inward || word === className.outward) {
                  hasDirection = true;
                }
              });
            }
            return hasDirection;
          },
          inlineDisplay: function() {
            var
              style = $module.attr('style') || ''
            ;
            return $.isArray(style.match(/display.*?;/, ''));
          }
        },

        set: {
          animating: function(animation) {
            var
              animationClass,
              direction
            ;
            // remove previous callbacks
            module.remove.completeCallback();

            // determine exact animation
            animation      = animation || settings.animation;
            animationClass = module.get.animationClass(animation);

            // save animation class in cache to restore class names
            module.save.animation(animationClass);

            // override display if necessary so animation appears visibly
            module.force.visible();

            module.remove.hidden();
            module.remove.direction();

            module.start.animation(animationClass);

          },
          duration: function(animationName, duration) {
            duration = duration || settings.duration;
            duration = (typeof duration == 'number')
              ? duration + 'ms'
              : duration
            ;
            if(duration || duration === 0) {
              module.verbose('Setting animation duration', duration);
              $module
                .css({
                  'animation-duration':  duration
                })
              ;
            }
          },
          direction: function(direction) {
            direction = direction || module.get.direction();
            if(direction == className.inward) {
              module.set.inward();
            }
            else {
              module.set.outward();
            }
          },
          looping: function() {
            module.debug('Transition set to loop');
            $module
              .addClass(className.looping)
            ;
          },
          hidden: function() {
            $module
              .addClass(className.transition)
              .addClass(className.hidden)
            ;
          },
          inward: function() {
            module.debug('Setting direction to inward');
            $module
              .removeClass(className.outward)
              .addClass(className.inward)
            ;
          },
          outward: function() {
            module.debug('Setting direction to outward');
            $module
              .removeClass(className.inward)
              .addClass(className.outward)
            ;
          },
          visible: function() {
            $module
              .addClass(className.transition)
              .addClass(className.visible)
            ;
          }
        },

        start: {
          animation: function(animationClass) {
            animationClass = animationClass || module.get.animationClass();
            module.debug('Starting tween', animationClass);
            $module
              .addClass(animationClass)
              .one(animationEnd + '.complete' + eventNamespace, module.complete)
            ;
            if(settings.useFailSafe) {
              module.add.failSafe();
            }
            module.set.duration(settings.duration);
            settings.onStart.call(element);
          }
        },

        save: {
          animation: function(animation) {
            if(!module.cache) {
              module.cache = {};
            }
            module.cache.animation = animation;
          },
          displayType: function(displayType) {
            if(displayType !== 'none') {
              $module.data(metadata.displayType, displayType);
            }
          },
          transitionExists: function(animation, exists) {
            $.fn.transition.exists[animation] = exists;
            module.verbose('Saving existence of transition', animation, exists);
          }
        },

        restore: {
          conditions: function() {
            var
              animation = module.get.currentAnimation()
            ;
            if(animation) {
              $module
                .removeClass(animation)
              ;
              module.verbose('Removing animation class', module.cache);
            }
            module.remove.duration();
          }
        },

        add: {
          failSafe: function() {
            var
              duration = module.get.duration()
            ;
            module.timer = setTimeout(function() {
              $module.triggerHandler(animationEnd);
            }, duration + settings.failSafeDelay);
            module.verbose('Adding fail safe timer', module.timer);
          }
        },

        remove: {
          animating: function() {
            $module.removeClass(className.animating);
          },
          animationCallbacks: function() {
            module.remove.queueCallback();
            module.remove.completeCallback();
          },
          queueCallback: function() {
            $module.off('.queue' + eventNamespace);
          },
          completeCallback: function() {
            $module.off('.complete' + eventNamespace);
          },
          display: function() {
            $module.css('display', '');
          },
          direction: function() {
            $module
              .removeClass(className.inward)
              .removeClass(className.outward)
            ;
          },
          duration: function() {
            $module
              .css('animation-duration', '')
            ;
          },
          failSafe: function() {
            module.verbose('Removing fail safe timer', module.timer);
            if(module.timer) {
              clearTimeout(module.timer);
            }
          },
          hidden: function() {
            $module.removeClass(className.hidden);
          },
          visible: function() {
            $module.removeClass(className.visible);
          },
          looping: function() {
            module.debug('Transitions are no longer looping');
            if( module.is.looping() ) {
              module.reset();
              $module
                .removeClass(className.looping)
              ;
            }
          },
          transition: function() {
            $module
              .removeClass(className.visible)
              .removeClass(className.hidden)
            ;
          }
        },
        get: {
          settings: function(animation, duration, onComplete) {
            // single settings object
            if(typeof animation == 'object') {
              return $.extend(true, {}, $.fn.transition.settings, animation);
            }
            // all arguments provided
            else if(typeof onComplete == 'function') {
              return $.extend({}, $.fn.transition.settings, {
                animation  : animation,
                onComplete : onComplete,
                duration   : duration
              });
            }
            // only duration provided
            else if(typeof duration == 'string' || typeof duration == 'number') {
              return $.extend({}, $.fn.transition.settings, {
                animation : animation,
                duration  : duration
              });
            }
            // duration is actually settings object
            else if(typeof duration == 'object') {
              return $.extend({}, $.fn.transition.settings, duration, {
                animation : animation
              });
            }
            // duration is actually callback
            else if(typeof duration == 'function') {
              return $.extend({}, $.fn.transition.settings, {
                animation  : animation,
                onComplete : duration
              });
            }
            // only animation provided
            else {
              return $.extend({}, $.fn.transition.settings, {
                animation : animation
              });
            }
            return $.fn.transition.settings;
          },
          animationClass: function(animation) {
            var
              animationClass = animation || settings.animation,
              directionClass = (module.can.transition() && !module.has.direction())
                ? module.get.direction() + ' '
                : ''
            ;
            return className.animating + ' '
              + className.transition + ' '
              + directionClass
              + animationClass
            ;
          },
          currentAnimation: function() {
            return (module.cache && module.cache.animation !== undefined)
              ? module.cache.animation
              : false
            ;
          },
          currentDirection: function() {
            return module.is.inward()
              ? className.inward
              : className.outward
            ;
          },
          direction: function() {
            return module.is.hidden() || !module.is.visible()
              ? className.inward
              : className.outward
            ;
          },
          animationDirection: function(animation) {
            var
              direction
            ;
            animation = animation || settings.animation;
            if(typeof animation === 'string') {
              animation = animation.split(' ');
              // search animation name for out/in class
              $.each(animation, function(index, word){
                if(word === className.inward) {
                  direction = className.inward;
                }
                else if(word === className.outward) {
                  direction = className.outward;
                }
              });
            }
            // return found direction
            if(direction) {
              return direction;
            }
            return false;
          },
          duration: function(duration) {
            duration = duration || settings.duration;
            if(duration === false) {
              duration = $module.css('animation-duration') || 0;
            }
            return (typeof duration === 'string')
              ? (duration.indexOf('ms') > -1)
                ? parseFloat(duration)
                : parseFloat(duration) * 1000
              : duration
            ;
          },
          displayType: function() {
            if(settings.displayType) {
              return settings.displayType;
            }
            if($module.data(metadata.displayType) === undefined) {
              // create fake element to determine display state
              module.can.transition(true);
            }
            return $module.data(metadata.displayType);
          },
          userStyle: function(style) {
            style = style || $module.attr('style') || '';
            return style.replace(/display.*?;/, '');
          },
          transitionExists: function(animation) {
            return $.fn.transition.exists[animation];
          },
          animationStartEvent: function() {
            var
              element     = document.createElement('div'),
              animations  = {
                'animation'       :'animationstart',
                'OAnimation'      :'oAnimationStart',
                'MozAnimation'    :'mozAnimationStart',
                'WebkitAnimation' :'webkitAnimationStart'
              },
              animation
            ;
            for(animation in animations){
              if( element.style[animation] !== undefined ){
                return animations[animation];
              }
            }
            return false;
          },
          animationEndEvent: function() {
            var
              element     = document.createElement('div'),
              animations  = {
                'animation'       :'animationend',
                'OAnimation'      :'oAnimationEnd',
                'MozAnimation'    :'mozAnimationEnd',
                'WebkitAnimation' :'webkitAnimationEnd'
              },
              animation
            ;
            for(animation in animations){
              if( element.style[animation] !== undefined ){
                return animations[animation];
              }
            }
            return false;
          }

        },

        can: {
          transition: function(forced) {
            var
              animation         = settings.animation,
              transitionExists  = module.get.transitionExists(animation),
              elementClass,
              tagName,
              $clone,
              currentAnimation,
              inAnimation,
              directionExists,
              displayType
            ;
            if( transitionExists === undefined || forced) {
              module.verbose('Determining whether animation exists');
              elementClass = $module.attr('class');
              tagName      = $module.prop('tagName');

              $clone = $('<' + tagName + ' />').addClass( elementClass ).insertAfter($module);
              currentAnimation = $clone
                .addClass(animation)
                .removeClass(className.inward)
                .removeClass(className.outward)
                .addClass(className.animating)
                .addClass(className.transition)
                .css('animationName')
              ;
              inAnimation = $clone
                .addClass(className.inward)
                .css('animationName')
              ;
              displayType = $clone
                .attr('class', elementClass)
                .removeAttr('style')
                .removeClass(className.hidden)
                .removeClass(className.visible)
                .show()
                .css('display')
              ;
              module.verbose('Determining final display state', displayType);
              module.save.displayType(displayType);

              $clone.remove();
              if(currentAnimation != inAnimation) {
                module.debug('Direction exists for animation', animation);
                directionExists = true;
              }
              else if(currentAnimation == 'none' || !currentAnimation) {
                module.debug('No animation defined in css', animation);
                return;
              }
              else {
                module.debug('Static animation found', animation, displayType);
                directionExists = false;
              }
              module.save.transitionExists(animation, directionExists);
            }
            return (transitionExists !== undefined)
              ? transitionExists
              : directionExists
            ;
          },
          animate: function() {
            // can transition does not return a value if animation does not exist
            return (module.can.transition() !== undefined);
          }
        },

        is: {
          animating: function() {
            return $module.hasClass(className.animating);
          },
          inward: function() {
            return $module.hasClass(className.inward);
          },
          outward: function() {
            return $module.hasClass(className.outward);
          },
          looping: function() {
            return $module.hasClass(className.looping);
          },
          occurring: function(animation) {
            animation = animation || settings.animation;
            animation = '.' + animation.replace(' ', '.');
            return ( $module.filter(animation).length > 0 );
          },
          visible: function() {
            return $module.is(':visible');
          },
          hidden: function() {
            return $module.css('visibility') === 'hidden';
          },
          supported: function() {
            return(animationEnd !== false);
          }
        },

        hide: function() {
          module.verbose('Hiding element');
          if( module.is.animating() ) {
            module.reset();
          }
          element.blur(); // IE will trigger focus change if element is not blurred before hiding
          module.remove.display();
          module.remove.visible();
          module.set.hidden();
          module.force.hidden();
          settings.onHide.call(element);
          settings.onComplete.call(element);
          // module.repaint();
        },

        show: function(display) {
          module.verbose('Showing element', display);
          module.remove.hidden();
          module.set.visible();
          module.force.visible();
          settings.onShow.call(element);
          settings.onComplete.call(element);
          // module.repaint();
        },

        toggle: function() {
          if( module.is.visible() ) {
            module.hide();
          }
          else {
            module.show();
          }
        },

        stop: function() {
          module.debug('Stopping current animation');
          $module.triggerHandler(animationEnd);
        },

        stopAll: function() {
          module.debug('Stopping all animation');
          module.remove.queueCallback();
          $module.triggerHandler(animationEnd);
        },

        clear: {
          queue: function() {
            module.debug('Clearing animation queue');
            module.remove.queueCallback();
          }
        },

        enable: function() {
          module.verbose('Starting animation');
          $module.removeClass(className.disabled);
        },

        disable: function() {
          module.debug('Stopping animation');
          $module.addClass(className.disabled);
        },

        setting: function(name, value) {
          module.debug('Changing setting', name, value);
          if( $.isPlainObject(name) ) {
            $.extend(true, settings, name);
          }
          else if(value !== undefined) {
            settings[name] = value;
          }
          else {
            return settings[name];
          }
        },
        internal: function(name, value) {
          if( $.isPlainObject(name) ) {
            $.extend(true, module, name);
          }
          else if(value !== undefined) {
            module[name] = value;
          }
          else {
            return module[name];
          }
        },
        debug: function() {
          if(settings.debug) {
            if(settings.performance) {
              module.performance.log(arguments);
            }
            else {
              module.debug = Function.prototype.bind.call(console.info, console, settings.name + ':');
              module.debug.apply(console, arguments);
            }
          }
        },
        verbose: function() {
          if(settings.verbose && settings.debug) {
            if(settings.performance) {
              module.performance.log(arguments);
            }
            else {
              module.verbose = Function.prototype.bind.call(console.info, console, settings.name + ':');
              module.verbose.apply(console, arguments);
            }
          }
        },
        error: function() {
          module.error = Function.prototype.bind.call(console.error, console, settings.name + ':');
          module.error.apply(console, arguments);
        },
        performance: {
          log: function(message) {
            var
              currentTime,
              executionTime,
              previousTime
            ;
            if(settings.performance) {
              currentTime   = new Date().getTime();
              previousTime  = time || currentTime;
              executionTime = currentTime - previousTime;
              time          = currentTime;
              performance.push({
                'Name'           : message[0],
                'Arguments'      : [].slice.call(message, 1) || '',
                'Element'        : element,
                'Execution Time' : executionTime
              });
            }
            clearTimeout(module.performance.timer);
            module.performance.timer = setTimeout(module.performance.display, 500);
          },
          display: function() {
            var
              title = settings.name + ':',
              totalTime = 0
            ;
            time = false;
            clearTimeout(module.performance.timer);
            $.each(performance, function(index, data) {
              totalTime += data['Execution Time'];
            });
            title += ' ' + totalTime + 'ms';
            if(moduleSelector) {
              title += ' \'' + moduleSelector + '\'';
            }
            if($allModules.length > 1) {
              title += ' ' + '(' + $allModules.length + ')';
            }
            if( (console.group !== undefined || console.table !== undefined) && performance.length > 0) {
              console.groupCollapsed(title);
              if(console.table) {
                console.table(performance);
              }
              else {
                $.each(performance, function(index, data) {
                  console.log(data['Name'] + ': ' + data['Execution Time']+'ms');
                });
              }
              console.groupEnd();
            }
            performance = [];
          }
        },
        // modified for transition to return invoke success
        invoke: function(query, passedArguments, context) {
          var
            object = instance,
            maxDepth,
            found,
            response
          ;
          passedArguments = passedArguments || queryArguments;
          context         = element         || context;
          if(typeof query == 'string' && object !== undefined) {
            query    = query.split(/[\. ]/);
            maxDepth = query.length - 1;
            $.each(query, function(depth, value) {
              var camelCaseValue = (depth != maxDepth)
                ? value + query[depth + 1].charAt(0).toUpperCase() + query[depth + 1].slice(1)
                : query
              ;
              if( $.isPlainObject( object[camelCaseValue] ) && (depth != maxDepth) ) {
                object = object[camelCaseValue];
              }
              else if( object[camelCaseValue] !== undefined ) {
                found = object[camelCaseValue];
                return false;
              }
              else if( $.isPlainObject( object[value] ) && (depth != maxDepth) ) {
                object = object[value];
              }
              else if( object[value] !== undefined ) {
                found = object[value];
                return false;
              }
              else {
                return false;
              }
            });
          }
          if ( $.isFunction( found ) ) {
            response = found.apply(context, passedArguments);
          }
          else if(found !== undefined) {
            response = found;
          }

          if($.isArray(returnedValue)) {
            returnedValue.push(response);
          }
          else if(returnedValue !== undefined) {
            returnedValue = [returnedValue, response];
          }
          else if(response !== undefined) {
            returnedValue = response;
          }
          return (found !== undefined)
            ? found
            : false
          ;
        }
      };
      module.initialize();
    })
  ;
  return (returnedValue !== undefined)
    ? returnedValue
    : this
  ;
};

// Records if CSS transition is available
$.fn.transition.exists = {};

$.fn.transition.settings = {

  // module info
  name          : 'Transition',

  // debug content outputted to console
  debug         : false,

  // verbose debug output
  verbose       : false,

  // performance data output
  performance   : true,

  // event namespace
  namespace     : 'transition',

  // delay between animations in group
  interval      : 0,

  // whether group animations should be reversed
  reverse       : 'auto',

  // animation callback event
  onStart       : function() {},
  onComplete    : function() {},
  onShow        : function() {},
  onHide        : function() {},

  // whether timeout should be used to ensure callback fires in cases animationend does not
  useFailSafe   : true,

  // delay in ms for fail safe
  failSafeDelay : 100,

  // whether EXACT animation can occur twice in a row
  allowRepeats  : false,

  // Override final display type on visible
  displayType   : false,

  // animation duration
  animation     : 'fade',
  duration      : false,

  // new animations will occur after previous ones
  queue         : true,

  metadata : {
    displayType: 'display'
  },

  className   : {
    animating  : 'animating',
    disabled   : 'disabled',
    hidden     : 'hidden',
    inward     : 'in',
    loading    : 'loading',
    looping    : 'looping',
    outward    : 'out',
    transition : 'transition',
    visible    : 'visible'
  },

  // possible errors
  error: {
    noAnimation : 'There is no css animation matching the one you specified. Please make sure your css is vendor prefixed, and you have included transition css.',
    repeated    : 'That animation is already occurring, cancelling repeated animation',
    method      : 'The method you called is not defined',
    support     : 'This browser does not support CSS animations'
  }

};


})( jQuery, window, document );

/*!
 * # Semantic UI 2.1.6 - API
 * http://github.com/semantic-org/semantic-ui/
 *
 *
 * Copyright 2015 Contributors
 * Released under the MIT license
 * http://opensource.org/licenses/MIT
 *
 */

;(function ( $, window, document, undefined ) {

"use strict";

$.api = $.fn.api = function(parameters) {

  var
    // use window context if none specified
    $allModules     = $.isFunction(this)
        ? $(window)
        : $(this),
    moduleSelector = $allModules.selector || '',
    time           = new Date().getTime(),
    performance    = [],

    query          = arguments[0],
    methodInvoked  = (typeof query == 'string'),
    queryArguments = [].slice.call(arguments, 1),

    returnedValue
  ;

  $allModules
    .each(function() {
      var
        settings          = ( $.isPlainObject(parameters) )
          ? $.extend(true, {}, $.fn.api.settings, parameters)
          : $.extend({}, $.fn.api.settings),

        // internal aliases
        namespace       = settings.namespace,
        metadata        = settings.metadata,
        selector        = settings.selector,
        error           = settings.error,
        className       = settings.className,

        // define namespaces for modules
        eventNamespace  = '.' + namespace,
        moduleNamespace = 'module-' + namespace,

        // element that creates request
        $module         = $(this),
        $form           = $module.closest(selector.form),

        // context used for state
        $context        = (settings.stateContext)
          ? $(settings.stateContext)
          : $module,

        // request details
        ajaxSettings,
        requestSettings,
        url,
        data,
        requestStartTime,

        // standard module
        element         = this,
        context         = $context[0],
        instance        = $module.data(moduleNamespace),
        module
      ;

      module = {

        initialize: function() {
          if(!methodInvoked) {
            module.bind.events();
          }
          module.instantiate();
        },

        instantiate: function() {
          module.verbose('Storing instance of module', module);
          instance = module;
          $module
            .data(moduleNamespace, instance)
          ;
        },

        destroy: function() {
          module.verbose('Destroying previous module for', element);
          $module
            .removeData(moduleNamespace)
            .off(eventNamespace)
          ;
        },

        bind: {
          events: function() {
            var
              triggerEvent = module.get.event()
            ;
            if( triggerEvent ) {
              module.verbose('Attaching API events to element', triggerEvent);
              $module
                .on(triggerEvent + eventNamespace, module.event.trigger)
              ;
            }
            else if(settings.on == 'now') {
              module.debug('Querying API endpoint immediately');
              module.query();
            }
          }
        },

        decode: {
          json: function(response) {
            if(response !== undefined && typeof response == 'string') {
              try {
               response = JSON.parse(response);
              }
              catch(e) {
                // isnt json string
              }
            }
            return response;
          }
        },

        read: {
          cachedResponse: function(url) {
            var
              response
            ;
            if(window.Storage === undefined) {
              module.error(error.noStorage);
              return;
            }
            response = sessionStorage.getItem(url);
            module.debug('Using cached response', url, response);
            response = module.decode.json(response);
            return false;
          }
        },
        write: {
          cachedResponse: function(url, response) {
            if(response && response === '') {
              module.debug('Response empty, not caching', response);
              return;
            }
            if(window.Storage === undefined) {
              module.error(error.noStorage);
              return;
            }
            if( $.isPlainObject(response) ) {
              response = JSON.stringify(response);
            }
            sessionStorage.setItem(url, response);
            module.verbose('Storing cached response for url', url, response);
          }
        },

        query: function() {

          if(module.is.disabled()) {
            module.debug('Element is disabled API request aborted');
            return;
          }

          if(module.is.loading()) {
            if(settings.interruptRequests) {
              module.debug('Interrupting previous request');
              module.abort();
            }
            else {
              module.debug('Cancelling request, previous request is still pending');
              return;
            }
          }

          // pass element metadata to url (value, text)
          if(settings.defaultData) {
            $.extend(true, settings.urlData, module.get.defaultData());
          }

          // Add form content
          if(settings.serializeForm) {
            settings.data = module.add.formData(settings.data);
          }

          // call beforesend and get any settings changes
          requestSettings = module.get.settings();

          // check if before send cancelled request
          if(requestSettings === false) {
            module.cancelled = true;
            module.error(error.beforeSend);
            return;
          }
          else {
            module.cancelled = false;
          }

          // get url
          url = module.get.templatedURL();

          if(!url && !module.is.mocked()) {
            module.error(error.missingURL);
            return;
          }

          // replace variables
          url = module.add.urlData( url );

          // missing url parameters
          if( !url && !module.is.mocked()) {
            return;
          }


          // look for jQuery ajax parameters in settings
          ajaxSettings = $.extend(true, {}, settings, {
            type       : settings.method || settings.type,
            data       : data,
            url        : settings.base + url,
            beforeSend : settings.beforeXHR,
            success    : function() {},
            failure    : function() {},
            complete   : function() {}
          });

          module.debug('Querying URL', ajaxSettings.url);
          module.verbose('Using AJAX settings', ajaxSettings);

          if(settings.cache === 'local' && module.read.cachedResponse(url)) {
            module.debug('Response returned from local cache');
            module.request = module.create.request();
            module.request.resolveWith(context, [ module.read.cachedResponse(url) ]);
            return;
          }

          if( !settings.throttle ) {
            module.debug('Sending request', data, ajaxSettings.method);
            module.send.request();
          }
          else {
            if(!settings.throttleFirstRequest && !module.timer) {
              module.debug('Sending request', data, ajaxSettings.method);
              module.send.request();
              module.timer = setTimeout(function(){}, settings.throttle);
            }
            else {
              module.debug('Throttling request', settings.throttle);
              clearTimeout(module.timer);
              module.timer = setTimeout(function() {
                if(module.timer) {
                  delete module.timer;
                }
                module.debug('Sending throttled request', data, ajaxSettings.method);
                module.send.request();
              }, settings.throttle);
            }
          }

        },

        should: {
          removeError: function() {
            return ( settings.hideError === true || (settings.hideError === 'auto' && !module.is.form()) );
          }
        },

        is: {
          disabled: function() {
            return ($module.filter(selector.disabled).length > 0);
          },
          form: function() {
            return $module.is('form') || $context.is('form');
          },
          mocked: function() {
            return (settings.mockResponse || settings.mockResponseAsync);
          },
          input: function() {
            return $module.is('input');
          },
          loading: function() {
            return (module.request && module.request.state() == 'pending');
          },
          abortedRequest: function(xhr) {
            if(xhr && xhr.readyState !== undefined && xhr.readyState === 0) {
              module.verbose('XHR request determined to be aborted');
              return true;
            }
            else {
              module.verbose('XHR request was not aborted');
              return false;
            }
          },
          validResponse: function(response) {
            if( (settings.dataType !== 'json' && settings.dataType !== 'jsonp') || !$.isFunction(settings.successTest) ) {
              module.verbose('Response is not JSON, skipping validation', settings.successTest, response);
              return true;
            }
            module.debug('Checking JSON returned success', settings.successTest, response);
            if( settings.successTest(response) ) {
              module.debug('Response passed success test', response);
              return true;
            }
            else {
              module.debug('Response failed success test', response);
              return false;
            }
          }
        },

        was: {
          cancelled: function() {
            return (module.cancelled || false);
          },
          succesful: function() {
            return (module.request && module.request.state() == 'resolved');
          },
          failure: function() {
            return (module.request && module.request.state() == 'rejected');
          },
          complete: function() {
            return (module.request && (module.request.state() == 'resolved' || module.request.state() == 'rejected') );
          }
        },

        add: {
          urlData: function(url, urlData) {
            var
              requiredVariables,
              optionalVariables
            ;
            if(url) {
              requiredVariables = url.match(settings.regExp.required);
              optionalVariables = url.match(settings.regExp.optional);
              urlData           = urlData || settings.urlData;
              if(requiredVariables) {
                module.debug('Looking for required URL variables', requiredVariables);
                $.each(requiredVariables, function(index, templatedString) {
                  var
                    // allow legacy {$var} style
                    variable = (templatedString.indexOf('$') !== -1)
                      ? templatedString.substr(2, templatedString.length - 3)
                      : templatedString.substr(1, templatedString.length - 2),
                    value   = ($.isPlainObject(urlData) && urlData[variable] !== undefined)
                      ? urlData[variable]
                      : ($module.data(variable) !== undefined)
                        ? $module.data(variable)
                        : ($context.data(variable) !== undefined)
                          ? $context.data(variable)
                          : urlData[variable]
                  ;
                  // remove value
                  if(value === undefined) {
                    module.error(error.requiredParameter, variable, url);
                    url = false;
                    return false;
                  }
                  else {
                    module.verbose('Found required variable', variable, value);
                    value = (settings.encodeParameters)
                      ? module.get.urlEncodedValue(value)
                      : value
                    ;
                    url = url.replace(templatedString, value);
                  }
                });
              }
              if(optionalVariables) {
                module.debug('Looking for optional URL variables', requiredVariables);
                $.each(optionalVariables, function(index, templatedString) {
                  var
                    // allow legacy {/$var} style
                    variable = (templatedString.indexOf('$') !== -1)
                      ? templatedString.substr(3, templatedString.length - 4)
                      : templatedString.substr(2, templatedString.length - 3),
                    value   = ($.isPlainObject(urlData) && urlData[variable] !== undefined)
                      ? urlData[variable]
                      : ($module.data(variable) !== undefined)
                        ? $module.data(variable)
                        : ($context.data(variable) !== undefined)
                          ? $context.data(variable)
                          : urlData[variable]
                  ;
                  // optional replacement
                  if(value !== undefined) {
                    module.verbose('Optional variable Found', variable, value);
                    url = url.replace(templatedString, value);
                  }
                  else {
                    module.verbose('Optional variable not found', variable);
                    // remove preceding slash if set
                    if(url.indexOf('/' + templatedString) !== -1) {
                      url = url.replace('/' + templatedString, '');
                    }
                    else {
                      url = url.replace(templatedString, '');
                    }
                  }
                });
              }
            }
            return url;
          },
          formData: function(data) {
            var
              canSerialize = ($.fn.serializeObject !== undefined),
              formData     = (canSerialize)
                ? $form.serializeObject()
                : $form.serialize(),
              hasOtherData
            ;
            data         = data || settings.data;
            hasOtherData = $.isPlainObject(data);

            if(hasOtherData) {
              if(canSerialize) {
                module.debug('Extending existing data with form data', data, formData);
                data = $.extend(true, {}, data, formData);
              }
              else {
                module.error(error.missingSerialize);
                module.debug('Cant extend data. Replacing data with form data', data, formData);
                data = formData;
              }
            }
            else {
              module.debug('Adding form data', formData);
              data = formData;
            }
            return data;
          }
        },

        send: {
          request: function() {
            module.set.loading();
            module.request = module.create.request();
            if( module.is.mocked() ) {
              module.mockedXHR = module.create.mockedXHR();
            }
            else {
              module.xhr = module.create.xhr();
            }
            settings.onRequest.call(context, module.request, module.xhr);
          }
        },

        event: {
          trigger: function(event) {
            module.query();
            if(event.type == 'submit' || event.type == 'click') {
              event.preventDefault();
            }
          },
          xhr: {
            always: function() {
              // nothing special
            },
            done: function(response, textStatus, xhr) {
              var
                context            = this,
                elapsedTime        = (new Date().getTime() - requestStartTime),
                timeLeft           = (settings.loadingDuration - elapsedTime),
                translatedResponse = ( $.isFunction(settings.onResponse) )
                  ? settings.onResponse.call(context, $.extend(true, {}, response))
                  : false
              ;
              timeLeft = (timeLeft > 0)
                ? timeLeft
                : 0
              ;
              if(translatedResponse) {
                module.debug('Modified API response in onResponse callback', settings.onResponse, translatedResponse, response);
                response = translatedResponse;
              }
              if(timeLeft > 0) {
                module.debug('Response completed early delaying state change by', timeLeft);
              }
              setTimeout(function() {
                if( module.is.validResponse(response) ) {
                  module.request.resolveWith(context, [response, xhr]);
                }
                else {
                  module.request.rejectWith(context, [xhr, 'invalid']);
                }
              }, timeLeft);
            },
            fail: function(xhr, status, httpMessage) {
              var
                context     = this,
                elapsedTime = (new Date().getTime() - requestStartTime),
                timeLeft    = (settings.loadingDuration - elapsedTime)
              ;
              timeLeft = (timeLeft > 0)
                ? timeLeft
                : 0
              ;
              if(timeLeft > 0) {
                module.debug('Response completed early delaying state change by', timeLeft);
              }
              setTimeout(function() {
                if( module.is.abortedRequest(xhr) ) {
                  module.request.rejectWith(context, [xhr, 'aborted', httpMessage]);
                }
                else {
                  module.request.rejectWith(context, [xhr, 'error', status, httpMessage]);
                }
              }, timeLeft);
            }
          },
          request: {
            done: function(response, xhr) {
              module.debug('Successful API Response', response);
              if(settings.cache === 'local' && url) {
                module.write.cachedResponse(url, response);
                module.debug('Saving server response locally', module.cache);
              }
              settings.onSuccess.call(context, response, $module, xhr);
            },
            complete: function(firstParameter, secondParameter) {
              var
                xhr,
                response
              ;
              // have to guess callback parameters based on request success
              if( module.was.succesful() ) {
                response = firstParameter;
                xhr      = secondParameter;
              }
              else {
                xhr      = firstParameter;
                response = module.get.responseFromXHR(xhr);
              }
              module.remove.loading();
              settings.onComplete.call(context, response, $module, xhr);
            },
            fail: function(xhr, status, httpMessage) {
              var
                // pull response from xhr if available
                response     = module.get.responseFromXHR(xhr),
                errorMessage = module.get.errorFromRequest(response, status, httpMessage)
              ;
              if(status == 'aborted') {
                module.debug('XHR Aborted (Most likely caused by page navigation or CORS Policy)', status, httpMessage);
                settings.onAbort.call(context, status, $module, xhr);
              }
              else if(status == 'invalid') {
                module.debug('JSON did not pass success test. A server-side error has most likely occurred', response);
              }
              else if(status == 'error')  {
                if(xhr !== undefined) {
                  module.debug('XHR produced a server error', status, httpMessage);
                  // make sure we have an error to display to console
                  if( xhr.status != 200 && httpMessage !== undefined && httpMessage !== '') {
                    module.error(error.statusMessage + httpMessage, ajaxSettings.url);
                  }
                  settings.onError.call(context, errorMessage, $module, xhr);
                }
              }

              if(settings.errorDuration && status !== 'aborted') {
                module.debug('Adding error state');
                module.set.error();
                if( module.should.removeError() ) {
                  setTimeout(module.remove.error, settings.errorDuration);
                }
              }
              module.debug('API Request failed', errorMessage, xhr);
              settings.onFailure.call(context, response, $module, xhr);
            }
          }
        },

        create: {

          request: function() {
            // api request promise
            return $.Deferred()
              .always(module.event.request.complete)
              .done(module.event.request.done)
              .fail(module.event.request.fail)
            ;
          },

          mockedXHR: function () {
            var
              // xhr does not simulate these properties of xhr but must return them
              textStatus  = false,
              status      = false,
              httpMessage = false,
              asyncCallback,
              response,
              mockedXHR
            ;

            mockedXHR = $.Deferred()
              .always(module.event.xhr.complete)
              .done(module.event.xhr.done)
              .fail(module.event.xhr.fail)
            ;

            if(settings.mockResponse) {
              if( $.isFunction(settings.mockResponse) ) {
                module.debug('Using mocked callback returning response', settings.mockResponse);
                response = settings.mockResponse.call(context, settings);
              }
              else {
                module.debug('Using specified response', settings.mockResponse);
                response = settings.mockResponse;
              }
              // simulating response
              mockedXHR.resolveWith(context, [ response, textStatus, { responseText: response }]);
            }
            else if( $.isFunction(settings.mockResponseAsync) ) {
              asyncCallback = function(response) {
                module.debug('Async callback returned response', response);

                if(response) {
                  mockedXHR.resolveWith(context, [ response, textStatus, { responseText: response }]);
                }
                else {
                  mockedXHR.rejectWith(context, [{ responseText: response }, status, httpMessage]);
                }
              };
              module.debug('Using async mocked response', settings.mockResponseAsync);
              settings.mockResponseAsync.call(context, settings, asyncCallback);
            }
            return mockedXHR;
          },

          xhr: function() {
            var
              xhr
            ;
            // ajax request promise
            xhr = $.ajax(ajaxSettings)
              .always(module.event.xhr.always)
              .done(module.event.xhr.done)
              .fail(module.event.xhr.fail)
            ;
            module.verbose('Created server request', xhr);
            return xhr;
          }
        },

        set: {
          error: function() {
            module.verbose('Adding error state to element', $context);
            $context.addClass(className.error);
          },
          loading: function() {
            module.verbose('Adding loading state to element', $context);
            $context.addClass(className.loading);
            requestStartTime = new Date().getTime();
          }
        },

        remove: {
          error: function() {
            module.verbose('Removing error state from element', $context);
            $context.removeClass(className.error);
          },
          loading: function() {
            module.verbose('Removing loading state from element', $context);
            $context.removeClass(className.loading);
          }
        },

        get: {
          responseFromXHR: function(xhr) {
            return $.isPlainObject(xhr)
              ? (settings.dataType == 'json' || settings.dataType == 'jsonp')
                ? module.decode.json(xhr.responseText)
                : xhr.responseText
              : false
            ;
          },
          errorFromRequest: function(response, status, httpMessage) {
            return ($.isPlainObject(response) && response.error !== undefined)
              ? response.error // use json error message
              : (settings.error[status] !== undefined) // use server error message
                ? settings.error[status]
                : httpMessage
            ;
          },
          request: function() {
            return module.request || false;
          },
          xhr: function() {
            return module.xhr || false;
          },
          settings: function() {
            var
              runSettings
            ;
            runSettings = settings.beforeSend.call(context, settings);
            if(runSettings) {
              if(runSettings.success !== undefined) {
                module.debug('Legacy success callback detected', runSettings);
                module.error(error.legacyParameters, runSettings.success);
                runSettings.onSuccess = runSettings.success;
              }
              if(runSettings.failure !== undefined) {
                module.debug('Legacy failure callback detected', runSettings);
                module.error(error.legacyParameters, runSettings.failure);
                runSettings.onFailure = runSettings.failure;
              }
              if(runSettings.complete !== undefined) {
                module.debug('Legacy complete callback detected', runSettings);
                module.error(error.legacyParameters, runSettings.complete);
                runSettings.onComplete = runSettings.complete;
              }
            }
            if(runSettings === undefined) {
              module.error(error.noReturnedValue);
            }
            return (runSettings !== undefined)
              ? runSettings
              : settings
            ;
          },
          urlEncodedValue: function(value) {
            var
              decodedValue   = window.decodeURIComponent(value),
              encodedValue   = window.encodeURIComponent(value),
              alreadyEncoded = (decodedValue !== value)
            ;
            if(alreadyEncoded) {
              module.debug('URL value is already encoded, avoiding double encoding', value);
              return value;
            }
            module.verbose('Encoding value using encodeURIComponent', value, encodedValue);
            return encodedValue;
          },
          defaultData: function() {
            var
              data = {}
            ;
            if( !$.isWindow(element) ) {
              if( module.is.input() ) {
                data.value = $module.val();
              }
              else if( !module.is.form() ) {

              }
              else {
                data.text = $module.text();
              }
            }
            return data;
          },
          event: function() {
            if( $.isWindow(element) || settings.on == 'now' ) {
              module.debug('API called without element, no events attached');
              return false;
            }
            else if(settings.on == 'auto') {
              if( $module.is('input') ) {
                return (element.oninput !== undefined)
                  ? 'input'
                  : (element.onpropertychange !== undefined)
                    ? 'propertychange'
                    : 'keyup'
                ;
              }
              else if( $module.is('form') ) {
                return 'submit';
              }
              else {
                return 'click';
              }
            }
            else {
              return settings.on;
            }
          },
          templatedURL: function(action) {
            action = action || $module.data(metadata.action) || settings.action || false;
            url    = $module.data(metadata.url) || settings.url || false;
            if(url) {
              module.debug('Using specified url', url);
              return url;
            }
            if(action) {
              module.debug('Looking up url for action', action, settings.api);
              if(settings.api[action] === undefined && !module.is.mocked()) {
                module.error(error.missingAction, settings.action, settings.api);
                return;
              }
              url = settings.api[action];
            }
            else if( module.is.form() ) {
              url = $module.attr('action') || $context.attr('action') || false;
              module.debug('No url or action specified, defaulting to form action', url);
            }
            return url;
          }
        },

        abort: function() {
          var
            xhr = module.get.xhr()
          ;
          if( xhr && xhr.state() !== 'resolved') {
            module.debug('Cancelling API request');
            xhr.abort();
          }
        },

        // reset state
        reset: function() {
          module.remove.error();
          module.remove.loading();
        },

        setting: function(name, value) {
          module.debug('Changing setting', name, value);
          if( $.isPlainObject(name) ) {
            $.extend(true, settings, name);
          }
          else if(value !== undefined) {
            settings[name] = value;
          }
          else {
            return settings[name];
          }
        },
        internal: function(name, value) {
          if( $.isPlainObject(name) ) {
            $.extend(true, module, name);
          }
          else if(value !== undefined) {
            module[name] = value;
          }
          else {
            return module[name];
          }
        },
        debug: function() {
          if(settings.debug) {
            if(settings.performance) {
              module.performance.log(arguments);
            }
            else {
              module.debug = Function.prototype.bind.call(console.info, console, settings.name + ':');
              module.debug.apply(console, arguments);
            }
          }
        },
        verbose: function() {
          if(settings.verbose && settings.debug) {
            if(settings.performance) {
              module.performance.log(arguments);
            }
            else {
              module.verbose = Function.prototype.bind.call(console.info, console, settings.name + ':');
              module.verbose.apply(console, arguments);
            }
          }
        },
        error: function() {
          module.error = Function.prototype.bind.call(console.error, console, settings.name + ':');
          module.error.apply(console, arguments);
        },
        performance: {
          log: function(message) {
            var
              currentTime,
              executionTime,
              previousTime
            ;
            if(settings.performance) {
              currentTime   = new Date().getTime();
              previousTime  = time || currentTime;
              executionTime = currentTime - previousTime;
              time          = currentTime;
              performance.push({
                'Name'           : message[0],
                'Arguments'      : [].slice.call(message, 1) || '',
                //'Element'        : element,
                'Execution Time' : executionTime
              });
            }
            clearTimeout(module.performance.timer);
            module.performance.timer = setTimeout(module.performance.display, 500);
          },
          display: function() {
            var
              title = settings.name + ':',
              totalTime = 0
            ;
            time = false;
            clearTimeout(module.performance.timer);
            $.each(performance, function(index, data) {
              totalTime += data['Execution Time'];
            });
            title += ' ' + totalTime + 'ms';
            if(moduleSelector) {
              title += ' \'' + moduleSelector + '\'';
            }
            if( (console.group !== undefined || console.table !== undefined) && performance.length > 0) {
              console.groupCollapsed(title);
              if(console.table) {
                console.table(performance);
              }
              else {
                $.each(performance, function(index, data) {
                  console.log(data['Name'] + ': ' + data['Execution Time']+'ms');
                });
              }
              console.groupEnd();
            }
            performance = [];
          }
        },
        invoke: function(query, passedArguments, context) {
          var
            object = instance,
            maxDepth,
            found,
            response
          ;
          passedArguments = passedArguments || queryArguments;
          context         = element         || context;
          if(typeof query == 'string' && object !== undefined) {
            query    = query.split(/[\. ]/);
            maxDepth = query.length - 1;
            $.each(query, function(depth, value) {
              var camelCaseValue = (depth != maxDepth)
                ? value + query[depth + 1].charAt(0).toUpperCase() + query[depth + 1].slice(1)
                : query
              ;
              if( $.isPlainObject( object[camelCaseValue] ) && (depth != maxDepth) ) {
                object = object[camelCaseValue];
              }
              else if( object[camelCaseValue] !== undefined ) {
                found = object[camelCaseValue];
                return false;
              }
              else if( $.isPlainObject( object[value] ) && (depth != maxDepth) ) {
                object = object[value];
              }
              else if( object[value] !== undefined ) {
                found = object[value];
                return false;
              }
              else {
                module.error(error.method, query);
                return false;
              }
            });
          }
          if ( $.isFunction( found ) ) {
            response = found.apply(context, passedArguments);
          }
          else if(found !== undefined) {
            response = found;
          }
          if($.isArray(returnedValue)) {
            returnedValue.push(response);
          }
          else if(returnedValue !== undefined) {
            returnedValue = [returnedValue, response];
          }
          else if(response !== undefined) {
            returnedValue = response;
          }
          return found;
        }
      };

      if(methodInvoked) {
        if(instance === undefined) {
          module.initialize();
        }
        module.invoke(query);
      }
      else {
        if(instance !== undefined) {
          instance.invoke('destroy');
        }
        module.initialize();
      }
    })
  ;

  return (returnedValue !== undefined)
    ? returnedValue
    : this
  ;
};

$.api.settings = {

  name              : 'API',
  namespace         : 'api',

  debug             : false,
  verbose           : false,
  performance       : true,

  // object containing all templates endpoints
  api               : {},

  // whether to cache responses
  cache             : true,

  // whether new requests should abort previous requests
  interruptRequests : true,

  // event binding
  on                : 'auto',

  // context for applying state classes
  stateContext      : false,

  // duration for loading state
  loadingDuration   : 0,

  // whether to hide errors after a period of time
  hideError         : 'auto',

  // duration for error state
  errorDuration     : 2000,

  // whether parameters should be encoded with encodeURIComponent
  encodeParameters  : true,

  // API action to use
  action            : false,

  // templated URL to use
  url               : false,

  // base URL to apply to all endpoints
  base              : '',

  // data that will
  urlData           : {},

  // whether to add default data to url data
  defaultData          : true,

  // whether to serialize closest form
  serializeForm        : false,

  // how long to wait before request should occur
  throttle             : 0,

  // whether to throttle first request or only repeated
  throttleFirstRequest : true,

  // standard ajax settings
  method            : 'get',
  data              : {},
  dataType          : 'json',

  // mock response
  mockResponse      : false,
  mockResponseAsync : false,

  // callbacks before request
  beforeSend  : function(settings) { return settings; },
  beforeXHR   : function(xhr) {},
  onRequest   : function(promise, xhr) {},

  // after request
  onResponse  : false, // function(response) { },

  // response was successful, if JSON passed validation
  onSuccess   : function(response, $module) {},

  // request finished without aborting
  onComplete  : function(response, $module) {},

  // failed JSON success test
  onFailure   : function(response, $module) {},

  // server error
  onError     : function(errorMessage, $module) {},

  // request aborted
  onAbort     : function(errorMessage, $module) {},

  successTest : false,

  // errors
  error : {
    beforeSend        : 'The before send function has aborted the request',
    error             : 'There was an error with your request',
    exitConditions    : 'API Request Aborted. Exit conditions met',
    JSONParse         : 'JSON could not be parsed during error handling',
    legacyParameters  : 'You are using legacy API success callback names',
    method            : 'The method you called is not defined',
    missingAction     : 'API action used but no url was defined',
    missingSerialize  : 'jquery-serialize-object is required to add form data to an existing data object',
    missingURL        : 'No URL specified for api event',
    noReturnedValue   : 'The beforeSend callback must return a settings object, beforeSend ignored.',
    noStorage         : 'Caching responses locally requires session storage',
    parseError        : 'There was an error parsing your request',
    requiredParameter : 'Missing a required URL parameter: ',
    statusMessage     : 'Server gave an error: ',
    timeout           : 'Your request timed out'
  },

  regExp  : {
    required : /\{\$*[A-z0-9]+\}/g,
    optional : /\{\/\$*[A-z0-9]+\}/g,
  },

  className: {
    loading : 'loading',
    error   : 'error'
  },

  selector: {
    disabled : '.disabled',
    form      : 'form'
  },

  metadata: {
    action  : 'action',
    url     : 'url'
  }
};



})( jQuery, window, document );

/*!
 * # Semantic UI 2.1.6 - State
 * http://github.com/semantic-org/semantic-ui/
 *
 *
 * Copyright 2015 Contributors
 * Released under the MIT license
 * http://opensource.org/licenses/MIT
 *
 */

;(function ( $, window, document, undefined ) {

"use strict";

$.fn.state = function(parameters) {
  var
    $allModules     = $(this),

    moduleSelector  = $allModules.selector || '',

    hasTouch        = ('ontouchstart' in document.documentElement),
    time            = new Date().getTime(),
    performance     = [],

    query           = arguments[0],
    methodInvoked   = (typeof query == 'string'),
    queryArguments  = [].slice.call(arguments, 1),

    returnedValue
  ;
  $allModules
    .each(function() {
      var
        settings          = ( $.isPlainObject(parameters) )
          ? $.extend(true, {}, $.fn.state.settings, parameters)
          : $.extend({}, $.fn.state.settings),

        error           = settings.error,
        metadata        = settings.metadata,
        className       = settings.className,
        namespace       = settings.namespace,
        states          = settings.states,
        text            = settings.text,

        eventNamespace  = '.' + namespace,
        moduleNamespace = namespace + '-module',

        $module         = $(this),

        element         = this,
        instance        = $module.data(moduleNamespace),

        module
      ;
      module = {

        initialize: function() {
          module.verbose('Initializing module');

          // allow module to guess desired state based on element
          if(settings.automatic) {
            module.add.defaults();
          }

          // bind events with delegated events
          if(settings.context && moduleSelector !== '') {
            $(settings.context)
              .on(moduleSelector, 'mouseenter' + eventNamespace, module.change.text)
              .on(moduleSelector, 'mouseleave' + eventNamespace, module.reset.text)
              .on(moduleSelector, 'click'      + eventNamespace, module.toggle.state)
            ;
          }
          else {
            $module
              .on('mouseenter' + eventNamespace, module.change.text)
              .on('mouseleave' + eventNamespace, module.reset.text)
              .on('click'      + eventNamespace, module.toggle.state)
            ;
          }
          module.instantiate();
        },

        instantiate: function() {
          module.verbose('Storing instance of module', module);
          instance = module;
          $module
            .data(moduleNamespace, module)
          ;
        },

        destroy: function() {
          module.verbose('Destroying previous module', instance);
          $module
            .off(eventNamespace)
            .removeData(moduleNamespace)
          ;
        },

        refresh: function() {
          module.verbose('Refreshing selector cache');
          $module = $(element);
        },

        add: {
          defaults: function() {
            var
              userStates = parameters && $.isPlainObject(parameters.states)
                ? parameters.states
                : {}
            ;
            $.each(settings.defaults, function(type, typeStates) {
              if( module.is[type] !== undefined && module.is[type]() ) {
                module.verbose('Adding default states', type, element);
                $.extend(settings.states, typeStates, userStates);
              }
            });
          }
        },

        is: {

          active: function() {
            return $module.hasClass(className.active);
          },
          loading: function() {
            return $module.hasClass(className.loading);
          },
          inactive: function() {
            return !( $module.hasClass(className.active) );
          },
          state: function(state) {
            if(className[state] === undefined) {
              return false;
            }
            return $module.hasClass( className[state] );
          },

          enabled: function() {
            return !( $module.is(settings.filter.active) );
          },
          disabled: function() {
            return ( $module.is(settings.filter.active) );
          },
          textEnabled: function() {
            return !( $module.is(settings.filter.text) );
          },

          // definitions for automatic type detection
          button: function() {
            return $module.is('.button:not(a, .submit)');
          },
          input: function() {
            return $module.is('input');
          },
          progress: function() {
            return $module.is('.ui.progress');
          }
        },

        allow: function(state) {
          module.debug('Now allowing state', state);
          states[state] = true;
        },
        disallow: function(state) {
          module.debug('No longer allowing', state);
          states[state] = false;
        },

        allows: function(state) {
          return states[state] || false;
        },

        enable: function() {
          $module.removeClass(className.disabled);
        },

        disable: function() {
          $module.addClass(className.disabled);
        },

        setState: function(state) {
          if(module.allows(state)) {
            $module.addClass( className[state] );
          }
        },

        removeState: function(state) {
          if(module.allows(state)) {
            $module.removeClass( className[state] );
          }
        },

        toggle: {
          state: function() {
            var
              apiRequest,
              requestCancelled
            ;
            if( module.allows('active') && module.is.enabled() ) {
              module.refresh();
              if($.fn.api !== undefined) {
                apiRequest       = $module.api('get request');
                requestCancelled = $module.api('was cancelled');
                if( requestCancelled ) {
                  module.debug('API Request cancelled by beforesend');
                  settings.activateTest   = function(){ return false; };
                  settings.deactivateTest = function(){ return false; };
                }
                else if(apiRequest) {
                  module.listenTo(apiRequest);
                  return;
                }
              }
              module.change.state();
            }
          }
        },

        listenTo: function(apiRequest) {
          module.debug('API request detected, waiting for state signal', apiRequest);
          if(apiRequest) {
            if(text.loading) {
              module.update.text(text.loading);
            }
            $.when(apiRequest)
              .then(function() {
                if(apiRequest.state() == 'resolved') {
                  module.debug('API request succeeded');
                  settings.activateTest   = function(){ return true; };
                  settings.deactivateTest = function(){ return true; };
                }
                else {
                  module.debug('API request failed');
                  settings.activateTest   = function(){ return false; };
                  settings.deactivateTest = function(){ return false; };
                }
                module.change.state();
              })
            ;
          }
        },

        // checks whether active/inactive state can be given
        change: {

          state: function() {
            module.debug('Determining state change direction');
            // inactive to active change
            if( module.is.inactive() ) {
              module.activate();
            }
            else {
              module.deactivate();
            }
            if(settings.sync) {
              module.sync();
            }
            settings.onChange.call(element);
          },

          text: function() {
            if( module.is.textEnabled() ) {
              if(module.is.disabled() ) {
                module.verbose('Changing text to disabled text', text.hover);
                module.update.text(text.disabled);
              }
              else if( module.is.active() ) {
                if(text.hover) {
                  module.verbose('Changing text to hover text', text.hover);
                  module.update.text(text.hover);
                }
                else if(text.deactivate) {
                  module.verbose('Changing text to deactivating text', text.deactivate);
                  module.update.text(text.deactivate);
                }
              }
              else {
                if(text.hover) {
                  module.verbose('Changing text to hover text', text.hover);
                  module.update.text(text.hover);
                }
                else if(text.activate){
                  module.verbose('Changing text to activating text', text.activate);
                  module.update.text(text.activate);
                }
              }
            }
          }

        },

        activate: function() {
          if( settings.activateTest.call(element) ) {
            module.debug('Setting state to active');
            $module
              .addClass(className.active)
            ;
            module.update.text(text.active);
            settings.onActivate.call(element);
          }
        },

        deactivate: function() {
          if( settings.deactivateTest.call(element) ) {
            module.debug('Setting state to inactive');
            $module
              .removeClass(className.active)
            ;
            module.update.text(text.inactive);
            settings.onDeactivate.call(element);
          }
        },

        sync: function() {
          module.verbose('Syncing other buttons to current state');
          if( module.is.active() ) {
            $allModules
              .not($module)
                .state('activate');
          }
          else {
            $allModules
              .not($module)
                .state('deactivate')
            ;
          }
        },

        get: {
          text: function() {
            return (settings.selector.text)
              ? $module.find(settings.selector.text).text()
              : $module.html()
            ;
          },
          textFor: function(state) {
            return text[state] || false;
          }
        },

        flash: {
          text: function(text, duration, callback) {
            var
              previousText = module.get.text()
            ;
            module.debug('Flashing text message', text, duration);
            text     = text     || settings.text.flash;
            duration = duration || settings.flashDuration;
            callback = callback || function() {};
            module.update.text(text);
            setTimeout(function(){
              module.update.text(previousText);
              callback.call(element);
            }, duration);
          }
        },

        reset: {
          // on mouseout sets text to previous value
          text: function() {
            var
              activeText   = text.active   || $module.data(metadata.storedText),
              inactiveText = text.inactive || $module.data(metadata.storedText)
            ;
            if( module.is.textEnabled() ) {
              if( module.is.active() && activeText) {
                module.verbose('Resetting active text', activeText);
                module.update.text(activeText);
              }
              else if(inactiveText) {
                module.verbose('Resetting inactive text', activeText);
                module.update.text(inactiveText);
              }
            }
          }
        },

        update: {
          text: function(text) {
            var
              currentText = module.get.text()
            ;
            if(text && text !== currentText) {
              module.debug('Updating text', text);
              if(settings.selector.text) {
                $module
                  .data(metadata.storedText, text)
                  .find(settings.selector.text)
                    .text(text)
                ;
              }
              else {
                $module
                  .data(metadata.storedText, text)
                  .html(text)
                ;
              }
            }
            else {
              module.debug('Text is already set, ignoring update', text);
            }
          }
        },

        setting: function(name, value) {
          module.debug('Changing setting', name, value);
          if( $.isPlainObject(name) ) {
            $.extend(true, settings, name);
          }
          else if(value !== undefined) {
            settings[name] = value;
          }
          else {
            return settings[name];
          }
        },
        internal: function(name, value) {
          if( $.isPlainObject(name) ) {
            $.extend(true, module, name);
          }
          else if(value !== undefined) {
            module[name] = value;
          }
          else {
            return module[name];
          }
        },
        debug: function() {
          if(settings.debug) {
            if(settings.performance) {
              module.performance.log(arguments);
            }
            else {
              module.debug = Function.prototype.bind.call(console.info, console, settings.name + ':');
              module.debug.apply(console, arguments);
            }
          }
        },
        verbose: function() {
          if(settings.verbose && settings.debug) {
            if(settings.performance) {
              module.performance.log(arguments);
            }
            else {
              module.verbose = Function.prototype.bind.call(console.info, console, settings.name + ':');
              module.verbose.apply(console, arguments);
            }
          }
        },
        error: function() {
          module.error = Function.prototype.bind.call(console.error, console, settings.name + ':');
          module.error.apply(console, arguments);
        },
        performance: {
          log: function(message) {
            var
              currentTime,
              executionTime,
              previousTime
            ;
            if(settings.performance) {
              currentTime   = new Date().getTime();
              previousTime  = time || currentTime;
              executionTime = currentTime - previousTime;
              time          = currentTime;
              performance.push({
                'Name'           : message[0],
                'Arguments'      : [].slice.call(message, 1) || '',
                'Element'        : element,
                'Execution Time' : executionTime
              });
            }
            clearTimeout(module.performance.timer);
            module.performance.timer = setTimeout(module.performance.display, 500);
          },
          display: function() {
            var
              title = settings.name + ':',
              totalTime = 0
            ;
            time = false;
            clearTimeout(module.performance.timer);
            $.each(performance, function(index, data) {
              totalTime += data['Execution Time'];
            });
            title += ' ' + totalTime + 'ms';
            if(moduleSelector) {
              title += ' \'' + moduleSelector + '\'';
            }
            if( (console.group !== undefined || console.table !== undefined) && performance.length > 0) {
              console.groupCollapsed(title);
              if(console.table) {
                console.table(performance);
              }
              else {
                $.each(performance, function(index, data) {
                  console.log(data['Name'] + ': ' + data['Execution Time']+'ms');
                });
              }
              console.groupEnd();
            }
            performance = [];
          }
        },
        invoke: function(query, passedArguments, context) {
          var
            object = instance,
            maxDepth,
            found,
            response
          ;
          passedArguments = passedArguments || queryArguments;
          context         = element         || context;
          if(typeof query == 'string' && object !== undefined) {
            query    = query.split(/[\. ]/);
            maxDepth = query.length - 1;
            $.each(query, function(depth, value) {
              var camelCaseValue = (depth != maxDepth)
                ? value + query[depth + 1].charAt(0).toUpperCase() + query[depth + 1].slice(1)
                : query
              ;
              if( $.isPlainObject( object[camelCaseValue] ) && (depth != maxDepth) ) {
                object = object[camelCaseValue];
              }
              else if( object[camelCaseValue] !== undefined ) {
                found = object[camelCaseValue];
                return false;
              }
              else if( $.isPlainObject( object[value] ) && (depth != maxDepth) ) {
                object = object[value];
              }
              else if( object[value] !== undefined ) {
                found = object[value];
                return false;
              }
              else {
                module.error(error.method, query);
                return false;
              }
            });
          }
          if ( $.isFunction( found ) ) {
            response = found.apply(context, passedArguments);
          }
          else if(found !== undefined) {
            response = found;
          }
          if($.isArray(returnedValue)) {
            returnedValue.push(response);
          }
          else if(returnedValue !== undefined) {
            returnedValue = [returnedValue, response];
          }
          else if(response !== undefined) {
            returnedValue = response;
          }
          return found;
        }
      };

      if(methodInvoked) {
        if(instance === undefined) {
          module.initialize();
        }
        module.invoke(query);
      }
      else {
        if(instance !== undefined) {
          instance.invoke('destroy');
        }
        module.initialize();
      }
    })
  ;

  return (returnedValue !== undefined)
    ? returnedValue
    : this
  ;
};

$.fn.state.settings = {

  // module info
  name           : 'State',

  // debug output
  debug          : false,

  // verbose debug output
  verbose        : false,

  // namespace for events
  namespace      : 'state',

  // debug data includes performance
  performance    : true,

  // callback occurs on state change
  onActivate     : function() {},
  onDeactivate   : function() {},
  onChange       : function() {},

  // state test functions
  activateTest   : function() { return true; },
  deactivateTest : function() { return true; },

  // whether to automatically map default states
  automatic      : true,

  // activate / deactivate changes all elements instantiated at same time
  sync           : false,

  // default flash text duration, used for temporarily changing text of an element
  flashDuration  : 1000,

  // selector filter
  filter     : {
    text   : '.loading, .disabled',
    active : '.disabled'
  },

  context    : false,

  // error
  error: {
    beforeSend : 'The before send function has cancelled state change',
    method     : 'The method you called is not defined.'
  },

  // metadata
  metadata: {
    promise    : 'promise',
    storedText : 'stored-text'
  },

  // change class on state
  className: {
    active   : 'active',
    disabled : 'disabled',
    error    : 'error',
    loading  : 'loading',
    success  : 'success',
    warning  : 'warning'
  },

  selector: {
    // selector for text node
    text: false
  },

  defaults : {
    input: {
      disabled : true,
      loading  : true,
      active   : true
    },
    button: {
      disabled : true,
      loading  : true,
      active   : true,
    },
    progress: {
      active   : true,
      success  : true,
      warning  : true,
      error    : true
    }
  },

  states     : {
    active   : true,
    disabled : true,
    error    : true,
    loading  : true,
    success  : true,
    warning  : true
  },

  text     : {
    disabled   : false,
    flash      : false,
    hover      : false,
    active     : false,
    inactive   : false,
    activate   : false,
    deactivate : false
  }

};



})( jQuery, window, document );

/*!
 * # Semantic UI 2.1.6 - Visibility
 * http://github.com/semantic-org/semantic-ui/
 *
 *
 * Copyright 2015 Contributors
 * Released under the MIT license
 * http://opensource.org/licenses/MIT
 *
 */

;(function ( $, window, document, undefined ) {

"use strict";

$.fn.visibility = function(parameters) {
  var
    $allModules    = $(this),
    moduleSelector = $allModules.selector || '',

    time           = new Date().getTime(),
    performance    = [],

    query          = arguments[0],
    methodInvoked  = (typeof query == 'string'),
    queryArguments = [].slice.call(arguments, 1),
    returnedValue
  ;

  $allModules
    .each(function() {
      var
        settings        = ( $.isPlainObject(parameters) )
          ? $.extend(true, {}, $.fn.visibility.settings, parameters)
          : $.extend({}, $.fn.visibility.settings),

        className       = settings.className,
        namespace       = settings.namespace,
        error           = settings.error,
        metadata        = settings.metadata,

        eventNamespace  = '.' + namespace,
        moduleNamespace = 'module-' + namespace,

        $window         = $(window),

        $module         = $(this),
        $context        = $(settings.context),

        $placeholder,

        selector        = $module.selector || '',
        instance        = $module.data(moduleNamespace),

        requestAnimationFrame = window.requestAnimationFrame
          || window.mozRequestAnimationFrame
          || window.webkitRequestAnimationFrame
          || window.msRequestAnimationFrame
          || function(callback) { setTimeout(callback, 0); },

        element         = this,
        disabled        = false,

        observer,
        module
      ;

      module = {

        initialize: function() {
          module.debug('Initializing', settings);

          module.setup.cache();

          if( module.should.trackChanges() ) {

            if(settings.type == 'image') {
              module.setup.image();
            }
            if(settings.type == 'fixed') {
              module.setup.fixed();
            }

            if(settings.observeChanges) {
              module.observeChanges();
            }
            module.bind.events();
          }

          module.save.position();
          if( !module.is.visible() ) {
            module.error(error.visible, $module);
          }

          if(settings.initialCheck) {
            module.checkVisibility();
          }
          module.instantiate();
        },

        instantiate: function() {
          module.debug('Storing instance', module);
          $module
            .data(moduleNamespace, module)
          ;
          instance = module;
        },

        destroy: function() {
          module.verbose('Destroying previous module');
          if(observer) {
            observer.disconnect();
          }
          $window
            .off('load'   + eventNamespace, module.event.load)
            .off('resize' + eventNamespace, module.event.resize)
          ;
          $context
            .off('scrollchange' + eventNamespace, module.event.scrollchange)
          ;
          $module
            .off(eventNamespace)
            .removeData(moduleNamespace)
          ;
        },

        observeChanges: function() {
          if('MutationObserver' in window) {
            observer = new MutationObserver(function(mutations) {
              module.verbose('DOM tree modified, updating visibility calculations');
              module.timer = setTimeout(function() {
                module.verbose('DOM tree modified, updating sticky menu');
                module.refresh();
              }, 100);
            });
            observer.observe(element, {
              childList : true,
              subtree   : true
            });
            module.debug('Setting up mutation observer', observer);
          }
        },

        bind: {
          events: function() {
            module.verbose('Binding visibility events to scroll and resize');
            if(settings.refreshOnLoad) {
              $window
                .on('load'   + eventNamespace, module.event.load)
              ;
            }
            $window
              .on('resize' + eventNamespace, module.event.resize)
            ;
            // pub/sub pattern
            $context
              .off('scroll'      + eventNamespace)
              .on('scroll'       + eventNamespace, module.event.scroll)
              .on('scrollchange' + eventNamespace, module.event.scrollchange)
            ;
          }
        },

        event: {
          resize: function() {
            module.debug('Window resized');
            if(settings.refreshOnResize) {
              requestAnimationFrame(module.refresh);
            }
          },
          load: function() {
            module.debug('Page finished loading');
            requestAnimationFrame(module.refresh);
          },
          // publishes scrollchange event on one scroll
          scroll: function() {
            if(settings.throttle) {
              clearTimeout(module.timer);
              module.timer = setTimeout(function() {
                $context.triggerHandler('scrollchange' + eventNamespace, [ $context.scrollTop() ]);
              }, settings.throttle);
            }
            else {
              requestAnimationFrame(function() {
                $context.triggerHandler('scrollchange' + eventNamespace, [ $context.scrollTop() ]);
              });
            }
          },
          // subscribes to scrollchange
          scrollchange: function(event, scrollPosition) {
            module.checkVisibility(scrollPosition);
          },
        },

        precache: function(images, callback) {
          if (!(images instanceof Array)) {
            images = [images];
          }
          var
            imagesLength  = images.length,
            loadedCounter = 0,
            cache         = [],
            cacheImage    = document.createElement('img'),
            handleLoad    = function() {
              loadedCounter++;
              if (loadedCounter >= images.length) {
                if ($.isFunction(callback)) {
                  callback();
                }
              }
            }
          ;
          while (imagesLength--) {
            cacheImage         = document.createElement('img');
            cacheImage.onload  = handleLoad;
            cacheImage.onerror = handleLoad;
            cacheImage.src     = images[imagesLength];
            cache.push(cacheImage);
          }
        },

        enableCallbacks: function() {
          module.debug('Allowing callbacks to occur');
          disabled = false;
        },

        disableCallbacks: function() {
          module.debug('Disabling all callbacks temporarily');
          disabled = true;
        },

        should: {
          trackChanges: function() {
            if(methodInvoked) {
              module.debug('One time query, no need to bind events');
              return false;
            }
            module.debug('Callbacks being attached');
            return true;
          }
        },

        setup: {
          cache: function() {
            module.cache = {
              occurred : {},
              screen   : {},
              element  : {},
            };
          },
          image: function() {
            var
              src = $module.data(metadata.src)
            ;
            if(src) {
              module.verbose('Lazy loading image', src);
              settings.once           = true;
              settings.observeChanges = false;

              // show when top visible
              settings.onOnScreen = function() {
                module.debug('Image on screen', element);
                module.precache(src, function() {
                  module.set.image(src);
                });
              };
            }
          },
          fixed: function() {
            module.debug('Setting up fixed');
            settings.once           = false;
            settings.observeChanges = false;
            settings.initialCheck   = true;
            settings.refreshOnLoad  = true;
            if(!parameters.transition) {
              settings.transition = false;
            }
            module.create.placeholder();
            module.debug('Added placeholder', $placeholder);
            settings.onTopPassed = function() {
              module.debug('Element passed, adding fixed position', $module);
              module.show.placeholder();
              module.set.fixed();
              if(settings.transition) {
                if($.fn.transition !== undefined) {
                  $module.transition(settings.transition, settings.duration);
                }
              }
            };
            settings.onTopPassedReverse = function() {
              module.debug('Element returned to position, removing fixed', $module);
              module.hide.placeholder();
              module.remove.fixed();
            };
          }
        },

        create: {
          placeholder: function() {
            module.verbose('Creating fixed position placeholder');
            $placeholder = $module
              .clone(false)
              .css('display', 'none')
              .addClass(className.placeholder)
              .insertAfter($module)
            ;
          }
        },

        show: {
          placeholder: function() {
            module.verbose('Showing placeholder');
            $placeholder
              .css('display', 'block')
              .css('visibility', 'hidden')
            ;
          }
        },
        hide: {
          placeholder: function() {
            module.verbose('Hiding placeholder');
            $placeholder
              .css('display', 'none')
              .css('visibility', '')
            ;
          }
        },

        set: {
          fixed: function() {
            module.verbose('Setting element to fixed position');
            $module
              .addClass(className.fixed)
              .css({
                position : 'fixed',
                top      : settings.offset + 'px',
                left     : 'auto',
                zIndex   : '1'
              })
            ;
          },
          image: function(src) {
            $module
              .attr('src', src)
            ;
            if(settings.transition) {
              if( $.fn.transition !== undefined ) {
                $module.transition(settings.transition, settings.duration);
              }
              else {
                $module.fadeIn(settings.duration);
              }
            }
            else {
              $module.show();
            }
          }
        },

        is: {
          onScreen: function() {
            var
              calculations   = module.get.elementCalculations()
            ;
            return calculations.onScreen;
          },
          offScreen: function() {
            var
              calculations   = module.get.elementCalculations()
            ;
            return calculations.offScreen;
          },
          visible: function() {
            if(module.cache && module.cache.element) {
              return !(module.cache.element.width === 0 && module.cache.element.offset.top === 0);
            }
            return false;
          }
        },

        refresh: function() {
          module.debug('Refreshing constants (width/height)');
          if(settings.type == 'fixed') {
            module.remove.fixed();
            module.remove.occurred();
          }
          module.reset();
          module.save.position();
          if(settings.checkOnRefresh) {
            module.checkVisibility();
          }
          settings.onRefresh.call(element);
        },

        reset: function() {
          module.verbose('Reseting all cached values');
          if( $.isPlainObject(module.cache) ) {
            module.cache.screen = {};
            module.cache.element = {};
          }
        },

        checkVisibility: function(scroll) {
          module.verbose('Checking visibility of element', module.cache.element);

          if( !disabled && module.is.visible() ) {

            // save scroll position
            module.save.scroll(scroll);

            // update calculations derived from scroll
            module.save.calculations();

            // percentage
            module.passed();

            // reverse (must be first)
            module.passingReverse();
            module.topVisibleReverse();
            module.bottomVisibleReverse();
            module.topPassedReverse();
            module.bottomPassedReverse();

            // one time
            module.onScreen();
            module.offScreen();
            module.passing();
            module.topVisible();
            module.bottomVisible();
            module.topPassed();
            module.bottomPassed();

            // on update callback
            if(settings.onUpdate) {
              settings.onUpdate.call(element, module.get.elementCalculations());
            }
          }
        },

        passed: function(amount, newCallback) {
          var
            calculations   = module.get.elementCalculations(),
            amountInPixels
          ;
          // assign callback
          if(amount && newCallback) {
            settings.onPassed[amount] = newCallback;
          }
          else if(amount !== undefined) {
            return (module.get.pixelsPassed(amount) > calculations.pixelsPassed);
          }
          else if(calculations.passing) {
            $.each(settings.onPassed, function(amount, callback) {
              if(calculations.bottomVisible || calculations.pixelsPassed > module.get.pixelsPassed(amount)) {
                module.execute(callback, amount);
              }
              else if(!settings.once) {
                module.remove.occurred(callback);
              }
            });
          }
        },

        onScreen: function(newCallback) {
          var
            calculations = module.get.elementCalculations(),
            callback     = newCallback || settings.onOnScreen,
            callbackName = 'onScreen'
          ;
          if(newCallback) {
            module.debug('Adding callback for onScreen', newCallback);
            settings.onOnScreen = newCallback;
          }
          if(calculations.onScreen) {
            module.execute(callback, callbackName);
          }
          else if(!settings.once) {
            module.remove.occurred(callbackName);
          }
          if(newCallback !== undefined) {
            return calculations.onOnScreen;
          }
        },

        offScreen: function(newCallback) {
          var
            calculations = module.get.elementCalculations(),
            callback     = newCallback || settings.onOffScreen,
            callbackName = 'offScreen'
          ;
          if(newCallback) {
            module.debug('Adding callback for offScreen', newCallback);
            settings.onOffScreen = newCallback;
          }
          if(calculations.offScreen) {
            module.execute(callback, callbackName);
          }
          else if(!settings.once) {
            module.remove.occurred(callbackName);
          }
          if(newCallback !== undefined) {
            return calculations.onOffScreen;
          }
        },

        passing: function(newCallback) {
          var
            calculations = module.get.elementCalculations(),
            callback     = newCallback || settings.onPassing,
            callbackName = 'passing'
          ;
          if(newCallback) {
            module.debug('Adding callback for passing', newCallback);
            settings.onPassing = newCallback;
          }
          if(calculations.passing) {
            module.execute(callback, callbackName);
          }
          else if(!settings.once) {
            module.remove.occurred(callbackName);
          }
          if(newCallback !== undefined) {
            return calculations.passing;
          }
        },


        topVisible: function(newCallback) {
          var
            calculations = module.get.elementCalculations(),
            callback     = newCallback || settings.onTopVisible,
            callbackName = 'topVisible'
          ;
          if(newCallback) {
            module.debug('Adding callback for top visible', newCallback);
            settings.onTopVisible = newCallback;
          }
          if(calculations.topVisible) {
            module.execute(callback, callbackName);
          }
          else if(!settings.once) {
            module.remove.occurred(callbackName);
          }
          if(newCallback === undefined) {
            return calculations.topVisible;
          }
        },

        bottomVisible: function(newCallback) {
          var
            calculations = module.get.elementCalculations(),
            callback     = newCallback || settings.onBottomVisible,
            callbackName = 'bottomVisible'
          ;
          if(newCallback) {
            module.debug('Adding callback for bottom visible', newCallback);
            settings.onBottomVisible = newCallback;
          }
          if(calculations.bottomVisible) {
            module.execute(callback, callbackName);
          }
          else if(!settings.once) {
            module.remove.occurred(callbackName);
          }
          if(newCallback === undefined) {
            return calculations.bottomVisible;
          }
        },

        topPassed: function(newCallback) {
          var
            calculations = module.get.elementCalculations(),
            callback     = newCallback || settings.onTopPassed,
            callbackName = 'topPassed'
          ;
          if(newCallback) {
            module.debug('Adding callback for top passed', newCallback);
            settings.onTopPassed = newCallback;
          }
          if(calculations.topPassed) {
            module.execute(callback, callbackName);
          }
          else if(!settings.once) {
            module.remove.occurred(callbackName);
          }
          if(newCallback === undefined) {
            return calculations.topPassed;
          }
        },

        bottomPassed: function(newCallback) {
          var
            calculations = module.get.elementCalculations(),
            callback     = newCallback || settings.onBottomPassed,
            callbackName = 'bottomPassed'
          ;
          if(newCallback) {
            module.debug('Adding callback for bottom passed', newCallback);
            settings.onBottomPassed = newCallback;
          }
          if(calculations.bottomPassed) {
            module.execute(callback, callbackName);
          }
          else if(!settings.once) {
            module.remove.occurred(callbackName);
          }
          if(newCallback === undefined) {
            return calculations.bottomPassed;
          }
        },

        passingReverse: function(newCallback) {
          var
            calculations = module.get.elementCalculations(),
            callback     = newCallback || settings.onPassingReverse,
            callbackName = 'passingReverse'
          ;
          if(newCallback) {
            module.debug('Adding callback for passing reverse', newCallback);
            settings.onPassingReverse = newCallback;
          }
          if(!calculations.passing) {
            if(module.get.occurred('passing')) {
              module.execute(callback, callbackName);
            }
          }
          else if(!settings.once) {
            module.remove.occurred(callbackName);
          }
          if(newCallback !== undefined) {
            return !calculations.passing;
          }
        },


        topVisibleReverse: function(newCallback) {
          var
            calculations = module.get.elementCalculations(),
            callback     = newCallback || settings.onTopVisibleReverse,
            callbackName = 'topVisibleReverse'
          ;
          if(newCallback) {
            module.debug('Adding callback for top visible reverse', newCallback);
            settings.onTopVisibleReverse = newCallback;
          }
          if(!calculations.topVisible) {
            if(module.get.occurred('topVisible')) {
              module.execute(callback, callbackName);
            }
          }
          else if(!settings.once) {
            module.remove.occurred(callbackName);
          }
          if(newCallback === undefined) {
            return !calculations.topVisible;
          }
        },

        bottomVisibleReverse: function(newCallback) {
          var
            calculations = module.get.elementCalculations(),
            callback     = newCallback || settings.onBottomVisibleReverse,
            callbackName = 'bottomVisibleReverse'
          ;
          if(newCallback) {
            module.debug('Adding callback for bottom visible reverse', newCallback);
            settings.onBottomVisibleReverse = newCallback;
          }
          if(!calculations.bottomVisible) {
            if(module.get.occurred('bottomVisible')) {
              module.execute(callback, callbackName);
            }
          }
          else if(!settings.once) {
            module.remove.occurred(callbackName);
          }
          if(newCallback === undefined) {
            return !calculations.bottomVisible;
          }
        },

        topPassedReverse: function(newCallback) {
          var
            calculations = module.get.elementCalculations(),
            callback     = newCallback || settings.onTopPassedReverse,
            callbackName = 'topPassedReverse'
          ;
          if(newCallback) {
            module.debug('Adding callback for top passed reverse', newCallback);
            settings.onTopPassedReverse = newCallback;
          }
          if(!calculations.topPassed) {
            if(module.get.occurred('topPassed')) {
              module.execute(callback, callbackName);
            }
          }
          else if(!settings.once) {
            module.remove.occurred(callbackName);
          }
          if(newCallback === undefined) {
            return !calculations.onTopPassed;
          }
        },

        bottomPassedReverse: function(newCallback) {
          var
            calculations = module.get.elementCalculations(),
            callback     = newCallback || settings.onBottomPassedReverse,
            callbackName = 'bottomPassedReverse'
          ;
          if(newCallback) {
            module.debug('Adding callback for bottom passed reverse', newCallback);
            settings.onBottomPassedReverse = newCallback;
          }
          if(!calculations.bottomPassed) {
            if(module.get.occurred('bottomPassed')) {
              module.execute(callback, callbackName);
            }
          }
          else if(!settings.once) {
            module.remove.occurred(callbackName);
          }
          if(newCallback === undefined) {
            return !calculations.bottomPassed;
          }
        },

        execute: function(callback, callbackName) {
          var
            calculations = module.get.elementCalculations(),
            screen       = module.get.screenCalculations()
          ;
          callback = callback || false;
          if(callback) {
            if(settings.continuous) {
              module.debug('Callback being called continuously', callbackName, calculations);
              callback.call(element, calculations, screen);
            }
            else if(!module.get.occurred(callbackName)) {
              module.debug('Conditions met', callbackName, calculations);
              callback.call(element, calculations, screen);
            }
          }
          module.save.occurred(callbackName);
        },

        remove: {
          fixed: function() {
            module.debug('Removing fixed position');
            $module
              .removeClass(className.fixed)
              .css({
                position : '',
                top      : '',
                left     : '',
                zIndex   : ''
              })
            ;
          },
          occurred: function(callback) {
            if(callback) {
              var
                occurred = module.cache.occurred
              ;
              if(occurred[callback] !== undefined && occurred[callback] === true) {
                module.debug('Callback can now be called again', callback);
                module.cache.occurred[callback] = false;
              }
            }
            else {
              module.cache.occurred = {};
            }
          }
        },

        save: {
          calculations: function() {
            module.verbose('Saving all calculations necessary to determine positioning');
            module.save.direction();
            module.save.screenCalculations();
            module.save.elementCalculations();
          },
          occurred: function(callback) {
            if(callback) {
              if(module.cache.occurred[callback] === undefined || (module.cache.occurred[callback] !== true)) {
                module.verbose('Saving callback occurred', callback);
                module.cache.occurred[callback] = true;
              }
            }
          },
          scroll: function(scrollPosition) {
            scrollPosition      = scrollPosition + settings.offset || $context.scrollTop() + settings.offset;
            module.cache.scroll = scrollPosition;
          },
          direction: function() {
            var
              scroll     = module.get.scroll(),
              lastScroll = module.get.lastScroll(),
              direction
            ;
            if(scroll > lastScroll && lastScroll) {
              direction = 'down';
            }
            else if(scroll < lastScroll && lastScroll) {
              direction = 'up';
            }
            else {
              direction = 'static';
            }
            module.cache.direction = direction;
            return module.cache.direction;
          },
          elementPosition: function() {
            var
              element = module.cache.element,
              screen  = module.get.screenSize()
            ;
            module.verbose('Saving element position');
            // (quicker than $.extend)
            element.fits          = (element.height < screen.height);
            element.offset        = $module.offset();
            element.width         = $module.outerWidth();
            element.height        = $module.outerHeight();
            // store
            module.cache.element = element;
            return element;
          },
          elementCalculations: function() {
            var
              screen     = module.get.screenCalculations(),
              element    = module.get.elementPosition()
            ;
            // offset
            if(settings.includeMargin) {
              element.margin        = {};
              element.margin.top    = parseInt($module.css('margin-top'), 10);
              element.margin.bottom = parseInt($module.css('margin-bottom'), 10);
              element.top    = element.offset.top - element.margin.top;
              element.bottom = element.offset.top + element.height + element.margin.bottom;
            }
            else {
              element.top    = element.offset.top;
              element.bottom = element.offset.top + element.height;
            }

            // visibility
            element.topVisible       = (screen.bottom >= element.top);
            element.topPassed        = (screen.top >= element.top);
            element.bottomVisible    = (screen.bottom >= element.bottom);
            element.bottomPassed     = (screen.top >= element.bottom);
            element.pixelsPassed     = 0;
            element.percentagePassed = 0;

            // meta calculations
            element.onScreen  = (element.topVisible && !element.bottomPassed);
            element.passing   = (element.topPassed && !element.bottomPassed);
            element.offScreen = (!element.onScreen);

            // passing calculations
            if(element.passing) {
              element.pixelsPassed     = (screen.top - element.top);
              element.percentagePassed = (screen.top - element.top) / element.height;
            }
            module.cache.element = element;
            module.verbose('Updated element calculations', element);
            return element;
          },
          screenCalculations: function() {
            var
              scroll = module.get.scroll()
            ;
            module.save.direction();
            module.cache.screen.top    = scroll;
            module.cache.screen.bottom = scroll + module.cache.screen.height;
            return module.cache.screen;
          },
          screenSize: function() {
            module.verbose('Saving window position');
            module.cache.screen = {
              height: $context.height()
            };
          },
          position: function() {
            module.save.screenSize();
            module.save.elementPosition();
          }
        },

        get: {
          pixelsPassed: function(amount) {
            var
              element = module.get.elementCalculations()
            ;
            if(amount.search('%') > -1) {
              return ( element.height * (parseInt(amount, 10) / 100) );
            }
            return parseInt(amount, 10);
          },
          occurred: function(callback) {
            return (module.cache.occurred !== undefined)
              ? module.cache.occurred[callback] || false
              : false
            ;
          },
          direction: function() {
            if(module.cache.direction === undefined) {
              module.save.direction();
            }
            return module.cache.direction;
          },
          elementPosition: function() {
            if(module.cache.element === undefined) {
              module.save.elementPosition();
            }
            return module.cache.element;
          },
          elementCalculations: function() {
            if(module.cache.element === undefined) {
              module.save.elementCalculations();
            }
            return module.cache.element;
          },
          screenCalculations: function() {
            if(module.cache.screen === undefined) {
              module.save.screenCalculations();
            }
            return module.cache.screen;
          },
          screenSize: function() {
            if(module.cache.screen === undefined) {
              module.save.screenSize();
            }
            return module.cache.screen;
          },
          scroll: function() {
            if(module.cache.scroll === undefined) {
              module.save.scroll();
            }
            return module.cache.scroll;
          },
          lastScroll: function() {
            if(module.cache.screen === undefined) {
              module.debug('First scroll event, no last scroll could be found');
              return false;
            }
            return module.cache.screen.top;
          }
        },

        setting: function(name, value) {
          if( $.isPlainObject(name) ) {
            $.extend(true, settings, name);
          }
          else if(value !== undefined) {
            settings[name] = value;
          }
          else {
            return settings[name];
          }
        },
        internal: function(name, value) {
          if( $.isPlainObject(name) ) {
            $.extend(true, module, name);
          }
          else if(value !== undefined) {
            module[name] = value;
          }
          else {
            return module[name];
          }
        },
        debug: function() {
          if(settings.debug) {
            if(settings.performance) {
              module.performance.log(arguments);
            }
            else {
              module.debug = Function.prototype.bind.call(console.info, console, settings.name + ':');
              module.debug.apply(console, arguments);
            }
          }
        },
        verbose: function() {
          if(settings.verbose && settings.debug) {
            if(settings.performance) {
              module.performance.log(arguments);
            }
            else {
              module.verbose = Function.prototype.bind.call(console.info, console, settings.name + ':');
              module.verbose.apply(console, arguments);
            }
          }
        },
        error: function() {
          module.error = Function.prototype.bind.call(console.error, console, settings.name + ':');
          module.error.apply(console, arguments);
        },
        performance: {
          log: function(message) {
            var
              currentTime,
              executionTime,
              previousTime
            ;
            if(settings.performance) {
              currentTime   = new Date().getTime();
              previousTime  = time || currentTime;
              executionTime = currentTime - previousTime;
              time          = currentTime;
              performance.push({
                'Name'           : message[0],
                'Arguments'      : [].slice.call(message, 1) || '',
                'Element'        : element,
                'Execution Time' : executionTime
              });
            }
            clearTimeout(module.performance.timer);
            module.performance.timer = setTimeout(module.performance.display, 500);
          },
          display: function() {
            var
              title = settings.name + ':',
              totalTime = 0
            ;
            time = false;
            clearTimeout(module.performance.timer);
            $.each(performance, function(index, data) {
              totalTime += data['Execution Time'];
            });
            title += ' ' + totalTime + 'ms';
            if(moduleSelector) {
              title += ' \'' + moduleSelector + '\'';
            }
            if( (console.group !== undefined || console.table !== undefined) && performance.length > 0) {
              console.groupCollapsed(title);
              if(console.table) {
                console.table(performance);
              }
              else {
                $.each(performance, function(index, data) {
                  console.log(data['Name'] + ': ' + data['Execution Time']+'ms');
                });
              }
              console.groupEnd();
            }
            performance = [];
          }
        },
        invoke: function(query, passedArguments, context) {
          var
            object = instance,
            maxDepth,
            found,
            response
          ;
          passedArguments = passedArguments || queryArguments;
          context         = element         || context;
          if(typeof query == 'string' && object !== undefined) {
            query    = query.split(/[\. ]/);
            maxDepth = query.length - 1;
            $.each(query, function(depth, value) {
              var camelCaseValue = (depth != maxDepth)
                ? value + query[depth + 1].charAt(0).toUpperCase() + query[depth + 1].slice(1)
                : query
              ;
              if( $.isPlainObject( object[camelCaseValue] ) && (depth != maxDepth) ) {
                object = object[camelCaseValue];
              }
              else if( object[camelCaseValue] !== undefined ) {
                found = object[camelCaseValue];
                return false;
              }
              else if( $.isPlainObject( object[value] ) && (depth != maxDepth) ) {
                object = object[value];
              }
              else if( object[value] !== undefined ) {
                found = object[value];
                return false;
              }
              else {
                module.error(error.method, query);
                return false;
              }
            });
          }
          if ( $.isFunction( found ) ) {
            response = found.apply(context, passedArguments);
          }
          else if(found !== undefined) {
            response = found;
          }
          if($.isArray(returnedValue)) {
            returnedValue.push(response);
          }
          else if(returnedValue !== undefined) {
            returnedValue = [returnedValue, response];
          }
          else if(response !== undefined) {
            returnedValue = response;
          }
          return found;
        }
      };

      if(methodInvoked) {
        if(instance === undefined) {
          module.initialize();
        }
        instance.save.scroll();
        instance.save.calculations();
        module.invoke(query);
      }
      else {
        if(instance !== undefined) {
          instance.invoke('destroy');
        }
        module.initialize();
      }
    })
  ;

  return (returnedValue !== undefined)
    ? returnedValue
    : this
  ;
};

$.fn.visibility.settings = {

  name                   : 'Visibility',
  namespace              : 'visibility',

  debug                  : false,
  verbose                : false,
  performance            : true,

  // whether to use mutation observers to follow changes
  observeChanges         : true,

  // check position immediately on init
  initialCheck           : true,

  // whether to refresh calculations after all page images load
  refreshOnLoad          : true,

  // whether to refresh calculations after page resize event
  refreshOnResize        : true,

  // should call callbacks on refresh event (resize, etc)
  checkOnRefresh         : true,

  // callback should only occur one time
  once                   : true,

  // callback should fire continuously whe evaluates to true
  continuous             : false,

  // offset to use with scroll top
  offset                 : 0,

  // whether to include margin in elements position
  includeMargin          : false,

  // scroll context for visibility checks
  context                : window,

  // visibility check delay in ms (defaults to animationFrame)
  throttle               : false,

  // special visibility type (image, fixed)
  type                   : false,

  // image only animation settings
  transition             : 'fade in',
  duration               : 1000,

  // array of callbacks for percentage
  onPassed               : {},

  // standard callbacks
  onOnScreen             : false,
  onOffScreen            : false,
  onPassing              : false,
  onTopVisible           : false,
  onBottomVisible        : false,
  onTopPassed            : false,
  onBottomPassed         : false,

  // reverse callbacks
  onPassingReverse       : false,
  onTopVisibleReverse    : false,
  onBottomVisibleReverse : false,
  onTopPassedReverse     : false,
  onBottomPassedReverse  : false,

  // utility callbacks
  onUpdate               : false, // disabled by default for performance
  onRefresh              : function(){},

  metadata : {
    src: 'src'
  },

  className: {
    fixed       : 'fixed',
    placeholder : 'placeholder'
  },

  error : {
    method  : 'The method you called is not defined.',
    visible : 'Element is hidden, you must call refresh after element becomes visible'
  }

};

})( jQuery, window, document );
/*!
 * jQuery Cookie Plugin v1.4.1
 * https://github.com/carhartl/jquery-cookie
 *
 * Copyright 2013 Klaus Hartl
 * Released under the MIT license
 */
(function (factory) {
	if (typeof define === 'function' && define.amd) {
		// AMD
		define(['jquery.cookie-1.4.1'], factory);
	} else if (typeof exports === 'object') {
		// CommonJS
		factory(require('jquery'));
	} else {
		// Browser globals
		factory(jQuery);
	}
}(function ($) {

	var pluses = /\+/g;

	function encode(s) {
		return config.raw ? s : encodeURIComponent(s);
	}

	function decode(s) {
		return config.raw ? s : decodeURIComponent(s);
	}

	function stringifyCookieValue(value) {
		return encode(config.json ? JSON.stringify(value) : String(value));
	}

	function parseCookieValue(s) {
		if (s.indexOf('"') === 0) {
			// This is a quoted cookie as according to RFC2068, unescape...
			s = s.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
		}

		try {
			// Replace server-side written pluses with spaces.
			// If we can't decode the cookie, ignore it, it's unusable.
			// If we can't parse the cookie, ignore it, it's unusable.
			s = decodeURIComponent(s.replace(pluses, ' '));
			return config.json ? JSON.parse(s) : s;
		} catch(e) {}
	}

	function read(s, converter) {
		var value = config.raw ? s : parseCookieValue(s);
		return $.isFunction(converter) ? converter(value) : value;
	}

	var config = $.cookie = function (key, value, options) {

		// Write

		if (value !== undefined && !$.isFunction(value)) {
			options = $.extend({}, config.defaults, options);

			if (typeof options.expires === 'number') {
				var days = options.expires, t = options.expires = new Date();
				t.setTime(+t + days * 864e+5);
			}

			return (document.cookie = [
				encode(key), '=', stringifyCookieValue(value),
				options.expires ? '; expires=' + options.expires.toUTCString() : '', // use expires attribute, max-age is not supported by IE
				options.path    ? '; path=' + options.path : '',
				options.domain  ? '; domain=' + options.domain : '',
				options.secure  ? '; secure' : ''
			].join(''));
		}

		// Read

		var result = key ? undefined : {};

		// To prevent the for loop in the first place assign an empty array
		// in case there are no cookies at all. Also prevents odd result when
		// calling $.cookie().
		var cookies = document.cookie ? document.cookie.split('; ') : [];

		for (var i = 0, l = cookies.length; i < l; i++) {
			var parts = cookies[i].split('=');
			var name = decode(parts.shift());
			var cookie = parts.join('=');

			if (key && key === name) {
				// If second argument (value) is a function it's a converter...
				result = read(cookie, value);
				break;
			}

			// Prevent storing a cookie that we couldn't decode.
			if (!key && (cookie = read(cookie)) !== undefined) {
				result[name] = cookie;
			}
		}

		return result;
	};

	config.defaults = {};

	$.removeCookie = function (key, options) {
		if ($.cookie(key) === undefined) {
			return false;
		}

		// Must not alter options, thus extending a fresh object...
		$.cookie(key, '', $.extend({}, options, { expires: -1 }));
		return !$.cookie(key);
	};

}));

// Generated by CoffeeScript 1.7.1
(function() {
  var $, cardFromNumber, cardFromType, cards, defaultFormat, formatBackCardNumber, formatBackExpiry, formatCardNumber, formatExpiry, formatForwardExpiry, formatForwardSlashAndSpace, hasTextSelected, luhnCheck, reFormatCVC, reFormatCardNumber, reFormatExpiry, reFormatNumeric, replaceFullWidthChars, restrictCVC, restrictCardNumber, restrictExpiry, restrictNumeric, safeVal, setCardType,
      __slice = [].slice,
      __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  $ = window.jQuery || window.Zepto || window.$;

  $.payment = {};

  $.payment.fn = {};

  $.fn.payment = function() {
    var args, method;
    method = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    return $.payment.fn[method].apply(this, args);
  };

  defaultFormat = /(\d{1,4})/g;

  $.payment.cards = cards = [
    {
      type: 'visaelectron',
      patterns: [4026, 417500, 4405, 4508, 4844, 4913, 4917],
      format: defaultFormat,
      length: [16],
      cvcLength: [3],
      luhn: true
    }, {
      type: 'maestro',
      patterns: [5018, 502, 503, 56, 58, 639, 6220, 67],
      format: defaultFormat,
      length: [12, 13, 14, 15, 16, 17, 18, 19],
      cvcLength: [3],
      luhn: true
    }, {
      type: 'forbrugsforeningen',
      patterns: [600],
      format: defaultFormat,
      length: [16],
      cvcLength: [3],
      luhn: true
    }, {
      type: 'dankort',
      patterns: [5019],
      format: defaultFormat,
      length: [16],
      cvcLength: [3],
      luhn: true
    }, {
      type: 'visa',
      patterns: [4],
      format: defaultFormat,
      length: [13, 16],
      cvcLength: [3],
      luhn: true
    }, {
      type: 'mastercard',
      patterns: [51, 52, 53, 54, 55, 22, 23, 24, 25, 26, 27],
      format: defaultFormat,
      length: [16],
      cvcLength: [3],
      luhn: true
    }, {
      type: 'amex',
      patterns: [34, 37],
      format: /(\d{1,4})(\d{1,6})?(\d{1,5})?/,
      length: [15],
      cvcLength: [3, 4],
      luhn: true
    }, {
      type: 'dinersclub',
      patterns: [30, 36, 38, 39],
      format: /(\d{1,4})(\d{1,6})?(\d{1,4})?/,
      length: [14],
      cvcLength: [3],
      luhn: true
    }, {
      type: 'discover',
      patterns: [60, 64, 65, 622],
      format: defaultFormat,
      length: [16],
      cvcLength: [3],
      luhn: true
    }, {
      type: 'unionpay',
      patterns: [62, 88],
      format: defaultFormat,
      length: [16, 17, 18, 19],
      cvcLength: [3],
      luhn: false
    }, {
      type: 'jcb',
      patterns: [35],
      format: defaultFormat,
      length: [16],
      cvcLength: [3],
      luhn: true
    }
  ];

  cardFromNumber = function(num) {
    var card, p, pattern, _i, _j, _len, _len1, _ref;
    num = (num + '').replace(/\D/g, '');
    for (_i = 0, _len = cards.length; _i < _len; _i++) {
      card = cards[_i];
      _ref = card.patterns;
      for (_j = 0, _len1 = _ref.length; _j < _len1; _j++) {
        pattern = _ref[_j];
        p = pattern + '';
        if (num.substr(0, p.length) === p) {
          return card;
        }
      }
    }
  };

  cardFromType = function(type) {
    var card, _i, _len;
    for (_i = 0, _len = cards.length; _i < _len; _i++) {
      card = cards[_i];
      if (card.type === type) {
        return card;
      }
    }
  };

  luhnCheck = function(num) {
    var digit, digits, odd, sum, _i, _len;
    odd = true;
    sum = 0;
    digits = (num + '').split('').reverse();
    for (_i = 0, _len = digits.length; _i < _len; _i++) {
      digit = digits[_i];
      digit = parseInt(digit, 10);
      if ((odd = !odd)) {
        digit *= 2;
      }
      if (digit > 9) {
        digit -= 9;
      }
      sum += digit;
    }
    return sum % 10 === 0;
  };

  hasTextSelected = function($target) {
    var _ref;
    if (($target.prop('selectionStart') != null) && $target.prop('selectionStart') !== $target.prop('selectionEnd')) {
      return true;
    }
    if ((typeof document !== "undefined" && document !== null ? (_ref = document.selection) != null ? _ref.createRange : void 0 : void 0) != null) {
      if (document.selection.createRange().text) {
        return true;
      }
    }
    return false;
  };

  safeVal = function(value, $target) {
    var cursor, error, last;
    try {
      cursor = $target.prop('selectionStart');
    } catch (_error) {
      error = _error;
      cursor = null;
    }
    last = $target.val();
    $target.val(value);
    if (cursor !== null && $target.is(":focus")) {
      if (cursor === last.length) {
        cursor = value.length;
      }
      $target.prop('selectionStart', cursor);
      return $target.prop('selectionEnd', cursor);
    }
  };

  replaceFullWidthChars = function(str) {
    var chars, chr, fullWidth, halfWidth, idx, value, _i, _len;
    if (str == null) {
      str = '';
    }
    fullWidth = '\uff10\uff11\uff12\uff13\uff14\uff15\uff16\uff17\uff18\uff19';
    halfWidth = '0123456789';
    value = '';
    chars = str.split('');
    for (_i = 0, _len = chars.length; _i < _len; _i++) {
      chr = chars[_i];
      idx = fullWidth.indexOf(chr);
      if (idx > -1) {
        chr = halfWidth[idx];
      }
      value += chr;
    }
    return value;
  };

  reFormatNumeric = function(e) {
    return setTimeout(function() {
      var $target, value;
      $target = $(e.currentTarget);
      value = $target.val();
      value = replaceFullWidthChars(value);
      value = value.replace(/\D/g, '');
      return safeVal(value, $target);
    });
  };

  reFormatCardNumber = function(e) {
    return setTimeout(function() {
      var $target, value;
      $target = $(e.currentTarget);
      value = $target.val();
      value = replaceFullWidthChars(value);
      value = $.payment.formatCardNumber(value);
      return safeVal(value, $target);
    });
  };

  formatCardNumber = function(e) {
    var $target, card, digit, length, re, upperLength, value;
    digit = String.fromCharCode(e.which);
    if (!/^\d+$/.test(digit)) {
      return;
    }
    $target = $(e.currentTarget);
    value = $target.val();
    card = cardFromNumber(value + digit);
    length = (value.replace(/\D/g, '') + digit).length;
    upperLength = 16;
    if (card) {
      upperLength = card.length[card.length.length - 1];
    }
    if (length >= upperLength) {
      return;
    }
    if (($target.prop('selectionStart') != null) && $target.prop('selectionStart') !== value.length) {
      return;
    }
    if (card && card.type === 'amex') {
      re = /^(\d{4}|\d{4}\s\d{6})$/;
    } else {
      re = /(?:^|\s)(\d{4})$/;
    }
    if (re.test(value)) {
      e.preventDefault();
      return setTimeout(function() {
        return $target.val(value + ' ' + digit);
      });
    } else if (re.test(value + digit)) {
      e.preventDefault();
      return setTimeout(function() {
        return $target.val(value + digit + ' ');
      });
    }
  };

  formatBackCardNumber = function(e) {
    var $target, value;
    $target = $(e.currentTarget);
    value = $target.val();
    if (e.which !== 8) {
      return;
    }
    if (($target.prop('selectionStart') != null) && $target.prop('selectionStart') !== value.length) {
      return;
    }
    if (/\d\s$/.test(value)) {
      e.preventDefault();
      return setTimeout(function() {
        return $target.val(value.replace(/\d\s$/, ''));
      });
    } else if (/\s\d?$/.test(value)) {
      e.preventDefault();
      return setTimeout(function() {
        return $target.val(value.replace(/\d$/, ''));
      });
    }
  };

  reFormatExpiry = function(e) {
    return setTimeout(function() {
      var $target, value;
      $target = $(e.currentTarget);
      value = $target.val();
      value = replaceFullWidthChars(value);
      value = $.payment.formatExpiry(value);
      return safeVal(value, $target);
    });
  };

  formatExpiry = function(e) {
    var $target, digit, val;
    digit = String.fromCharCode(e.which);
    if (!/^\d+$/.test(digit)) {
      return;
    }
    $target = $(e.currentTarget);
    val = $target.val() + digit;
    if (/^\d$/.test(val) && (val !== '0' && val !== '1')) {
      e.preventDefault();
      return setTimeout(function() {
        return $target.val("0" + val + " / ");
      });
    } else if (/^\d\d$/.test(val)) {
      e.preventDefault();
      return setTimeout(function() {
        var m1, m2;
        m1 = parseInt(val[0], 10);
        m2 = parseInt(val[1], 10);
        if (m2 > 2 && m1 !== 0) {
          return $target.val("0" + m1 + " / " + m2);
        } else {
          return $target.val("" + val + " / ");
        }
      });
    }
  };

  formatForwardExpiry = function(e) {
    var $target, digit, val;
    digit = String.fromCharCode(e.which);
    if (!/^\d+$/.test(digit)) {
      return;
    }
    $target = $(e.currentTarget);
    val = $target.val();
    if (/^\d\d$/.test(val)) {
      return $target.val("" + val + " / ");
    }
  };

  formatForwardSlashAndSpace = function(e) {
    var $target, val, which;
    which = String.fromCharCode(e.which);
    if (!(which === '/' || which === ' ')) {
      return;
    }
    $target = $(e.currentTarget);
    val = $target.val();
    if (/^\d$/.test(val) && val !== '0') {
      return $target.val("0" + val + " / ");
    }
  };

  formatBackExpiry = function(e) {
    var $target, value;
    $target = $(e.currentTarget);
    value = $target.val();
    if (e.which !== 8) {
      return;
    }
    if (($target.prop('selectionStart') != null) && $target.prop('selectionStart') !== value.length) {
      return;
    }
    if (/\d\s\/\s$/.test(value)) {
      e.preventDefault();
      return setTimeout(function() {
        return $target.val(value.replace(/\d\s\/\s$/, ''));
      });
    }
  };

  reFormatCVC = function(e) {
    return setTimeout(function() {
      var $target, value;
      $target = $(e.currentTarget);
      value = $target.val();
      value = replaceFullWidthChars(value);
      value = value.replace(/\D/g, '').slice(0, 4);
      return safeVal(value, $target);
    });
  };

  restrictNumeric = function(e) {
    var input;
    if (e.metaKey || e.ctrlKey) {
      return true;
    }
    if (e.which === 32) {
      return false;
    }
    if (e.which === 0) {
      return true;
    }
    if (e.which < 33) {
      return true;
    }
    input = String.fromCharCode(e.which);
    return !!/[\d\s]/.test(input);
  };

  restrictCardNumber = function(e) {
    var $target, card, digit, value;
    $target = $(e.currentTarget);
    digit = String.fromCharCode(e.which);
    if (!/^\d+$/.test(digit)) {
      return;
    }
    if (hasTextSelected($target)) {
      return;
    }
    value = ($target.val() + digit).replace(/\D/g, '');
    card = cardFromNumber(value);
    if (card) {
      return value.length <= card.length[card.length.length - 1];
    } else {
      return value.length <= 16;
    }
  };

  restrictExpiry = function(e) {
    var $target, digit, value;
    $target = $(e.currentTarget);
    digit = String.fromCharCode(e.which);
    if (!/^\d+$/.test(digit)) {
      return;
    }
    if (hasTextSelected($target)) {
      return;
    }
    value = $target.val() + digit;
    value = value.replace(/\D/g, '');
    if (value.length > 6) {
      return false;
    }
  };

  restrictCVC = function(e) {
    var $target, digit, val;
    $target = $(e.currentTarget);
    digit = String.fromCharCode(e.which);
    if (!/^\d+$/.test(digit)) {
      return;
    }
    if (hasTextSelected($target)) {
      return;
    }
    val = $target.val() + digit;
    return val.length <= 4;
  };

  setCardType = function(e) {
    var $target, allTypes, card, cardType, val;
    $target = $(e.currentTarget);
    val = $target.val();
    cardType = $.payment.cardType(val) || 'unknown';
    if (!$target.hasClass(cardType)) {
      allTypes = (function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = cards.length; _i < _len; _i++) {
          card = cards[_i];
          _results.push(card.type);
        }
        return _results;
      })();
      $target.removeClass('unknown');
      $target.removeClass(allTypes.join(' '));
      $target.addClass(cardType);
      $target.toggleClass('identified', cardType !== 'unknown');
      return $target.trigger('payment.cardType', cardType);
    }
  };

  $.payment.fn.formatCardCVC = function() {
    this.on('keypress', restrictNumeric);
    this.on('keypress', restrictCVC);
    this.on('paste', reFormatCVC);
    this.on('change', reFormatCVC);
    this.on('input', reFormatCVC);
    return this;
  };

  $.payment.fn.formatCardExpiry = function() {
    this.on('keypress', restrictNumeric);
    this.on('keypress', restrictExpiry);
    this.on('keypress', formatExpiry);
    this.on('keypress', formatForwardSlashAndSpace);
    this.on('keypress', formatForwardExpiry);
    this.on('keydown', formatBackExpiry);
    this.on('change', reFormatExpiry);
    this.on('input', reFormatExpiry);
    return this;
  };

  $.payment.fn.formatCardNumber = function() {
    this.on('keypress', restrictNumeric);
    this.on('keypress', restrictCardNumber);
    this.on('keypress', formatCardNumber);
    this.on('keydown', formatBackCardNumber);
    this.on('keyup', setCardType);
    this.on('paste', reFormatCardNumber);
    this.on('change', reFormatCardNumber);
    this.on('input', reFormatCardNumber);
    this.on('input', setCardType);
    return this;
  };

  $.payment.fn.restrictNumeric = function() {
    this.on('keypress', restrictNumeric);
    this.on('paste', reFormatNumeric);
    this.on('change', reFormatNumeric);
    this.on('input', reFormatNumeric);
    return this;
  };

  $.payment.fn.cardExpiryVal = function() {
    return $.payment.cardExpiryVal($(this).val());
  };

  $.payment.cardExpiryVal = function(value) {
    var month, prefix, year, _ref;
    _ref = value.split(/[\s\/]+/, 2), month = _ref[0], year = _ref[1];
    if ((year != null ? year.length : void 0) === 2 && /^\d+$/.test(year)) {
      prefix = (new Date).getFullYear();
      prefix = prefix.toString().slice(0, 2);
      year = prefix + year;
    }
    month = parseInt(month, 10);
    year = parseInt(year, 10);
    return {
      month: month,
      year: year
    };
  };

  $.payment.validateCardNumber = function(num) {
    var card, _ref;
    num = (num + '').replace(/\s+|-/g, '');
    if (!/^\d+$/.test(num)) {
      return false;
    }
    card = cardFromNumber(num);
    if (!card) {
      return false;
    }
    return (_ref = num.length, __indexOf.call(card.length, _ref) >= 0) && (card.luhn === false || luhnCheck(num));
  };

  $.payment.validateCardExpiry = function(month, year) {
    var currentTime, expiry, _ref;
    if (typeof month === 'object' && 'month' in month) {
      _ref = month, month = _ref.month, year = _ref.year;
    }
    if (!(month && year)) {
      return false;
    }
    month = $.trim(month);
    year = $.trim(year);
    if (!/^\d+$/.test(month)) {
      return false;
    }
    if (!/^\d+$/.test(year)) {
      return false;
    }
    if (!((1 <= month && month <= 12))) {
      return false;
    }
    if (year.length === 2) {
      if (year < 70) {
        year = "20" + year;
      } else {
        year = "19" + year;
      }
    }
    if (year.length !== 4) {
      return false;
    }
    expiry = new Date(year, month);
    currentTime = new Date;
    expiry.setMonth(expiry.getMonth() - 1);
    expiry.setMonth(expiry.getMonth() + 1, 1);
    return expiry > currentTime;
  };

  $.payment.validateCardCVC = function(cvc, type) {
    var card, _ref;
    cvc = $.trim(cvc);
    if (!/^\d+$/.test(cvc)) {
      return false;
    }
    card = cardFromType(type);
    if (card != null) {
      return _ref = cvc.length, __indexOf.call(card.cvcLength, _ref) >= 0;
    } else {
      return cvc.length >= 3 && cvc.length <= 4;
    }
  };

  $.payment.cardType = function(num) {
    var _ref;
    if (!num) {
      return null;
    }
    return ((_ref = cardFromNumber(num)) != null ? _ref.type : void 0) || null;
  };

  $.payment.formatCardNumber = function(num) {
    var card, groups, upperLength, _ref;
    num = num.replace(/\D/g, '');
    card = cardFromNumber(num);
    if (!card) {
      return num;
    }
    upperLength = card.length[card.length.length - 1];
    num = num.slice(0, upperLength);
    if (card.format.global) {
      return (_ref = num.match(card.format)) != null ? _ref.join(' ') : void 0;
    } else {
      groups = card.format.exec(num);
      if (groups == null) {
        return;
      }
      groups.shift();
      groups = $.grep(groups, function(n) {
        return n;
      });
      return groups.join(' ');
    }
  };

  $.payment.formatExpiry = function(expiry) {
    var mon, parts, sep, year;
    parts = expiry.match(/^\D*(\d{1,2})(\D+)?(\d{1,4})?/);
    if (!parts) {
      return '';
    }
    mon = parts[1] || '';
    sep = parts[2] || '';
    year = parts[3] || '';
    if (year.length > 0) {
      sep = ' / ';
    } else if (sep === ' /') {
      mon = mon.substring(0, 1);
      sep = '';
    } else if (mon.length === 2 || sep.length > 0) {
      sep = ' / ';
    } else if (mon.length === 1 && (mon !== '0' && mon !== '1')) {
      mon = "0" + mon;
      sep = ' / ';
    }
    return mon + sep + year;
  };

}).call(this);
/*!
 * Validator v0.9.0 for Bootstrap 3, by @1000hz
 * Copyright 2015 Cina Saffary
 * Licensed under http://opensource.org/licenses/MIT
 *
 * https://github.com/1000hz/bootstrap-validator
 */

+function ($) {
  'use strict';

  // VALIDATOR CLASS DEFINITION
  // ==========================

  var Validator = function (element, options) {
    this.$element = $(element)
    this.options  = options

    options.errors = $.extend({}, Validator.DEFAULTS.errors, options.errors)

    for (var custom in options.custom) {
      if (!options.errors[custom]) throw new Error('Missing default error message for custom validator: ' + custom)
    }

    $.extend(Validator.VALIDATORS, options.custom)

    this.$element.attr('novalidate', true) // disable automatic native validation
    this.toggleSubmit()

    this.$element.on('input.bs.validator change.bs.validator focusout.bs.validator', $.proxy(this.validateInput, this))
    this.$element.on('submit.bs.validator', $.proxy(this.onSubmit, this))

    this.$element.find('[data-match]').each(function () {
      var $this  = $(this)
      var target = $this.data('match')

      $(target).on('input.bs.validator', function (e) {
        $this.val() && $this.trigger('input.bs.validator')
      })
    })
  }

  Validator.INPUT_SELECTOR = ':input:not([type="submit"], button):enabled:visible'

  Validator.DEFAULTS = {
    delay: 500,
    html: false,
    disable: true,
    custom: {},
    errors: {
      match: 'Does not match',
      minlength: 'Not long enough'
    },
    feedback: {
      success: 'glyphicon-ok',
      error: 'glyphicon-remove'
    }
  }

  Validator.VALIDATORS = {
    'native': function ($el) {
      var el = $el[0]
      return el.checkValidity ? el.checkValidity() : true
    },
    'match': function ($el) {
      var target = $el.data('match')
      return !$el.val() || $el.val() === $(target).val()
    },
    'minlength': function ($el) {
      var minlength = $el.data('minlength')
      return !$el.val() || $el.val().length >= minlength
    }
  }

  Validator.prototype.validateInput = function (e) {
    var $el        = $(e.target)
    var prevErrors = $el.data('bs.validator.errors')
    var errors

    if ($el.is('[type="radio"]')) $el = this.$element.find('input[name="' + $el.attr('name') + '"]')

    this.$element.trigger(e = $.Event('validate.bs.validator', {relatedTarget: $el[0]}))

    if (e.isDefaultPrevented()) return

    var self = this

    this.runValidators($el).done(function (errors) {
      $el.data('bs.validator.errors', errors)

      errors.length ? self.showErrors($el) : self.clearErrors($el)

      if (!prevErrors || errors.toString() !== prevErrors.toString()) {
        e = errors.length
            ? $.Event('invalid.bs.validator', {relatedTarget: $el[0], detail: errors})
            : $.Event('valid.bs.validator', {relatedTarget: $el[0], detail: prevErrors})

        self.$element.trigger(e)
      }

      self.toggleSubmit()

      self.$element.trigger($.Event('validated.bs.validator', {relatedTarget: $el[0]}))
    })
  }


  Validator.prototype.runValidators = function ($el) {
    var errors   = []
    var deferred = $.Deferred()
    var options  = this.options

    $el.data('bs.validator.deferred') && $el.data('bs.validator.deferred').reject()
    $el.data('bs.validator.deferred', deferred)

    function getErrorMessage(key) {
      return $el.data(key + '-error')
          || $el.data('error')
          || key == 'native' && $el[0].validationMessage
          || options.errors[key]
    }

    $.each(Validator.VALIDATORS, $.proxy(function (key, validator) {
      if (($el.data(key) || key == 'native') && !validator.call(this, $el)) {
        var error = getErrorMessage(key)
        !~errors.indexOf(error) && errors.push(error)
      }
    }, this))

    if (!errors.length && $el.val() && $el.data('remote')) {
      this.defer($el, function () {
        var data = {}
        data[$el.attr('name')] = $el.val()
        $.get($el.data('remote'), data)
            .fail(function (jqXHR, textStatus, error) { errors.push(getErrorMessage('remote') || error) })
            .always(function () { deferred.resolve(errors)})
      })
    } else deferred.resolve(errors)

    return deferred.promise()
  }

  Validator.prototype.validate = function () {
    var delay = this.options.delay

    this.options.delay = 0
    this.$element.find(Validator.INPUT_SELECTOR).trigger('input.bs.validator')
    this.options.delay = delay

    return this
  }

  Validator.prototype.showErrors = function ($el) {
    var method = this.options.html ? 'html' : 'text'

    this.defer($el, function () {
      var $group = $el.closest('.form-group')
      var $block = $group.find('.help-block.with-errors')
      var $feedback = $group.find('.form-control-feedback')
      var errors = $el.data('bs.validator.errors')

      if (!errors.length) return

      errors = $('<ul/>')
          .addClass('list-unstyled')
          .append($.map(errors, function (error) { return $('<li/>')[method](error) }))

      $block.data('bs.validator.originalContent') === undefined && $block.data('bs.validator.originalContent', $block.html())
      $block.empty().append(errors)
      $group.addClass('has-error')

      $feedback.length
      && $feedback.removeClass(this.options.feedback.success)
      && $feedback.addClass(this.options.feedback.error)
      && $group.removeClass('has-success')
    })
  }

  Validator.prototype.clearErrors = function ($el) {
    var $group = $el.closest('.form-group')
    var $block = $group.find('.help-block.with-errors')
    var $feedback = $group.find('.form-control-feedback')

    $block.html($block.data('bs.validator.originalContent'))
    $group.removeClass('has-error')

    $feedback.length
    && $feedback.removeClass(this.options.feedback.error)
    && $feedback.addClass(this.options.feedback.success)
    && $group.addClass('has-success')
  }

  Validator.prototype.hasErrors = function () {
    function fieldErrors() {
      return !!($(this).data('bs.validator.errors') || []).length
    }

    return !!this.$element.find(Validator.INPUT_SELECTOR).filter(fieldErrors).length
  }

  Validator.prototype.isIncomplete = function () {
    function fieldIncomplete() {
      return this.type === 'checkbox' ? !this.checked                                   :
          this.type === 'radio'    ? !$('[name="' + this.name + '"]:checked').length :
          $.trim(this.value) === ''
    }

    return !!this.$element.find(Validator.INPUT_SELECTOR).filter('[required]').filter(fieldIncomplete).length
  }

  Validator.prototype.onSubmit = function (e) {
    this.validate()
    if (this.isIncomplete() || this.hasErrors()) e.preventDefault()
  }

  Validator.prototype.toggleSubmit = function () {
    if(!this.options.disable) return

    var $btn = $('button[type="submit"], input[type="submit"]')
        .filter('[form="' + this.$element.attr('id') + '"]')
        .add(this.$element.find('input[type="submit"], button[type="submit"]'))

    $btn.toggleClass('disabled', this.isIncomplete() || this.hasErrors())
  }

  Validator.prototype.defer = function ($el, callback) {
    callback = $.proxy(callback, this)
    if (!this.options.delay) return callback()
    window.clearTimeout($el.data('bs.validator.timeout'))
    $el.data('bs.validator.timeout', window.setTimeout(callback, this.options.delay))
  }

  Validator.prototype.destroy = function () {
    this.$element
        .removeAttr('novalidate')
        .removeData('bs.validator')
        .off('.bs.validator')

    this.$element.find(Validator.INPUT_SELECTOR)
        .off('.bs.validator')
        .removeData(['bs.validator.errors', 'bs.validator.deferred'])
        .each(function () {
          var $this = $(this)
          var timeout = $this.data('bs.validator.timeout')
          window.clearTimeout(timeout) && $this.removeData('bs.validator.timeout')
        })

    this.$element.find('.help-block.with-errors').each(function () {
      var $this = $(this)
      var originalContent = $this.data('bs.validator.originalContent')

      $this
          .removeData('bs.validator.originalContent')
          .html(originalContent)
    })

    this.$element.find('input[type="submit"], button[type="submit"]').removeClass('disabled')

    this.$element.find('.has-error').removeClass('has-error')

    return this
  }

  // VALIDATOR PLUGIN DEFINITION
  // ===========================


  function Plugin(option) {
    return this.each(function () {
      var $this   = $(this)
      var options = $.extend({}, Validator.DEFAULTS, $this.data(), typeof option == 'object' && option)
      var data    = $this.data('bs.validator')

      if (!data && option == 'destroy') return
      if (!data) $this.data('bs.validator', (data = new Validator(this, options)))
      if (typeof option == 'string') data[option]()
    })
  }

  var old = $.fn.validator

  $.fn.validator             = Plugin
  $.fn.validator.Constructor = Validator


  // VALIDATOR NO CONFLICT
  // =====================

  $.fn.validator.noConflict = function () {
    $.fn.validator = old
    return this
  }


  // VALIDATOR DATA-API
  // ==================

  $(window).on('load', function () {
    $('form[data-toggle="validator"]').each(function () {
      var $form = $(this)
      Plugin.call($form, $form.data())
    })
  })

}(jQuery);
var Class = (function() {
  var initializing = false, fnTest = /xyz/.test(function(){xyz;}) ? /\b_super\b/ : /.*/;

  // The base Class implementation (does nothing)
  function Class(){};

  // Create a new Class that inherits from this class
  Class.extend = function(prop) {

    var $inject = prop.$inject, config = prop.config, subclass;
    delete prop.$inject;
    delete prop.config;

    var _super = this.prototype;

    // Instantiate a base class (but only create the instance,
    // don't run the init constructor)
    initializing = true;
    var prototype = new this();
    initializing = false;

    // Copy the properties over onto the new prototype
    for (var name in prop) {
      // Check if we're overwriting an existing function
      prototype[name] = typeof prop[name] == "function" &&
      typeof _super[name] == "function" && fnTest.test(prop[name]) ?
          (function(name, fn){
            return function() {
              var tmp = this._super;

              // Add a new ._super() method that is the same method
              // but on the super-class
              this._super = _super[name];

              // The method only need to be bound temporarily, so we
              // remove it when we're done executing
              var ret = fn.apply(this, arguments);
              this._super = tmp;

              return ret;
            };
          })(name, prop[name]) :
          prop[name];
    }

    // The dummy class constructor
    function Class() {
      // All construction is actually done in the init method
      if ( !initializing && this.init ) {
        var self = this;
        $.each(this.__proto__, function(key, member) {
          if($.isFunction(member)/*&& key.toLowerCase().indexOf('on') === 0*/) {
            self[key] = member.bind(self);
          }
        });
        this.init.apply(this, arguments);
      }
    }

    // Populate our constructed prototype object
    Class.prototype = prototype;

    // Enforce the constructor to be what we expect
    Class.prototype.constructor = Class;

    // And make this class extendable
    Class.extend = arguments.callee;

    if($inject) Class.$inject = $inject;
    if(config) Class.config = config;

    return Class;
  };

  return Class;

})();
var Module = (function() {
  return Class.extend({

    ensureLocals: function () {
      if (this.ensured) return;
      this.callbacks = {};
      this._id = 0;
      this.ensured = true;
    },

    on: function (events, fn) {
      var self = this;
      this.ensureLocals();
      if (typeof fn == 'function') {
        fn._id = typeof fn._id == 'undefined' ? this._id++ : fn._id

        events.replace(/\S+/g, function (name, pos) {
          (self.callbacks[name] = self.callbacks[name] || []).push(fn)
          fn.typed = pos > 0
        })
      }
      return this;
    },

    off: function (events, fn) {
      var self = this;
      this.ensureLocals();
      if (events == '*') this.callbacks = {}
      else {
        events.replace(/\S+/g, function (name) {
          if (fn) {
            var arr = self.callbacks[name]
            for (var i = 0, cb; (cb = arr && arr[i]); ++i) {
              if (cb._id == fn._id) {
                arr.splice(i, 1);
                i--
              }
            }
          } else {
            self.callbacks[name] = []
          }
        })
      }
      return this;
    },

    one: function (name, fn) {
      this.ensureLocals();
      function on() {
        this.off(name, on)
        fn.apply(this, arguments)
      }

      return this.on(name, on)
    },

    trigger: function (name) {
      this.ensureLocals();
      var args = [].slice.call(arguments, 1),
          fns = this.callbacks[name] || []

      for (var i = 0, fn; (fn = fns[i]); ++i) {
        if (!fn.busy) {
          fn.busy = 1
          fn.apply(this, fn.typed ? [name].concat(args) : args)
          if (fns[i] !== fn) {
            i--
          }
          fn.busy = 0
        }
      }

      if (this.callbacks.all && name != 'all') {
        this.trigger.apply(this, ['all', name].concat(args))
      }

      return this
    }
  });

})();



var app = (function () {
  var typeRegistry, instanceRegistry, app;

  typeRegistry = {};
  instanceRegistry = {};

  app = {

    components: [],

    routes: [],

    getType: function(name) {
      return typeRegistry[name];
    },

    value: function (name, value) {
      instanceRegistry[name] = value;
    },

    service: function (name, type, dependencies) {
      type.dependencies = dependencies || [];
      typeRegistry[name] = type;
    },

    component: function (name, type, dependencies, tag) {
      type.dependencies = dependencies || [];
      typeRegistry[name] = type;
      this.components.push(tag || name);
    },

    checkForCircularDependency: function (typeName, dependencyName) {
      var type = typeRegistry[dependencyName];
      if(!type) {
        return;
      }
      type.dependencies.forEach(function (dep) {
        if(dep == typeName) {
          throw new Error("Types '" + typeName + "' and '" + dep + "' have " +
          "a circular dependency on one another");
        }
      });
    },

    getDependencyInstances: function (typeName, type) {
      var self = this;
      return type.dependencies.map(function (dependencyName) {
        self.checkForCircularDependency(typeName, dependencyName);
        return self.resolve(dependencyName, typeName);
      });
    },

    resolve: function (name, forName) {
      if (instanceRegistry[name] !== undefined) {
        return instanceRegistry[name];
      }
      if (typeRegistry[name] === undefined) {
        throw new Error("Type: " + forName + " depends on unregistered dependency: " + name);
      }
      var dependencies = this.getDependencyInstances(name, typeRegistry[name]);
      dependencies.splice(0, 0, null);
      return instanceRegistry[name] = new (Function.prototype.bind.apply(typeRegistry[name], dependencies));
    },

    run: function(authenticated) {
      this.value('authenticated', authenticated);
      this.value('window', window);
      this.value('$', $);
      this.value('riot', riot);
      this.value('page', page);
      this.value('components', app.components);
      this.value('app', app);
      this.value('console', console);
      var router = app.resolve('Router');
      router.register(this.routes).start('/app');
    }
  };

  return app;
})();
(function () {
  var Account = Module.extend({
    init: function (http, authenticated) {
      this.http = http;
      this.authenticated = authenticated;
    },

    getEncodedCredentials: function (credentials) {
      var str = [];
      for (var p in credentials)
        str.push(encodeURIComponent(p) + "=" + encodeURIComponent(credentials[p]));
      return str.join("&");
    },

    login: function (credentials) {
      return this.http.post(
          '/api/accounts/login',
          this.getEncodedCredentials(credentials),
          {'Content-Type': 'application/x-www-form-urlencoded'}
      );
    },

    logout: function () {
      return this.http.delete('/api/accounts/logout');
    },

    create: function (account) {
      delete account.passwordConfirm;
      return this.http.post('/api/accounts', account);
    },

    update: function(account) {
      delete account.password;
      delete account.passwordConfirm;
      return this.http.patch('/api/accounts', account)
    },

    changePassword: function(oldPassword, newPassword) {
      return this.http.post('/api/accounts/password/change', {
        oldPassword: oldPassword,
        newPassword: newPassword
      });
    },

    recoverPassword: function(email) {
      return this.http.post('/api/accounts/password/recover', {
        email: email
      });
    },

    resetPassword: function(token, password) {
      return this.http.post('/api/accounts/password/reset', {
        passwordResetToken: token,
        password: password
      });
    },

    getCurrent: function() {
      return this.http.get('/api/accounts/current');
    },

    update: function(account) {
      return this.http.patch('/api/accounts', account);
    }

  });

  app.service(
      'Account',
      Account,
      [
        'Http',
        'authenticated'
      ]
  );
})();
(function () {
  var ComponentLoader = Module.extend({

    init: function ($, riot, app, http) {
      this.$ = $;
      this.riot = riot;
      this.app = app;
      this.http = http;
      this.compiled = {};
      this.mounted = [];
    },

    parseComponentReferences: function (parentComponent, content) {
      var references = [];
      content = content.toLowerCase();
      this.app.components.forEach(function (component) {
        if (component != parentComponent && content.indexOf('<' + component.toLowerCase()) > -1) {
          references.push(component);
        }
      });
      return references;
    },

    onFetchSuccess: function (cb) {
      var self = this;
      return function (matches) {
        self.compile(matches);
        cb(matches);
      }
    },

    fetch: function (components, cb) {
      var self = this;

      if (!components) {
        return cb([]);
      }

      if (!self.$.isArray(components)) {
        components = [components];
      }

      //remove already compiled components.
      components = components.filter(function (component) {
        return !self.compiled[component];
      });

      if (!components.length) {
        return cb([]);
      }
      return self.http.get('/components/content?names=' + components.join()).done(this.onFetchSuccess(cb));
    },

    compile: function (components) {
      var self = this;
      components.forEach(function (component) {
        if (self.compiled[component.name]) return;
        self.riot.compile(component.content);
        self.compiled[component.name] = true;
      });
    },

    onLoadComplete: function (component, cb) {
      var self = this;
      return function (components) {
        if (!components.length) {
          return cb();
        }
        var componentReferences = self.parseComponentReferences(component, components[0].content);
        self.fetch(componentReferences, cb);
      };
    },

    load: function (component, cb) {
      this.fetch(component, this.onLoadComplete(component, cb));
    },

    unmountPrevious: function () {
      this.mounted.forEach(function (tag) {
        tag.unmount();
      });
    },

    onMountComplete: function (viewport, component, tag, ctx, cb) {
      var self = this;
      return function () {
        self.unmountPrevious();
        self.$(viewport).html('<' + tag + '></' + tag + '>');
        self.mounted = self.riot.mount(tag, ctx);
        if (cb) {
          cb();
        }
      }
    },

    mount: function (viewport, component, tag, ctx, cb) {
      component = component.toLowerCase();
      this.load(component, this.onMountComplete(viewport, component, tag, ctx ,cb));
    }
  });

  app.service(
      'ComponentLoader',
      ComponentLoader,
      [
        '$',
        'riot',
        'app',
        'Http'
      ]
  );
})();
(function () {
  var ErrorHandler = Module.extend({
    init: function (router) {
      this.router = router;
    },

    handle: function (status, possibleErrors) {
      var handled, self;
      handled = false;
      self = this;

      for (statusKey in possibleErrors) {
        if(possibleErrors.hasOwnProperty(statusKey)) {
          var possibleError = possibleErrors[statusKey];
          if(!handled && statusKey.toString().length == 1 && status.toString().indexOf(statusKey.toString())
              || statusKey == status) {
            if(possibleError.form) {
              handled = true;
              return possibleError.form.form('add errors', possibleError.text);
            }
            if(possibleError.route) {
              handled = true;
              return self.router.go(possibleError.route);
            }
            throw new Error('All error handlers should either bind to a form or a route.');
          }
        }
      }

      return handled;
    }
  });

  app.service(
      'ErrorHandler',
      ErrorHandler,
      [
          'Router'
      ]
  );
})();
(function () {
  var Http = Module.extend({
    init: function ($) {
      this.$ = $;

      //this.dispatch = this.dispatch.bind(this);
      //this.get = this.get.bind(this);
      //this.post = this.post.bind(this);
      //this.put = this.put.bind(this);
      //this.patch = this.patch.bind(this);
      //this.delete = this.delete.bind(this);
    },

    dispatch: function (options) {
      if(options.contentType === undefined) {
        options.contentType = false;
      }
      if(options.data && this.$.isPlainObject(options.data)) {
        options.data = JSON.stringify(options.data);
      }
      options.headers = this.$.extend({
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-XSRF-TOKEN': this.$.cookie('XSRF-TOKEN')
      }, options.headers);
      return this.$.ajax(options);
    },

    get: function (url, headers) {
      return this.dispatch({
        url: url,
        type: 'GET',
        dataType: 'json',
        headers: headers
      });
    },

    post: function (url, data, headers) {
      return this.dispatch({
        url: url,
        type: 'POST',
        data: data,
        headers: headers
      });
    },

    put: function (url, data, headers) {
      return this.dispatch({
        url: url,
        type: 'PUT',
        data: data,
        headers: headers
      });
    },

    patch: function (url, data, headers) {
      return this.dispatch({
        url: url,
        type: 'PATCH',
        data: data,
        headers: headers
      });
    },

    delete: function (url, headers) {
      return this.dispatch({
        url: url,
        type: 'DELETE',
        headers: headers
      });
    }
  });


  app.service(
      'Http',
      Http,
      [
        '$'
      ]
  );

})();
(function () {
  var Router = Module.extend({

    init: function (window, page, riot, app, componentLoader) {
      this.window = window;
      this.page = page;
      this.riot = riot;
      this.app = app;
      this.current = null;
      this.componentLoader = componentLoader;
      this.routes = {};
    },

    onRouteChange: function (route) {
      var self = this;
      return function (ctx) {
        var shortCircuited = false;

        self.current = ctx;

        if (route.authenticate && !self.app.resolve('authenticated')) {
          return self.page.redirect('/login');
        }

        route.interceptors = (route.interceptors || []).map(function (interceptor) {
          return self.app.resolve(interceptor);
        });

        route.interceptors.forEach(function (interceptor) {
          if (!shortCircuited && interceptor.preHandle) {
            shortCircuited = !interceptor.preHandle.call(self, route, self.page);
          }
        });

        if (shortCircuited) {
          return;
        }

        var ctrl = {};
        if (route.component) {
          ctrl = self.app.resolve(route.component);
        }

        ctrl.ctx = ctx;
        self.componentLoader.mount(route.viewport || '#viewport', route.templateName || route.component, route.tag, ctrl);

        route.interceptors.forEach(function (interceptor) {
          if (!shortCircuited && interceptor.postHandle) {
            shortCircuited = !interceptor.postHandle.call(self, route, self.page);
          }
        });
      }
    },

    onRegisterRoute: function (route) {
      this.routes[route.name || route.templateName || route.component] = route;
      this.page(route.path, this.onRouteChange(route));
    },

    register: function (routes) {
      var sorted = routes.sort(function(a, b){
        a.index = a.index || 0;
        b.index = b.index || 0;
        if (a.index > b.index) {
          return 1;
        }
        if (a.index < b.index) {
          return -1;
        }
      });
      sorted.forEach(this.onRegisterRoute);
      return this;
    },

    start: function (base) {
      //this.history.redirect(null, base);
      this.base = base || '/';
      this.page.base(base);
      this.page.start();
    },

    isCurrent: function(name) {
      if (!this.routes[name]) {
        throw new Error("The route: '" + name + "' is not registered");
      }
      return this.current.path.toLowerCase() == this.getPath(this.routes[name]).toLowerCase();
    },

    getPath: function (route, params) {
      var path = route.path;
      params = params || {};
      for (var key in params) {
        if (params.hasOwnProperty(key)) {
          path = route.path.replace(':' + key, params[key])
        }
      }
      return path;
    },

    go: function (name, params, reload) {
      if (name.indexOf('http') == 0 || name.indexOf('/') == 0) {
        return this.window.location.href = name;
      }
      if(reload) {
        return this.window.location.href = this.base + this.routes[name].path;
      }
      if (!this.routes[name]) {
        throw new Error("The route: '" + name + "' is not registered");
      }
      this.page.show(this.getPath(this.routes[name], params));
    }

  });


  app.service(
      'Router',
      Router,
      [
        'window',
        'page',
        'riot',
        'app',
        'ComponentLoader'
      ]
  );

})();
(function () {
  var Billing = Module.extend({

    init: function ($, errorHandler, router, account) {
      this.$ = $;
      this.errorHandler = errorHandler;
      this.router = router;
      this.account = account;
    },

    onMount: function (tag) {
      this.tag = tag;
      this.form = this.$('form', tag.root).form({
        inline: false//,
        //fields: {
        //  email: ['email', 'empty']
        //}
      });
      this.$(this.tag.root).ready(function() {
        //var s = document.createElement("script");
        //s.type = "text/javascript";
        //s.src = "https://js.stripe.com/v2/"
        //$("body").append(s);


        $.getScript("https://js.stripe.com/v2/", function(){
          $('#payment-form').submit(function(event) {
            var $form = $(this);

            // Disable the submit button to prevent repeated clicks
            $form.find('button').prop('disabled', true);

            //Stripe.card.createToken($form, stripeResponseHandler);
            alert($form);

            $form.find('button').prop('disabled', false);
            // Prevent the form from submitting with the default action
            return false;
          });
        });

      });
    }
  });


  app.component(
      'Billing',
      Billing,
      [
        '$',
        'ErrorHandler',
        'Router',
        'Account'
      ]
  );

  app.routes.push({
    path: '/settings/billing',
    component: 'Billing',
    tag: 'billing',
    authenticate: true
  });

  app.routes.push({
    templateName: 'billingEdit',
    path: '/settings/billing/edit',
    component: 'Billing',
    tag: 'billing-edit',
    authenticate: true
  });

})();

(function () {
  var Login = Module.extend({

    init: function ($, errorHandler, router, account) {
      this.$ = $;
      this.errorHandler = errorHandler;
      this.router = router;
      this.account = account;
      this.message = {};
    },

    onMount: function (tag) {
      this.message.displayPasswordResetSuccess = this.router.isCurrent('LoginAfterPasswordReset');
      this.tag = tag;
      this.form = this.$('form', tag.root).form({
        inline: false,
        fields: {
          email: ['email', 'empty'],
          password: ['empty']
        }
      });
      this.tag.update();
    },

    getInputs: function (form) {
      return {
        email: form.email.value,
        password: form.password.value,
        rememberMe: true
      }
    },

    onSuccess: function (data, status) {
      this.router.go('Home', null, true);
      this.tag.update();
    },

    onError: function (jqXHR, textStatus, errorThrown) {
      this.errorHandler.handle(jqXHR.status, {
        401: { form: this.form, text: 'Email address or password invalid.' }
      });
      this.tag.update();
    },

    submit: function (e) {
      if(!e.result) return;
      this.account.login(this.getInputs(e.target)).done(this.onSuccess).fail(this.onError);
    }
  });


  app.component(
      'Login',
      Login,
      [
        '$',
        'ErrorHandler',
        'Router',
        'Account'
      ]
  );

  app.routes.push({
    path: '/login',
    component: 'Login',
    tag: 'login'
  });

  app.routes.push({
    name: 'LoginAfterPasswordReset',
    path: '/login/password-reset-success',
    component: 'Login',
    tag: 'login'
  });

})();

(function () {
  var Organization = Module.extend({

    init: function ($, errorHandler, router, account) {
      this.$ = $;
      this.errorHandler = errorHandler;
      this.router = router;
      this.account = account;
    },

    onMount: function (tag) {
      this.tag = tag;
    }
  });


  app.component(
      'Organization',
      Organization,
      [
        '$',
        'ErrorHandler',
        'Router',
        'Account'
      ]
  );

  app.routes.push({
    path: '/settings/organization',
    component: 'Organization',
    tag: 'organization',
    authenticate: true
  });

  app.routes.push({
    templateName: 'organizationEdit',
    path: '/settings/organization/edit',
    component: 'Organization',
    tag: 'organization-edit',
    authenticate: true
  });

})();

(function () {
  var Profile = Module.extend({

    init: function ($, errorHandler, router, account) {
      this.$ = $;
      this.errorHandler = errorHandler;
      this.router = router;
      this.account = account;
      this.data = {};
      this.editing = false;
    },

    onMount: function (tag) {
      this.tag = tag;
      this.form = this.$('form', tag.root).form({
        inline: false,
        fields: {
          email: ['email', 'empty']
        }
      });

      this.account.getCurrent().done(this.onGetCurrentSuccess).fail(this.onGetCurrentError);
    },

    onUnMount: function () {
      this.reset();
    },

    onGetCurrentSuccess: function (profile, status) {
      this.data = profile;
      this.tag.update();
    },

    onGetCurrentError: function (jqXHR, textStatus, errorThrown) {
      //this.errorHandler.handle(jqXHR.status, {
      //  401: { form: this.form, text: 'Email address or password invalid.' }
      //});
      //this.tag.update();
      console.log(jqXHR);
      this.tag.update();
    },

    onUpdateAccountSuccess: function (data, status) {
      console.log('success');
      this.editing = false;
      this.tag.update();
    },

    onUpdateAccountError: function (jqXHR, textStatus, errorThrown) {
      //this.errorHandler.handle(jqXHR.status, {
      //  401: { form: this.form, text: 'Email address or password invalid.' }
      //});
      //this.tag.update();
      this.tag.update();
    },

    toggle: function (e) {
      this.editing = e.target.checked;
      if(this.editing) {
        this.original = this.$.extend({}, this.data);
      } else {
        this.data = this.$.extend(this.data, this.getInputs(e.target.form));
        this.tag.update();
      }
    },

    reset: function() {
      this.editing = false;
      this.data = this.original || this.data;
      this.tag.update();
    },

    getInputs: function (form) {
      return {
        email: form[1].value,
        first: form[2].value,
        last: form[3].value
      }
    },

    submit: function (e) {
      this.account.update(this.getInputs(e.target)).done(this.onUpdateAccountSuccess).fail(this.onUpdateAccountError);
    }
  });


  app.component(
      'Profile',
      Profile,
      [
        '$',
        'ErrorHandler',
        'Router',
        'Account'
      ]
  );

  app.routes.push({
    path: '/settings/profile',
    component: 'Profile',
    tag: 'profile',
    authenticate: true
  });

  app.routes.push({
    templateName: 'profileEdit',
    path: '/settings/profile/edit',
    component: 'Profile',
    tag: 'profile-edit',
    authenticate: true
  });

})();

(function () {
  var RecoverPassword = Module.extend({

    init: function ($, errorHandler, router, account) {
      this.$ = $;
      this.errorHandler = errorHandler;
      this.router = router;
      this.account = account;
    },

    onMount: function (tag) {
      this.tag = tag;
      this.form = this.$('form', tag.root).form({
        inline: false,
        fields: {
          email: ['email', 'empty']
        }
      });
    },

    getInputs: function (form) {
      return {
        email: form.email.value
      }
    },

    onSuccess: function () {
      this.router.go('PasswordResetInstructionsSent');
      this.tag.update();
    },

    onError: function (jqXHR, textStatus, errorThrown) {
      this.errorHandler.handle(jqXHR.status, {
        400: { form: this.form, text: 'Invalid request' },
        404: { form: this.form, text: 'Email address not found' }
      });
      this.tag.update();
    },

    submit: function (e) {
      if(!e.result) return;
      this.account.recoverPassword(this.getInputs(e.target).email).done(this.onSuccess).fail(this.onError);
    }
  });


  app.component(
      'RecoverPassword',
      RecoverPassword,
      [
        '$',
        'ErrorHandler',
        'Router',
        'Account'
      ]
  );

  app.routes.push({
    path: '/recover-password',
    component: 'RecoverPassword',
    tag: 'recover-password'
  });

})();

(function () {
  var Registration = Module.extend({

    init: function ($, errorHandler, router, account) {
      this.$ = $;
      this.errorHandler = errorHandler;
      this.router = router;
      this.account = account;
    },

    onMount: function (tag) {
      this.tag = tag;
      this.form = this.$('form', tag.root).form({
        inline: false,
        fields: {
          email: ['email', 'empty'],
          password: ['minLength[6]', 'empty']
        }
      });
    },

    getInputs: function (form) {
      return {
        email: form.email.value,
        password: form.password.value,
        rememberMe: true
      }
    },

    submit: function (e) {
      if(!e.result) return;
      this.account
          .create(this.getInputs(e.target))
          .done(this.onSuccess)
          .fail(this.onError);
    },

    onSuccess: function () {
      this.router.go('Home', null, true);
    },

    onError: function (jqXHR, textStatus, errorThrown) {
      this.errorHandler.handle(jqXHR.status, {
        400: { form: this.form, text: 'Invalid request' },
        409: { form: this.form, text: 'Email address taken' }
      });
      this.tag.update();
    }
  });

  app.component(
      'Registration',
      Registration,
      [
        '$',
        'ErrorHandler',
        'Router',
        'Account'
      ]
  );

  app.routes.push({
    path: '/register',
    component: 'Registration',
    tag: 'registration'
  });

})()

(function () {
  var ResetPassword = Module.extend({

    init: function ($, errorHandler, router, account) {
      this.$ = $;
      this.errorHandler = errorHandler;
      this.router = router;
      this.account = account;
    },

    onMount: function (tag) {
      this.tag = tag;
      this.form = this.$('form', tag.root).form({
        inline: false,
        fields: {
          password: ['empty'],
          passwordConfirmation: ['empty']
        }
      });
    },

    getInputs: function (form) {
      return {
        password: form.password.value,
        passwordConfirmation: form.passwordConfirmation.value
      }
    },

    onSuccess: function () {
      this.router.go('LoginAfterPasswordReset');
      this.tag.update();
    },

    onError: function (jqXHR, textStatus, errorThrown) {
      this.errorHandler.handle(jqXHR.status, {
        400: { form: this.form, text: 'Invalid request' },
        404: { route: 'ResetPasswordTokenNotFound' }
      });
      this.tag.update();
    },

    submit: function (e) {
      if(!e.result) return;
      var inputs = this.getInputs(e.target);
      if(inputs.password != inputs.passwordConfirmation) {
        return this.form.form('add errors', ['Password must match.']);
      }
      this.account.resetPassword(this.ctx.params.token, inputs.passwordConfirmation).done(this.onSuccess).fail(this.onError);
    }
  });


  app.component(
      'ResetPassword',
      ResetPassword,
      [
        '$',
        'ErrorHandler',
        'Router',
        'Account'
      ]
  );

  app.routes.push({
    path: '/reset-password/:token',
    component: 'ResetPassword',
    tag: 'reset-password'
  });

})();

(function () {
  var SettingsContainer = Module.extend({
    init: function (account, router, $) {
      this.account = account;
      this.router = router;
      this.$ = $;
      this.isProfileTabActive = true;
      this.isBillingTabActive = false;
      this.isOrganizationTabActive = false;
    },

    onMount: function(tag) {
      this.tag = tag;
      this.isProfileTabActive = this.router.isCurrent('Profile');
      this.isBillingTabActive = this.router.isCurrent('Billing');
      this.isOrganizationTabActive = this.router.isCurrent('Organization');
      this.tag.update();
    }
  });

  app.component(
      'SettingsContainer',
      SettingsContainer,
      [
        'Account',
        'Router',
          '$'
      ],
      'settings-container'
  );

})();

(function () {
  app.routes.push({
    path: '/password-reset-instructions-sent',
    templateName: 'PasswordResetInstructionsSent',
    tag: 'password-reset-instructions-sent'
  });
})();

(function () {
  app.routes.push({
    path: '/reset-password-token-not-found',
    templateName: 'ResetPasswordTokenNotFound',
    tag: 'reset-password-token-not-found'
  });
  app.routes.push({
    path: '/logout-error',
    templateName: 'LogoutError',
    tag: 'logout-error'
  });
  app.routes.push({
    path: '*',
    templateName: 'NotFound',
    tag: 'notfound',
    index: 10000
  });
})();

(function () {
  var Container = Module.extend({
    init: function (account, router, $) {
      this.account = account;
      this.router = router;
      this.$ = $;
    },

    onMount: function(tag) {
      this.$('.ui.dropdown', tag.root).dropdown();
    },

    onLogoutSuccess: function () {
      this.router.go('Login', null, true);
    },

    onLogoutFailure: function (jqXHR, textStatus, errorThrown) {
      this.router.go('LogoutError');
    },

    logout: function () {
      this.account.logout().done(this.onLogoutSuccess).fail(this.onLogoutFailure);
    }
  });

  app.component(
      'Container',
      Container,
      [
        'Account',
        'Router',
          '$'
      ]
  );

})();

(function () {
  var Home = Module.extend({
    init: function($) {
      this.$ = $;
      this.onMount = this.onMount.bind(this);
    },

    onMount: function(tag) {
      this.$('.ui.dropdown', tag.root).dropdown();
    }
  });

  app.component(
      'Home',
      Home,
      ['$']
  );

  app.routes.push({
    path: '/',
    component: 'Home',
    tag: 'home',
    authenticate: true
  });
})();
