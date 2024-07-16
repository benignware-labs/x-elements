// lib/Preloader/Preloader.mjs
var XPreloader = class _XPreloader extends HTMLElement {
  #internals;
  #assignedNodes = [];
  #mutationObserver;
  #queue = [];
  #body;
  static LOADER_TAGS = ["img", "video", "audio", "iframe", "link", "script"];
  static isLoaderNode(node) {
    if (node.nodeType !== 1) {
      return false;
    }
    return _XPreloader.LOADER_TAGS.includes(node.tagName.toLowerCase()) || Reflect.has(node, "complete");
  }
  constructor() {
    super();
    this.handleMutation = this.handleMutation.bind(this);
    this.handleComplete = this.handleComplete.bind(this);
    this.handleSlotChange = this.handleSlotChange.bind(this);
    this.handleItemLoad = this.handleItemLoad.bind(this);
    this.handleItemLoadStart = this.handleItemLoadStart.bind(this);
    this.handleItemError = this.handleItemError.bind(this);
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
      <style>
        /* Add your styling here */
        :host {
          display: block;
          position: relative;
        }

        .body {
          opacity: 0;
          transition: opacity 0.3s;
          width: 100%;
        }

        :host(:state(--complete)) .body {
          opacity: 1;
        }
        
      </style>
      <div class="body">
        <!-- Add your preloader content here -->
        <slot></slot>
      </div>
    `;
    this.#internals = this.attachInternals();
    this.#mutationObserver = new MutationObserver(this.handleMutation);
    this.#body = this.shadowRoot.querySelector(".body");
    const slot = this.shadowRoot.querySelector("slot");
    this.#mutationObserver.observe(slot, {
      childList: true,
      subtree: true
    });
    slot.addEventListener("slotchange", this.handleSlotChange);
  }
  handleMutation(mutations) {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => this.nodeAdded(node));
      mutation.removedNodes.forEach((node) => this.nodeRemoved(node));
      const oldValue = mutation.oldValue;
      const newValue = mutation.target.getAttribute(mutation.attributeName);
      if (mutation.oldValue !== null && oldValue !== newValue) {
        this.#queue.push(mutation.target);
        this.update();
        this.handleItemLoadStart({ target: mutation.target });
      }
    });
  }
  nodeAdded(node) {
    if (_XPreloader.isLoaderNode(node)) {
      node.addEventListener("load", this.handleItemLoad);
      node.addEventListener("error", this.handleItemError);
      if (!node.complete) {
        node.style.visibility = "hidden";
        this.#queue.push(node);
        this.update();
      }
    }
  }
  nodeRemoved(node) {
    if (_XPreloader.isLoaderNode(node)) {
      node.removeEventListener("load", this.handleItemLoad);
      node.removeEventListener("error", this.handleItemError);
      this.#mutationObserver.unobserve(node);
    }
  }
  handleSlotChange(e) {
    const removedNodes = this.#assignedNodes.filter((x) => !e.target.assignedNodes().includes(x));
    const addedNodes = e.target.assignedNodes().filter((x) => !this.#assignedNodes.includes(x));
    this.#assignedNodes = addedNodes;
    addedNodes.filter((node) => node.nodeType === 1).forEach((node) => {
      this.#mutationObserver.observe(node, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["src", "srcset", "poster", "href"],
        attributeOldValue: true
      });
      const descendants = node.querySelectorAll("*");
      descendants.forEach((descendant) => this.nodeAdded(descendant));
      this.nodeAdded(node);
    });
    removedNodes.filter((node) => node.nodeType === 1).forEach((node) => {
      this.nodeRemoved(node);
    });
  }
  update() {
    if (this.#queue.length === 0) {
      this.handleComplete();
    } else {
      this.#internals.states.add("--loading");
    }
  }
  handleItemLoadStart(e) {
  }
  handleItemLoad(e) {
    this.#queue = this.#queue.filter((x) => x !== e.target);
    e.target.style.visibility = "";
    this.update();
  }
  handleItemError(e) {
    console.log("Item error", e);
    this.#queue = this.#queue.filter((x) => x !== e.target);
    this.#internals.states.delete("--loading");
    this.#internals.states.add("--error");
    this.update();
  }
  handleComplete() {
    this.#internals.states.delete("--loading");
    this.#internals.states.add("--complete");
    this.#assignedNodes.forEach((node) => {
      if (node.nodeType === 1) {
        node.style.visibility = "";
      }
    });
    const loadEvent = new CustomEvent("load");
    this.dispatchEvent(loadEvent);
  }
  connectedCallback() {
  }
};
if (!customElements.get("x-preloader")) {
  customElements.define("x-preloader", XPreloader);
}
var Preloader_default = XPreloader;

// lib/Select/Select.mjs
var XSelect = class extends HTMLElement {
  static formAssociated = true;
  // this is needed
  #internals;
  constructor() {
    super();
    this.#internals = this.attachInternals();
    this.attachShadow({ mode: "open", delegatesFocus: true });
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }
      </style>
      <slot></slot>
    `;
    this.handleChange = this.handleChange.bind(this);
  }
  handleChange(event) {
    const items = this.querySelectorAll("x-option");
    const isMultiple = this.hasAttribute("multiple");
    if (isMultiple) {
      return;
    }
    if (!event.target.selected) {
      return;
    }
    for (const item of items) {
      if (item !== event.target) {
        if (item.selected) {
          item.setAttribute("selected", "");
        } else {
          item.removeAttribute("selected");
        }
      }
    }
    this.#internals.setFormValue(event.target.value);
    const change = new Event("change", {
      bubbles: false,
      composed: true
    });
    this.dispatchEvent(change);
    if (this.#internals.form) {
      this.#internals.form.dispatchEvent(
        new Event("change", {
          bubbles: false,
          composed: true
        })
      );
    }
  }
  get value() {
    const items = this.querySelectorAll("x-option");
    for (const item of items) {
      if (item.selected) {
        return item.value;
      }
    }
    return "";
  }
  get selectedIndex() {
    const items = [...this.querySelectorAll("x-option")];
    return items.findIndex((item) => item.selected);
  }
  connectedCallback() {
    this.addEventListener(
      "x-option:change",
      this.handleChange,
      false
    );
  }
  static get observedAttributes() {
    return ["name", "value", "multiple"];
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    this[name] = newValue;
  }
};
if (!customElements.get("x-select")) {
  customElements.define("x-select", XSelect);
}

// lib/Select/Option.mjs
var XOption = class extends HTMLElement {
  #internals;
  constructor() {
    super();
    this.#internals = this.attachInternals();
    this.attachShadow({ mode: "open", delegatesFocus: true });
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-block;
          /* border: 2px solid transparent; */
          cursor: pointer;
        }

        :host(:state(--selected)) {
          /* border-color: blue; */
        }
      </style>
      <slot></slot>
    `;
    this.handleClick = this.handleClick.bind(this);
  }
  set value(value) {
    this.setAttribute("value", value);
  }
  get value() {
    return this.getAttribute("value") || "";
  }
  getSelected() {
    return this.#internals.states.has("--selected");
  }
  setSelected(flag) {
    if (flag !== this.getAttribute("selected")) {
      if (flag) {
        this.setAttribute("selected", flag);
      } else {
        this.removeAttribute("selected");
      }
    }
    if (flag === this.selected) {
      return;
    }
    if (flag) {
      this.#internals.states.add("--selected");
    } else {
      this.#internals.states.delete("--selected");
    }
    const event = new Event("x-option:change", {
      bubbles: true,
      composed: true
    });
    window.requestAnimationFrame(() => {
      this.dispatchEvent(event);
    });
  }
  set selected(flag) {
    this.setSelected(flag);
  }
  get selected() {
    return this.getSelected();
  }
  connectedCallback() {
    this.selected = this.hasAttribute("selected");
    this.addEventListener("click", this.handleClick);
  }
  handleClick() {
    const selected = !this.selected;
    const isMultiple = !!this.closest("x-select[multiple]");
    if (!selected && this.selected && !isMultiple) {
      return;
    }
    this.setSelected(selected);
  }
  static get observedAttributes() {
    return ["selected", "value"];
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    this[name] = newValue;
  }
};
if (!customElements.get("x-option")) {
  customElements.define("x-option", XOption);
}

// lib/Panel/Panel.mjs
var Panel = class extends HTMLElement {
  #internals;
  constructor() {
    super();
    this.handleTransitionEnd = this.handleTransitionEnd.bind(this);
    this.#internals = this.attachInternals();
    this.shadow = this.attachShadow({ mode: "open" });
    this.layer = document.createElement("div");
    this.layer.classList.add("layer");
    this.shadow.appendChild(this.layer);
    this.panel = document.createElement("div");
    this.panel.classList.add("panel");
    this.layer.appendChild(this.panel);
    const host = this.shadowRoot.host;
    this.#internals.states.add("--shown");
    host.addEventListener("transitionend", this.handleTransitionEnd);
  }
  handleTransitionEnd(event) {
    if (event.target !== this.shadowRoot.host) return;
    const target = event.target;
    const style = window.getComputedStyle(target);
    let fullyVisible = false;
    let fullyHidden = false;
    if (event.propertyName === "transform") {
      const matrix = new DOMMatrixReadOnly(style.transform);
      const x = matrix.e;
      const y = matrix.f;
      const sx = matrix.a;
      const sy = matrix.d;
      const { width, height } = target.getBoundingClientRect();
      const fullyVisibleX = x === 0;
      const fullyVisibleY = y === 0;
      const fullyVisibleWidth = sx === 1;
      const fullyVisibleHeight = sy === 1;
      fullyVisible = fullyVisibleX && fullyVisibleY && fullyVisibleWidth && fullyVisibleHeight;
      fullyHidden = !fullyVisible;
    }
    if (event.propertyName === "opacity") {
      fullyVisible = style.opacity === "1";
      fullyHidden = style.opacity === "0";
    }
    if (fullyVisible) {
      this.#internals.states.add("--shown");
      this.#internals.states.delete("--showing");
    }
    if (fullyHidden) {
      this.#internals.states.add("--hidden");
      this.#internals.states.delete("--hiding");
    }
    if (fullyVisible || fullyHidden) {
      this.endAnimation();
    }
    if (fullyVisible) {
      this.dispatchEvent(new CustomEvent("x-panel:shown"));
    }
    if (fullyHidden) {
      this.dispatchEvent(new CustomEvent("x-panel:hidden"));
    }
  }
  startAnimation() {
    this._animating = true;
    this.animate();
  }
  endAnimation() {
    this._animating = false;
  }
  animate() {
    if (!this._animating) return;
    const event = new CustomEvent("x-panel:animate");
    this.dispatchEvent(event);
    window.requestAnimationFrame(() => this.animate());
  }
  connectedCallback() {
    this.render();
    window.requestAnimationFrame(() => {
      this.#internals.states.add("--initialized");
    });
  }
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host(x-panel[hidden]) {
          display: block !important;
        }

        :host {
          position: absolute;
        }

        :host(:state(--initialized)) {
          transition: all 0.33s ease-in-out;
        }

        :host([orientation*="top"]:not([orientation*="center"])) {
          top: 0;
        }

        :host([orientation*="left"]:not([orientation*="center"])) {
          left: 0;
        }

        :host([orientation*="top"][orientation*="center"]),
        :host([orientation*="bottom"][orientation*="center"]) {
          left: 50%;
          transform: translateX(-50%);
        }

        :host([orientation*="left"][orientation*="center"]),
        :host([orientation*="right"][orientation*="center"]) {
          top: 50%;
          transform: translateY(-50%);
        }

        :host([orientation*="right"]) {
          right: 0;
        }

        :host([orientation*="bottom"]) {
          bottom: 0;
        }

        :host([orientation="center"]) {
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%) scale(1, 1);
        }

        /* HIDDEN */

        :host([hidden]:where([animation='slide'],:not([animation]))[orientation*="left"]:not([orientation*="center"]):not([orientation*="right"])) {
          transform: translateX(-100%);
        }

        :host([hidden]:where([animation='slide'],:not([animation]))[orientation*="right"]:not([orientation*="center"]):not([orientation*="left"])) {
          transform: translateX(100%);
        }

        :host([hidden]:where([animation='slide'],:not([animation]))[orientation*="top"][orientation*="center"]) {
          transform: translateX(-50%) translateY(-100%);
        }

        :host([hidden]:where([animation='slide'],:not([animation]))[orientation*="top"][orientation*="left"][orientation*="right"]:not([orientation*="bottom"])) {
          transform: translateY(-100%);
        }

        :host([hidden]:where([animation='slide'],:not([animation]))[orientation*="bottom"][orientation*="center"]) {
          transform: translateX(-50%) translateY(100%);
        }

        :host([hidden]:where([animation='slide'],:not([animation]))[orientation*="bottom"][orientation*="left"][orientation*="right"]:not([orientation*="top"])) {
          transform: translateY(100%);
        }

        :host([hidden]:where([animation='slide'],:not([animation]))[orientation*="left"][orientation*="center"]) {
          transform: translateY(-50%) translateX(-100%);
        }

        :host([hidden]:where([animation='slide'],:not([animation]))[orientation*="left"][orientation*="top"][orientation*="bottom"]:not([orientation*="right"])) {
          transform: translateX(-100%);
        }

        :host([hidden]:where([animation='slide'],:not([animation]))[orientation*="right"][orientation*="center"]) {
          transform: translateY(-50%) translateX(100%);
        }

        :host([hidden]:where([animation='slide'],:not([animation]))[orientation*="right"][orientation*="top"][orientation*="bottom"]:not([orientation*="left"])) {
          transform: translateX(100%);
        }

        :host([hidden][orientation="center"]:where([animation='slide'],:not([animation]))) {
          transform: translate(-50%, -50%) scale(0, 0);
        }

        :host([hidden][orientation*="left"][orientation*="right"][orientation*="top"][orientation*="bottom"]:where([animation='slide'],:not([animation]))) {
          transform: scale(0, 0);
        }

        :host([hidden][animation*='fade']) {
          opacity: 0;
          visibility: hidden;
          transition: visibility 0s 0.33s, opacity 0.33s linear;
        }

      </style>
      <slot></slot>
    `;
  }
  set hidden(val) {
    if (val) {
      this.setAttribute("hidden", "");
    } else {
      this.removeAttribute("hidden");
    }
  }
  get hidden() {
    return this.hasAttribute("hidden");
  }
  set orientation(val) {
    if (val !== this.getAttribute("orientation")) {
      if (val) {
        this.setAttribute("orientation", val);
      } else {
        this.removeAttribute("orientation");
      }
    }
  }
  get orientation() {
    return this.getAttribute("orientation") || "top left";
  }
  get state() {
    const states = [...this.#internals.states.values()].filter((state) => state !== "--initialized").map((state) => state.replace("--", ""));
    return states.pop();
  }
  static get observedAttributes() {
    return ["hidden", "orientation"];
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    if (name === "hidden") {
      const hidden = this.hasAttribute("hidden");
      const isInitialized = this.#internals.states.has("--initialized");
      if (hidden) {
        this.dispatchEvent(new CustomEvent("x-panel:hide"));
      } else {
        this.dispatchEvent(new CustomEvent("x-panel:show"));
      }
      if (hidden) {
        if (isInitialized) {
          this.#internals.states.delete("--shown");
          this.#internals.states.delete("--showing");
          this.#internals.states.add("--hiding");
        } else {
          this.#internals.states.add("--hidden");
        }
      } else {
        if (isInitialized) {
          this.#internals.states.delete("--hidden");
          this.#internals.states.delete("--hiding");
          this.#internals.states.add("--showing");
        } else {
          this.#internals.states.add("--shown");
        }
      }
      if (this.#internals.states.has("--initialized")) {
        this.startAnimation();
      }
      return;
    }
    this[name] = newValue;
  }
};
if (!customElements.get("x-panel")) {
  customElements.define("x-panel", Panel);
}
var Panel_default = Panel;

// lib/Panel/PanelManager.mjs
var PanelManager = class {
  #options;
  #panels;
  #next = null;
  #current = null;
  constructor(options = {}) {
    this._handleState = this._handleState.bind(this);
    this.#options = {
      groupBy: (panel) => panel.getAttribute("group") || panel.dataset.group,
      ...options
    };
    this.#panels = /* @__PURE__ */ new Set();
  }
  get options() {
    return this.#options;
  }
  get panels() {
    return this.#panels;
  }
  add(...panel) {
    for (const p of panel) {
      if (!this.#current) {
        this.#current = p;
      }
      p.addEventListener("x-panel:shown", this._handleState);
      p.addEventListener("x-panel:hidden", this._handleState);
      this.#panels.add(p);
    }
  }
  remove(...panel) {
    for (const p of panel) {
      p.removeEventListener("x-panel:shown", this._handleState);
      p.removeEventListener("x-panel:hidden", this._handleState);
      this.#panels.delete(panel);
    }
  }
  clear() {
    this.#panels.forEach((panel) => this.remove(panel));
  }
  set(group) {
    this.#next = group;
    this._handleState();
  }
  get() {
    return this.#next !== null ? this.#next : this.#current;
  }
  _handleState() {
    if (this.#next === null) {
      return;
    }
    const panels = Array.from(this.#panels);
    const groupBy = typeof this.#options.groupBy === "string" ? (panel) => panel.getAttribute(this.#options.groupBy) : this.#options.groupBy;
    const others = panels.filter((panel) => groupBy(panel) !== this.#next);
    others.forEach((panel) => panel.hidden = true);
    const othersHidden = others.every((panel) => panel.state === "hidden");
    if (othersHidden && this.#current !== this.#next) {
      panels.filter((panel) => groupBy(panel) === this.#next).forEach((panel) => panel.hidden = false);
      this.#current = this.#next;
      this.#next = null;
    }
  }
};

// lib/Ambience/Ambience.mjs
var MEDIA_TAGS = ["IMG", "VIDEO"];
function copyStyles(dest, src, props = []) {
  const srcStyle = window.getComputedStyle(src);
  const destStyle = window.getComputedStyle(dest);
  for (let i = 0; i < srcStyle.length; i++) {
    const property = srcStyle.item(i);
    if (!props.length || props.includes(property)) {
      const fresh = srcStyle.getPropertyValue(property);
      const current = destStyle.getPropertyValue(property);
      if (fresh !== current) {
        dest.style.setProperty(property, fresh);
      }
    }
  }
}
var getScrollParent = (element, stop = null, values = ["scroll", "auto"]) => {
  let parent = element;
  while (parent) {
    if (parent === document.body) {
      return parent;
    }
    if (parent === stop) {
      return null;
    }
    const style = window.getComputedStyle(parent);
    if (values.includes(style.overflow) || values.includes(style.overflowX) || values.includes(style.overflowY)) {
      return parent;
    } else {
      parent = parent.parentElement;
    }
  }
  return document.body;
};
var getScrollParents = (element, stop = null, values = ["scroll", "auto"]) => {
  stop = Array.isArray(stop) ? stop : [stop];
  let parent = element.parentNode;
  const parents = [];
  while (parent) {
    const style = window.getComputedStyle(parent);
    if (values.includes(style.overflow) || values.includes(style.overflowX) || values.includes(style.overflowY)) {
      parents.push(parent);
    }
    if (parent === document.body || stop.includes(parent)) {
      return parents;
    }
    parent = parent.parentElement;
  }
  return parents;
};
var getScrollSize = (element) => {
  let container = element;
  if (element === document.body) {
    container = document.documentElement;
  }
  const size = {
    width: container.scrollWidth,
    height: container.scrollHeight
  };
  return size;
};
var getPositioonFixedParent = (element) => {
  let parent = element;
  while (parent) {
    const style = window.getComputedStyle(parent);
    if (style.position === "fixed") {
      return parent;
    } else {
      parent = parent.parentElement;
    }
  }
  return null;
};
var Ambience = class extends HTMLElement {
  #internals;
  #slot;
  #assignedChildren = /* @__PURE__ */ new Set();
  #mutationObservers = /* @__PURE__ */ new WeakMap();
  #mediaElements = /* @__PURE__ */ new Set();
  #clippingTargets = /* @__PURE__ */ new Set();
  #clippingParents = /* @__PURE__ */ new WeakMap();
  #clippingDisplayElements = /* @__PURE__ */ new WeakMap();
  #displayElements = /* @__PURE__ */ new WeakMap();
  #displayMediaElements = /* @__PURE__ */ new WeakMap();
  #displayIds = /* @__PURE__ */ new WeakMap();
  #displayIdInc = 0;
  #animatedElements = /* @__PURE__ */ new Set();
  #elementAnimations = /* @__PURE__ */ new WeakMap();
  #scrollParent = null;
  #backdrop;
  #backdropBody;
  // Props
  #animated = false;
  #for = null;
  static observedAttributes = ["for", "animated"];
  constructor() {
    super();
    this.handleMutation = this.handleMutation.bind(this);
    this.handleSlotChange = this.handleSlotChange.bind(this);
    this.handleResize = this.handleResize.bind(this);
    this.handleLoad = this.handleLoad.bind(this);
    this.handleScroll = this.handleScroll.bind(this);
    this.handlePlay = this.handlePlay.bind(this);
    this.handlePause = this.handlePause.bind(this);
    this.handleStateChange = this.handleStateChange.bind(this);
    this.#internals = this.attachInternals();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
      <style>
        /* Add your styling here */
        :host {
          display: contents;
          --x-ambience-filter--default: contrast(1.3) blur(5.5rem) brightness(1.4) opacity(0.7);
          /*--x-ambience-filter--default: contrast(4) blur(3.5rem) brightness(2.7);*/
          /*--x-ambience-filter--default: drop-shadow(0 0 0.75rem crimson);*/
          /*--x-ambience-filter--default: none;*/
          --x-ambience-filter--default: blur(3.5rem);
          --x-ambience-scale--default: 1;
        }

        :host::part(backdrop) {
          position: absolute;
          transform-style: preserve-3d;
          pointer-events: none;
        }

        :host::part(backdrop-body) {
          position: absolute;
        }

        :host-context(.x-ambience-scroll-measure)::part(backdrop) {
          display: none !important;
          transform: none !important;
        }

         /*:host::part(backdrop):after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 1000;
        }*/

        :host(*) {
          transform-style: preserve-3d;
          backface-visibility: hidden;
        }

        :host::part(clip) {
          position: absolute;
          overflow: hidden;
          /* clip-path: polygon(0 0, 100% 0, 100% 100%, 0% 100%);*/
        }

        .effect {
          filter: var(--x-ambience-filter, var(--x-ambience-filter--default));
          /*scale: var(--x-ambience-scale, var(--x-ambience-scale--default));
          scale: 1;*/
        }

        :host::part(display) {
          position: absolute;
          opacity: 0;
          transition: opacity 0.125s;
          will-change: opacity;
        }

        :host::part(display ready) {
          opacity: 1;
        }
      </style>
      <div part="backdrop">
        <div part="backdrop-body"></div>
      </div>
      <slot></slot>
    `;
    this.#backdrop = this.shadowRoot.querySelector('[part="backdrop"]');
    this.#backdropBody = this.shadowRoot.querySelector('[part="backdrop-body"]');
    this.#slot = this.shadowRoot.querySelector("slot");
  }
  isMediaElement(element) {
    const isMediaTag = MEDIA_TAGS.includes(element.nodeName);
    if (!isMediaTag) {
      return false;
    }
    const parentAmbience = element.closest("x-ambience");
    if (parentAmbience && parentAmbience !== this) {
      return false;
    }
    const forAmbiences = document.querySelectorAll(`x-ambience[for]`);
    for (const ambience of forAmbiences) {
      if (ambience.getAttribute("for") === element.id && ambience !== this) {
        return false;
      }
    }
    return true;
  }
  handleMutation(mutations) {
    mutations.forEach((mutation) => {
      const addedMediaElements = [...mutation.addedNodes].filter((node) => node.nodeType === 1 && MEDIA_TAGS.includes(node.nodeName));
      this.mediaElementAdded(...addedMediaElements);
      const removedMediaElements = [...mutation.removedNodes].filter((node) => node.nodeType === 1 && MEDIA_TAGS.includes(node.nodeName));
      this.mediaElementRemoved(...removedMediaElements);
      if (addedMediaElements.length || removedMediaElements.length) {
        this.render();
      }
    });
  }
  getDisplayId(element) {
    if (this.#displayIds.has(element)) {
      return this.#displayIds.get(element);
    }
    const nextId = this.#displayIdInc++;
    this.#displayIds.set(element, nextId);
    return nextId;
  }
  createDisplayElement(element) {
    const displayElement = document.createElement("div");
    const slot = displayElement;
    let mediaDisplayElement;
    if (element instanceof HTMLMediaElement) {
      const canvas = document.createElement("canvas");
      const poster = document.createElement("img");
      poster.src = element.poster;
      poster.style.width = "100%";
      poster.style.height = "100%";
      poster.style.position = "absolute";
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      canvas.style.position = "absolute";
      slot.appendChild(canvas);
      slot.appendChild(poster);
      mediaDisplayElement = canvas;
    } else {
      mediaDisplayElement = element.cloneNode(true);
      slot.appendChild(mediaDisplayElement);
    }
    this.#displayMediaElements.set(element, mediaDisplayElement);
    this.updateMediaElementStyles(element);
    displayElement.classList.add("display");
    displayElement.setAttribute("part", "display");
    return displayElement;
  }
  clippingTargetAdded(element) {
    element.addEventListener("scroll", this.handleScroll, { passive: true });
  }
  clippingTargetRemoved(element) {
    element.removeEventListener("scroll", this.handleScroll, { passive: true });
    this.#clippingDisplayElements.delete(element);
  }
  createClippingDisplayElement(element) {
    const clippingDisplayElement = document.createElement("div");
    clippingDisplayElement.setAttribute("part", "clip");
    clippingDisplayElement.setAttribute("data-class", element.getAttribute("class"));
    clippingDisplayElement.setAttribute("data-tag", element.tagName);
    return clippingDisplayElement;
  }
  mediaElementAdded(...element) {
    const targetElements = [...this.#assignedChildren];
    element.forEach((element2) => {
      this.#mediaElements.add(element2);
      const scrollParents = getScrollParents(element2, targetElements, ["scroll", "auto", "hidden", "clip"]);
      scrollParents.reverse().forEach((scrollParent2, index, array) => {
        const parent = index > 0 ? array[index - 1] : null;
        if (!this.#clippingTargets.has(scrollParent2)) {
          this.#clippingTargets.add(scrollParent2);
          if (!this.#clippingDisplayElements.get(scrollParent2)) {
            const clippingDisplayElement = this.createClippingDisplayElement(scrollParent2);
            clippingDisplayElement.classList.toggle("effect", !parent);
            const displayParent2 = this.#clippingDisplayElements.get(parent) || this.#backdropBody;
            displayParent2.appendChild(clippingDisplayElement);
            this.#clippingDisplayElements.set(scrollParent2, clippingDisplayElement);
            this.#clippingParents.set(scrollParent2, parent);
          }
          this.clippingTargetAdded(scrollParent2);
        }
      });
      const scrollParent = scrollParents.length ? scrollParents[scrollParents.length - 1] : null;
      const displayParent = this.#clippingDisplayElements.get(scrollParent) || this.#backdropBody;
      const displayElement = this.createDisplayElement(element2);
      displayElement.classList.toggle("effect", !scrollParent);
      this.#displayElements.set(element2, displayElement);
      this.#clippingParents.set(element2, scrollParent);
      displayParent.appendChild(displayElement);
      element2.addEventListener("loadeddata", this.handleLoad, { passive: true });
      element2.addEventListener("load", this.handleLoad, { passive: true });
      element2.addEventListener("play", this.handlePlay, { passive: true });
      element2.addEventListener("pause", this.handlePause, { passive: true });
      if (element2 instanceof HTMLMediaElement) {
        const posterImage = displayElement.querySelector("img");
        if (posterImage) {
          posterImage.src = element2.poster;
          posterImage.addEventListener("load", this.handleLoad, { passive: true });
        }
      }
    });
    this.mediaElementsChanged();
  }
  mediaElementRemoved(...element) {
    element.forEach((element2) => {
      element2.removeEventListener("loadeddata", this.handleLoad);
      element2.removeEventListener("load", this.handleLoad);
      element2.removeEventListener("play", this.handlePlay);
      element2.removeEventListener("pause", this.handlePause);
      const displayElement = this.#displayElements.get(element2);
      if (element2 instanceof HTMLMediaElement) {
        const posterImage = displayElement.querySelector("img");
        if (posterImage) {
          posterImage.removeEventListener("load", this.handleLoad, { passive: true });
        }
      }
      displayElement.parentNode.removeChild(displayElement);
      this.#displayElements.delete(element2);
      this.#clippingParents.delete(element2);
      this.#mediaElements.delete(element2);
    });
    this.mediaElementsChanged();
  }
  addTargetElement(...elements) {
    const addedMediaElements = [];
    elements.filter((element) => !this.#assignedChildren.has(element)).forEach((element) => {
      this.#assignedChildren.add(element);
      const mutationObserver = new MutationObserver(this.handleMutation);
      mutationObserver.observe(element, {
        childList: true,
        subtree: true
      });
      this.#mutationObservers.set(element, mutationObserver);
      element.addEventListener("animationstart", this.handlePlay, { passive: true });
      element.addEventListener("transitionstart", this.handlePlay, { passive: true });
      element.addEventListener("animationend", this.handlePause, { passive: true });
      element.addEventListener("transitionend", this.handlePause, { passive: true });
      element.addEventListener("click", this.handleStateChange, { passive: true });
      element.addEventListener("pointerover", this.handleStateChange, { passive: true });
      element.addEventListener("pointerenter", this.handleStateChange, { passive: true });
      element.addEventListener("pointerleave", this.handleStateChange, { passive: true });
      const nodes = [...element.querySelectorAll(MEDIA_TAGS.join(", "))];
      if (MEDIA_TAGS.includes(element.nodeName)) {
        nodes.push(element);
      }
      addedMediaElements.push(...nodes);
    });
    this.mediaElementAdded(...addedMediaElements);
  }
  removeTargetElement(...elements) {
    const removedMediaElements = [];
    elements.filter((element) => this.#assignedChildren.has(element)).forEach((element) => {
      const mutationObserver = this.#mutationObservers.get(element);
      mutationObserver.disconnect();
      this.#mutationObservers.delete(element);
      element.removeEventListener("animationstart", this.handlePlay);
      element.removeEventListener("transitionstart", this.handlePlay);
      element.removeEventListener("animationend", this.handlePause);
      element.removeEventListener("transitionend", this.handlePause);
      element.removeEventListener("click", this.handleStateChange);
      element.removeEventListener("pointerover", this.handleStateChange);
      element.removeEventListener("pointerenter", this.handleStateChange);
      element.removeEventListener("pointerleave", this.handleStateChange);
      this.#assignedChildren.delete(element);
      if (MEDIA_TAGS.includes(element.nodeName)) {
        removedMediaElements.push(element);
      }
    });
    this.mediaElementRemoved(...removedMediaElements);
  }
  removeAllTargetElements() {
    this.removeTargetElement(...this.#assignedChildren);
  }
  handleSlotChange(e) {
    if (this.hasAttribute("for")) {
      return;
    }
    const slot = e.target;
    const assignedElements = [...this.#assignedChildren];
    const removedNodes = assignedElements.filter((x) => !slot.assignedElements().includes(x));
    const addedNodes = slot.assignedElements().filter((x) => !assignedElements.includes(x));
    this.addTargetElement(...addedNodes);
    this.removeTargetElement(...removedNodes);
    this.targetElementsChanged();
  }
  handleScroll(event) {
    this.render();
  }
  handleResize() {
    this.render();
  }
  handleLoad(event) {
    window.requestAnimationFrame(() => {
      this.render();
    });
  }
  handleStateChange(event) {
    if (this.#mediaElements.has(event.target)) {
      this.updateMediaElementStyles(event.target);
    }
    this.render();
  }
  startAnimation(element, id) {
    let elementAnimations;
    if (this.#elementAnimations.has(element)) {
      elementAnimations = this.#elementAnimations.get(element);
      elementAnimations.add(id);
    } else {
      elementAnimations = /* @__PURE__ */ new Set();
      elementAnimations.add(id);
      this.#elementAnimations.set(element, elementAnimations);
    }
    this.#animatedElements.add(element);
    this.animate();
  }
  endAnimation(element, id) {
    if (!this.#elementAnimations.has(element)) {
      return;
    }
    const elementAnimations = this.#elementAnimations.get(element);
    elementAnimations.delete(id);
    if (elementAnimations.size === 0) {
      this.#elementAnimations.delete(element);
      this.#animatedElements.delete(element);
    }
  }
  getAnimationId(event) {
    if (event.type === "play" || event.type === "pause") {
      return `playback`;
    }
    if (event.type === "animationstart" || event.type === "animationend") {
      return `animation-${event.animationName}`;
    }
    if (event.type === "transitionstart" || event.type === "transitionend") {
      return `transition-${event.propertyName}`;
    }
    return null;
  }
  handlePlay(event) {
    this.startAnimation(event.target, this.getAnimationId(event));
  }
  handlePause(event) {
    this.endAnimation(event.target, this.getAnimationId(event));
  }
  isAnimating() {
    return this.#animated || this.#elementAnimations.size > 0;
  }
  set animated(value) {
    this.#animated = value;
    this.animate();
  }
  get animated() {
    return this.#animated || this.#animatedElements.size > 0;
  }
  animate() {
    if (this.animated) {
      this.render();
    }
    window.requestAnimationFrame(() => {
      if (this.animated) {
        this.animate();
      }
      ;
    });
  }
  connectedCallback() {
    window.addEventListener("resize", this.handleResize, { passive: true });
    this.#slot.addEventListener("slotchange", this.handleSlotChange);
    this.#scrollParent = getScrollParent(this);
    const scrollTarget = this.#scrollParent === document.body ? window : this.#scrollParent;
    scrollTarget.addEventListener("scroll", this.handleScroll, { passive: true });
    this.render();
  }
  detachedCallback() {
    window.removeEventListener("resize", this.handleResize);
    this.#slot.removeEventListener("slotchange", this.handleSlotChange);
    const scrollTarget = this.#scrollParent === document.body ? window : this.#scrollParent;
    scrollTarget.removeEventListener("scroll", this.handleScroll);
    this.#scrollParent = null;
  }
  mediaElementsChanged() {
    this.render();
  }
  targetElementsChanged() {
    this.render();
  }
  getZIndex() {
    const computedStyle = window.getComputedStyle(this.#backdropBody);
    let zIndex = computedStyle.getPropertyValue("--x-ambience-z-index");
    if (!zIndex || zIndex === "auto") {
      zIndex = !!getPositioonFixedParent(this) ? "" : -1;
    }
    return zIndex;
  }
  updateClippingDisplayElement(element) {
    const clippingDisplayElement = this.#clippingDisplayElements.get(element);
    if (!clippingDisplayElement) {
      return;
    }
    const clippingParent = this.#clippingParents.get(element);
    const parent = clippingParent || this.#backdropBody;
    const clippingArea = element.getBoundingClientRect();
    const targetBounds = parent.getBoundingClientRect();
    const style = clippingDisplayElement.style;
    const left = clippingArea.left - targetBounds.left;
    const top = clippingArea.top - targetBounds.top;
    const scale = "";
    style.setProperty("transform", `${scale}  translate3d(${left}px, ${top}px, 0) `);
    style.setProperty("width", `${clippingArea.width}px`);
    style.setProperty("height", `${clippingArea.height}px`);
  }
  updateClippingDisplayElements() {
    for (const element of this.#clippingTargets) {
      this.updateClippingDisplayElement(element);
    }
  }
  isElementReady(element) {
    if (element instanceof HTMLMediaElement) {
      if (element.poster && element.played.length === 0) {
        const displayElement = this.#displayElements.get(element);
        const poster = displayElement.querySelector("img");
        return poster.complete;
      }
      return element.readyState >= 3;
    }
    if (element instanceof HTMLImageElement) {
      return element.complete;
    }
    return true;
  }
  updateMediaElementStyles(element) {
    const mediaDisplayElement = this.#displayMediaElements.get(element);
    if (!mediaDisplayElement) {
      return;
    }
    copyStyles(mediaDisplayElement, element, [
      "object-fit",
      "object-position",
      "filter",
      "transform",
      "transform-origin",
      "transform-style",
      "opacity",
      "position",
      // 'top',
      // 'left',
      // 'right',
      // 'bottom',
      "clip-path"
    ]);
  }
  updateMediaElement(element) {
    const displayElement = this.#displayElements.get(element);
    if (!displayElement) {
      return;
    }
    const clippingParent = this.#clippingParents.get(element);
    const targetParent = clippingParent || this.#backdropBody;
    const targetBounds = targetParent.getBoundingClientRect();
    const elementBounds = element.getBoundingClientRect();
    const top = elementBounds.top - targetBounds.top;
    const left = elementBounds.left - targetBounds.left;
    const scale = "  scale(var(--x-ambience-scale, var(--x-ambience-scale--default)))";
    const isRenderedBefore = displayElement.style.transform !== "";
    if (!isRenderedBefore || elementBounds.width > 0 && elementBounds.height > 0) {
      displayElement.style.setProperty("transform", `translate3d(${left}px, ${top}px, 0) ${scale} `);
      displayElement.style.setProperty("width", `${elementBounds.width}px`);
      displayElement.style.setProperty("height", `${elementBounds.height}px`);
      displayElement.style.setProperty("opacity", 1);
      displayElement.style.setProperty("display", "");
    } else if (isRenderedBefore) {
      displayElement.style.setProperty("opacity", 0);
      displayElement.style.setProperty("display", "");
    } else {
      displayElement.style.setProperty("display", "none");
    }
    displayElement.style.setProperty("width", `${elementBounds.width}px`);
    displayElement.style.setProperty("height", `${elementBounds.height}px`);
    displayElement.setAttribute("part", this.isElementReady(element) ? "display ready" : "display");
    const mediaDisplayElement = this.#displayMediaElements.get(element);
    mediaDisplayElement.style.setProperty("visibility", window.getComputedStyle(element).visibility);
    mediaDisplayElement.style.setProperty("position", "absolute");
    mediaDisplayElement.style.setProperty("top", "0");
    mediaDisplayElement.style.setProperty("bottom", "0");
    mediaDisplayElement.style.setProperty("transition-duration", "0s");
    mediaDisplayElement.style.setProperty("width", `${elementBounds.width}px`);
    mediaDisplayElement.style.setProperty("height", `${elementBounds.height}px`);
    if (element instanceof HTMLMediaElement) {
      const canvas = displayElement.querySelector("canvas");
      const poster = displayElement.querySelector("img");
      const isPoster = element.poster && element.played.length === 0;
      poster.style.setProperty("width", `${elementBounds.width}px`);
      poster.style.setProperty("height", `${elementBounds.height}px`);
      poster.style.setProperty("object-fit", "cover");
      poster.style.setProperty("display", isPoster ? "block" : "none");
      if (!isPoster) {
        canvas.width = elementBounds.width;
        canvas.height = elementBounds.height;
        const context = canvas.getContext("2d");
        context.drawImage(element, 0, 0, canvas.width, canvas.height);
      }
    }
  }
  updateMediaElements() {
    for (const element of this.#mediaElements) {
      this.updateMediaElement(element);
    }
  }
  clipToParent() {
    const scrollParent = this.#scrollParent;
    const backdrop = this.#backdrop;
    const backdropBody = this.#backdropBody;
    backdrop.style.transform = ``;
    backdrop.style.width = ``;
    backdrop.style.height = ``;
    const targetBounds = backdrop.getBoundingClientRect();
    scrollParent.classList.add("x-ambience-scroll-measure");
    const scrollBounds = scrollParent.getBoundingClientRect();
    const relScrollBounds = {
      top: scrollBounds.top - targetBounds.top,
      left: scrollBounds.left - targetBounds.left,
      right: scrollBounds.right - targetBounds.left,
      bottom: scrollBounds.bottom - targetBounds.top
    };
    let { left, top } = relScrollBounds;
    let { width, height } = getScrollSize(scrollParent);
    backdrop.style.transform = `translate3d(${left}px, ${top}px, 0)`;
    backdrop.style.width = `${width}px`;
    backdrop.style.height = `${height}px`;
    backdrop.style.overflow = "hidden";
    backdrop.style.transform = `translate3d(${left}px, ${top}px, 0)`;
    backdropBody.style.transform = `translate3d(${-left}px, ${-top}px, 0)`;
    scrollParent.classList.remove("x-ambience-scroll-measure");
  }
  render() {
    if (!this.isConnected || !this.parentNode) {
      return;
    }
    if (!this.#scrollParent) {
      return;
    }
    if (this.#mediaElements.size === 0) {
      return;
    }
    const zIndex = this.getZIndex();
    this.#backdrop.style.setProperty("z-index", zIndex);
    this.updateClippingDisplayElements();
    this.updateMediaElements();
  }
  set for(value) {
    if (value !== this.for) {
      if (value) {
        this.setAttribute("for", value);
      } else {
        this.removeAttribute("for");
      }
      this.removeAllTargetElements();
      this.#for = value;
      if (this.#for) {
        const targetElement = document.querySelector(`#${this.#for}`);
        if (targetElement) {
          this.addTargetElement(targetElement);
        }
      }
    }
  }
  get for() {
    return this.#for;
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    if (Reflect.has(this, name)) {
      const isBool = typeof this[name] === "boolean";
      const value = isBool ? this.hasAttribute(name) : newValue;
      if (value !== this[name]) {
        this[name] = value;
      }
    }
  }
};
if (!customElements.get("x-ambience")) {
  customElements.define("x-ambience", Ambience);
}
var Ambience_default = Ambience;

// lib/MediaControls/MediaControlsList.mjs
var isEqualSets = (set1, set2) => {
  if (set1.size !== set2.size) {
    return false;
  }
  for (const item of set1) {
    if (!set2.has(item)) {
      return false;
    }
  }
  return true;
};
var cloneSet = (set) => /* @__PURE__ */ new Set([...set]);
var MediaControlsList = class extends Set {
  #callback;
  constructor(callback = () => {
  }) {
    super();
    this.#callback = callback;
  }
  add(value) {
    const before = cloneSet(this);
    value?.split(/\s+/).forEach((value2) => super.add(value2));
    if (!isEqualSets(before, this)) {
      this.#callback();
    }
  }
  delete(value) {
    const before = cloneSet(this);
    value?.split(/\s+/).forEach((value2) => super.delete(value2));
    if (!isEqualSets(before, this)) {
      this.#callback();
    }
  }
  clear() {
    const before = cloneSet(this);
    super.clear();
    if (!isEqualSets(before, this)) {
      this.#callback();
    }
  }
  toString() {
    return Array.from(this).join(" ");
  }
};

// lib/MediaControls/MediaControls.mjs
var formatCurrentTime = (time, duration) => {
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};
var MediaControls = class _MediaControls extends HTMLElement {
  #internals;
  #slot;
  #mediaElement;
  #clickTimeout;
  #autohideTimeout;
  #body;
  #controlsPanel;
  #timeline;
  #volumeSlider;
  #currentTimeDisplay;
  #durationDisplay;
  #overlayPlayButton;
  #volume;
  #controlslist = null;
  #for;
  static CONTROLS_TIMEOUT = 3e3;
  constructor() {
    super();
    this.handleSlotChange = this.handleSlotChange.bind(this);
    this.handlePlay = this.handlePlay.bind(this);
    this.handlePause = this.handlePause.bind(this);
    this.handleVolumeChange = this.handleVolumeChange.bind(this);
    this.handleClick = this.handleClick.bind(this);
    this.handleFullscreenChange = this.handleFullscreenChange.bind(this);
    this.handleTimelineChange = this.handleTimelineChange.bind(this);
    this.handleVolumeSliderChange = this.handleVolumeSliderChange.bind(this);
    this.handleTimeUpdate = this.handleTimeUpdate.bind(this);
    this.handleDblClick = this.handleDblClick.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerLeave = this.handlePointerLeave.bind(this);
    this.handleLoadedData = this.handleLoadedData.bind(this);
    this.handleCanPlay = this.handleCanPlay.bind(this);
    this.handleResize = this.handleResize.bind(this);
    this.handleControlsListChange = this.handleControlsListChange.bind(this);
    this.update = this.update.bind(this);
    this.attachShadow({ mode: "open" });
    this.#internals = this.attachInternals();
    this.#controlslist = new MediaControlsList(this.handleControlsListChange);
    const html = `
      <style>
        :host {
          display: inline-flex;
          position: relative;
          /*overflow: hidden;*/
          font-family: var(--x-font-family, sans-serif);
          font-size: var(--x-font-size, 0.9rem);
        }

        *::slotted(video) {
          /*border: 1px solid blue;
          outline: 2px solid yellow;*/
        }

        :host([for]) {
          display: block;
          overflow: visible;
        }

        :host::part(body) {
          /*outline: 2px solid yellow;*/
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          overflow: hidden;
          pointer-events: none;
        }

        /* controls panel */
        :host::part(controls-panel) {
          pointer-events: auto;
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          background: var(--x-controls-bg, color-mix(in srgb, black 45%, transparent));
          transform: translateY(100%);
          transition-delay: 0s;
          opacity: 0;
          padding: var(--x-controls-padding-y, 0.5rem) var(--x-controls-padding-x, 0.5rem);
          display: flex;
          justify-content: start;
          align-items: center;
          gap: var(--x-controls-gap, 0.5rem);
        }

        :host(:state(--nocontrols))::part(controls-panel) {
          display: none;
        }

        :host(:state(--animated))::part(controls-panel) {
          transition: transform 0.3s ease-in, opacity 0.3s ease-in;
        }

        :host(:state(--paused))::part(controls-panel) {
        }

        :host(:state(--fullscreen))::part(controls-panel) {
        }

        :host(:state(--controlsvisible))::part(controls-panel) {
          transform: translateY(0);
          transition-delay: 0.1s;
          opacity: 1;
        }

        /* sliders */
        :host::part(slider) {
          -webkit-appearance: none;
          appearance: none;
          background: transparent;
          cursor: pointer;
          display: block;
          width: max-content;
          flex-grow: 1;
          flex-shrink: 1;
          pointer-events: auto;
        }

        :host::part(timeline) {
          min-width: 65px;
          flex-grow: 1;
          flex-shrink: 1;
        }

        ${[
      "-webkit-slider-runnable-track",
      "-moz-range-track"
    ].map((selector) => `
          *::${selector} {
            width: 100%;
            height: var(--x-slider-height, 0.5rem);
            cursor: pointer;
            box-shadow: var(--x-slider-shadow, inset 0 1px 2px color-mix(in srgb, black 5%, transparent));
            background: var(--x-slider-bg, color-mix(in srgb, var(--x-controls-color, #fff) 50%, transparent));
            border-radius: var(--x-slider-radius, 0.5rem);
            border-width: var(--x-slider-border-width, 0);
            border-style: var(--x-slider-border-style, solid);
            border-color: var(--x-slider-border-color, #010101);
            display: flex;
          }
          
          input[type=range]:focus::${selector} {
            /*background: initial;*/
          }
        `).join("\n")}

        ${[
      "-webkit-slider-thumb",
      "-moz-range-thumb"
    ].map((selector) => `
          *::${selector} {
            -webkit-appearance: none;
            appearance: none;
            width: var(--x-slider-thumb-width, 0.5rem); 
            height: var(--x-slider-thumb-height, 0.5rem);
            border-radius: 50%;
            background: var(--x-controls-color, #fff);
            cursor: pointer;
            margin-top: calc((var(--x-slider-height, 0.5rem) - var(--x-slider-thumb-height, 0.5rem)) / 2);
          }
        `).join("\n")}

        /* control buttons */
        :host::part(control-button) {
          aspect-ratio: 1;
          display: flex;
          justify-content: center;
          align-items: center;
          line-height: 1;
          height: 1rem;
          box-sizing: content-box;
          cursor: pointer;
          pointer-events: auto;
        }

        :host::part(control-button):before,
        :host::part(overlay-playbutton):before,
        :host::part(control-button):after {
          font-family: var(--x-icon-font-family, monospace);
          font-weight: var(--x-icon-font-weight, normal);
        }

        /* fullscreen button */
        :host::part(fullscreen-button) {
          grid-area: fullscreen-button;
          margin-left: auto;
        }

        :host::part(fullscreen-button)::before {
          content: var(--x-icon-expand, '\u26F6');
        }

        :host(:state(--fullscreen))::part(fullscreen-button)::before {
          content: var(--x-icon-collapse, '\u26F6');
        }

        /* play button */
        :host::part(play-button) {
        }

        :host(:state(--paused))::part(play-button):before {
          content: var(--x-icon-play, "\u25B6");
        }

        :host::part(play-button):before {
          content: var(--x-icon-pause, '\u23F8');
        }

        /* mute button */
        :host::part(mute-button) {
          position: relative;
        }

        :host::part(mute-button):before {
          content: var(--x-icon-unmute, "\\1F50A");
        }

        :host(:state(--muted))::part(mute-button):before {
          /* content: var(--x-icon-mute, '\u{1F507}'); */
        }

        :host(:state(--muted))::part(mute-button):after {
          /*content: var(--x-icon-strike, '\\2298');*/
          content: '';
          display: block;
          position: absolute;
          left: 0;
          top: 0;
          height: 1rem;
          aspect-ratio: 1;
          color: red;
          font-size: 2rem;
          width: 1rem;
          background: linear-gradient(to right top, transparent, transparent 40%, #eee 40%, #eee 50%, #333 50%, #333 60%, transparent 60%, transparent);
        }

        :host::part(time-display) {
          display: flex;
          flex-wrap: nowrap;
          white-space: nowrap;
        }

        /* duration-display */
        :host::part(duration) {
          color: var(--x-muted, color-mix(in srgb, var(--x-controls-color, #fff) 50%, transparent));
        }

        :host::part(duration)::before {
          content: ' / ';
        }

        /* current-time-display */
        :host::part(current-time) {
        }

        :host::part(display) {
          
        }

        :host::part(duration):empty {
          display: none;
        }

        /* overlay play button */
        :host::part(overlay-playbutton) {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          transition: all 0.3s ease-in;
          padding: 1.3rem;
          font: var(--x-icon-font, monospace);
          font-size: 2rem;
          background: var(--x-controls-bg, color-mix(in srgb, black 45%, transparent));
          border-radius: 50%;
          display: flex;
          justify-content: center;
          align-items: center;
          box-sizing: content-box;
          cursor: pointer;
          text-align: center;
          opacity: 0.5;
          transition: all 0.09s linear;
          visibility: hidden;
          aspect-ratio: 1;
          height: 1em;
        }

        :host::part(overlay-playbutton)::before {
          content: var(--x-icon-play, "\u25B6");
          display: block;
          vertical-align: middle;
        }

        :host(:state(--canplay):state(--paused):not(:state(--played)))::part(overlay-playbutton) {
          opacity: 1;
          transform: translate(-50%, -50%) scale(1);
          visibility: visible;
        }

        :host(:state(--played))::part(overlay-playbutton) {
          opacity: 0;
          transform: translate(-50%, -50%) scale(2.5);
          transition: visibility 0s 0.4s, opacity 0.4s ease-out, transform 0.4s ease-in;
          visibility: hidden;
          pointer-events: none;
          cursor: default;
        }

        /* volume-control */
        .volume-control {
          display: flex;
          align-items: center;
          position: relative;
          margin-right: 0;
          pointer-events: auto;
        }

        :host::part(volume-slider) {
          transition: all 0.2s ease-in;
          width: 65px;
        }

        .volume-control > input[type=range] {
          max-width: calc(
            5rem * var(--x-volume-slider-expand, 1) +
            0rem * (1 - var(--x-volume-slider-expand, 1))
          );
          opacity: calc(
            1 * var(--x-volume-slider-expand, 1) +
            0 * (1 - var(--x-volume-slider-expand, 1))
          );;
          padding-left: calc(
            0.5rem * var(--x-volume-slider-expand, 1) +
            0rem * (1 - var(--x-volume-slider-expand, 1))
          );
        } 

        .volume-control:hover > input[type=range] {
          opacity: 1;
          max-width: 5rem;
          padding-left: 0.5rem;
        }

        /* controlslist */
        /*
        :host([controlslist*="nofullscreen"])::part(fullscreen-button),
        :host([controlslist*="nooverlayplaybutton"])::part(overlay-playbutton),
        :host([controlslist*="noplaybutton"])::part(play-button),
        :host([controlslist*="nomutebutton"])::part(mute-button),
        :host([controlslist*="notimeline"])::part(timeline),
        :host([controlslist*="noduration"])::part(duration),
        :host([controlslist*="nocurrenttime"])::part(current-time),
        :host([controlslist*="novolumeslider"])::part(volume-slider) {
          display: none;
        }
          */

        :host(:where(
          [controlslist^="noplaybutton"],
          [controlslist*=" noplaybutton "],
          [controlslist$="noplaybutton"],
          [controlslist^="noplay"],
          [controlslist*=" noplay "],
          [controlslist$="noplay"],
        ))::part(play-button),
        
        :host(:where(
          [controlslist^="nooverlayplaybutton"],
          [controlslist*=" nooverlayplaybutton "],
          [controlslist$="nooverlayplaybutton"],
          [controlslist^="noplay"],
          [controlslist*=" noplay "],
          [controlslist$="noplay"],
        ))::part(overlay-playbutton),

        :host(:where(
          [controlslist^="nofullscreenbutton"],
          [controlslist*=" nofullscreenbutton "],
          [controlslist$="nofullscreenbutton"],
          [controlslist^="nofullscreen"],
          [controlslist*=" nofullscreen "],
          [controlslist$="nofullscreen"],
        ))::part(fullscreen-button),

        :host(:where(
          [controlslist^="nomutebutton"],
          [controlslist*=" nomutebutton "],
          [controlslist$="nomutebutton"],
          [controlslist^="novolume"],
          [controlslist*=" novolume "],
          [controlslist$="novolume"],
        ))::part(mute-button),

        :host(:where(
          [controlslist^="novolumeslider"],
          [controlslist*=" novolumeslider "],
          [controlslist$="novolumeslider"],
          [controlslist^="novolume"],
          [controlslist*=" novolume "],
          [controlslist$="novolume"],
        ))::part(volume-slider),

        :host(:where(
          [controlslist^="nocurrenttime"],
          [controlslist*=" nocurrenttime "],
          [controlslist$="nocurrenttime"],
          [controlslist^="notime"],
          [controlslist*=" notime "],
          [controlslist$="notime"],
        ))::part(current-time),

        :host(:where(
          [controlslist^="noduration"],
          [controlslist*=" noduration "],
          [controlslist$="noduration"],
          [controlslist^="notime"],
          [controlslist*=" notime "],
          [controlslist$="notime"],
        ))::part(duration),

        :host(:where(
          [controlslist^="notimeline"],
          [controlslist*=" notimeline "],
          [controlslist$="notimeline"],
          [controlslist^="notime"],
          [controlslist*=" notime "],
          [controlslist$="notime"],
        ))::part(timeline)
        
        {
          display: none;
        }
      </style>
      
      <slot></slot>
      <div part="body">
        <div part="controls-panel">
          <div part="control-button play-button"></div>
          
          <input part="slider timeline" type="range"/>
          <div part="display current-time">0:00</div>
          <div part="display duration">0:00</div>

          <div class="volume-control">
            <div part="control-button mute-button"></div>
            <input part="slider volume-slider" type="range"/>
          </div>
          
          <div part="control-button fullscreen-button"></div>
        </div>
        <div part="overlay-playbutton"></div>
      </div>
    `;
    this.shadowRoot.innerHTML = html;
    this.#slot = this.shadowRoot.querySelector("slot");
    this.#body = this.shadowRoot.querySelector('[part*="body"]');
    this.#timeline = this.shadowRoot.querySelector('[part*="timeline"]');
    this.#currentTimeDisplay = this.shadowRoot.querySelector('[part*="current-time"]');
    this.#durationDisplay = this.shadowRoot.querySelector('[part*="duration"]');
    this.#volumeSlider = this.shadowRoot.querySelector('[part*="volume-slider"]');
    this.#volumeSlider.value = 100;
    this.#controlsPanel = this.shadowRoot.querySelector('[part*="controls-panel"]');
  }
  set mediaElement(value) {
    if (value !== this.#mediaElement) {
      if (this.#mediaElement) {
        this.#mediaElement.removeEventListener("loadeddata", this.handleLoadedData);
        this.#mediaElement.removeEventListener("canplay", this.handleCanPlay);
        this.#mediaElement.removeEventListener("play", this.handlePlay);
        this.#mediaElement.removeEventListener("pause", this.handlePause);
        this.#mediaElement.removeEventListener("timeupdate", this.handleTimeUpdate);
        this.#mediaElement.removeEventListener("durationchange", this.handleTimeUpdate);
        this.#mediaElement.removeEventListener("volumechange", this.handleVolumeChange);
      }
      this.#mediaElement = value;
      if (this.#mediaElement) {
        this.#mediaElement.addEventListener("loadeddata", this.handleLoadedData);
        this.#mediaElement.addEventListener("canplay", this.handleCanPlay);
        this.#mediaElement.addEventListener("play", this.handlePlay);
        this.#mediaElement.addEventListener("pause", this.handlePause);
        this.#mediaElement.addEventListener("timeupdate", this.handleTimeUpdate);
        this.#mediaElement.addEventListener("durationchange", this.handleTimeUpdate);
        this.#mediaElement.addEventListener("volumechange", this.handleVolumeChange);
        this.#mediaElement.muted ? this.#internals.states.add("--muted") : this.#internals.states.delete("--muted");
        this.#volumeSlider.value = this.#mediaElement.muted ? 0 : this.#mediaElement.volume * 100;
        if (this.#mediaElement.readyState === 0 && this.#mediaElement.autoplay || !this.#mediaElement.paused) {
          this.hideControls(0);
        } else {
          this.showControls();
        }
        if (this.#mediaElement.readyState >= 2) {
          this.#timeline.max = 100;
          this.#internals.states.add("--loadeddata");
          if (this.#mediaElement.readyState >= 3) {
            this.#internals.states.add("--canplay");
          }
        }
      }
    }
    this.update();
  }
  get mediaElement() {
    return this.#mediaElement;
  }
  handleSlotChange(event) {
    const mediaElement = event.target.assignedElements().find((element) => element instanceof HTMLMediaElement);
    if (mediaElement) {
      this.mediaElement = mediaElement;
    }
    this.update();
  }
  toggleFullscreen() {
    if (!document.fullscreenElement) {
      this.requestFullscreen().catch((err) => {
        alert(
          `Error attempting to enable fullscreen mode: ${err.message} (${err.name})`
        );
      });
    } else {
      document.exitFullscreen();
    }
  }
  handleResize() {
    this.update();
  }
  handleClick(event) {
    const isControlsPanel = !!event.target.closest('[part*="controls-panel"]');
    if (isControlsPanel) {
      const playButton = event.target.closest('[part*="play-button"]');
      if (playButton) {
        this.#mediaElement.paused ? this.#mediaElement.play() : this.#mediaElement.pause();
      }
      const muteButton = event.target.closest('[part*="mute-button"]');
      if (muteButton) {
        this.#mediaElement.muted = !this.#mediaElement.muted;
      }
      const fullscreenButton = event.target.closest('[part*="fullscreen-button"]');
      if (fullscreenButton) {
        this.toggleFullscreen();
      }
      return;
    }
    const noPlay = this.controlslist.has("noplay");
    if (noPlay) {
      return;
    }
    clearTimeout(this.#clickTimeout);
    if (event.detail === 1) {
      this.#clickTimeout = setTimeout(() => {
        this.handleSingleClick(event);
      }, 200);
    }
  }
  handleSingleClick(event) {
    if (!this.#mediaElement) {
      return;
    }
    const isControlsPanel = !!event.target.closest('[part*="controls-panel"]');
    if (!isControlsPanel) {
      this.#mediaElement.paused ? this.#mediaElement.play() : this.#mediaElement.pause();
      return;
    }
  }
  handlePlay() {
    if (this.#mediaElement.played.length > 0) {
      this.#internals.states.add("--played");
      this.#internals.states.add("--animated");
    }
    this.hideControls();
    this.update();
  }
  handlePause() {
    this.showControls();
    this.update();
  }
  handleVolumeChange() {
    const isMuted = this.#mediaElement.muted;
    const volume = isMuted ? 0 : this.#mediaElement.volume;
    this.#volumeSlider.value = volume * 100;
    if (volume === 0) {
      this.#internals.states.add("--muted");
    } else {
      this.#internals.states.delete("--muted");
    }
  }
  handleFullscreenChange() {
    window.requestAnimationFrame(() => {
    });
    const isAnimated = this.#internals.states.has("--animated");
    this.#internals.states.delete("--animated");
    this.update();
    this.handleControlsListChange();
    if (isAnimated) {
      this.#internals.states.add("--animated");
    }
  }
  handleTimelineChange(event) {
    if (!this.#mediaElement) {
      return;
    }
    const newTime = this.#mediaElement.duration * (event.target.value / 100);
    this.#mediaElement.currentTime = newTime;
    this.update();
  }
  handleVolumeSliderChange(event) {
    if (!this.#mediaElement) {
      return;
    }
    this.#mediaElement.volume = event.target.value / 100;
    this.#mediaElement.muted = event.target.value > 0 ? false : true;
    this.handleVolumeChange();
  }
  handleDblClick(event) {
    if (event.target !== this.#mediaElement) {
      return;
    }
    this.toggleFullscreen();
  }
  handlePointerMove(event) {
    if (this.#autohideTimeout) {
      clearTimeout(this.#autohideTimeout);
    }
    this.#internals.states.add("--controlsvisible");
    if (this.#mediaElement.paused) {
      return;
    }
    const originalTarget = event.composedPath()[0];
    const isControls = !!originalTarget.closest('[part*="controls"]');
    if (isControls) {
      return;
    }
    this.#autohideTimeout = setTimeout(() => {
      this.#internals.states.delete("--controlsvisible");
    }, _MediaControls.CONTROLS_TIMEOUT);
  }
  handlePointerLeave(event) {
    if (this.#autohideTimeout) {
      clearTimeout(this.#autohideTimeout);
    }
    if (this.#mediaElement.paused) {
      return;
    }
    this.#internals.states.delete("--controlsvisible");
  }
  handleLoadedData(e) {
    this.#timeline.max = 100;
    this.#internals.states.add("--loadeddata");
    this.update();
  }
  handleCanPlay(e) {
    this.#internals.states.add("--canplay");
    this.update();
  }
  handleTimeUpdate() {
    const value = 100 / this.#mediaElement.duration * this.#mediaElement.currentTime;
    if (isNaN(value)) {
      return;
    }
    this.#timeline.value = value;
    this.#currentTimeDisplay.textContent = formatCurrentTime(this.#mediaElement.currentTime, this.#mediaElement.duration);
    this.#durationDisplay.textContent = formatCurrentTime(this.#mediaElement.duration);
  }
  handleControlsListChange() {
    const controls = this.shadowRoot.querySelectorAll('[part="controls-panel"] *[part]');
    const hasVisibleControls = Array.from(controls).some((control) => getComputedStyle(control).display !== "none");
    if (!hasVisibleControls) {
      this.#internals.states.add("--nocontrols");
    } else {
      this.#internals.states.delete("--nocontrols");
    }
    if (!this.#mediaElement) {
      return;
    }
    if (this.controlslist.has("noplay")) {
      const isPlaying = this.#mediaElement.hasAttribute("autoplay");
      if (isPlaying) {
        this.#mediaElement.play();
      } else {
        this.#mediaElement.pause();
      }
    }
    if (this.controlslist.has("novolume") || this.controlslist.has("nomutebutton") && this.controlslist.has("novolumeslider")) {
      const isMuted = this.#mediaElement.hasAttribute("muted");
      this.#mediaElement.muted = isMuted;
    }
  }
  connectedCallback() {
    window.addEventListener("resize", this.handleResize);
    document.addEventListener("fullscreenchange", this.handleFullscreenChange);
    this.#slot.addEventListener("slotchange", this.handleSlotChange);
    this.shadowRoot.addEventListener("click", this.handleClick);
    this.shadowRoot.addEventListener("dblclick", this.handleDblClick);
    this.addEventListener("pointermove", this.handlePointerMove);
    this.addEventListener("pointerleave", this.handlePointerLeave);
    this.#timeline.addEventListener("change", this.handleTimelineChange);
    this.#volumeSlider.addEventListener("change", this.handleVolumeSliderChange);
    this.update();
  }
  detachedCallback() {
    window.removeEventListener("resize", this.handleResize);
    document.removeEventListener("fullscreenchange", this.handleFullscreenChange);
    this.#slot.addEventListener("slotchange", this.handleSlotChange);
    this.shadowRoot.removeEventListener("click", this.handleClick);
    this.shadowRoot.removeEventListener("dblclick", this.handleDblClick);
    this.removeEventListener("pointermove", this.handlePointerMove);
    this.removeEventListener("pointerleave", this.handlePointerLeave);
    this.#timeline.removeEventListener("change", this.handleTimelineChange);
    this.#volumeSlider.removeEventListener("change", this.handleVolumeSliderChange);
  }
  hideControls(timeout = _MediaControls.CONTROLS_TIMEOUT) {
    if (this.#autohideTimeout) {
      clearTimeout(this.#autohideTimeout);
    }
    if (_MediaControls.CONTROLS_TIMEOUT === 0) {
      this.#internals.states.delete("--controlsvisible");
      return;
    }
    this.#autohideTimeout = setTimeout(() => {
      if (!this.#mediaElement.paused) {
        this.#internals.states.delete("--controlsvisible");
      }
    }, timeout);
  }
  showControls() {
    if (this.#autohideTimeout) {
      clearTimeout(this.#autohideTimeout);
    }
    this.#internals.states.add("--controlsvisible");
  }
  update() {
    if (!this.#mediaElement) {
      return;
    }
    const isPaused = this.#mediaElement.paused;
    const isFullscreen = document.fullscreenElement === this || document.fullscreenElement?.contains(this);
    if (isPaused) {
      this.#internals.states.add("--paused");
    } else {
      this.#internals.states.delete("--paused");
    }
    if (isFullscreen) {
      this.#internals.states.add("--fullscreen");
    } else {
      this.#internals.states.delete("--fullscreen");
    }
    const style = getComputedStyle(this.#mediaElement);
    this.#body.style.setProperty("border-top-left-radius", style.getPropertyValue("border-top-left-radius"));
    this.#body.style.setProperty("border-top-right-radius", style.getPropertyValue("border-top-right-radius"));
    this.#body.style.setProperty("border-bottom-left-radius", style.getPropertyValue("border-bottom-left-radius"));
    this.#body.style.setProperty("border-bottom-right-radius", style.getPropertyValue("border-bottom-right-radius"));
    if (this.#for) {
      const mediaElementBounds = this.#mediaElement.getBoundingClientRect();
      this.#body.style.setProperty("width", `${mediaElementBounds.width}px`);
      this.#body.style.setProperty("height", `${mediaElementBounds.height}px`);
      const targetBounds = this.getBoundingClientRect();
      const top = mediaElementBounds.top - targetBounds.top;
      const left = mediaElementBounds.left - targetBounds.left;
      this.#body.style.setProperty("transform", `translate(${left}px, ${top}px)`);
    }
  }
  set for(value) {
    if (value !== this.for) {
      if (value) {
        this.setAttribute("for", value);
      } else {
        this.removeAttribute("for");
      }
      this.#for = value;
      if (this.#for) {
        this.mediaElement = document.querySelector(`#${this.#for}`);
      }
    }
  }
  get for() {
    return this.#for;
  }
  get controlslist() {
    return this.#controlslist;
  }
  static get observedAttributes() {
    return ["for", "controlslist"];
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    if (name === "controlslist") {
      this.controlslist.clear();
      this.controlslist.add(newValue);
      return;
    }
    if (Reflect.has(this, name)) {
      const isBool = typeof this[name] === "boolean";
      const value = isBool ? this.hasAttribute(name) : newValue;
      if (value !== this[name]) {
        this[name] = value;
      }
    }
  }
};
customElements.define("x-media-controls", MediaControls);
export {
  Ambience_default as Ambience,
  MediaControls,
  XOption as Option,
  Panel_default as Panel,
  PanelManager,
  Preloader_default as Preloader,
  XSelect as Select
};
