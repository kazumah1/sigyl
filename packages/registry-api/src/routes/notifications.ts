import express, { Request, Response } from 'express';
import fetch from 'node-fetch';

const router = express.Router();

router.post('/new-user', async (req: Request, res: Response) => {
  if (req.headers['x-webhook-secret'] !== process.env.WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!slackWebhookUrl) {
    console.error('Slack webhook URL not configured');
    return res.status(500).json({ error: 'Internal server error' });
  }

  const { record } = req.body; // Payload from Supabase webhook (new profile record)
  if (!record) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  const message = {
    text: `🎉 New Sigyl User Signup!\n- Name: ${record.full_name || 'N/A'}\n- Username: ${record.username || 'N/A'}\n- Email: ${record.email || 'N/A'}\n- GitHub: ${record.github_username || 'N/A'}\n- Created: ${record.created_at}`,
  };

  try {
    const slackResponse = await fetch(slackWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });

    if (!slackResponse.ok) {
      throw new Error(`Slack API error: ${slackResponse.statusText}`);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error sending Slack notification:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

export default router; 