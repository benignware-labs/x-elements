<!--
  dest: components/Panel.html
-->


# Panel

<!-- Example -->
```css
.panel {
  background-color: #f1f1f1;
  border: 1px solid #d3d3d3;
  padding: 10px;
  width: 300px;
  min-height: 300px;
  margin: 20px;
}

.wrapper-panel {
  position: relative;
  overflow: hidden;
  aspect-ratio: 4/3;
}
```

```html
<div class="wrapper-panel">
  <x-panel id="panel" orientation="center left" hidden>
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


