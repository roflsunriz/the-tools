export function mdiIcon(pathData: string, size = 24): SVGSVGElement {
	const NS = 'http://www.w3.org/2000/svg';
	const svg = document.createElementNS(NS, 'svg');
	svg.setAttribute('viewBox', '0 0 24 24');
	svg.setAttribute('width', String(size));
	svg.setAttribute('height', String(size));
	svg.classList.add('mdi-icon');

	const path = document.createElementNS(NS, 'path');
	path.setAttribute('d', pathData);
	path.setAttribute('fill', 'currentColor');
	svg.appendChild(path);

	return svg;
}

export function setButtonIcon(button: HTMLElement, pathData: string, size = 20): void {
	const existing = button.querySelector('.mdi-icon');
	if (existing) existing.remove();
	const icon = mdiIcon(pathData, size);
	button.prepend(icon);
}
