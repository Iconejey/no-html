#!/usr/bin/env node

/**
 * Colorization Export Tool for no-html extension
 *
 * This script provides a command-line interface to export colorization
 * results from the no-html VS Code extension to JSON files.
 */

const { ColorizerCli } = require('./out/cli');

// Run the CLI
const cli = new ColorizerCli(process.argv.slice(2));
cli.run().catch(error => {
	console.error('Colorization failed:', error.message);
	process.exit(1);
});
