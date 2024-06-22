class XPreloader extends HTMLElement {
  #internals;
  #assignedNodes = [];
  #mutationObserver;
  #queue = [];
  #body;

  static LOADER_TAGS = ['img', 'video', 'audio', 'iframe', 'link'];

  static isLoaderNode(node) {
    if (node.nodeType !== 1) {
      return false;
    }
  
    return XPreloader.LOADER_TAGS.includes(node.tagName.toLowerCase()) || Reflect.has(node, 'complete');
  }

  constructor() {
    super();

    this.handleMutation = this.handleMutation.bind(this);
    this.handleComplete = this.handleComplete.bind(this);
    this.handleSlotChange = this.handleSlotChange.bind(this);
    this.handleItemLoad = this.handleItemLoad.bind(this);
    this.handleItemLoadStart = this.handleItemLoadStart.bind(this);
    this.handleItemError = this.handleItemError.bind(this);

    this.attachShadow({ mode: 'open' });

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
    // this.#internals.states.add('--loading');

    const slot = this.shadowRoot.querySelector('slot');

    slot.addEventListener('slotchange', this.handleSlotChange);

    this.#mutationObserver = new MutationObserver(this.handleMutation);

    this.#mutationObserver.observe(slot, {
      childList: true,
      subtree: true
    });

    this.#body = this.shadowRoot.querySelector('.body');
  }

  handleMutation(mutations) {
    mutations.forEach((mutation) => {
      console.log('Mutation', mutation);
      mutation.addedNodes.forEach(node => this.nodeAdded(node));
      mutation.removedNodes.forEach(node => this.nodeRemoved(node));

      const oldValue = mutation.oldValue;
      const newValue = mutation.target.getAttribute(mutation.attributeName);

      if (mutation.oldValue !== null && oldValue !== newValue) {
        console.log('Attribute changed', mutation.attributeName, mutation.oldValue, newValue);
        this.#queue.push(mutation.target);
        this.update();
        this.handleItemLoadStart({ target: mutation.target });
      }
    });
  }

  nodeAdded(node) {
    console.log('Node added', node);
    if (XPreloader.isLoaderNode(node)) {
      console.log('FOUND LOADER NODE:', node);
      node.addEventListener('load', this.handleItemLoad);
      node.addEventListener('error', this.handleItemError);

      // this.#mutationObserver.observe(node, {
      //   attributes: true,
      //   attributeFilter: ['src', 'srcset', 'poster', 'href'],
      //   attributeOldValue: true
      // });

      if (!node.complete) {
        console.log('Node not complete', node);
        node.style.visibility = 'hidden';
        this.#queue.push(node);
        this.update();
      }
    }
  }

  nodeRemoved(node) {
    console.log('Node removed', node);
    if (XPreloader.isLoaderNode(node)) {
      console.log('FOUND LOADER NODE:', node);
      node.removeEventListener('load', this.handleItemLoad);
      node.removeEventListener('error', this.handleItemError);

      // this.#mutationObserver.unobserve(node);
    }
  }

  handleSlotChange(e) {
    console.log('SLOT CHANGE', e.target.assignedNodes());
    const removedNodes = this.#assignedNodes.filter(x => !e.target.assignedNodes().includes(x));
    const addedNodes = e.target.assignedNodes().filter(x => !this.#assignedNodes.includes(x));

    this.#assignedNodes = addedNodes;

    addedNodes
      .filter(node => node.nodeType === 1)
      .forEach(node => {
        this.#mutationObserver.observe(node, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['src', 'srcset', 'poster', 'href'],
          attributeOldValue: true
        });
      
        const descendants = node.querySelectorAll('*');
        descendants.forEach(descendant => this.nodeAdded(descendant));

        this.nodeAdded(node);
      });

    removedNodes
      .filter(node => node.nodeType === 1)
      .forEach(node => {
        this.#mutationObserver.unobserve(node);
      });
  }

  update() {
    if (this.#queue.length === 0) {
      this.handleComplete();
    } else {
      this.#internals.states.add('--loading');
    }
  }

  handleItemLoadStart(e) {
    // console.log('$$$$$$$ Item load start', e);
  }

  handleItemLoad(e) {
    this.#queue = this.#queue.filter(x => x !== e.target);
    console.log('Item loaded', e.target, this.#queue.length);
    
    e.target.style.visibility = '';

    this.update();
  }

  handleItemError(e) {
    console.log('Item error', e);
    this.#queue = this.#queue.filter(x => x !== e.target);
    this.#internals.states.delete('--loading');
    this.#internals.states.add('--error');

    this.update();
  }

  handleComplete() {
    console.log('******** Complete ********');
    this.#internals.states.delete('--loading');
    this.#internals.states.add('--complete');

    this.#assignedNodes.forEach(node => {
      if (node.nodeType === 1) {
        node.style.visibility = '';
      }
    });

    const loadEvent = new CustomEvent('load');

    this.dispatchEvent(loadEvent);
  }

  connectedCallback() {
    console.log('Connected');
  }
}

customElements.define('x-preloader', XPreloader);

export default XPreloader;