export default class FullscreenButton extends HTMLButtonElement {
  constructor() {
    super();

    this.handleClick = this.handleClick.bind(this);
    this.handleFullscreenChange = this.handleFullscreenChange.bind(this);
  }

  get targetElement() {
    const selector = this.dataset.target || this.getAttribute('target');

    return selector ? document.querySelector(selector) : document.documentElement;
  }

  handleClick(event) {
    console.log('click', this.targetElement);
    if (!this.targetElement) {
      return;
    }

    if (!document.fullscreenElement) {
      this.targetElement.requestFullscreen().catch((err) => {
        alert(
          `Error attempting to enable fullscreen mode: ${err.message} (${err.name})`,
        );
      });
    } else {
      document.exitFullscreen();
    }
  }

  handleFullscreenChange(event) {
    if (!this.targetElement) {
      return;
    }

    if (document.fullscreenElement === this.targetElement && this.targetElement.tagName === 'VIDEO') {
      this.targetElement.setAttribute('controls', '');
    } else {
      if (!this._hasControls) {
        this.targetElement.removeAttribute('controls');
      }
    }
  
    this.update();
  }

  connectedCallback() {
    if (!this.targetElement) {
      return;
    }

    this.addEventListener("click", this.handleClick);
    document.addEventListener("fullscreenchange", this.handleFullscreenChange);

    if (this.targetElement.tagName !== 'VIDEO') {
      const elements = this.targetElement.querySelectorAll('video');

      elements.forEach((element) => {
        const controlsList = new Set((element.hasAttribute('controlsList') ? element.getAttribute('controlsList') : '').split(/\s+/));

        controlsList.add('nofullscreen');
        element.setAttribute('controlsList', [...controlsList].join(' '));
      });
    }

    this._hasControls = this.targetElement.hasAttribute('controls');

    this.targetElement.addEventListener('fullscreenchange', this.handleFullscreenChange);
    this.update();
  }

  detachedCallback() {
    this.removeEventListener('click', this.handleClick);
    document.addEventListener("fullscreenchange", this.handleFullscreenChange);
  }

  update() {
    if (!this.targetElement) {
      return;
    }

    const expand = this.dataset.expand ? this.querySelector(this.dataset.expand) : null;
    const compress = this.dataset.compress ? this.querySelector(this.dataset.compress) : null;
    const isFullscreen = !!document.fullscreenElement;

    if (expand) {
      expand.hidden = isFullscreen;
    }

    if (compress) {
      compress.hidden = !isFullscreen;
    }

    const expandSlot = this.querySelector('[slot="expand"]');
    const collapseSlot = this.querySelector('[slot="collapse"]');

    if (expandSlot) {
      expandSlot.hidden = isFullscreen;
    }

    if (collapseSlot) {
      collapseSlot.hidden = !isFullscreen;
    }
  }
}

customElements.define("x-fullscreen-button", FullscreenButton, { extends: 'button' });
