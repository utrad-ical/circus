import { Viewer } from './viewer/viewer';

interface Toolbar {
	bindViewer: (viewer: Viewer) => void;
}

export function createToolbar(
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
			btn => btn.classList.remove('active')
		);
		(event.target as HTMLButtonElement).classList.add('active');
		viewers.forEach(v => v.setActiveTool(toolName));
		toolChanging = false;
	};

	const appendButton = toolName => {
		const button = document.createElement('button');
		button.className = [
			'circus-rs-toolbutton',
			toolName,
			'rs-icon-' + toolName
		].join(' ');
		button.setAttribute('type', 'button');
		// button.appendChild(document.createTextNode(toolName));

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
