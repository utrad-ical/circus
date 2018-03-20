import { Viewer } from './viewer/viewer';

interface Toolbar {
  bindViewer: (viewer: Viewer) => void;
}

/**
 * Converts a string to kebabcase (eg. 'someValue' => 'some-value')
 * @param str
 * @returns {string}
 */
function toKebabCase(str: string): string {
  return str.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
}

export default function createToolbar(
  wrapperElement: HTMLElement,
  toolNames: string[]
): Toolbar {
  const viewers: Viewer[] = [];

  const ulElement = document.createElement('ul');
  ulElement.className = 'circus-rs-toolbar';

  let toolChanging = false;
  const setTool = toolName => {
    toolChanging = true;
    Array.prototype.forEach.call(
      ulElement.querySelectorAll('.circus-rs-toolbutton'),
      btn => {
        if (btn.classList.contains('rs-icon-' + toKebabCase(toolName))) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      }
    );
    viewers.forEach(v => v.setActiveTool(toolName));
    toolChanging = false;
  };

  const appendButton = toolName => {
    const button = document.createElement('button');
    button.className = [
      'circus-rs-toolbutton',
      'circus-rs-tool-' + toKebabCase(toolName),
      'rs-icon-' + toKebabCase(toolName)
    ].join(' ');
    button.setAttribute('type', 'button');

    button.addEventListener('click', () => setTool(toolName));

    const liElement = document.createElement('li');
    liElement.className = 'circus-rs-toolbar-item';
    liElement.appendChild(button);
    ulElement.appendChild(liElement);
  };

  for (let i = 0; i < toolNames.length; i++) {
    appendButton(toolNames[i]);
  }

  wrapperElement.appendChild(ulElement);

  const bindViewer = viewer => {
    viewer.on('toolchange', (before, after) => {
      if (!toolChanging) setTool(after);
    });
    viewers.push(viewer);
  };

  return { bindViewer };
}
