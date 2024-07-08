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
var Ambience = class extends HTMLElement {
  #assignedChildren;
  #mutationObservers;
  #mediaElements;
  #displayElements;
  #backdrop;
  #backdropBody;
  static observedAttributes = ["for"];
  constructor() {
    super();
    this.handleMutation = this.handleMutation.bind(this);
    this.handleSlotChange = this.handleSlotChange.bind(this);
    this.handleResize = this.handleResize.bind(this);
    this.handleLoad = this.handleLoad.bind(this);
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
      <style>
        /* Add your styling here */
        :host {
          display: contents;
          position: relative;
          transform-style: preserve-3d;
           
        }

        slot {
          display: block;
          transform-style: preserve-3d;
        }

        :host::part(backdrop) {
          position: relative;
          z-index: -1;
          transform : translate3d ( 0,0,0 ) ;
          transform-style: preserve-3d;
          
          /*filter: contrast(2) blur(3.5rem) opacity(0.5) brightness(2.7);*/
          filter: blur(3.5rem);
          /*pointer-events: none;*/
          transform: translate3d(0, 0, 0);
        }
        
        :host::part(backdrop-body) {
          transform: translate3d(0, 0, 0);
          transform-style: preserve-3d;
        }

        /*:host::part(body) {
          position: relative;
          overflow: auto;
          height: 300px;
        }*/
      </style>
      <div part="body">
        <div part="backdrop">
          <div part="backdrop-body"></div>
        </div>
        <div part="content">
          <slot></slot>
        </div>
      </div>
    `;
    this.#backdrop = this.shadowRoot.querySelector('[part="backdrop"]');
    this.#backdropBody = this.shadowRoot.querySelector('[part="backdrop-body"]');
    this.#assignedChildren = /* @__PURE__ */ new Set();
    this.#mediaElements = /* @__PURE__ */ new Set();
    this.#displayElements = /* @__PURE__ */ new WeakMap();
    this.#mutationObservers = /* @__PURE__ */ new WeakMap();
  }
  handleMutation(mutations) {
    mutations.forEach((mutation) => {
      mutation.addedNodes.filter((node) => node.nodeType === 1 && MEDIA_TAGS.includes(node.nodeName)).forEach((node) => this.mediaElementAdded(node));
      mutation.removedNodes.filter((node) => node.nodeType === 1 && MEDIA_TAGS.includes(node.nodeName)).forEach((node) => this.mediaElementRemoved(node));
    });
  }
  createDisplayElement(element) {
    let displayElement2;
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
      displayElement2 = document.createElement("div");
      displayElement2.appendChild(canvas);
      displayElement2.appendChild(poster);
    }
    if (!displayElement2) {
      displayElement2 = element.cloneNode(true);
    }
    displayElement2.style.transition = "opacity 0.12s";
    return displayElement2;
  }
  mediaElementAdded(...element) {
    element.forEach((element2) => {
      this.#mediaElements.add(element2);
      const displayElement2 = this.createDisplayElement(element2);
      this.#backdropBody.appendChild(displayElement2);
      this.#displayElements.set(element2, displayElement2);
      element2.addEventListener("load", this.handleLoad);
    });
    this.render();
  }
  mediaElementRemoved(...element) {
    element.forEach((element2) => {
      this.#mediaElements.delete(element2);
      this.#backdropBody.removeChild(displayElement);
      this.#displayElements.delete(element2);
      element2.removeEventListener("load", this.handleLoad);
    });
    this.render();
  }
  addTargetElement(...elements) {
    elements.filter((element) => !this.#assignedChildren.has(element)).forEach((element) => {
      this.#assignedChildren.add(element);
      const mutationObserver = new MutationObserver(this.handleMutation);
      mutationObserver.observe(element, {
        childList: true,
        subtree: true
      });
      this.#mutationObservers.set(element, mutationObserver);
      const nodes = [...element.querySelectorAll(MEDIA_TAGS.join(", "))];
      if (MEDIA_TAGS.includes(element.nodeName)) {
        nodes.push(element);
      }
      this.mediaElementAdded(...nodes);
    });
  }
  removeTargetElement(...elements) {
    elements.filter((element) => this.#assignedChildren.has(element)).forEach((element) => {
      const mutationObserver = this.#mutationObservers.get(element);
      mutationObserver.disconnect();
      this.#mutationObservers.delete(element);
      this.#assignedChildren.delete(element);
      if (MEDIA_TAGS.includes(element.nodeName)) {
        this.mediaElementRemoved(element);
      }
    });
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
  }
  handleResize() {
    this.render();
  }
  handleLoad(event) {
    console.log("handleLoad", event.target.src);
    window.requestAnimationFrame(() => {
      this.render();
    });
  }
  connectedCallback() {
    const slot = this.shadowRoot.querySelector("slot");
    slot.addEventListener("slotchange", this.handleSlotChange);
    window.addEventListener("resize", this.handleResize);
  }
  detachedCallback() {
    window.removeEventListener("resize", this.handleResize);
  }
  get clipArea() {
    let bounds = [...this.#assignedChildren].reduce((bounds2, element) => {
      const elementBounds = element.getBoundingClientRect();
      bounds2.top = Math.min(bounds2.top, elementBounds.top);
      bounds2.left = Math.min(bounds2.left, elementBounds.left);
      bounds2.bottom = Math.max(bounds2.bottom, elementBounds.bottom);
      bounds2.right = Math.max(bounds2.right, elementBounds.right);
      return bounds2;
    }, {
      top: Infinity,
      left: Infinity,
      bottom: -Infinity,
      right: -Infinity
    });
    bounds = {
      top: Math.round(bounds.top),
      left: Math.round(bounds.left),
      width: Math.round(bounds.right - bounds.left),
      height: Math.round(bounds.bottom - bounds.top),
      right: Math.round(bounds.right),
      bottom: Math.round(bounds.bottom)
    };
    const targetBounds = this.#backdrop.getBoundingClientRect();
    bounds.top -= targetBounds.top;
    bounds.left -= targetBounds.left;
    bounds.bottom -= targetBounds.top;
    bounds.right -= targetBounds.left;
    return bounds;
  }
  render() {
    const bounds = this.getBoundingClientRect();
    const backdrop = this.#backdrop;
    const targetBounds = backdrop.getBoundingClientRect();
    if (this.#mediaElements.size === 0) {
      return;
    }
    for (const element of this.#mediaElements) {
      const style = window.getComputedStyle(element);
      const copyStyles = ["filter", "transition", "visibility"];
      let elementBounds = element.getBoundingClientRect();
      const top = elementBounds.top - targetBounds.top;
      const left = elementBounds.left - targetBounds.left;
      const displayElement2 = this.#displayElements.get(element);
      displayElement2.style.display = "block";
      displayElement2.style.marginLeft = "0";
      displayElement2.style.marginTop = "0";
      displayElement2.style.margin = "0";
      displayElement2.style.position = "absolute";
      copyStyles.forEach((name) => {
        displayElement2.style[name] = style[name];
      });
      if (elementBounds.width > 0 && elementBounds.height > 0) {
        displayElement2.style.transform = `translate(${left}px, ${top}px)`;
        displayElement2.style.width = `${elementBounds.width}px`;
        displayElement2.style.height = `${elementBounds.height}px`;
        displayElement2.style.opacity = 1;
      } else {
        displayElement2.style.opacity = 0;
      }
      if (element instanceof HTMLMediaElement) {
        const canvas = displayElement2.querySelector("canvas");
        const poster = displayElement2.querySelector("img");
        const isPoster = element.poster && element.played.length === 0;
        poster.style.display = isPoster ? "block" : "none";
        if (!isPoster) {
          canvas.width = elementBounds.width;
          canvas.height = elementBounds.height;
          const context = canvas.getContext("2d");
          context.drawImage(element, 0, 0, canvas.width, canvas.height);
        }
      }
    }
    const clipArea = this.clipArea;
    const clipPath = `polygon(${clipArea.left}px ${clipArea.top}px,${clipArea.right}px ${clipArea.top}px,${clipArea.right}px ${clipArea.bottom}px,${clipArea.left}px ${clipArea.bottom}px)`;
    this.#backdropBody.style.clipPath = clipPath;
    window.requestAnimationFrame(() => {
      this.render();
    });
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) {
      return;
    }
    if (name === "for") {
      const targetElement = document.querySelector(`#${newValue}`);
      if (targetElement) {
        this.removeTargetElement(targetElement);
        this.addTargetElement(targetElement);
      }
    }
  }
};
if (!customElements.get("x-ambience")) {
  customElements.define("x-ambience", Ambience);
}
var Ambience_default = Ambience;

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
  #timeoutId;
  #timeline;
  #volumeSlider;
  #currentTimeDisplay;
  #durationDisplay;
  #overlayPlayButton;
  #volume;
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
    this.update = this.update.bind(this);
    this.attachShadow({ mode: "open" });
    this.#internals = this.attachInternals();
    const html = `
      <style>
        :host {
          display: inline-flex;
          position: relative;
          overflow: hidden;
          font-family: var(--x-font-family, sans-serif);
          font-size: var(--x-font-size, 0.9rem);
        }

        *::slotted(video) {
          /*border: 1px solid blue;
          outline: 2px solid yellow;*/
        }

        /* controls panel */
        :host::part(controls-panel) {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          background: var(--x-controls-bg, color-mix(in srgb, black 45%, transparent));
          transform: translateY(100%);
          transition: all 0.3s ease-in;
          transition-delay: 0s;
          opacity: 0;
          padding: var(--x-controls-padding-y, 0.5rem) var(--x-controls-padding-x, 0.5rem);
          
          display: flex;
          justify-content: start;
          align-items: center;
          gap: var(--x-controls-gap, 1rem);
        }

        :host(:state(--paused))::part(controls-panel) {
        }

        :host(:state(--controlsvisible))::part(controls-panel) {
          transform: translateY(0);
          transition-duration: 0.1s;
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
            background: var(--x-slider-bg, color-mix(in srgb, currentColor 50%, transparent));
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
            background: currentColor;
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
        }

        :host::part(control-button):before,
        :host::part(overlay-play-button):before,
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
          color: var(--x-muted, color-mix(in srgb, currentColor 50%, transparent));
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
        :host::part(overlay-play-button) {
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

        :host::part(overlay-play-button)::before {
          content: var(--x-icon-play, "\u25B6");
          display: block;
          vertical-align: middle;
        }

        :host(:state(--canplay):state(--paused):not(:state(--played)))::part(overlay-play-button) {
          opacity: 1;
          transform: translate(-50%, -50%) scale(1);
          visibility: visible;
        }

        :host(:state(--played))::part(overlay-play-button) {
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
        }

        .volume-control:hover {
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
            0.75rem * var(--x-volume-slider-expand, 1) +
            0rem * (1 - var(--x-volume-slider-expand, 1))
          );
        } 

        .volume-control:hover > input[type=range] {
          opacity: 1;
          max-width: 5rem;
          padding-left: 0.75rem;
        }

        /* controlslist */
        :host([controlslist*="nofullscreen"])::part(fullscreen-button),
        :host([controlslist*="noplay"])::part(play-button),
        :host([controlslist*="nomute"])::part(mute-button),
        :host([controlslist*="notimeline"])::part(timeline),
        :host([controlslist*="novolumeslider"])::part(volume-slider) {
          display: none;
        }
      </style>
      
      <slot></slot>
      <div part="controls-panel">
        <div part="control-button play-button"></div>
        
        <input part="slider timeline" type="range"/>
        <div part="time-display">
          <div part="display current-time">0:00</div>
          <div part="display duration">0:00</div>
        </div>

        <div part="volume-control" class="volume-control">
          <div part="control-button mute-button"></div>
          <input part="slider volume-slider" type="range"/>
        </div>
        
        <div part="control-button fullscreen-button"></div>
      </div>
      <div part="overlay-play-button"></div>
    `;
    this.shadowRoot.innerHTML = html;
    this.#slot = this.shadowRoot.querySelector("slot");
    this.#timeline = this.shadowRoot.querySelector('[part*="timeline"]');
    this.#currentTimeDisplay = this.shadowRoot.querySelector('[part*="current-time"]');
    this.#durationDisplay = this.shadowRoot.querySelector('[part*="duration"]');
    this.#volumeSlider = this.shadowRoot.querySelector('[part*="volume-slider"]');
    this.#volumeSlider.value = 100;
  }
  handleSlotChange(event) {
    const mediaElement = event.target.assignedElements().find((element) => element instanceof HTMLMediaElement);
    if (mediaElement !== this.#mediaElement) {
      if (this.#mediaElement) {
        this.#mediaElement.removeEventListener("loadeddata", this.handleLoadedData);
        this.#mediaElement.removeEventListener("canplay", this.handleCanPlay);
        this.#mediaElement.removeEventListener("play", this.handlePlay);
        this.#mediaElement.removeEventListener("pause", this.handlePause);
        this.#mediaElement.removeEventListener("timeupdate", this.handleTimeUpdate);
        this.#mediaElement.removeEventListener("durationchange", this.handleTimeUpdate);
        this.#mediaElement.removeEventListener("volumechange", this.handleVolumeChange);
      }
      this.#mediaElement = mediaElement;
      if (this.#mediaElement) {
        this.#mediaElement.addEventListener("loadeddata", this.handleLoadedData);
        this.#mediaElement.addEventListener("canplay", this.handleCanPlay);
        this.#mediaElement.addEventListener("play", this.handlePlay);
        this.#mediaElement.addEventListener("pause", this.handlePause);
        this.#mediaElement.addEventListener("timeupdate", this.handleTimeUpdate);
        this.#mediaElement.addEventListener("durationchange", this.handleTimeUpdate);
        this.#mediaElement.addEventListener("volumechange", this.handleVolumeChange);
        this.#mediaElement.paused ? this.showControls() : this.hideControls(0);
        this.#mediaElement.muted ? this.#internals.states.add("--muted") : this.#internals.states.delete("--muted");
        this.#volumeSlider.value = this.#mediaElement.muted ? 0 : this.#mediaElement.volume * 100;
      }
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
  handleClick(event) {
    if (!this.#mediaElement) {
      return;
    }
    const isControlsPanel = !!event.target.closest('[part*="controls-panel"]');
    if (!isControlsPanel) {
      this.#mediaElement.paused ? this.#mediaElement.play() : this.#mediaElement.pause();
      return;
    }
    const playButton = event.target.closest('[part*="play-button"]');
    if (playButton) {
      this.#mediaElement.paused ? this.#mediaElement.play() : this.#mediaElement.pause();
    }
    const muteButton = event.target.closest('[part*="mute-button"]');
    if (muteButton) {
      console.log("muteButton", muteButton, this.#mediaElement.muted);
      this.#mediaElement.muted = !this.#mediaElement.muted;
    }
    const fullscreenButton = event.target.closest('[part*="fullscreen-button"]');
    if (fullscreenButton) {
      this.toggleFullscreen();
    }
  }
  handlePlay(event) {
    this.#internals.states.add("--played");
    this.hideControls();
    this.update();
  }
  handlePause(event) {
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
  handleFullscreenChange(event) {
    window.requestAnimationFrame(() => {
      this.update();
    });
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
    if (this.#timeoutId) {
      clearTimeout(this.#timeoutId);
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
    this.#timeoutId = setTimeout(() => {
      this.#internals.states.delete("--controlsvisible");
    }, _MediaControls.CONTROLS_TIMEOUT);
  }
  handlePointerLeave(event) {
    if (this.#timeoutId) {
      clearTimeout(this.#timeoutId);
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
  connectedCallback() {
    this.#slot.addEventListener("slotchange", this.handleSlotChange);
    this.shadowRoot.addEventListener("click", this.handleClick);
    this.shadowRoot.addEventListener("dblclick", this.handleDblClick);
    this.addEventListener("pointermove", this.handlePointerMove);
    this.addEventListener("pointerleave", this.handlePointerLeave);
    document.addEventListener("fullscreenchange", this.handleFullscreenChange);
    this.#timeline.addEventListener("change", this.handleTimelineChange);
    this.#volumeSlider.addEventListener("change", this.handleVolumeSliderChange);
  }
  detachedCallback() {
    this.#slot.addEventListener("slotchange", this.handleSlotChange);
    this.shadowRoot.removeEventListener("click", this.handleClick);
    this.shadowRoot.removeEventListener("dblclick", this.handleDblClick);
    this.removeEventListener("pointermove", this.handlePointerMove);
    this.removeEventListener("pointerleave", this.handlePointerLeave);
    document.removeEventListener("fullscreenchange", this.handleFullscreenChange);
    this.#timeline.removeEventListener("change", this.handleTimelineChange);
    this.#volumeSlider.removeEventListener("change", this.handleVolumeSliderChange);
  }
  hideControls(timeout = _MediaControls.CONTROLS_TIMEOUT) {
    if (this.#timeoutId) {
      clearTimeout(this.#timeoutId);
    }
    this.#timeoutId = setTimeout(() => {
      if (!this.#mediaElement.paused) {
        this.#internals.states.delete("--controlsvisible");
      }
    }, timeout);
  }
  showControls() {
    if (this.#timeoutId) {
      clearTimeout(this.#timeoutId);
    }
    this.#internals.states.add("--controlsvisible");
  }
  update() {
    if (!this.#mediaElement) {
      return;
    }
    const isPaused = this.#mediaElement.paused;
    const isPlayed = this.#mediaElement.played.length > 0;
    const isFullscreen = document.fullscreenElement === this || document.fullscreenElement?.contains(this);
    if (isPaused) {
      this.#internals.states.add("--paused");
    } else {
      this.#internals.states.delete("--paused");
    }
    if (isPlayed) {
      this.#internals.states.add("--played");
    } else {
    }
    if (isFullscreen) {
      this.#internals.states.add("--fullscreen");
    } else {
      this.#internals.states.delete("--fullscreen");
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
