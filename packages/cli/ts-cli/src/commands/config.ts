import { Command } from "commander";
import inquirer from "inquirer";
import chalk from "chalk";
import { saveConfig, loadConfig, getRegistryConfig } from "../lib/config";

export const configCommand = new Command("config")
  .description("Configure Sigyl CLI settings")
  .action(async () => {
    console.log(chalk.blue.bold("🔧 Sigyl CLI Configuration"));
    console.log();

    const currentConfig = loadConfig();
    
    if (currentConfig) {
      console.log(chalk.green("✅ Current configuration found:"));
      console.log(`  Registry URL: ${chalk.blue(currentConfig.registryUrl || 'https://api.sigyl.dev')}`);
      console.log(`  API Key: ${chalk.blue(currentConfig.apiKey ? currentConfig.apiKey.substring(0, 20) + '...' : 'Not set (public access only)')}`);
      console.log();
      
      const { reconfigure } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'reconfigure',
          message: 'Do you want to update the configuration?',
          default: false
        }
      ]);
      
      if (!reconfigure) {
        console.log(chalk.yellow("Configuration unchanged."));
        return;
      }
    }

    console.log(chalk.yellow("📋 Configure your Sigyl CLI:"));
    console.log(chalk.gray("You can get your API key from https://sigyl.dev/dashboard"));
    console.log(chalk.gray("Note: API key is optional for installing public packages"));
    console.log();

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'registryUrl',
        message: 'Registry URL:',
        default: currentConfig?.registryUrl || 'https://api.sigyl.dev',
        validate: (input: string) => {
          if (!input) return 'Registry URL is required';
          if (!input.startsWith('https://') && !input.startsWith('http://')) return 'URL must start with https:// or http://';
          return true;
        }
      },
      {
        type: 'password',
        name: 'apiKey',
        message: 'Sigyl API Key (optional - leave blank for public access):',
        default: currentConfig?.apiKey || '',
        validate: (input: string) => {
          if (!input) return true; // API key is optional
          if (!input.startsWith('sk_')) return 'API key must start with sk_';
          if (input.length < 20) return 'API key seems too short, please check it';
          return true;
        }
      }
    ]);

    try {
      const config = {
        registryUrl: answers.registryUrl,
        ...(answers.apiKey && { apiKey: answers.apiKey })
      };
      
      saveConfig(config);
      
      console.log();
      console.log(chalk.green.bold("🎉 Configuration saved successfully!"));
      console.log();
      console.log(chalk.blue("You can now use the Sigyl CLI to install MCP packages."));
      console.log(chalk.gray("Run 'sigyl install <package-name>' to get started."));
      
    } catch (error) {
      console.error(chalk.red("❌ Failed to save configuration:"), error);
      process.exit(1);
    }
  });

// Add subcommands
configCommand
  .command("show")
  .description("Show current configuration")
  .action(() => {
    const config = getRegistryConfig();
    
    console.log(chalk.blue.bold("📋 Current Sigyl CLI Configuration:"));
    console.log();
    console.log(`  Registry URL: ${chalk.green(config.registryUrl)}`);
    console.log(`  API Key: ${chalk.green(config.apiKey ? config.apiKey.substring(0, 20) + '...' : 'Not set (public access)')}`);
    console.log();
    console.log(chalk.gray(`Configuration file: ~/.sigyl/config.json`));
    console.log(chalk.gray(`Get your API key at: https://sigyl.dev/dashboard`));
  });

configCommand
  .command("reset")
  .description("Reset configuration to defaults")
  .action(async () => {
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Are you sure you want to reset the configuration?',
        default: false
      }
    ]);
    
    if (confirm) {
      saveConfig({
        registryUrl: 'https://api.sigyl.dev'
      });
      console.log(chalk.green("✅ Configuration reset to defaults."));
      console.log(chalk.yellow("💡 You can add your API key with 'sigyl config' for private packages."));
    } else {
      console.log(chalk.yellow("Configuration unchanged."));
    }
  }); 