# Colorization Export Feature

The no-html extension now includes functionality to export colorization results to JSON files. This is useful for:

-   Analyzing syntax highlighting behavior
-   Creating test baselines for colorization
-   Debugging highlighting issues
-   Comparing colorization results across different versions

## Using the VS Code Commands

The extension provides several commands accessible through the Command Palette (`Ctrl+Shift+P`):

### `No HTML: Export Colorization (Current File)`

Exports colorization results for the currently active file to a JSON file.

### `No HTML: Export Colorization (Test Fixtures)`

Exports colorization results for all test fixture files in the `test/colorize-fixtures` directory.

### `No HTML: Export Colorization (Selected Files)`

Allows you to select multiple files and export their colorization results to a chosen directory.

### `No HTML: Compare Colorization Results`

Compares a source file's current colorization with a baseline JSON file and shows differences.

## Using the Command Line

A command-line interface is planned for future releases. Currently, colorization export is available through VS Code commands only.

## Output Format

The JSON output contains an array of token objects with the following structure:

```json
[
	{
		"c": "<",
		"t": "source.js meta.block.js string.js.taggedTemplate meta.embedded.block.html punctuation.definition.tag.begin.html",
		"r": {
			"dark_plus": "punctuation.definition.tag: #808080",
			"light_plus": "punctuation.definition.tag: #800000",
			"dark_vs": "punctuation.definition.tag: #808080",
			"light_vs": "punctuation.definition.tag: #800000",
			"hc_black": "punctuation.definition.tag: #808080"
		}
	}
]
```

Where:

-   `c`: The character/content of the token
-   `t`: The TextMate scope/token type
-   `r`: Theme-specific color information

## Configuration

You can configure the colorization export behavior in VS Code settings:

```json
{
	"no-html.colorization.outputFormat": "pretty", // or "json"
	"no-html.colorization.includeThemes": ["dark_plus", "light_plus", "dark_vs", "light_vs", "hc_black"]
}
```

## Integration with Tests

The enhanced test suite (`enhanced-colorization.test.js`) includes export functionality:

```javascript
const { exportAllColorizations } = require('./enhanced-colorization.test');

// Export all fixture colorizations
exportAllColorizations('./my-export-dir')
	.then(files => console.log(`Exported ${files.length} files`))
	.catch(console.error);
```

## Use Cases

### Creating Test Baselines

```bash
# Export current colorization results as new baselines
npm run colorize:fixtures
```

### Debugging Colorization Issues

1. Export colorization before making changes
2. Make your grammar/syntax changes
3. Export colorization again
4. Use the compare command to see differences

### Analyzing Syntax Highlighting

The exported JSON files can be analyzed programmatically to understand:

-   Which tokens are being generated
-   How themes are applying colors
-   Where highlighting might be incorrect

### CI/CD Integration

Include colorization export in your build process to catch highlighting regressions:

```bash
# In your CI script
npm run colorize:fixtures
git diff --exit-code test/colorize-results/
```

This will fail the build if colorization results have changed unexpectedly.
