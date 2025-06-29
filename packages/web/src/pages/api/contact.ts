import type { NextApiRequest, NextApiResponse } from 'next';
import nodemailer from 'nodemailer';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const { name, email, reason, message } = req.body;
  if (!name || !email || !reason || !message) return res.status(400).json({ error: 'Missing fields' });

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.CONTACT_EMAIL_USER,
      pass: process.env.CONTACT_EMAIL_PASS,
    },
  });

  try {
    await transporter.sendMail({
      from: email,
      to: 'daniel_zhao@college.harvard.edu',
      subject: `Contact Form: ${reason}`,
      text: `Name: ${name}\nEmail: ${email}\nReason: ${reason}\nMessage: ${message}`,
    });
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to send email' });
  }
} 