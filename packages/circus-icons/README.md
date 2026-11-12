# CIRCUS Icons

SVG icons used throughout the CIRCUS project, including the body part icons (`b-*.svg`) of plug-ins and projects and the tool icons of CIRCUS RS.

Each file is a single-color SVG in `icons/`. Icon fonts are no longer provided (up to 0.2.0).

## Usage

### Inline SVG from a string

With a bundler that supports `?raw` (e.g., Vite):

```js
import handIcon from '@utrad-ical/circus-icons/icons/hand.svg?raw';

button.innerHTML = handIcon;
```

```css
button svg {
  width: 1em;
  height: 1em;
  fill: currentColor;
}
```

### CSS `mask-image`

The icon takes the color of `background-color`, so `currentColor` makes it follow the text color.

```css
.hand-icon {
  display: inline-block;
  width: 1em;
  height: 1em;
  background-color: currentColor;
  mask: url('@utrad-ical/circus-icons/icons/hand.svg') center / contain
    no-repeat;
}
```

### `<img>`

The simplest, but the color cannot be changed (always black).

```js
import handUrl from '@utrad-ical/circus-icons/icons/hand.svg';

img.src = handUrl;
```

### React

Insert the string from `?raw`, or convert the files into components with a tool such as SVGR.

```jsx
import handIcon from '@utrad-ical/circus-icons/icons/hand.svg?raw';

const HandIcon = () => (
  <span className="icon" dangerouslySetInnerHTML={{ __html: handIcon }} />
);
```
