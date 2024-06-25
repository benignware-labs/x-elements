// (panel) => panel.getAttribute('group') || panel.dataset.group,

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

  remove(panel) {
    p.removeEventListener('x-panel:shown', this._handleState);
    p.removeEventListener('x-panel:hidden', this._handleState);
    this.#panels.delete(panel);
  }

  clear() {
    this.#panels.forEach(panel => this.remove(panel));
  }

  set(group) {
    console.log('set', group);
    this.#next = group;

    this._handleState();
  }

  get() {
    return this.#next !== null ? this.#next : this.#current;
  }
  
  _handleState() {
    console.log('HANDLE STATE', this.#next);
    if (this.#next === null) {
      return;
    }

    const panels = Array.from(this.#panels);

    const groupBy = typeof this.#options.groupBy === 'string' ? (panel) => panel.getAttribute(this.#options.groupBy) : this.#options.groupBy;

    const others = panels.filter(panel => groupBy(panel) !== this.#next);

    console.log('others: ', this.#next, others.length);
    
    others.forEach(panel => panel.hidden = true);

    const othersHidden = others.every(panel => panel.state === 'hidden');

    console.log('states', others.map(panel => panel.state), othersHidden);

    if (othersHidden && this.#current !== this.#next) {
      console.log('SHOW IT', this.#next);

      console.log(panels
        .map(panel => groupBy(panel)));
      
      panels
        .filter(panel => groupBy(panel) === this.#next)
        .forEach(panel => panel.hidden = false)
      
      this.#current = this.#next;
      this.#next = null;
    }
  }
}