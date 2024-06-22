---
  dest: components/Select.html
---

# Select

<!-- Example -->

```css
x-option {
  border: 1px solid #d3d3d3;
  padding: 10px;
  margin: 10px;
  display: inline-block;  
}

x-option:state(--selected) {
  background-color: white;
  color: black;
}
```


```html
<form id="selectExampleForm">
  <x-select name="test">
    <x-option value="item-1">
      Item 1
    </x-option>

    <x-option value="item-2">
      Item 2
    </x-option>

    <x-option value="item-3">
      Item 3
    </x-option>
  </x-select>
  <button type="submit">Submit</button>
</form>
```

```js
document
  .querySelector('#selectExampleForm')
  .addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    alert(formData.get('test')); 
  });
```