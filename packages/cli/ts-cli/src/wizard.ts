import chalk from "chalk";
import inquirer from "inquirer";
import { initTemplate } from "./commands/init";
import { integrateWithExpress } from "./commands/integrate";
import inspectCommand from "./commands/inspect";
import { existsSync, rmSync } from "node:fs";

export async function runWizard() {
  console.log(chalk.cyan("\nWelcome to the Sigyl Interactive Wizard!\n"));
  let exit = false;
  while (!exit) {
    const { action } = await inquirer.prompt([
      {
        type: "list",
        name: "action",
        message: "What do you want to do?",
        choices: [
          { name: "Generate a blank template", value: "init" },
          { name: "Generate from express app", value: "integrate" },
          { name: "Run inspector", value: "inspect" },
          { name: "Exit", value: "exit" }
        ]
      }
    ]);
    switch (action) {
      case "init": {
        const { out, language, name } = await inquirer.prompt([
          { type: "input", name: "out", message: "Output directory:", default: "template-server" },
          { type: "list", name: "language", message: "Server language:", choices: ["typescript", "javascript"], default: "typescript" },
          { type: "input", name: "name", message: "Server name:", default: "my-mcp-server" }
        ]);
        await initTemplate({ outDir: out, serverLanguage: language, name });
        exit = true;
        break;
      }
      case "integrate": {
        const { directory, out, endpoint, language } = await inquirer.prompt([
          { type: "input", name: "directory", message: "Express app directory:", default: "." },
          { type: "input", name: "out", message: "Output directory:", default: "template-server" },
          { type: "input", name: "endpoint", message: "MCP endpoint path:", default: "/mcp" },
          { type: "list", name: "language", message: "Server language:", choices: ["typescript", "javascript"], default: "typescript" }
        ]);
        await integrateWithExpress({ directory, outDir: out, serverLanguage: language, endpoint });
        exit = true;
        break;
      }
      case "inspect": {
        const { serverPath } = await inquirer.prompt([
          { type: "input", name: "serverPath", message: "Path or URL to MCP server:", default: "template-server/server.js" }
        ]);
        await inspectCommand([], serverPath);
        exit = true;
        break;
      }
      case "install": {
        console.log(chalk.yellow("\nPlease use the 'install' command directly for advanced options.\n"));
        break;
      }
      case "clean": {
        const { out } = await inquirer.prompt([
          { type: "input", name: "out", message: "Output directory to clean:", default: ".mcp-generated" }
        ]);
        if (existsSync(out)) {
          rmSync(out, { recursive: true, force: true });
          console.log(chalk.green(`✅ Cleaned ${out} directory`));
        } else {
          console.log(chalk.yellow(`⚠️  Directory ${out} not found`));
        }
        exit = true;
        break;
      }
      case "exit":
      default:
        exit = true;
        console.log(chalk.cyan("Goodbye!"));
        break;
    }
  }
} 