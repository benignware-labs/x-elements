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
    poster="https://picsum.photos/id/888/800/450"
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

## Example: Clip

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

## Example: Nested Clip
<!-- Example -->

```html
<x-ambience>
  <div class="overflow root">
    <h4>Image 1</h4>
    <img
        src="https://picsum.photos/id/456/800/450"
        style="aspect-ratio: 16/9; width: 900px; height: auto; "
      />
    <div class="overflow container">
      <h4>Image 2</h4>
      <img
        src="https://picsum.photos/id/643/800/450"
        style="aspect-ratio: 16/9; width: 1600px; height: auto; "
      />
    </div>
  </div>
</x-ambience>
```

```css
.overflow {
  overflow: auto;
  width: 100%;
  height: 300px
}

```



## Example: Clip with fixed elements

<!-- Example -->
```html
<div id="cliptest" class="cover">
  <img
    src="https://picsum.photos/id/56/800/450"
    style="aspect-ratio: 16/9; width: 100%; height: 100%; position: fixed; top: 0; bottom: 0; object-fit: cover"
  />
</div>
<x-ambience for="cliptest" />
```

```css
.cover {
  overflow: hidden;
  width: 100%;
  height: 300px;
  clip-path: polygon(0 0, 100% 0, 100% 100%, 0% 100%);
}
```



## Example: Slider

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
<x-ambience>
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
          src="https://picsum.photos/id/445/800/450"
          style="aspect-ratio: 16/9; width: 400px; height: auto; "
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
          poster="https://picsum.photos/id/621/800/450"
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
</x-ambience>
```




## Example: States and Transitions

<!-- Example -->
```html

<x-ambience>
  <div class="thumbnails">
    <img
      src="https://picsum.photos/id/19/800/450"
      class="img"
      onclick="this.classList.toggle('active')"
    />
    <img
      src="https://picsum.photos/id/19/800/450"
      class="img animated"
      onclick="this.classList.toggle('active')"
    />
  </div>
</x-ambience>
```

```css
.thumbnails {
  display: flex;
  gap: 1.5rem;
  position: relative;
  z-index: 1;
}

.img {
  aspect-ratio: 1;
  object-fit: cover;
  width: 100px;
  height: auto;
  filter: grayscale(100%);
  clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
  scale: 1;
}

.img.animated {
  transition: all .15s ease-in-out;
}

.img:hover {
  filter: grayscale(0);
  clip-path: polygon(50% 0%, 73% 17%, 98% 35%, 89% 61%, 79% 91%, 49% 91%, 21% 91%, 11% 63%, 2% 35%, 26% 18%);
  scale: 1.1;
}
```

