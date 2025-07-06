import { Command } from "commander";
import chalk from "chalk";
import { saveConfig, loadConfig } from "../lib/config";
import express from "express";
import { createServer } from "http";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export const authCommand = new Command("auth")
  .description("Authenticate with Sigyl using your browser")
  .action(async () => {
    console.log(chalk.blue.bold("🔐 Sigyl CLI Authentication"));
    console.log();

    const currentConfig = loadConfig();
    
    if (currentConfig?.apiKey) {
      console.log(chalk.green("✅ You're already authenticated."));
      console.log(`  API Key: ${chalk.blue(currentConfig.apiKey.substring(0, 20) + '...')}`);
      console.log();
      
      const inquirer = await import("inquirer");
      const { reauthenticate } = await inquirer.default.prompt([
        {
          type: 'confirm',
          name: 'reauthenticate',
          message: 'Do you want to authenticate again?',
          default: false
        }
      ]);
      
      if (!reauthenticate) {
        console.log(chalk.yellow("Authentication unchanged."));
        return;
      }
    }

    console.log(chalk.blue("🌐 Opening browser for authentication..."));
    console.log(chalk.gray("This will redirect you to GitHub to authenticate with Sigyl."));
    console.log();

    try {
      const token = await performBrowserAuth();
      
      if (token) {
        // Save the token
        const config = {
          registryUrl: currentConfig?.registryUrl || 'https://api.sigyl.dev',
          apiKey: token
        };
        
        saveConfig(config);
        
        console.log();
        console.log(chalk.green.bold("🎉 Authentication successful!"));
        console.log();
        console.log(chalk.blue("You can now use the Sigyl CLI to install MCP packages."));
        console.log(chalk.gray("Run 'sigyl install <package-name>' to get started."));
      } else {
        console.log(chalk.red("❌ Authentication failed or was cancelled."));
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red("❌ Authentication error:"), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

export async function performBrowserAuth(): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const app = express();
    const server = createServer(app);
    
    // Find available port
    server.listen(0, () => {
      const port = (server.address() as any)?.port;
      if (!port) {
        reject(new Error("Failed to start local server"));
        return;
      }

      const redirectUri = `http://localhost:${port}/callback`;
      const authUrl = `https://sigyl.dev/cli/auth?redirect=${encodeURIComponent(redirectUri)}`;
      
      console.log(chalk.gray(`Local server started on port ${port}`));
      console.log(chalk.gray(`Redirect URI: ${redirectUri}`));
      
      // Handle the callback
      app.get('/callback', (req, res) => {
        const { token, error } = req.query;
        
        if (error) {
          res.send(`
            <html>
              <body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; text-align: center; padding: 50px;">
                <h1 style="color: #dc3545;">❌ Authentication Failed</h1>
                <p>Error: ${error}</p>
                <p>You can close this window and try again.</p>
              </body>
            </html>
          `);
          server.close();
          resolve(null);
          return;
        }
        
        if (token && typeof token === 'string') {
          res.send(`
            <html>
              <body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; text-align: center; padding: 50px;">
                <h1 style="color: #28a745;">✅ Authentication Successful!</h1>
                <p>You can close this window and return to your terminal.</p>
                <script>setTimeout(() => window.close(), 3000);</script>
              </body>
            </html>
          `);
          server.close();
          resolve(token);
        } else {
          res.send(`
            <html>
              <body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; text-align: center; padding: 50px;">
                <h1 style="color: #dc3545;">❌ Authentication Failed</h1>
                <p>No token received. Please try again.</p>
                <p>You can close this window.</p>
              </body>
            </html>
          `);
          server.close();
          resolve(null);
        }
      });

      // Open browser
      openBrowser(authUrl).catch(err => {
        console.log(chalk.yellow("⚠️ Could not open browser automatically."));
        console.log(chalk.blue("Please open this URL manually:"));
        console.log(chalk.cyan(authUrl));
      });

      // Timeout after 5 minutes
      setTimeout(() => {
        server.close();
        resolve(null);
      }, 5 * 60 * 1000);
    });

    server.on('error', (err) => {
      reject(err);
    });
  });
}

async function openBrowser(url: string): Promise<void> {
  const platform = process.platform;
  
  try {
    if (platform === 'darwin') {
      await execAsync(`open "${url}"`);
    } else if (platform === 'win32') {
      await execAsync(`start "${url}"`);
    } else {
      await execAsync(`xdg-open "${url}"`);
    }
  } catch (error) {
    throw new Error(`Failed to open browser: ${error}`);
  }
}

// Add logout subcommand
authCommand
  .command("logout")
  .description("Log out and remove stored authentication")
  .action(async () => {
    const currentConfig = loadConfig();
    
    if (!currentConfig?.apiKey) {
      console.log(chalk.yellow("You're not currently authenticated."));
      return;
    }
    
    const inquirer = await import("inquirer");
    const { confirm } = await inquirer.default.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Are you sure you want to log out?',
        default: false
      }
    ]);
    
    if (confirm) {
      saveConfig({
        registryUrl: currentConfig.registryUrl || 'https://api.sigyl.dev'
      });
      console.log(chalk.green("✅ Successfully logged out."));
      console.log(chalk.gray("Run 'sigyl auth' to authenticate again."));
    } else {
      console.log(chalk.yellow("Logout cancelled."));
    }
  });

// Add status subcommand  
authCommand
  .command("status")
  .description("Show current authentication status")
  .action(() => {
    const config = loadConfig();
    
    console.log(chalk.blue.bold("🔐 Authentication Status"));
    console.log();
    
    if (config?.apiKey) {
      console.log(chalk.green("✅ Authenticated"));
      console.log(`  API Key: ${chalk.blue(config.apiKey.substring(0, 20) + '...')}`);
      console.log(`  Registry: ${chalk.blue(config.registryUrl || 'https://api.sigyl.dev')}`);
    } else {
      console.log(chalk.red("❌ Not authenticated"));
      console.log(chalk.gray("Run 'sigyl auth' to authenticate."));
    }
  }); 