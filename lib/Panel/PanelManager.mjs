export default class PanelManager {
  #options;
  #panels;
  #next = null;
  #current = null;

  constructor(options = {}) {
    this._handleState = this._handleState.bind(this);
    this.#options = {
      groupBy: (panel) => panel.getAttribute('group') || panel.dataset.group,
      ...options
    };
    this.#panels = new Set();
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
      p.addEventListener('x-panel:shown', this._handleState);
      p.addEventListener('x-panel:hidden', this._handleState);
      this.#panels.add(p);
    }
  }

  remove(...panel) {
    for (const p of panel) {
      p.removeEventListener('x-panel:shown', this._handleState);
      p.removeEventListener('x-panel:hidden', this._handleState);
      this.#panels.delete(panel);
    }
  }

  clear() {
    this.#panels.forEach(panel => this.remove(panel));
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

    const groupBy = typeof this.#options.groupBy === 'string' ? (panel) => panel.getAttribute(this.#options.groupBy) : this.#options.groupBy;

    const others = panels.filter(panel => groupBy(panel) !== this.#next);
    
    others.forEach(panel => panel.hidden = true);

    const othersHidden = others.every(panel => panel.state === 'hidden');

    if (othersHidden && this.#current !== this.#next) {
      panels
        .filter(panel => groupBy(panel) === this.#next)
        .forEach(panel => panel.hidden = false)
      
      this.#current = this.#next;
      this.#next = null;
    }
  }
}