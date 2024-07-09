const MEDIA_TAGS = ['IMG', 'VIDEO'];

const getScrollParent = (element) => {
  let parent = element;

  while (parent) {
    if (parent === document.body) {
      return parent;
    }
    
    const style = window.getComputedStyle(parent);

    if (style.overflowY === 'scroll' || style.overflowY === 'auto') {
      return parent;
    } else {
      parent = parent.parentElement;
    }
  }

  return document.body;
};

const getScrollSize = (element) => {
  let container = element;

  if (element === document.body) {
    container = document.documentElement;
  }

  return {
    width: container.scrollWidth,
    height: container.scrollHeight
  };
};


const getPositioonFixedParent = (element) => {
  let parent = element;

  while (parent) {
    const style = window.getComputedStyle(parent);

    if (style.position === 'fixed') {
      return parent;
    } else {
      parent = parent.parentElement;
    }
  }

  return null;
};

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
        }

        :host::part(backdrop) {
          position: absolute;
          /*z-index: -1;*/
          transform-style: preserve-3d;
          /*filter: contrast(2) blur(3.5rem) opacity(0.5) brightness(2.7);*/
          filter: var(--x-ambience-filter, blur(3rem));
          /*pointer-events: none;*/
          /*transform: translate3d(0, 0, 0);*/
          /*height: 0;
          width: 0;*/
          max-width: 100vw;
          /*outline: 2px solid red;*/
          /*background: yellow;*/
        }
        
        :host::part(backdrop-body) {
          position: absolute;
          transform: translate3d(0, 0, 0);
          transform-style: preserve-3d;
          width: 0;
          height: 0;
        }

        :host::part(body) {
          position: relative;
        }
      </style>
      <div part="body">
        <div part="backdrop">
          <div part="backdrop-body"></div>
        </div>
        <slot></slot>
      </div>
    `;

    this.#backdrop = this.shadowRoot.querySelector('[part="backdrop"]');
    this.#backdropBody = this.shadowRoot.querySelector('[part="backdrop-body"]');
    this.#assignedChildren = new Set();
    this.#mediaElements = new Set();
    this.#displayElements = new WeakMap();
    this.#mutationObservers = new WeakMap();
  }

  isMediaElement(element) {
    const isMediaTag = MEDIA_TAGS.includes(element.nodeName);

    if (!isMediaTag) {
      return false;
    }

    const parentAmbience = element.closest('x-ambience');

    if (parentAmbience !== this) {
      return false;
    }

    const forAmbiences = document.querySelectorAll(`x-ambience[for]`);

    for (const ambience of forAmbiences) {
      if (ambience.getAttribute('for') === element.id && ambience !== this) {
        return false;
      }
    }

    return true;
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

    displayElement.style.transition = 'opacity 4.52s';

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

  clipBackdrop() {
    const scrollParent = getScrollParent(this);

    // const scrollBounds = scrollParent.getBoundingClientRect();
    // let backdropBounds = this.#backdrop.getBoundingClientRect();

    // backdropBounds = {
    //   top: top - scrollBounds.top,
    //   left: left - scrollBounds.left,
    //   right: Math.min(scrollBounds.right, backdropBounds.right),
    //   bottom: Math.min(scrollBounds.bottom, backdropBounds.bottom)
    // };

    // const top = Math.max(scrollBounds.top, backdropBounds.top);
    // const left = Math.max(scrollBounds.left, backdropBounds.left);
    // const right = Math.min(scrollBounds.right, backdropBounds.right);
    // const bottom = Math.min(scrollBounds.bottom, backdropBounds.bottom);

    // this.#backdrop.style.top = `${top}px`;
    // this.#backdrop.style.left = `${left}px`;
    // this.#backdrop.style.right = `${right}px`;
    // this.#backdrop.style.bottom = `${bottom}px`;
  }

  render() {
    const backdrop = this.#backdrop;
    
    backdrop.style.transform = '';
    backdrop.style.width = '0px';
    backdrop.style.height = '0px';

    let targetBounds = backdrop.getBoundingClientRect();

    backdrop.style.display = 'none';

    const scrollParent = getScrollParent(this);

    const scrollBounds = scrollParent.getBoundingClientRect();

    const relScrollBounds = {
      top: scrollBounds.top - targetBounds.top,
      left: scrollBounds.left - targetBounds.left,
      right: scrollBounds.right - targetBounds.left,
      bottom: scrollBounds.bottom - targetBounds.top
    };
  
    const { left, top } = relScrollBounds;

    let { width, height } = getScrollSize(scrollParent);

    backdrop.style.transform = `translate3d(${left}px, ${top}px, 0)`;
    backdrop.style.width = `${width}px`;
    backdrop.style.height = `${height}px`;
    backdrop.style.overflow = 'hidden';


    // backdrop.style.clipPath = `polygon(${left}px ${top}px,${left + width}px ${top}px,${left + width}px ${top + height}px,${left}px ${top + height}px)`;

    backdrop.style.display = 'block';

    targetBounds = backdrop.getBoundingClientRect();
   

    const positionFixedParent = getPositioonFixedParent(this);

    if (positionFixedParent) {
      backdrop.style.zIndex = '';
    } else {
      backdrop.style.zIndex = '-1';
    }

    if (this.#mediaElements.size === 0) {
      return;
    }


    for (const element of this.#mediaElements) {
      const style = window.getComputedStyle(element);

      const copyStyles = ['filter', 'transition', 'visibility'];

      let elementBounds = element.getBoundingClientRect();

      // Calculate the top and left positions
      const top = elementBounds.top - targetBounds.top;
      const left = elementBounds.left - targetBounds.left;

      const displayElement = this.#displayElements.get(element);

      displayElement.style.marginLeft = '0';
      displayElement.style.marginTop = '0';
      displayElement.style.margin = '0';

      displayElement.style.position = 'absolute';

      copyStyles.forEach(name => {
        displayElement.style[name] = style[name];
      });

      const isRenderedBefore = displayElement.style.transform !== '';

      if (!isRenderedBefore || elementBounds.width > 0 && elementBounds.height > 0) {
        displayElement.style.transform = `translate3d(${left}px, ${top}px, 0)`;
        displayElement.style.width = `${elementBounds.width}px`;
        displayElement.style.height = `${elementBounds.height}px`;
        displayElement.style.opacity = 1;
      } else if (isRenderedBefore) {
        displayElement.style.opacity = 0;
      } else {
        displayElement.style.display = 'none';
      }

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