---
title: Getting Started
---

# Getting Started

## Fundamentals of Displaying Images

In this minimum example, we will draw a section of a 3D volume from a CT series.
Make sure CIRCUS RS is properly installed. (See [Install](install.html))

JavaScript:

```js
const series = 'your-series-instance-uid';
const server = 'https://your-rs-server/';

// Create a new ImageSource
const src = new circusrs.DynamicImageSource({ series, server });

// Assign your ImageSource to a new Composition
const comp = new circusrs.Composition();
comp.setImageSource(src);

// Assign the composition to a new Viewer
const viewer = new circusrs.Viewer(
    document.getElementById('viewer')
);
viewer.setComposition(comp);
```

HTML:

```html
...
<body>
    <div id="viewer"></div>
</body>
...
```

Result:

［画像］

If you do not see any image displayed, check the followings:

- Make sure CIRCUS RS server is running and properly set up with an appropriate image instance ID.
  Check if the server is connectable by viewing `http://your-rs-server/status` on your browser.
- Make sure CIRCUS RS client script is loaded in your HTML page.
- Make sure you're using a modern browser that supports `Promise`. Internet Explorer is currently not supported.

An `ImageSource` instance represents the image drawn on the HTML page.
A `DynamicImageSource` is a subclass of `ImageSource`, and we will be soon
discussing the other types of `ImageSource`s later.

A `Viewer` instance is the viewer comonent itself, which makes one HTML canvas
element and handles everything drawn on that canvas.

To associate the viewer and the image to display, we are using a `Composition`
instance, which is a rather simple container class.
In this example the use of `Composition` may seem redundant,
but a composition is used to associate multiple **annotations** to the image.


## Handling View States

Now we know how to display a single section.

The next step is to understand so-called a **view state**.
Inside of the viewer, all images are drawn to the canvas by passing
a view state to the `ImageSource` instance.

A view state is a plain object (i.e., not a class instance) that determines
the condition under which the `ImageSource` is displayed.

For example, here is how a view state looks like after a viewer was
properly initialized and the first section was properly displayed:

```js
var viewState = {
    "window": { // display window
        "level": 60, // window level
        "width": 400 // window width
    },
    "section": { // 3D section
        "origin": [ 0, 0, 209.5 ], // the top-left corner of the section
        "xAxis": [ 293, 0, 0 ], // the orientation and size of the x-axis of the section
        "yAxis": [ 0, 293, 0 ] // the orientation and size of the y-axis of the section
    }
}
```

In this example, we can see the viewer is currently Displaying an axial slice
of the original 3D volume, because `xAxis` and `yAxis` is in parallel with
the x- and y- axis of the original volume, respectively.

A `ImageSource` instance functions *asynchronously* using JavaScript Promise.
It also needs a preparation process, for example for loading a volume data
over HTTP. A drawing request to a `ImageSource` when it is not yet ready
will result in a runtime exception.

Whether a `ImageSource` is ready for drawing can be determined using
`ImageSourece#ready()` method, which return a Promise instance which
resolves when the `ImageSource` is ready.
Before the `ImageSource` becomes ready, the view state is not available either.

```js
src.ready().then(() => {
    const state = viewer.getState();
    console.log(JSON.stringify(state, null, '  '));
});
```

// TODO: イベントベースに書き換え

## Setting View States Programmatically

Let's try viewing the volume from another angle by modifying the
view state of the viewer.

JavaScript

```js
src.ready().then(() => {
    // getState() returns the current ViewState
    const state = viewer.getState();

    // mmDim returns the size of the volume in mm
    const [width, height, depth] = src.mmDim();

    // Modify the ViewState...
    state.section.origin = [0, height / 2, 0];
    state.section.xAxis = [width, 0, 0];
    state.section.yAxis = [0, 0, depth];

    // ...and assign it again to the Viewer
    viewer.setState(state);
} );
```

In general, here is how to modify the view state:

0. Get the current view state via `Viewer#getState()`
0. Modify the view state as you like
0. Update the view state via `Viewer#setState()`

The actual drawing of `setState()` is delayed to the end of the
current browser event loop. If you like, you can call `setState()`
multiple times with very small performance impact. The actual
rendering procedure will be occurred one in an event loop at most.
{:.alert .alert-info}
