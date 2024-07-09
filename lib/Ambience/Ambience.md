<!--
  dest: components/Ambience.html
-->
# Ambience

Creates atmospheric backdrop for images and videos.


## Example: Image

<!-- Example -->
```html
<x-ambience>
  <img
    src="https://picsum.photos/id/56/800/450"
    style="aspect-ratio: 16/9; width: 100%; height: auto; "
  />
</x-ambience>
```


## Example: Video

<!-- Example -->
```html
<x-ambience>
  <video
    style="aspect-ratio: 16/9; width: 100%; height: auto; "
    src="http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
    poster="https://picsum.photos/id/352/800/450"
    loop
    muted
    playsinline
    controls
  ></video>
</x-ambience>
```


## Example: "for"-Attribute

<!-- Example -->
```html
<img
  id="testimg"
  src="https://picsum.photos/id/62/800/450"
  style="aspect-ratio: 16/9; width: 100%; height: auto; "
/>
<x-ambience for="testimg"/>
```


## Example: Overflow

<!-- Example -->

```css
.slider {
  overflow: hidden;
}

.slider-layer {
  display: flex;
  flex-wrap: nowrap;
  transition: transform 0.8s ease;
}

.slide {
  width: 100%;
  flex-shrink: 0;
  max-height: 400px;
  overflow: auto;
}

```

```js
let activeIndex = 0;
const slider = document.querySelector('#slider');

const layer = slider.querySelector('.slider-layer');

const slideTo = (index) => {
  activeIndex = index;
  
  layer.style.transform = `translateX(calc(-100% * ${activeIndex}))`;
}

slideTo(0);

slider.addEventListener('click', event => {
  console.log('click');
  const next = event.target.closest('.slider-next');

  if (next) {
    console.log('next');
    slideTo(activeIndex + 1 > layer.children.length - 1 ? 0 : activeIndex + 1);
  }

  const prev = event.target.closest('.slider-prev');

  if (prev) {
    slideTo(activeIndex - 1 < 0 ? layer.children.length - 1 : activeIndex - 1);
  }
})
```

```html

  <div id="slider" class="slider">
    <div class="slider-layer">
      <div class="slide">
        <h2>Slide 1</h2>
        <p>Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.</p>
        <p>Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.</p>
        <img
          src="https://picsum.photos/id/134/800/450"
          style="aspect-ratio: 16/9; width: 100%; height: auto; "
        />
        <p>Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.</p>
        <p>Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.</p>
      </div>
      <div class="slide">
        <h2>Slide 2</h2>
        <p>Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.</p>
        <img
          src="https://picsum.photos/id/678/800/450"
          style="aspect-ratio: 16/9; width: 200px; height: auto; "
        />
        <p>Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.</p>
      </div>
      <div class="slide">
        <h2>Slide 3</h2>
        <p>Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.</p>
        <p>Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.</p>
        <video
          style="aspect-ratio: 16/9; width: 100%; height: auto; "
          src="http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
          poster="https://picsum.photos/id/352/800/450"
          loop
          muted
          playsinline
          controls
        ></video>
        <p>Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.</p>
        <p>Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.</p>
      </div>
    </div>
    <button class="slider-next">Next</button>
    <button class="slider-prev">Prev</button>
  </div>
  <x-ambience for="slider"/>
```


## Example: Nested

<!-- Example -->
```html
<x-ambience>
  <img
    src="https://picsum.photos/id/256/800/450"
    style="aspect-ratio: 16/9; width: 100%; height: auto; "
  />
  <div>
    <x-ambience>
      <h4>Nested Ambience</h4>
      <img
        src="https://picsum.photos/id/526/800/450"
        style="aspect-ratio: 16/9; width: 100%; height: auto; "
      />
    </x-ambience>
    <h4>Nested Ambience with "for"-Attribute</h4>
    <img
      id="nested-img"
       src="https://picsum.photos/id/56/800/450"
      style="aspect-ratio: 16/9; width: 100%; height: auto; "
    />
    <x-ambience for="nested-img" />
  </div>
</x-ambience>
```



## Example: Clip to scroll parent
<!-- Example -->

```html
<x-ambience style="--x-ambience-filter: blur(4rem)">
 <div style="width: 100%; height: 300px; overflow: auto;">
    <img
      src="https://picsum.photos/id/56/800/450"
      style="aspect-ratio: 16/9; width: 3000px; height: auto; "
    />
  </div>
</x-ambience>
```
