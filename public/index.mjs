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
          height: 100%;
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
    const slot = this.shadowRoot.querySelector("slot");
    slot.addEventListener("slotchange", this.handleSlotChange);
    this.#mutationObserver = new MutationObserver(this.handleMutation);
    this.#mutationObserver.observe(slot, {
      childList: true,
      subtree: true
    });
    this.#body = this.shadowRoot.querySelector(".body");
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
      this.#mutationObserver.unobserve(node);
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
customElements.define("x-preloader", XPreloader);
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
         /* display: inline-flex;
          flex-direction: column;
          gap: 0.5rem;*/
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
customElements.define("x-select", XSelect);

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
customElements.define("x-option", XOption);

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
    console.log("ADD TRANSITION HANDLER", this.dataset);
    host.addEventListener("transitionend", this.handleTransitionEnd);
  }
  handleTransitionEnd(event) {
    console.log("TRANSITION END", event.target, event.propertyName, event.elapsedTime);
    const target = event.target;
    const style = window.getComputedStyle(target);
    let fullyShown = false;
    let fullyHidden = false;
    if (event.propertyName === "transform") {
      const matrix = new DOMMatrixReadOnly(style.transform);
      const x = matrix.e;
      const y = matrix.f;
      const sx = matrix.a;
      const sy = matrix.d;
      const orientations = this.orientation.split(" ");
      const width = target.offsetWidth;
      const height = target.offsetHeight;
      if (orientations.includes("top")) {
        fullyShown = y === 0;
        fullyHidden = y === -height;
      } else if (orientations.includes("bottom")) {
        fullyShown = y === 0;
        fullyHidden = y === height;
      } else if (orientations.includes("left")) {
        fullyShown = x === 0;
        fullyHidden = x === -width;
      } else if (orientations.includes("right")) {
        fullyShown = x === 0;
        fullyHidden = x === width;
      } else if (orientations.includes("center")) {
        fullyShown = sx === 1 && sy === 1;
        fullyHidden = sx === 0 && sy === 0;
      }
    }
    if (event.propertyName === "opacity") {
      fullyShown = style.opacity === "1";
      fullyHidden = style.opacity === "0";
    }
    if (fullyShown) {
      this.#internals.states.add("--shown");
      this.#internals.states.delete("--showing");
    }
    if (fullyHidden) {
      this.#internals.states.add("--hidden");
      this.#internals.states.delete("--hiding");
    }
    if (fullyShown) {
      console.log("shown");
      this.dispatchEvent(new CustomEvent("x-panel:shown"));
    }
    if (fullyHidden) {
      console.log("hidden");
      this.dispatchEvent(new CustomEvent("x-panel:hidden"));
    }
  }
  connectedCallback() {
    console.log("*** CONNECTED CALLBACK", this.dataset.scene, [...this.#internals.states.values()]);
    this.render();
    window.requestAnimationFrame(() => {
      this.#internals.states.add("--initialized");
    });
  }
  render() {
    console.log("RENDER");
    this.shadowRoot.innerHTML = `
      <style>
        :host([hidden]) {
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

        :host([hidden][orientation*="left"][orientation*="right"][orientation*="top"][orientation*="bottom"]) {
          transform: scale(0, 0);
        }

        :host([hidden][animation*='fade']) {
          opacity: 0;
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
      if (hidden) {
        console.log("HIDE", this.dataset.scene, this.isConnected, this.parentNode);
      } else {
        console.log("SHOW", this.dataset.scene, this.isConnected, this.parentNode);
      }
      if (hidden) {
        if (this.#internals.states.has("--initialized")) {
          this.#internals.states.delete("--shown");
          this.#internals.states.delete("--showing");
          this.#internals.states.add("--hiding");
        } else {
          this.#internals.states.add("--hidden");
        }
      } else {
        if (this.#internals.states.has("--initialized")) {
          this.#internals.states.delete("--hidden");
          this.#internals.states.delete("--hiding");
          this.#internals.states.add("--showing");
        } else {
          this.#internals.states.add("--shown");
        }
      }
      return;
    }
    this[name] = newValue;
  }
};
customElements.define("x-panel", Panel);
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
    for (const p2 of panel) {
      if (!this.#current) {
        this.#current = p2;
      }
      p2.addEventListener("x-panel:shown", this._handleState);
      p2.addEventListener("x-panel:hidden", this._handleState);
      this.#panels.add(p2);
    }
  }
  remove(panel) {
    p.removeEventListener("x-panel:shown", this._handleState);
    p.removeEventListener("x-panel:hidden", this._handleState);
    this.#panels.delete(panel);
  }
  clear() {
    this.#panels.clear();
  }
  set(group) {
    console.log("set", group);
    this.#next = group;
    this._handleState();
  }
  get() {
    return this.#next !== null ? this.#next : this.#current;
  }
  _handleState() {
    console.log("HANDLE STATE", this.#next);
    if (this.#next === null) {
      return;
    }
    const panels = Array.from(this.#panels);
    const groupBy = typeof this.#options.groupBy === "string" ? (panel) => panel.getAttribute(this.#options.groupBy) : this.#options.groupBy;
    const others = panels.filter((panel) => groupBy(panel) !== this.#next);
    console.log("others: ", this.#next, others.length);
    others.forEach((panel) => panel.hidden = true);
    const othersHidden = others.every((panel) => panel.state === "hidden");
    console.log("states", others.map((panel) => panel.state), othersHidden);
    if (othersHidden && this.#current !== this.#next) {
      console.log("SHOW IT", this.#next);
      console.log(panels.map((panel) => groupBy(panel)));
      panels.filter((panel) => groupBy(panel) === this.#next).forEach((panel) => panel.hidden = false);
      this.#current = this.#next;
      this.#next = null;
    }
  }
};
export {
  XOption as Option,
  Panel_default as Panel,
  PanelManager,
  Preloader_default as Preloader,
  XSelect as Select
};
