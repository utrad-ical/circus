---
title: Core Concepts of CIRCUS RS
---

# Core Concepts of CIRCUS RS

To understand the behavior of CIRCUS RS client, we need to understand the following basic classes and their relationships.
As described in the [Install](install.html) section, these classes can be accessed in one of the three ways below:

1. `const Viewer = require('browser/viewer/Viewer').default;` if you are using plain JS with some commonJS module bundler like Webpack and Browserify.
2. `import Viewer from 'browser/viewer/Viewer';` if you are using a module bundler in conjunction with some transpiler like Babel and TypeScript.
3. `circusrs.Viewer` if you are just including the the pre-bundled version of CIRCUS RS using a HTML `<script>` tag.

In this document, a **class** refers to a ES2015(ES6)-compatible class. Classes are actually compiled into ES5 functions using TypeScript.
{:.alert .alert-info}

## `Viewer` --- The Main Component

A **viewer** is the main component of CIRCUS RS Client, and it's the only component that directly changes the HTML DOM.
A viewer holds one HTML canvas element, and renders an associated image source and annotations (if any) on the canvas.
The associated image source and annotations are contained in a container class called `Composition`, which will be described later in this page.

You can assign only one composition to a viewer.
On the other hand, one composition can be assigned to more than one viewer simultaneously.
That is, you can assign one 3D volume to multiple viewers and display it from multiple angles using MPR (multiplanar reconstruction).

## `ViewState` --- How the Image is Rendered

A view state is a plain object (i.e., not a class instance) that determines the condition under which the `ImageSource` is displayed on a screen. For example, window level and window width are typical attributes of a view state because when these values changes, what will be displayed will also change.

Each viewer has its own view state. When you assign the same composition to two viewers, but assign two difference view states to those viewers, then you will see the same image drawn under two different conditions (window, MPR section, etc.). An image drawn to a canvas is determined by one image source and one view state.

For now, view state assumes the image source is a subclass of `VolumeImageSource`.
{:.alert .alert-info}

## `ImageSource` --- The Image to Display

`ImageSource` is an abstract class which represents an image (or set of images) from any origin. It typically represents a DICOM series, which is usually a set of 2D images. Each image source is responsible for receiving a viewer instance and a corresponding view state, and drawing something on a canvas asynchronously using Promise.

One image source can be simultaneously assigned to two or more viewers via a composition.

Currently, only 3D volume based image sources are natively implemented in CIRCUS RS. But you can extend CIRCUS RS to implement many types of image source.

Here are the list of working image source implementations.

`DynamicImageSource`
: This requests an image to CIRCUS RS Server whenever it is requested from a viewer. This does not use much memory on the client-side, but has a considerably slower paging speed. While this is a recommended choice for most applications, it may consume more bandwidth depending on the usage.

`RawVolumeImageSource`
: This loads the entire volume from the CIRCUS RS Server, and performs MPR calculation in the client's local machine. You can achieve the best frame-per-second on a moderate desktop machine, but it may be very slow to show the first section image. Use this when smooth paging experience is very important.

`HybridImageSource`
: This is basically the same as `RawVolumeImageSource`, but this also works as `DynamicImageSource` before the entire volume was loaded. This is the recommend class for most of the applications which are only targeted at desktop machines.

## `Annotation` --- Attachment to ImageSource

See [Working with Annotations](annotation.html) for details.
{:.tip}

`Annotation` is a base class which represents various attaching data to an image source. For example, these are annotations:

- An arrow, circle, dot, etc., to mark a lesion
- A ruler (caliper) to measure lesion size
- A 3D volume label (VoxelCloud)

Annotations are not directly assigned to a viewer.
Instead, annotations are assigned to a composition, and the composition in turn is assigned to one or more viewers.

A composition can have an arbitrary number of annotations.

## Composition --- Collection of Image Source and Annotations

A composition is a container which holds one image source and attaching annotations.

- One composition can have only one image source.
- One composition can have an arbitrary number of annotations.
- One composition can be simultaneously assigned to multiple viewers. That is, you can observe one image using different view states (i.e., display conditions such as display window) using multiple viewers.

## Tool --- Handles UI Events and Changes Annotations and/or Image Source

See [Working with Tools](tool.html) for details.
{:.tip}

A **tool** is activated per viewer and responds to mouse/keyboard events happening on a viewer.

By default, a tool called "null tool" is active, and it does not respond to any user actions.
This makes the viewer work much like a standard `<img>` element which shows a static image.

CIRCUS RS Client is equipped with various built-in tools, which developers can use.
An active tool can be specified using `Viewer#setTool()`. It is also possible to define your own tool for your own purpose.

Active tools are determined per-viewer basis.
This means the paging tool is active on one viewer but the window tool is active on another viewer, even though the two viewers shows the same image source.
This can sometimes be an intended behavior.
But if you want to use the same tool for all the viewers on the page, you have to write code according to your intention.

Each tool will typically do either of the followings:

- Changes the view state of the viewer. (e.g., paging tool and window tool)
- Adds/edits/removes annotation of the image source (via composition) (e.g., arrow annotation tool)

CIRCUS RS Client comes with a built-in tool bar with some custom icon fonts. You can use this if you with, or create your own UI to switch tools.
