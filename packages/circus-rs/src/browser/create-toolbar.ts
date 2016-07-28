'use strict';

import { Viewer } from './viewer/viewer';

interface Toolbar {
	bindViewer: (viewer: Viewer) => void;
}

export function createToolbar(
	wrapperElement: HTMLElement,
	toolNames: string[]
): Toolbar {
	const viewers: Viewer[] = [];

	const selectToolHandler = toolName => {
		viewers.forEach(v => v.setActiveTool(toolName));
	};

	const ulElement = document.createElement('ul');
	ulElement.className = 'circus-rs-toolbar';

	const appendLi = toolName => {
		const button = document.createElement('button');
		button.setAttribute('type', 'button');
		button.appendChild(document.createTextNode(toolName));
		button.addEventListener('click', () => selectToolHandler(toolName));

		const liElement = document.createElement('li');
		liElement.className = 'circus-rs-toolbar-item ' + toolName;
		liElement.appendChild(button);
		ulElement.appendChild(liElement);
	};

	for (let i = 0; i < toolNames.length; i++) {
		appendLi(toolNames[i]);
	}

	wrapperElement.appendChild(ulElement);

	const bindViewer = viewer => {
		viewer.on('toolchange', (before, after) => {
			if (before) {
				const re = new RegExp(' ' + before + '-active ', 'g');
				ulElement.className = ulElement.className.replace(re, '');
			}
			ulElement.className += ' ' + after + '-active ';
		});
		viewers.push(viewer);
	};

	return { bindViewer };
}
