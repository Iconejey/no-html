// On this
class MyComponent {
	myMethod() {
		this.render`
            <article>
                <h1>${this.title}</h1>
                <p>${this.content}</p>
            </article>
        `;
	}
}

// On variable
element.render`
    <div>
        <span>Hello World</span>
    </div>
`;

// On funtion return
document.querySelector('#app').render`
    <section>
        <h2>Welcome</h2>
    </section>
`;

// On object attribute / array item
const obj = { 'my target': document.createElement('div') };
obj['my target'].render`
    <footer>
        <p>Footer content</p>
    </footer>
`;

// On one line
someElement.render`<div>Optional Content</div>`;
$('#container').render`<div>jQuery Optional Content</div>`;
obj['my target'].render`<div>Another Optional Content</div>`;
