<!--
  dest: components/Panel.html
-->

# Panel

## Basic Example
<!-- Example -->
```css
.panel {
  background-color: #f1f1f1;
  color: black;
  border: 1px solid #d3d3d3;
  padding: 10px;
  min-width: 200px;
  height: 100%;
  margin: 20px;
}

.wrapper {
  position: relative;
  overflow: hidden;
  aspect-ratio: 4/3;
}
```

```html
<div class="wrapper">
  <x-panel id="panel" orientation="right top left bottom">
    <div class="panel">
      <h1>Panel</h1>
      <p>This is a panel</p>
    </div>
  </x-panel>
  <button style="position: relative" onclick="panel = document.querySelector('#panel'); panel.hidden = !panel.hidden;">
    Toggle Panel
  </button>
</div>
```

```js
const panel = document.querySelector('#panel');

panel.addEventListener('x-panel:shown', (e) => console.log('SHOWN', e.target.state));
panel.addEventListener('x-panel:hidden', (e) => console.log('HIDDEN', e.target.state));
```

## Example: PanelManager

PanelManager lets you manage appearance of Panel groups

<!-- Example -->
```css
.panel {
  background-color: #f1f1f1;
  color: black;
  border: 1px solid #d3d3d3;
  padding: 10px;
  width: 150px;
  aspect-ratio: 3/4;
  margin: 20px;
  font-size: 16px;
}

.wrapper {
  position: relative;
  overflow: hidden;
  aspect-ratio: 4/3;
}
```

```html
<div id="wrapper" class="wrapper">
  <x-panel group="scene1" orientation="center left" animation="slide">
    <div class="panel">
      <h4>Scene 1</h4>
      <p>Left Panel</p>
      <button style="position: relative" onclick="this.closest('x-panel').hidden = true;">
        Close
      </button>
    </div>
  </x-panel>
  <x-panel group="scene1" orientation="center" animation="fade">
    <div class="panel">
      <h4>Scene 1</h4>
      <p>Centered Panel</p>
      <button style="position: relative" onclick="this.closest('x-panel').hidden = true;">
        Close Panel
      </button>
    </div>
  </x-panel>
  <x-panel group="scene2" orientation="center left" hidden>
    <div class="panel">
      <h4>Scene 2</h4>
      <p>This is Panel 2</p>
    </div>
  </x-panel>
  <x-panel group="scene2" orientation="center" animation="slide" hidden>
    <div class="panel">
      <h4>Scene 2</h4>
      <p>Centered Panel</p>
      <button style="position: relative" onclick="this.closest('x-panel').hidden = true;">
        Close Panel
      </button>
    </div>
  </x-panel>
  <x-panel group="scene3" orientation="center left" hidden>
    <div class="panel">
      <h4>Scene 3</h4>
      <p>This is Panel 3</p>
    </div>
  </x-panel>
  <div id="buttons">
    <button data-group="scene1">
      Scene 1
    </button>
    <button data-group="scene2">
      Scene 2
    </button>
    <button data-group="scene3">
      Scene 3
    </button>
  </div>
</div>
```

```mjs
import { PanelManager } from 'x-elements';

const manager = new PanelManager();

manager.add(...document.querySelectorAll('x-panel[group]'));

const buttons = document.querySelector('#buttons');

buttons.addEventListener('click', (e) => {
  const button = e.target.closest('[data-group]');

  if (button) {
    manager.set(button.dataset.group);
  }
});
```