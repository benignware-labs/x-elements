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
var Ambience = class _Ambience extends HTMLElement {
  #poster;
  #slot;
  #backdrop;
  #canvas;
  #mediaElement;
  static MEDIA_CLASSES = [HTMLImageElement, HTMLVideoElement];
  constructor() {
    super();
    this.handleResize = this.handleResize.bind(this);
    this.handleSlotChange = this.handleSlotChange.bind(this);
    this.update = this.update.bind(this);
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-block;
          position: relative;
        }

        :host::part(backdrop) {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: -1;
          filter: contrast(2) blur(3.5rem) opacity(0.5) brightness(2.7);
        }

        :host::part(poster) {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          outline: 2px solid red;
        }

        canvas {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
        }
      </style>
      
     
      <div part="backdrop">
        <canvas part="canvas"></canvas>
      </div>
      
      <slot></slot>
    `;
    this.#slot = this.shadowRoot.querySelector("slot");
    this.#poster = this.shadowRoot.querySelector('[part="poster"]');
    this.#canvas = this.shadowRoot.querySelector('[part="canvas"]');
    this.#backdrop = this.shadowRoot.querySelector('[part="backdrop"]');
  }
  handleResize() {
    this.update();
  }
  handleSlotChange(event) {
    const mediaElement = event.target.assignedElements().find((element) => _Ambience.MEDIA_CLASSES.includes(element.constructor));
    if (mediaElement !== this.#mediaElement) {
      if (this.#mediaElement) {
      }
      this.#mediaElement = mediaElement;
      if (this.#mediaElement) {
      }
    }
    this.update();
  }
  connectedCallback() {
    window.addEventListener("resize", this.handleResize);
    this.#slot.addEventListener("slotchange", this.handleSlotChange);
    this.update();
  }
  detachedCallback() {
    window.removeEventListener("resize", this.handleResize);
  }
  update() {
    requestAnimationFrame(() => this.update());
    if (!this.targetElement) {
      return;
    }
    const t = this.targetElement;
    const offset = 0;
    const style = getComputedStyle(t);
    const objectFit = style.objectFit;
    const borderRadius = style.borderRadius;
    this.#canvas.style.transform = "";
    const ctx = this.#canvas.getContext("2d");
    const v = this.targetElement;
    const isPoster = this.targetElement.poster && !this.targetElement.played.length;
    if (isPoster) {
      this.#backdrop.style.background = `url(${this.targetElement.poster}) no-repeat center center / cover`;
      return;
    }
    const f = 1 + offset / 100;
    const b = this.targetElement.getBoundingClientRect();
    const w = b.width;
    const h = b.height;
    this.#canvas.width = w;
    this.#canvas.height = h;
    const sx = 0;
    const sy = 0;
    const sw = v.videoWidth || v.offsetWidth;
    const sh = v.videoHeight || v.offsetHeight;
    var hRatio = w / sw;
    var vRatio = h / sh;
    var ratio = objectFit === "cover" ? Math.max(hRatio, vRatio) : Math.min(hRatio, vRatio);
    const dx = (w - sw * ratio / f) / 2;
    const dy = (h - sh * ratio / f) / 2;
    const dw = sw * ratio / f;
    const dh = sh * ratio / f;
    ctx.clearRect(0, 0, w, h);
    const [, borderTopLeftValue, borderTopLeftUnit] = style.borderTopLeftRadius.match(/(\d+)(px|%)/);
    const borderTopLeftRadius = borderTopLeftUnit === "px" ? borderTopLeftValue : borderTopLeftValue * w / 100;
    const [, borderTopRightValue, borderTopRightUnit] = style.borderTopRightRadius.match(/(\d+)(px|%)/);
    const borderTopRightRadius = borderTopRightUnit === "px" ? borderTopRightValue : borderTopRightValue * w / 100;
    const [, borderBottomLeftValue, borderBottomLeftUnit] = style.borderBottomLeftRadius.match(/(\d+)(px|%)/);
    const borderBottomLeftRadius = borderBottomLeftUnit === "px" ? borderBottomLeftValue : borderBottomLeftValue * w / 100;
    const [, borderBottomRightValue, borderBottomRightUnit] = style.borderBottomRightRadius.match(/(\d+)(px|%)/);
    const borderBottomRightRadius = borderBottomRightUnit === "px" ? borderBottomRightValue : borderBottomRightValue * w / 100;
    const tlr = borderTopLeftRadius;
    const trr = borderTopRightRadius;
    const blr = borderBottomLeftRadius;
    const brr = borderBottomRightRadius;
    ctx.strokeStyle = "transparent";
    ctx.beginPath();
    ctx.roundRect(dx, dy, dw, dh, [tlr, trr, blr, brr]);
    ctx.stroke();
    ctx.clip();
    ctx.drawImage(
      v,
      sx,
      sy,
      sw,
      sh,
      dx,
      dy,
      dw,
      dh
    );
  }
  get targetElement() {
    const target = this.dataset.target;
    if (target) {
      return document.querySelector(target);
    }
    const element = this.querySelector("img, video");
    return element;
  }
};
customElements.define("x-ambience", Ambience);

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
          min-width: 65px;
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
            5rem * var(--x-volume-slider-expand, 0) +
            0rem * (1 - var(--x-volume-slider-expand, 0))
          );
          opacity: calc(
            1 * var(--x-volume-slider-expand, 0) +
            0 * (1 - var(--x-volume-slider-expand, 0))
          );;
          padding-left: calc(
            0.75rem * var(--x-volume-slider-expand, 0) +
            0rem * (1 - var(--x-volume-slider-expand, 0))
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
        <div part="volume-control" class="volume-control">
          <div part="control-button mute-button"></div>
          <input part="slider volume-slider" type="range"/>
        </div>
        <input part="slider timeline" type="range"/>
        <div part="time-display">
          <div part="display current-time">0:00</div>
          <div part="display duration">0:00</div>
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
  Ambience,
  MediaControls,
  XOption as Option,
  Panel_default as Panel,
  PanelManager,
  Preloader_default as Preloader,
  XSelect as Select
};
