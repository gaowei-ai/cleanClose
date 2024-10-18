const vscode = require("vscode");
const fs = require("fs").promises;
const path = require("path");

const fileExnames = [".js", ".ts", ".tsx", ".vue", ".jsx", ".cjs", ".mjs"];
// 删除文件中的 console.log
async function cleanFileConsole(filePath) {
	try {
		// 读取文件内容
		const content = await fs.readFile(filePath, "utf-8");

		// 删除 console.log() 语句的正则表达式
		const logRegex =
			/console\.log\s*\(\s*((?:[^()"'`]+|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\((?:[^()"'`]+|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)*\))*?)\s*\);?/g;

		// 替换掉 console.log()
		const cleanedContent = content.replace(logRegex, "");

		// 写回文件
		await fs.writeFile(filePath, cleanedContent, "utf-8");
	} catch (error) {
		vscode.window.showInformationMessage(`Failed to clean file ${filePath}: `);
	}
}

// 递归清理目录中的所有 JS 和 TS 文件
async function cleanDirConsole(dirPath) {
	try {
		const files = await fs.readdir(dirPath);

		// 使用 Promise.all 来并发处理文件和子目录
		const promises = files.map(async (file) => {
			const filePath = path.resolve(dirPath, file);
			const stat = await fs.stat(filePath);
			if (stat.isDirectory()) {
				// 递归处理子目录
				return cleanDirConsole(filePath);
			} else if (stat.isFile() && fileExnames.includes(path.extname(filePath))) {
				// 处理 JS 或 TS 文件
				return cleanFileConsole(filePath);
			}
		});

		// 等待所有文件和子目录的处理完成
		await Promise.all(promises);
	} catch (error) {
		vscode.window.showInformationMessage(`Failed to clean directory ${dirPath}: `);
	}
}

/**
 * 插件激活时调用
 * @param {vscode.ExtensionContext} context
 */
async function activate(context) {
	// 注册命令，当用户执行该命令时，插件会被激活
	let disposable = vscode.commands.registerCommand("cleanFileConsole.clean", async function (uri) {
		let url;
		if (!uri) {
			uri = vscode.window.activeTextEditor.document.uri;
		}
		url = uri.fsPath;
		try {
			const stat = await fs.stat(url);

			if (stat.isDirectory()) {
				// 并发清理文件夹中的文件
				await cleanDirConsole(url);
				vscode.window.showInformationMessage(`Cleaned all console.logs in directory: ${url}`);
			} else if (stat.isFile()) {
				// 清理单个文件
				await cleanFileConsole(url);
				vscode.window.showInformationMessage(`Cleaned console.logs in file: ${url}`);
			}
		} catch (error) {
			vscode.window.showErrorMessage(`Error cleaning console.logs: ${error.message}`);
		}
	});

	// 将命令加入到插件的订阅中
	context.subscriptions.push(disposable);
}

// 插件停用时调用
function deactivate() {}

module.exports = {
	activate,
	deactivate,
};
