import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

interface ColorizeOptions {
	outputPath?: string;
	includeThemes?: string[];
	format?: 'json' | 'pretty';
}

interface TokenInfo {
	c: string; // character/content
	t: string; // token type/scope
	r: Record<string, string>; // theme colors
}

export class Colorizer {
	/**
	 * Colorize a file and output results to JSON
	 */
	static async colorizeFile(filePath: string, options: ColorizeOptions = {}): Promise<TokenInfo[]> {
		try {
			const uri = vscode.Uri.file(filePath);
			const data = (await vscode.commands.executeCommand('_workbench.captureSyntaxTokens', uri)) as TokenInfo[];

			if (options.outputPath) {
				await this.writeTokensToFile(data, options.outputPath, options.format || 'pretty');
			}

			return data;
		} catch (error) {
			console.error(`Failed to colorize file ${filePath}:`, error);
			throw error;
		}
	}

	/**
	 * Colorize multiple files and output results
	 */
	static async colorizeFiles(filePaths: string[], outputDir?: string, options: ColorizeOptions = {}): Promise<Record<string, TokenInfo[]>> {
		const results: Record<string, TokenInfo[]> = {};

		if (outputDir && !fs.existsSync(outputDir)) {
			fs.mkdirSync(outputDir, { recursive: true });
		}

		for (const filePath of filePaths) {
			try {
				const fileName = path.basename(filePath);
				const outputPath = outputDir ? path.join(outputDir, `${fileName.replace('.', '_')}.json`) : undefined;

				const tokens = await this.colorizeFile(filePath, {
					...options,
					outputPath
				});

				results[filePath] = tokens;
				console.log(`✓ Colorized ${filePath}`);
			} catch (error) {
				console.error(`✗ Failed to colorize ${filePath}:`, error);
			}
		}

		return results;
	}

	/**
	 * Colorize all test fixtures
	 */
	static async colorizeTestFixtures(outputDir?: string): Promise<Record<string, TokenInfo[]>> {
		const workspaceRoot = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0] && vscode.workspace.workspaceFolders[0].uri.fsPath;
		if (!workspaceRoot) {
			throw new Error('No workspace found');
		}

		const fixturesDir = path.join(workspaceRoot, 'test', 'colorize-fixtures');
		const resultsDir = outputDir || path.join(workspaceRoot, 'test', 'colorize-results');

		if (!fs.existsSync(fixturesDir)) {
			throw new Error(`Fixtures directory not found: ${fixturesDir}`);
		}

		const fixtureFiles = fs
			.readdirSync(fixturesDir)
			.filter(file => file.endsWith('.js'))
			.map(file => path.join(fixturesDir, file));

		return await this.colorizeFiles(fixtureFiles, resultsDir);
	}

	/**
	 * Write tokens to file
	 */
	private static async writeTokensToFile(tokens: TokenInfo[], outputPath: string, format: 'json' | 'pretty' = 'pretty'): Promise<void> {
		const dir = path.dirname(outputPath);
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
		}

		const content = format === 'pretty' ? JSON.stringify(tokens, null, '\t') : JSON.stringify(tokens);

		fs.writeFileSync(outputPath, content, 'utf8');
	}

	/**
	 * Compare two token sets and return differences
	 */
	static compareTokens(
		tokensA: TokenInfo[],
		tokensB: TokenInfo[]
	): {
		same: boolean;
		differences: Array<{
			index: number;
			type: 'content' | 'scope' | 'theme';
			expected: any;
			actual: any;
		}>;
	} {
		const differences: Array<{
			index: number;
			type: 'content' | 'scope' | 'theme';
			expected: any;
			actual: any;
		}> = [];

		const minLength = Math.min(tokensA.length, tokensB.length);

		for (let i = 0; i < minLength; i++) {
			const tokenA = tokensA[i];
			const tokenB = tokensB[i];

			if (tokenA.c !== tokenB.c) {
				differences.push({
					index: i,
					type: 'content',
					expected: tokenA.c,
					actual: tokenB.c
				});
			}

			if (tokenA.t !== tokenB.t) {
				differences.push({
					index: i,
					type: 'scope',
					expected: tokenA.t,
					actual: tokenB.t
				});
			}

			// Compare theme colors
			const themeDiff = this.compareThemeColors(tokenA.r, tokenB.r);
			if (themeDiff.length > 0) {
				differences.push({
					index: i,
					type: 'theme',
					expected: tokenA.r,
					actual: tokenB.r
				});
			}
		}

		if (tokensA.length !== tokensB.length) {
			differences.push({
				index: minLength,
				type: 'content',
				expected: `Length: ${tokensA.length}`,
				actual: `Length: ${tokensB.length}`
			});
		}

		return {
			same: differences.length === 0,
			differences
		};
	}

	private static compareThemeColors(colorsA: Record<string, string>, colorsB: Record<string, string>): string[] {
		const differences: string[] = [];
		const allKeys = new Set([...Object.keys(colorsA), ...Object.keys(colorsB)]);

		for (const key of allKeys) {
			if (colorsA[key] !== colorsB[key]) {
				differences.push(key);
			}
		}

		return differences;
	}
}
