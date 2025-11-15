// Test file for colorization export
const template = html`
	<div class="container">
		<h1>${title}</h1>
		<p>This is a test paragraph with some <strong>bold text</strong>.</p>
		<ul>
			${items.map(item => html` <li data-id="${item.id}">${item.name}</li> `)}
		</ul>
	</div>
`;

const svgTemplate = svg`
  <svg viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="40" fill="blue" />
    <text x="50" y="55" text-anchor="middle">${message}</text>
  </svg>
`;

// Should NOT be highlighted
const notHighlighted = nothtml`<div>This should not be highlighted</div>`;
const alsoNotHighlighted = 'html`<div>This is just a string</div>`';
