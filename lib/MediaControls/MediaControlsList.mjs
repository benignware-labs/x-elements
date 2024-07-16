const isEqualSets = (set1, set2) => {
  if (set1.size !== set2.size) {
    return false;
  }

  for (const item of set1) {
    if (!set2.has(item)) {
      return false;
    }
  }

  return true;
}

const cloneSet = (set) => new Set([...set]); 

export class MediaControlsList extends Set {
  #callback;

  constructor(callback = () => {}) {
    super();

    this.#callback = callback;
  }

  add(value) {
    const before = cloneSet(this);

    value?.split(/\s+/).forEach(value => super.add(value));

    if (!isEqualSets(before, this)) {
      this.#callback();
    }
  }

  delete(value) {
    const before = cloneSet(this);

    value?.split(/\s+/).forEach(value => super.delete(value));

    if (!isEqualSets(before, this)) {
      this.#callback();
    }
  }

  clear() {
    const before = cloneSet(this);

    super.clear();

    if (!isEqualSets(before, this)) {
      this.#callback();
    }
  }

  toString() {
    return Array.from(this).join(' ');
  }
}
