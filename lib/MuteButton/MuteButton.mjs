export default class MuteButton extends HTMLButtonElement {
  constructor() {
    super();

    this.handleClick = this.handleClick.bind(this);
    this.handleVolumeChange = this.handleVolumeChange.bind(this);
  }

  handleClick(event) {
    if (!this.targetElement) {
      return;
    }

    this.targetElement.muted = !this.targetElement.muted;
  }

  handleVolumeChange(event) {
    console.log('volumechange', this.targetElement.muted);
    this.update();
  }

  connectedCallback() {
    if (!this.targetElement) {
      return;
    }

    this.addEventListener("click", this.handleClick);

    const elToWatch = this.targetElement.parentNode;

    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.removedNodes.contains(this.targetElement)) {
          console.log('REMOVED', this);
          this.targetElement.removeEventListener('volumechange', this.handleVolumeChange);
        }
      });
    });
    
    this.observer.observe(elToWatch, { childList: true, subtree: true});

    this.targetElement.addEventListener('volumechange', this.handleVolumeChange);

    this.update();
  }

  detachedCallback() {
    this.removeEventListener('click', this.handleClick);

    if (this.targetElement) {
      this.targetElement.removeEventListener('volumechange', this.handleVolumeChange);
    }
  }

  update() {
    if (!this.targetElement) {
      return;
    }

    const isMuted = this.targetElement.muted;

    this.querySelector('[slot="unmute"]').hidden = !isMuted;
    this.querySelector('[slot="mute"]').hidden = isMuted;
  }

  get targetElement() {
    const selector = this.dataset.target || this.getAttribute('target') || 'video';

    return document.querySelector(selector);
  }
}

customElements.define("x-mute-button", MuteButton, { extends: 'button' });
