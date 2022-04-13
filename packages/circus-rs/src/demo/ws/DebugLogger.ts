import { Logger } from "@utrad-ical/circus-lib";

export default class DebugLogger implements Logger {
    private appendTo: HTMLElement;
    private lines: { type: string; content: string; }[] = [];

    constructor(appendTo: HTMLElement) {
        this.appendTo = appendTo;
    }

    public trace(content: string) {
        this.add(content, 'trace');
    }

    public debug(content: string) {
        this.add(content, 'debug');
    }

    public info(content: string) {
        this.add(content, 'info');
    }

    public warn(content: string) {
        this.add(content, 'warn');
    }

    public error(content: string) {
        this.add(content, 'error');
    }

    public fatal(content: string) {
        this.add(content, 'fatal');
    }

    private add(content: string, type: string = 'info') {
        this.lines.push({ type, content });
        this.renderContent();
    }

    private renderContent() {
        this.appendTo.innerHTML = '';
        this.appendTo.append(this.getContentElement());
    }

    public async shutdown() {
        this.lines = [];
        this.appendTo.innerHTML = '';
    }

    private getContentElement() {
        const wrapElement = document.createElement('div') as HTMLDivElement;
        this.lines.forEach(({ type, content }) => {
            const text = document.createTextNode(content);
            const divElement: HTMLDivElement = document.createElement('div');
            divElement.appendChild(text);
            switch (type) {
                case 'info':
                    divElement.style.color = '#666666';
                    break;
                case 'error':
                    divElement.style.color = '#ff0000';
                    break;
                default:
                    divElement.style.color = '#666666';
            }
            wrapElement.appendChild(divElement);
        });
        return wrapElement;
    }
}
