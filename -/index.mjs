// lib/Preloader/Preloader.mjs
var XPreloader = class _XPreloader extends HTMLElement {
  #internals;
  #assignedNodes = [];
  #mutationObserver;
  #queue = [];
  #body;
  static LOADER_TAGS = ["img", "video", "audio", "iframe", "link"];
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
      console.log("Mutation", mutation);
      mutation.addedNodes.forEach((node) => this.nodeAdded(node));
      mutation.removedNodes.forEach((node) => this.nodeRemoved(node));
      const oldValue = mutation.oldValue;
      const newValue = mutation.target.getAttribute(mutation.attributeName);
      if (mutation.oldValue !== null && oldValue !== newValue) {
        console.log("Attribute changed", mutation.attributeName, mutation.oldValue, newValue);
        this.#queue.push(mutation.target);
        this.update();
        this.handleItemLoadStart({ target: mutation.target });
      }
    });
  }
  nodeAdded(node) {
    console.log("Node added", node);
    if (_XPreloader.isLoaderNode(node)) {
      console.log("FOUND LOADER NODE:", node);
      node.addEventListener("load", this.handleItemLoad);
      node.addEventListener("error", this.handleItemError);
      if (!node.complete) {
        console.log("Node not complete", node);
        node.style.visibility = "hidden";
        this.#queue.push(node);
        this.update();
      }
    }
  }
  nodeRemoved(node) {
    console.log("Node removed", node);
    if (_XPreloader.isLoaderNode(node)) {
      console.log("FOUND LOADER NODE:", node);
      node.removeEventListener("load", this.handleItemLoad);
      node.removeEventListener("error", this.handleItemError);
    }
  }
  handleSlotChange(e) {
    console.log("SLOT CHANGE", e.target.assignedNodes());
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
    console.log("Item loaded", e.target, this.#queue.length);
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
    console.log("******** Complete ********");
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
    console.log("Connected");
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
export {
  XOption as Option,
  Preloader_default as Preloader,
  XSelect as Select
};
