import * as vscode from 'vscode';
import { Colorizer } from './colorizer';

const typeScriptExtensionId = 'vscode.typescript-language-features';
const pluginId = 'typescript-lit-html-plugin';
const configurationSection = 'no-html';

interface SynchronizedConfiguration {
	tags?: ReadonlyArray<string>;
	format: {
		enabled?: boolean;
	};
}

export async function activate(context: vscode.ExtensionContext) {
	const extension = vscode.extensions.getExtension(typeScriptExtensionId);
	if (!extension) {
		return;
	}

	await extension.activate();
	if (!extension.exports || !extension.exports.getAPI) {
		return;
	}
	const api = extension.exports.getAPI(0);
	if (!api) {
		return;
	}

	vscode.workspace.onDidChangeConfiguration(
		e => {
			if (e.affectsConfiguration(configurationSection)) {
				synchronizeConfiguration(api);
			}
		},
		undefined,
		context.subscriptions
	);

	synchronizeConfiguration(api);

	// Register colorization commands
	registerColorizationCommands(context);
}

function registerColorizationCommands(context: vscode.ExtensionContext) {
	// Command: Colorize current file
	const colorizeCurrentFile = vscode.commands.registerCommand('no-html.colorizeCurrentFile', async () => {
		const activeEditor = vscode.window.activeTextEditor;
		if (!activeEditor) {
			vscode.window.showErrorMessage('No active file to colorize');
			return;
		}

		const filePath = activeEditor.document.uri.fsPath;
		try {
			const outputPath = await vscode.window.showSaveDialog({
				defaultUri: vscode.Uri.file(filePath.replace(/\.[^.]+$/, '_colorized.json')),
				filters: {
					'JSON files': ['json']
				}
			});

			if (outputPath) {
				const tokens = await Colorizer.colorizeFile(filePath, {
					outputPath: outputPath.fsPath,
					format: 'pretty'
				});

				vscode.window.showInformationMessage(`Colorization complete! ${tokens.length} tokens saved to ${outputPath.fsPath}`);
			}
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to colorize file: ${error}`);
		}
	});

	// Command: Colorize test fixtures
	const colorizeFixtures = vscode.commands.registerCommand('no-html.colorizeFixtures', async () => {
		try {
			const results = await Colorizer.colorizeTestFixtures();
			const fileCount = Object.keys(results).length;
			const tokenCount = Object.values(results).reduce((sum, tokens) => sum + tokens.length, 0);

			vscode.window.showInformationMessage(`Colorized ${fileCount} fixture files with ${tokenCount} total tokens`);
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to colorize fixtures: ${error}`);
		}
	});

	// Command: Colorize selected files
	const colorizeSelectedFiles = vscode.commands.registerCommand('no-html.colorizeSelectedFiles', async () => {
		const fileUris = await vscode.window.showOpenDialog({
			canSelectMany: true,
			filters: {
				'JavaScript/TypeScript': ['js', 'ts', 'jsx', 'tsx']
			}
		});

		if (!fileUris || fileUris.length === 0) {
			return;
		}

		const outputDir = await vscode.window.showOpenDialog({
			canSelectFolders: true,
			canSelectFiles: false,
			canSelectMany: false,
			openLabel: 'Select Output Directory'
		});

		if (!outputDir || outputDir.length === 0) {
			return;
		}

		try {
			const filePaths = fileUris.map(uri => uri.fsPath);
			const results = await Colorizer.colorizeFiles(filePaths, outputDir[0].fsPath);
			const fileCount = Object.keys(results).length;
			const tokenCount = Object.values(results).reduce((sum, tokens) => sum + tokens.length, 0);

			vscode.window.showInformationMessage(`Colorized ${fileCount} files with ${tokenCount} total tokens`);
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to colorize files: ${error}`);
		}
	});

	// Command: Compare colorization results
	const compareColorization = vscode.commands.registerCommand('no-html.compareColorization', async () => {
		const fileUris = await vscode.window.showOpenDialog({
			canSelectMany: false,
			filters: {
				'JSON files': ['json']
			}
		});

		if (!fileUris || fileUris.length === 0) {
			return;
		}

		const sourceFile = await vscode.window.showOpenDialog({
			canSelectMany: false,
			filters: {
				'JavaScript/TypeScript': ['js', 'ts', 'jsx', 'tsx']
			}
		});

		if (!sourceFile || sourceFile.length === 0) {
			return;
		}

		try {
			const baselineTokens = JSON.parse(require('fs').readFileSync(fileUris[0].fsPath, 'utf8'));
			const currentTokens = await Colorizer.colorizeFile(sourceFile[0].fsPath);

			const comparison = Colorizer.compareTokens(baselineTokens, currentTokens);

			if (comparison.same) {
				vscode.window.showInformationMessage('Colorization matches baseline! ✅');
			} else {
				const message = `Found ${comparison.differences.length} differences in colorization`;
				const choice = await vscode.window.showWarningMessage(message, 'Show Details', 'Update Baseline');

				if (choice === 'Show Details') {
					// Create a new document to show differences
					const diffContent = comparison.differences
						.map((diff, index) => `Difference ${index + 1} at token ${diff.index}:\n` + `  Type: ${diff.type}\n` + `  Expected: ${JSON.stringify(diff.expected)}\n` + `  Actual: ${JSON.stringify(diff.actual)}\n`)
						.join('\n');

					const doc = await vscode.workspace.openTextDocument({
						content: diffContent,
						language: 'text'
					});
					await vscode.window.showTextDocument(doc);
				}
			}
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to compare colorization: ${error}`);
		}
	});

	context.subscriptions.push(colorizeCurrentFile, colorizeFixtures, colorizeSelectedFiles, compareColorization);
}

function synchronizeConfiguration(api: any) {
	api.configurePlugin(pluginId, getConfiguration());
}

function getConfiguration(): SynchronizedConfiguration {
	const config = vscode.workspace.getConfiguration(configurationSection);
	const outConfig: SynchronizedConfiguration = {
		format: {}
	};

	withConfigValue<string[]>(config, 'tags', tags => {
		outConfig.tags = tags;
	});
	withConfigValue<boolean>(config, 'format.enabled', enabled => {
		outConfig.format.enabled = enabled;
	});

	return outConfig;
}

function withConfigValue<T>(config: vscode.WorkspaceConfiguration, key: string, withValue: (value: T) => void): void {
	const configSetting = config.inspect(key);
	if (!configSetting) {
		return;
	}

	// Make sure the user has actually set the value.
	// VS Code will return the default values instead of `undefined`, even if user has not don't set anything.
	if (typeof configSetting.globalValue === 'undefined' && typeof configSetting.workspaceFolderValue === 'undefined' && typeof configSetting.workspaceValue === 'undefined') {
		return;
	}

	const value = config.get<T | undefined>(key, undefined);
	if (typeof value !== 'undefined') {
		withValue(value);
	}
}
