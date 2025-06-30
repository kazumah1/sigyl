import fs from 'fs';
import path from 'path';
import os from 'os';
import chalk from 'chalk';

export interface SigylConfig {
  registryUrl: string;
  apiKey?: string;
}

const CONFIG_DIR = path.join(os.homedir(), '.sigyl');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

// Default production registry URL
const DEFAULT_REGISTRY_URL = 'https://api.sigyl.dev';

export function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

export function saveConfig(config: SigylConfig): void {
  ensureConfigDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  console.log(chalk.green('✅ Configuration saved to'), chalk.blue(CONFIG_FILE));
}

export function loadConfig(): SigylConfig | null {
  if (!fs.existsSync(CONFIG_FILE)) {
    return null;
  }
  
  try {
    const configData = fs.readFileSync(CONFIG_FILE, 'utf8');
    return JSON.parse(configData);
  } catch (error) {
    console.error(chalk.red('❌ Error reading configuration:'), error);
    return null;
  }
}

export function getRegistryConfig(): SigylConfig {
  // Try environment variables first (for development)
  const envUrl = process.env.SIGYL_REGISTRY_URL;
  const envKey = process.env.SIGYL_API_KEY;
  
  if (envUrl || envKey) {
    return {
      registryUrl: envUrl || DEFAULT_REGISTRY_URL,
      apiKey: envKey
    };
  }
  
  // Try config file
  const config = loadConfig();
  if (config) {
    return {
      registryUrl: config.registryUrl || DEFAULT_REGISTRY_URL,
      apiKey: config.apiKey
    };
  }
  
  // Use default production values (no API key required for public packages)
  return {
    registryUrl: DEFAULT_REGISTRY_URL
  };
}

export function hasValidConfig(): boolean {
  try {
    const config = getRegistryConfig();
    return !!(config.registryUrl);
  } catch {
    return false;
  }
}

export function requiresApiKey(): boolean {
  const config = getRegistryConfig();
  return !config.apiKey;
} 