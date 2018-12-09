import Viewer from './viewer/Viewer';
import { toolFactory } from './tool/tool-initializer';
import { Tool } from './tool/Tool';

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

interface ToolbarComponentProps {
  toolNames: string[];
  handleToolButtonClick: (toolName: string) => void;
}
class ToolbarComponent {
  private rootElement: HTMLElement;

  private props: ToolbarComponentProps;
  private activeToolName: string;

  constructor(rootElement: HTMLElement, props: ToolbarComponentProps) {
    this.props = props;
    this.activeToolName = '';
    this.rootElement = this.mount(rootElement);
  }

  public setActiveToolName(toolName: string) {
    this.activeToolName = toolName;
    this.update();
  }

  private mount(wrapperElement: HTMLElement) {
    const ulElement = document.createElement('ul');
    ulElement.className = 'circus-rs-toolbar';

    const { toolNames, handleToolButtonClick } = this.props;

    toolNames.forEach(toolName => {
      const button = document.createElement('button');
      button.className = [
        'circus-rs-toolbutton',
        'circus-rs-tool-' + toKebabCase(toolName),
        'rs-icon-' + toKebabCase(toolName)
      ].join(' ');
      button.setAttribute('type', 'button');

      button.addEventListener('click', () => handleToolButtonClick(toolName));

      const liElement = document.createElement('li');
      liElement.className = 'circus-rs-toolbar-item';
      liElement.appendChild(button);
      ulElement.appendChild(liElement);
    });

    wrapperElement.appendChild(ulElement);

    return ulElement;
  }

  private update() {
    const toolName = this.activeToolName;
    Array.prototype.forEach.call(
      this.rootElement.querySelectorAll('.circus-rs-toolbutton'),
      (btn: HTMLElement) => {
        if (btn.classList.contains('rs-icon-' + toKebabCase(toolName))) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      }
    );
  }
}

export default function createToolbar(
  wrapperElement: HTMLElement,
  toolNames: string[]
): Toolbar {
  const viewers: Viewer[] = [];
  const name2tool: Map<string, Tool> = new Map();
  const tool2name: Map<Tool, string> = new Map();
  toolNames.forEach(toolName => {
    const tool = toolFactory(toolName);
    name2tool.set(toolName, tool);
    tool2name.set(tool, toolName);
  });

  const component = new ToolbarComponent(wrapperElement, {
    toolNames,
    handleToolButtonClick: toolName => {
      const tool = name2tool.get(toolName)!;
      viewers.forEach(v => v.setActiveTool(tool));
    }
  });

  const bindViewer = (viewer: Viewer) => {
    viewer.on('toolchanged', (before: Tool | null, after: Tool | null) => {
      const toolName = (after && tool2name.get(after)) || '';
      component.setActiveToolName(toolName);
    });
    viewers.push(viewer);
  };

  return { bindViewer };
}
