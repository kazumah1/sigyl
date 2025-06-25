import express, { Request, Response } from 'express';
import { fetchMCPYaml } from '../services/yaml';
import { deployRepo } from '../services/deployer';
import { PackageService } from '../services/packageService';

const router = express.Router();
const packageService = new PackageService();

router.post('/deploy', async (req: Request, res: Response) => {
  try {
    const { repoUrl, githubToken } = req.body;
    const [owner, repo] = repoUrl.replace('https://github.com/', '').split('/');
    const metadata = await fetchMCPYaml(owner, repo, 'main', githubToken);

    const deployment: any = await deployRepo({
      repoUrl,
      env: { PORT: metadata.port.toString() }
    });

    // You may need to adjust this if deployment.url is not present
    const deploymentUrl = deployment.url || deployment.service?.url || '';
    if (!deploymentUrl) {
      throw new Error('Deployment URL not found in Render response');
    }

    // Simple health check before registry insert
    try {
      // Note: fetch does not support timeout natively; can be added with AbortController if needed
      const healthRes = await fetch(`${deploymentUrl}/health`);
      if (!healthRes.ok) {
        throw new Error(`Health check failed with status ${healthRes.status}`);
      }
    } catch (err) {
      throw new Error(`Deployment health check failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    // Register the package in the registry
    const registered = await packageService.createPackage({
      ...metadata
    });

    res.json({ packageId: registered.id, deploymentUrl });
  } catch (error: any) {
    console.error('Deploy error:', error);
    // Check for private/inaccessible repo error
    if (error.message && error.message.toLowerCase().includes('not accessible')) {
      res.status(400).json({
        error: 'This repo is private or inaccessible. Please install the Render GitHub App on your repo and try again.'
      });
    } else {
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }
});

export default router;
  