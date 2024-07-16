const MEDIA_TAGS = ['IMG', 'VIDEO'];

// Copy computed styles from another element
function copyStyles(dest, src, props = []) {
  const srcStyle = window.getComputedStyle(src);
  const destStyle = window.getComputedStyle(dest);


  for (let i = 0; i < srcStyle.length; i++) {
    const property = srcStyle.item(i);

    if (!props.length || props.includes(property)) {
      const fresh = srcStyle.getPropertyValue(property);
      const current = destStyle.getPropertyValue(property);

      if (fresh !== current) {
        dest.style.setProperty(property, fresh)
      }
    }
  }
}

const getScrollParent = (element, stop = null, values = ['scroll', 'auto']) => {
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

const getScrollParents = (element, stop = null, values = ['scroll', 'auto']) => {
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

const getScrollSize = (element) => {
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
  #internals;
  #slot;

  #assignedChildren = new Set();
  #mutationObservers = new WeakMap();
  #mediaElements = new Set();

  #clippingTargets = new Set();
  #clippingParents = new WeakMap();
  
  #clippingDisplayElements = new WeakMap();
  #displayElements = new WeakMap();
  #displayMediaElements = new WeakMap();
  #displayIds = new WeakMap();
  #displayIdInc = 0;

  #animatedElements = new Set();
  #elementAnimations = new WeakMap();

  #scrollParent = null;

  #backdrop;
  #backdropBody;

  // Props
  #animated = false;
  #for = null;

  static observedAttributes = ['for', 'animated'];

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
    this.attachShadow({ mode: 'open' });

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
    this.#slot = this.shadowRoot.querySelector('slot');
  }

  isMediaElement(element) {
    const isMediaTag = MEDIA_TAGS.includes(element.nodeName);

    if (!isMediaTag) {
      return false;
    }

    const parentAmbience = element.closest('x-ambience');

    if (parentAmbience && parentAmbience !== this) {
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
      const addedMediaElements = [...mutation.addedNodes]
        .filter(node => node.nodeType === 1 && MEDIA_TAGS.includes(node.nodeName))
      
      this.mediaElementAdded(...addedMediaElements)

      const removedMediaElements = [...mutation.removedNodes]
        .filter(node => node.nodeType === 1 && MEDIA_TAGS.includes(node.nodeName))
      
      this.mediaElementRemoved(...removedMediaElements)
      
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
    const displayElement = document.createElement('div');

    const slot = displayElement;

    // const slot = document.createElement('div');
    // const slot = document.createElement('slot');
    // const slotId = this.getDisplayId(element);
    
    // slot.setAttribute('name', 'display-' + slotId);

    // displayElement.appendChild(slot);

    let mediaDisplayElement;
  
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
      
      slot.appendChild(canvas);
      slot.appendChild(poster);

      mediaDisplayElement = canvas;

      
    } else {
      mediaDisplayElement = element.cloneNode(true);

      slot.appendChild(mediaDisplayElement);
    }

    this.#displayMediaElements.set(element, mediaDisplayElement);

    this.updateMediaElementStyles(element);

    displayElement.classList.add('display');
    displayElement.setAttribute('part', 'display');

    return displayElement;
  }

  clippingTargetAdded(element,) {
    element.addEventListener('scroll', this.handleScroll, { passive: true });
  }

  clippingTargetRemoved(element) {
    element.removeEventListener('scroll', this.handleScroll, { passive: true });

    this.#clippingDisplayElements.delete(element);
  }

  createClippingDisplayElement(element) {
    const clippingDisplayElement = document.createElement('div');

    clippingDisplayElement.setAttribute('part', 'clip');
    clippingDisplayElement.setAttribute('data-class', element.getAttribute('class'));
    clippingDisplayElement.setAttribute('data-tag', element.tagName);

    return clippingDisplayElement;
  }


  mediaElementAdded(...element) {
    const targetElements = [...this.#assignedChildren];

    element.forEach(element => {
      this.#mediaElements.add(element);

      const scrollParents = getScrollParents(element, targetElements, ['scroll', 'auto', 'hidden', 'clip']);

      scrollParents
        .reverse()
        .forEach((scrollParent, index, array) => {
          const parent = index > 0 ? array[index - 1] : null;

          if (!this.#clippingTargets.has(scrollParent)) {
            this.#clippingTargets.add(scrollParent);

            if (!this.#clippingDisplayElements.get(scrollParent)) {
              const clippingDisplayElement = this.createClippingDisplayElement(scrollParent);

              clippingDisplayElement.classList.toggle('effect', !parent);

              const displayParent = this.#clippingDisplayElements.get(parent) || this.#backdropBody;
  
              displayParent.appendChild(clippingDisplayElement);
  
              this.#clippingDisplayElements.set(scrollParent, clippingDisplayElement);
              this.#clippingParents.set(scrollParent, parent);
            }

            this.clippingTargetAdded(scrollParent);
          }
        });

      const scrollParent = scrollParents.length ? scrollParents[scrollParents.length - 1] : null;
      const displayParent = this.#clippingDisplayElements.get(scrollParent) || this.#backdropBody;
      const displayElement = this.createDisplayElement(element);

      displayElement.classList.toggle('effect', !scrollParent);

      this.#displayElements.set(element, displayElement);
      this.#clippingParents.set(element, scrollParent);

      displayParent.appendChild(displayElement);
  
      // Load
      element.addEventListener('loadeddata', this.handleLoad, { passive: true });
      element.addEventListener('load', this.handleLoad, { passive: true });
      // Play
      element.addEventListener('play', this.handlePlay, { passive: true });
      // Pause
      element.addEventListener('pause', this.handlePause, { passive: true });
      

      if (element instanceof HTMLMediaElement) {
        const posterImage = displayElement.querySelector('img');

        if (posterImage) {
          posterImage.src = element.poster;

          posterImage.addEventListener('load', this.handleLoad, { passive: true });
        }
      }
    });

    this.mediaElementsChanged();
  }

  mediaElementRemoved(...element) {
    element.forEach(element => {
      // Load
      element.removeEventListener('loadeddata', this.handleLoad);
      element.removeEventListener('load', this.handleLoad);
      // Play
      element.removeEventListener('play', this.handlePlay);
      // Pause
      element.removeEventListener('pause', this.handlePause);
     

      const displayElement = this.#displayElements.get(element);

      if (element instanceof HTMLMediaElement) {
        const posterImage = displayElement.querySelector('img');

        if (posterImage) {
          posterImage.removeEventListener('load', this.handleLoad, { passive: true });
        }
      }

      displayElement.parentNode.removeChild(displayElement);
      
      this.#displayElements.delete(element);
      this.#clippingParents.delete(element);

      this.#mediaElements.delete(element);
    });

    this.mediaElementsChanged();
  }

  addTargetElement(...elements) {
    const addedMediaElements = [];
  
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

        element.addEventListener('animationstart', this.handlePlay, { passive: true });
        element.addEventListener('transitionstart', this.handlePlay, { passive: true });
        element.addEventListener('animationend', this.handlePause, { passive: true });
        element.addEventListener('transitionend', this.handlePause, { passive: true });

        // Generic state change
        element.addEventListener('click', this.handleStateChange, { passive: true });
        element.addEventListener('pointerover', this.handleStateChange, { passive: true });
        element.addEventListener('pointerenter', this.handleStateChange, { passive: true });
        element.addEventListener('pointerleave', this.handleStateChange, { passive: true });
      
        const nodes = [...element.querySelectorAll(MEDIA_TAGS.join(', '))];
        
        if (MEDIA_TAGS.includes(element.nodeName)) {
          nodes.push(element);
        }
        
        addedMediaElements.push(...nodes);
      });

    this.mediaElementAdded(...addedMediaElements);
  }

  removeTargetElement(...elements) {
    const removedMediaElements = [];

    elements
      .filter(element => this.#assignedChildren.has(element))
      .forEach(element => {
        const mutationObserver = this.#mutationObservers.get(element);

        mutationObserver.disconnect();

        this.#mutationObservers.delete(element);

        element.removeEventListener('animationstart', this.handlePlay);
        element.removeEventListener('transitionstart', this.handlePlay);
        element.removeEventListener('animationend', this.handlePause);
        element.removeEventListener('transitionend', this.handlePause);

        element.removeEventListener('click', this.handleStateChange);
        element.removeEventListener('pointerover', this.handleStateChange);
        element.removeEventListener('pointerenter', this.handleStateChange);
        element.removeEventListener('pointerleave', this.handleStateChange);

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
    if (this.hasAttribute('for')) {
      return;
    }

    const slot = e.target;
    const assignedElements = [...this.#assignedChildren];
    const removedNodes = assignedElements.filter(x => !slot.assignedElements().includes(x));
    const addedNodes = slot.assignedElements().filter(x => !assignedElements.includes(x));

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
      elementAnimations = new Set();
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
    if (event.type === 'play' || event.type === 'pause') {
      return `playback`;
    }

    if (event.type === 'animationstart' || event.type === 'animationend') {
      return `animation-${event.animationName}`;
    }

    if (event.type === 'transitionstart' || event.type === 'transitionend') {
      return `transition-${event.propertyName}`;
    }
  
    return null;
  }

  handlePlay(event) {
    this.startAnimation(event.target, this.getAnimationId(event))
  }

  handlePause(event) {
    this.endAnimation(event.target, this.getAnimationId(event))
  }

  isAnimating() {
    return this.#animated || this.#elementAnimations.size > 0;
  }

  set animated(value) {
    this.#animated = value;
    
    this.animate();
  }

  get animated () {
    return this.#animated || this.#animatedElements.size > 0;
  }

  animate() {
    if (this.animated) {
      this.render();
    }

    window.requestAnimationFrame(() => {
      if (this.animated) {
        this.animate();
      };
    });
  }

  connectedCallback() {
    window.addEventListener('resize', this.handleResize, { passive: true });

    this.#slot.addEventListener('slotchange', this.handleSlotChange);
    

    this.#scrollParent = getScrollParent(this);

    const scrollTarget = this.#scrollParent === document.body ? window : this.#scrollParent;

    scrollTarget.addEventListener('scroll', this.handleScroll, { passive: true });

    this.render();
  }

  detachedCallback() {
    window.removeEventListener('resize', this.handleResize);
    this.#slot.removeEventListener('slotchange', this.handleSlotChange);

    const scrollTarget = this.#scrollParent === document.body ? window : this.#scrollParent;
    
    scrollTarget.removeEventListener('scroll', this.handleScroll);
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
    let zIndex = computedStyle.getPropertyValue('--x-ambience-z-index');

    if (!zIndex || zIndex === 'auto') {
      zIndex = !!getPositioonFixedParent(this) ? '' : -1;
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

    // const scale = !clippingParent ? 'var(--x-ambience-scale, var(--x-ambience-scale--default))' : '1';
    const style = clippingDisplayElement.style;

    const left = clippingArea.left - targetBounds.left;
    const top = clippingArea.top - targetBounds.top;

    // style.setProperty('transform', `translate3d(${clippingArea.left - targetBounds.left}px, ${clippingArea.top - targetBounds.top}px, 0) scale(${scale})`);

    // const scale = !clippingParent ? ' scale(var(--x-ambience-scale, var(--x-ambience-scale--default))) ' : '';
    const scale = '';

    style.setProperty('transform', `${scale}  translate3d(${left}px, ${top}px, 0) `);

    style.setProperty('width', `${clippingArea.width}px`);
    style.setProperty('height', `${clippingArea.height}px`);
  }

  updateClippingDisplayElements () {
    for (const element of this.#clippingTargets) {
      this.updateClippingDisplayElement(element);
    }
  }

  isElementReady(element) {
    if (element instanceof HTMLMediaElement) {
      if (element.poster && element.played.length === 0) {
        const displayElement = this.#displayElements.get(element);
        const poster = displayElement.querySelector('img');

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
      'object-fit',
      'object-position',
      'filter',
      'transform',
      'transform-origin',
      'transform-style',
      'opacity',
      'position',
      // 'top',
      // 'left',
      // 'right',
      // 'bottom',
      'clip-path',
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

    // const scale = !clippingParent ? ' translate(-50%, -50%) scale(var(--x-ambience-scale, var(--x-ambience-scale--default)))' : '';
    const scale = '  scale(var(--x-ambience-scale, var(--x-ambience-scale--default)))';

    const isRenderedBefore = displayElement.style.transform !== '';

      if (!isRenderedBefore || elementBounds.width > 0 && elementBounds.height > 0) {
        displayElement.style.setProperty('transform', `translate3d(${left}px, ${top}px, 0) ${scale} `);
        displayElement.style.setProperty('width', `${elementBounds.width}px`);
        displayElement.style.setProperty('height', `${elementBounds.height}px`);
        displayElement.style.setProperty('opacity', 1);
        displayElement.style.setProperty('display', '');

      } else if (isRenderedBefore) {
        displayElement.style.setProperty('opacity', 0);
        displayElement.style.setProperty('display', '');
      } else {
        displayElement.style.setProperty('display', 'none');
      }

    displayElement.style.setProperty('width', `${elementBounds.width}px`);
    displayElement.style.setProperty('height', `${elementBounds.height}px`);

    displayElement.setAttribute('part', this.isElementReady(element) ? 'display ready' : 'display');

    const mediaDisplayElement = this.#displayMediaElements.get(element);

    // TODO: Copy styles in a separate state handler
    // copyStyles(mediaDisplayElement, element);
    mediaDisplayElement.style.setProperty('visibility', window.getComputedStyle(element).visibility);

    mediaDisplayElement.style.setProperty('position', 'absolute');
    mediaDisplayElement.style.setProperty('top', '0');
    mediaDisplayElement.style.setProperty('bottom', '0');
    mediaDisplayElement.style.setProperty('transition-duration', '0s');
    mediaDisplayElement.style.setProperty('width', `${elementBounds.width}px`);
    mediaDisplayElement.style.setProperty('height', `${elementBounds.height}px`);

    if (element instanceof HTMLMediaElement) {
      const canvas = displayElement.querySelector('canvas');
      const poster = displayElement.querySelector('img');
      
      const isPoster = element.poster && element.played.length === 0;

      poster.style.setProperty('width', `${elementBounds.width}px`);
      poster.style.setProperty('height', `${elementBounds.height}px`);
      poster.style.setProperty('object-fit', 'cover');
      poster.style.setProperty('display', isPoster ? 'block' : 'none');

      if (!isPoster) {
        canvas.width = elementBounds.width;
        canvas.height = elementBounds.height;

        const context = canvas.getContext('2d');
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

    scrollParent.classList.add('x-ambience-scroll-measure');

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
    backdrop.style.overflow = 'hidden';

    backdrop.style.transform = `translate3d(${left}px, ${top}px, 0)`;

    backdropBody.style.transform = `translate3d(${-left}px, ${-top}px, 0)`;

    scrollParent.classList.remove('x-ambience-scroll-measure');
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

    // this.clipToParent();


    const zIndex = this.getZIndex();

    this.#backdrop.style.setProperty('z-index', zIndex);

    this.updateClippingDisplayElements();
    this.updateMediaElements();
  }


  set for(value) {
    if (value !== this.for) {
      if (value) {
        this.setAttribute('for', value);
      } else {
        this.removeAttribute('for');
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
      const isBool = typeof (this[name]) === 'boolean';
      const value = isBool ? this.hasAttribute(name) : newValue;

      if (value !== this[name]) {
        this[name] = value;
      }
    }
  }
}

if (!customElements.get('x-ambience')) {
  customElements.define('x-ambience', Ambience);
}

export default Ambience;