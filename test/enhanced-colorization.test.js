/*---------------------------------------------------------------------------------------------
 *  Enhanced colorization test with export functionality
 *  Based on the original colorization.test.js but with added export capabilities
 *--------------------------------------------------------------------------------------------*/
// @ts-check
'use strict';

const assert = require('assert');
const { commands, Uri } = require('vscode');
const { join, basename, normalize, dirname } = require('path');
const fs = require('fs');

/**
 * Export colorization results for a test fixture
 */
function exportColorizationResults(testFixturePath, exportPath, done) {
	let fileName = basename(testFixturePath);

	return commands.executeCommand('_workbench.captureSyntaxTokens', Uri.file(testFixturePath)).then(data => {
		try {
			if (!fs.existsSync(dirname(exportPath))) {
				fs.mkdirSync(dirname(exportPath), { recursive: true });
			}

			// Write the colorization data to the export path
			fs.writeFileSync(exportPath, JSON.stringify(data, null, '\t'), { flag: 'w' });

			console.log(`✓ Exported colorization for ${fileName} to ${exportPath}`);
			done();
		} catch (e) {
			done(e);
		}
	}, done);
}

/**
 * Enhanced version of assertUnchangedTokens that also supports export mode
 */
function assertUnchangedTokens(testFixurePath, done, exportMode = false) {
	let fileName = basename(testFixurePath);

	return commands.executeCommand('_workbench.captureSyntaxTokens', Uri.file(testFixurePath)).then(data => {
		try {
			let resultsFolderPath = join(dirname(dirname(testFixurePath)), 'colorize-results');
			if (!fs.existsSync(resultsFolderPath)) {
				fs.mkdirSync(resultsFolderPath);
			}
			let resultPath = join(resultsFolderPath, fileName.replace('.', '_') + '.json');

			if (exportMode) {
				// In export mode, always write the file
				fs.writeFileSync(resultPath, JSON.stringify(data, null, '\t'), { flag: 'w' });
				console.log(`✓ Exported: ${resultPath}`);
				done();
				return;
			}

			// Original comparison logic
			if (fs.existsSync(resultPath)) {
				let previousData = JSON.parse(fs.readFileSync(resultPath).toString());
				try {
					assert.deepEqual(data, previousData);
				} catch (e) {
					fs.writeFileSync(resultPath, JSON.stringify(data, null, '\t'), { flag: 'w' });
					if (Array.isArray(data) && Array.isArray(previousData) && data.length === previousData.length) {
						for (let i = 0; i < data.length; i++) {
							let d = data[i];
							let p = previousData[i];
							if (d.c !== p.c || hasThemeChange(d.r, p.r)) {
								throw e;
							}
						}
						// different but no tokenization or color change: no failure
					} else {
						throw e;
					}
				}
			} else {
				fs.writeFileSync(resultPath, JSON.stringify(data, null, '\t'));
			}
			done();
		} catch (e) {
			done(e);
		}
	}, done);
}

function hasThemeChange(d, p) {
	let keys = Object.keys(d);
	for (let key of keys) {
		if (d[key] !== p[key]) {
			return true;
		}
	}
	return false;
}

/**
 * Export all colorization results
 */
function exportAllColorizations(exportDir) {
	const extensionColorizeFixturePath = join(__dirname, 'colorize-fixtures');
	if (!fs.existsSync(extensionColorizeFixturePath)) {
		console.error('No colorize-fixtures directory found');
		return;
	}

	if (!fs.existsSync(exportDir)) {
		fs.mkdirSync(exportDir, { recursive: true });
	}

	const fixturesFiles = fs.readdirSync(extensionColorizeFixturePath);
	console.log(`Exporting colorization for ${fixturesFiles.length} fixtures...`);

	const exportPromises = fixturesFiles.map(fixturesFile => {
		return new Promise((resolve, reject) => {
			const fixturePath = join(extensionColorizeFixturePath, fixturesFile);
			const exportPath = join(exportDir, fixturesFile.replace('.', '_') + '.json');

			exportColorizationResults(fixturePath, exportPath, error => {
				if (error) {
					reject(error);
				} else {
					resolve(exportPath);
				}
			});
		});
	});

	return Promise.all(exportPromises);
}

suite('colorization', () => {
	let extensionColorizeFixturePath = join(__dirname, 'colorize-fixtures');
	if (fs.existsSync(extensionColorizeFixturePath)) {
		let fixturesFiles = fs.readdirSync(extensionColorizeFixturePath);
		fixturesFiles.forEach(fixturesFile => {
			// define a test for each fixture
			test(fixturesFile, function (done) {
				assertUnchangedTokens(join(extensionColorizeFixturePath, fixturesFile), done);
			});
		});
	}
});

suite('colorization export', () => {
	test('export all fixtures', function (done) {
		this.timeout(30000); // Increase timeout for export operations

		const exportDir = join(__dirname, '..', 'colorize-exports');
		exportAllColorizations(exportDir)
			.then(exportedFiles => {
				console.log(`Successfully exported ${exportedFiles.length} colorization files`);
				done();
			})
			.catch(done);
	});
});

module.exports = {
	assertUnchangedTokens,
	exportColorizationResults,
	exportAllColorizations,
	hasThemeChange
};
