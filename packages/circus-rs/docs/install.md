---
title: Install
---

# Install

## Running Environment

### Server

- Node.js (8.9 or up)
- You will need a good amount of free RAM (several gegabytes) because CIRCUS RS Server needs to cache 3D volume data in memory.

### Client (Web Browser)

- 64-bit versions of modern browsers which understand HTML5 canvas and Promise. These include the latest versios of Google Chrome, Mozilla Firefox and Microsoft Edge, but not vanilla Internet Explorer. (IE11 may work with suffient polyfills).
- If you want to use `RawVolumeImageSource` or `HybridImageSource`, which holds 3D volume data in the RAM of client machines, you are recommend to use desktop machines with at least 8GB of RAM.

## Prerequisites

On developing with CIRCUS RS, you have to be able to use JavaScript and HTML. In particular, this documentation widely uses ES2015 syntax/functions such as Promises and classes.

In this documentation, we extensively use arrow functions, shorthand object property syntax and `let/const`. You don't have to use these syntax in your own code, although it's always recommended.

You don't need to be good at HTML canvas programming and DICOM image formats unless you are going to extend internal functions/classes of CIRCUS RS.

CIRCUS RS is distributed on NPM, the standard module-distribution system on the JavaScript world. Therefore, you need to have Node.js and NPM installed on your development system.

## Installing CIRCUS RS

### Developing with Webpack/Browserify (recommended)

CIRCUS RS is structured using the CommonJS style module definition system, which is also (basically) compatible with ES2015 module system. CIRCUS RS can easily work with existing projects that make use of CommonJS ecosystem. You can use module bundlers such as Webpack and Browserify to bundle your application and CIRCUS RS (client) in one JavaScript file. Refer to the documentations of each module bundler project.

```js
// Import using ES6 style modules
import Viewer from 'circus-rs/viewer/Viewer';

// Or using traditional commonJS style
var Viewer = require('circus-rs/viewer/Viewer').default;
```

### Including Pre-built CIRCUS RS File

Alternatively, you can just include pre-built CIRCUS RS Client in your HTML file.

```html
<!-- Loading pre-bundled CIRCUS RS script -->
<script src="circus-rs-client.js"></script>
<script>
// your code here
</script>
```

All public APIs of CIRCUS RS are exported under the `circusrs` global namespace. For example, `Viewer` class can be accessed via `circusrs.Viewer`.
