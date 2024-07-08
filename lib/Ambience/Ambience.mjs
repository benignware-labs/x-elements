const MEDIA_TAGS = ['IMG', 'VIDEO'];

class Ambience extends HTMLElement {
  #assignedChildren;
  #mutationObservers;
  #mediaElements;
  #displayElements;
  #backdrop;
  #backdropBody;

  static observedAttributes = ['for'];

  constructor() {
    super();

    this.handleMutation = this.handleMutation.bind(this);
    this.handleSlotChange = this.handleSlotChange.bind(this);
    this.handleResize = this.handleResize.bind(this);
    this.handleLoad = this.handleLoad.bind(this);

    this.attachShadow({ mode: 'open' });

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
    this.#assignedChildren = new Set();
    this.#mediaElements = new Set();
    this.#displayElements = new WeakMap();
    this.#mutationObservers = new WeakMap();
  }

  handleMutation(mutations) {
    mutations.forEach((mutation) => {
      mutation.addedNodes
        .filter(node => node.nodeType === 1 && MEDIA_TAGS.includes(node.nodeName))
        .forEach(node => this.mediaElementAdded(node));
      
       mutation.removedNodes
        .filter(node => node.nodeType === 1 && MEDIA_TAGS.includes(node.nodeName))
        .forEach(node => this.mediaElementRemoved(node));
    });
  }

  createDisplayElement(element) {
    let displayElement;
  
    if (element instanceof HTMLMediaElement) {
      const canvas = document.createElement('canvas');
      const poster = document.createElement('img');

      poster.src = element.poster;
      poster.style.width = '100%';
      poster.style.height = '100%';
      poster.style.position = 'absolute';

      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.position = 'absolute';

      displayElement = document.createElement('div');
      
      displayElement.appendChild(canvas);
      displayElement.appendChild(poster);
    }

    if (!displayElement) {
      displayElement = element.cloneNode(true);
    }

    displayElement.style.transition = 'opacity 0.12s';

    return displayElement;
  }

  mediaElementAdded(...element) {
    element.forEach(element => {
      this.#mediaElements.add(element);
      const displayElement = this.createDisplayElement(element);
      this.#backdropBody.appendChild(displayElement);
      this.#displayElements.set(element, displayElement);

      element.addEventListener('load', this.handleLoad);
    });

    this.render();
  }

  mediaElementRemoved(...element) {
    element.forEach(element => {
      this.#mediaElements.delete(element);
      this.#backdropBody.removeChild(displayElement);
      this.#displayElements.delete(element);

      element.removeEventListener('load', this.handleLoad);
    });

    this.render();
  }

  addTargetElement(...elements) {
    elements
      .filter(element => !this.#assignedChildren.has(element))
      .forEach(element => {
        this.#assignedChildren.add(element);
        const mutationObserver = new MutationObserver(this.handleMutation);
        
        mutationObserver.observe(element, {
          childList: true,
          subtree: true
        });

        this.#mutationObservers.set(element, mutationObserver);
      
        const nodes = [...element.querySelectorAll(MEDIA_TAGS.join(', '))];
        
        if (MEDIA_TAGS.includes(element.nodeName)) {
          nodes.push(element);
        }

        this.mediaElementAdded(...nodes);
      });
  }

  removeTargetElement(...elements) {
    elements
      .filter(element => this.#assignedChildren.has(element))
      .forEach(element => {
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
    if (this.hasAttribute('for')) {
      return;
    }

    const slot = e.target;
    const assignedElements = [...this.#assignedChildren];
    const removedNodes = assignedElements.filter(x => !slot.assignedElements().includes(x));
    const addedNodes = slot.assignedElements().filter(x => !assignedElements.includes(x));

    this.addTargetElement(...addedNodes);
    this.removeTargetElement(...removedNodes);
  }

  handleResize() {
    this.render();
  }

  handleLoad(event) {
    console.log('handleLoad', event.target.src);
    window.requestAnimationFrame(() => {
      this.render();
    });
  }

  connectedCallback() {
    const slot = this.shadowRoot.querySelector('slot');

    slot.addEventListener('slotchange', this.handleSlotChange);
    window.addEventListener('resize', this.handleResize);
  }

  detachedCallback() {
    window.removeEventListener('resize', this.handleResize);
  }

  get clipArea() {
    let bounds = [...this.#assignedChildren].reduce((bounds, element) => {
      const elementBounds = element.getBoundingClientRect();

      bounds.top = Math.min(bounds.top, elementBounds.top);
      bounds.left = Math.min(bounds.left, elementBounds.left);
      bounds.bottom = Math.max(bounds.bottom, elementBounds.bottom);
      bounds.right = Math.max(bounds.right, elementBounds.right);
      
      return bounds;
    }, {
      top: Infinity,
      left: Infinity,
      bottom: -Infinity,
      right: -Infinity
    });

    // const scrollY = window.scrollY;
    // const scrollX = window.scrollX;

    // bounds.top = scrollY + Math.max(0, bounds.top);
    // bounds.left = scrollX + Math.max(0, bounds.left);
    // bounds.bottom = scrollY + Math.min(window.innerHeight, bounds.bottom);
    // bounds.right = scrollX + Math.min(window.innerWidth, bounds.right);

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
      // console.log('element: ', element);
      // Get the top, left coordinates of two elements
      const style = window.getComputedStyle(element);

      // if (style.display === 'none') {
      //   console.log('DISPLAY NONE');
      //   element.style.display = 'block';
      // }

      const copyStyles = ['filter', 'transition', 'visibility'];

      let elementBounds = element.getBoundingClientRect();
      

      // element.style.display = '';

      // Calculate the top and left positions
      const top = elementBounds.top - targetBounds.top;
      const left = elementBounds.left - targetBounds.left;

      const displayElement = this.#displayElements.get(element);

      // element.style.opacity = 0.1;
      // element.style.outline = '2px solid red';

      displayElement.style.display = 'block';

      displayElement.style.marginLeft = '0';
      displayElement.style.marginTop = '0';
      displayElement.style.margin = '0';

      displayElement.style.position = 'absolute';

      copyStyles.forEach(name => {
        displayElement.style[name] = style[name];
      });

      if (elementBounds.width > 0 && elementBounds.height > 0) {
        // displayElement.style.top = `${top}px`;
        // displayElement.style.left = `${left}px`;
        displayElement.style.transform = `translate(${left}px, ${top}px)`;

        displayElement.style.width = `${elementBounds.width}px`;
        displayElement.style.height = `${elementBounds.height}px`;
        displayElement.style.opacity = 1;
      } else {
        displayElement.style.opacity = 0;
      }
      // displayElement.style.border = '2px solid green';

      if (element instanceof HTMLMediaElement) {
        const canvas = displayElement.querySelector('canvas');
        const poster = displayElement.querySelector('img');
        
        const isPoster = element.poster && element.played.length === 0;

        poster.style.display = isPoster ? 'block' : 'none';

        if (!isPoster) {
          canvas.width = elementBounds.width;
          canvas.height = elementBounds.height;

          const context = canvas.getContext('2d');
          context.drawImage(element, 0, 0, canvas.width, canvas.height);
        }
      }
    }

    const clipArea = this.clipArea;

    const clipPath = `polygon(${clipArea.left}px ${clipArea.top}px,${clipArea.right}px ${clipArea.top}px,${clipArea.right}px ${clipArea.bottom}px,${clipArea.left}px ${clipArea.bottom}px)`;

    // console.log('clipPath: ', clipArea, clipPath);

    this.#backdropBody.style.clipPath = clipPath;
  
    window.requestAnimationFrame(() => {
      this.render();
    });
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) {
      return;
    }

    if (name === 'for') {
      const targetElement = document.querySelector(`#${newValue}`);

      if (targetElement) {
        this.removeTargetElement(targetElement);
        this.addTargetElement(targetElement);
      }
    }
  }
}

if (!customElements.get('x-ambience')) {
  customElements.define('x-ambience', Ambience);
}

export default Ambience;