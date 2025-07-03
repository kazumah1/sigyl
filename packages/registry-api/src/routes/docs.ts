import express from 'express';
import fs from 'fs';
import path from 'path';

const DOCS_DIR = path.join(__dirname, '../../docs');
const router = express.Router();

// List all available docs
router.get('/', async (_req, res) => {
  try {
    const files = await fs.promises.readdir(DOCS_DIR);
    const docs = files
      .filter(f => f.endsWith('.mdx'))
      .map(f => f.replace(/\.mdx$/, ''));
    res.json({ success: true, docs });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to list docs', message: error instanceof Error ? error.message : String(error) });
  }
});

// Get a specific doc by name
router.get('/:docName', async (req, res) => {
  try {
    const { docName } = req.params;
    if (!/^[a-zA-Z0-9_-]+$/.test(docName)) {
      return res.status(400).json({ success: false, error: 'Invalid doc name' });
    }
    const filePath = path.join(DOCS_DIR, `${docName}.mdx`);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'Doc not found' });
    }
    const content = await fs.promises.readFile(filePath, 'utf-8');
    res.setHeader('Content-Type', 'text/markdown');
    res.send(content);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to read doc', message: error instanceof Error ? error.message : String(error) });
  }
});

export default router; 