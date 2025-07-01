import express from 'express';
import { z } from 'zod';
import { supabase } from '../config/database';
import { APIResponse } from '../types';
import { requirePermissions } from '../middleware/auth';

const router = express.Router();

// Email subscription schema
const emailSubscriptionSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  email: z.string().email('Invalid email address'),
  purpose: z.enum(['demo', 'enterprise', 'feature', 'investor', 'misc', 'newsletter', 'waitlist']),
  message: z.string().optional(),
  source: z.string().default('contact_form')
});

// GET /api/v1/emails/stats - Get email statistics (admin only)
router.get('/stats', requirePermissions(['admin']), async (_req, res) => {
  try {
    const { data, error } = await supabase.rpc('get_email_stats');
    
    if (error) {
      console.error('Error fetching email stats:', error);
      return res.status(500).json({
        success: false,
        error: 'Database Error',
        message: 'Failed to fetch email statistics'
      });
    }

    const response: APIResponse<typeof data> = {
      success: true,
      data: data[0], // RPC returns array with single object
      message: 'Email statistics retrieved successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('Email stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch email statistics'
    });
  }
});

// GET /api/v1/emails/subscribers - Get all subscribers (admin only)
router.get('/subscribers', requirePermissions(['admin']), async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const purpose = req.query.purpose as string;
    const source = req.query.source as string;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('emails')
      .select('*', { count: 'exact' })
      .eq('subscribed', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (purpose) {
      query = query.eq('purpose', purpose);
    }
    if (source) {
      query = query.eq('source', source);
    }

    const { data: emails, error, count } = await query;

    if (error) {
      console.error('Error fetching subscribers:', error);
      return res.status(500).json({
        success: false,
        error: 'Database Error',
        message: 'Failed to fetch subscribers'
      });
    }

    const response: APIResponse<{
      emails: typeof emails;
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }> = {
      success: true,
      data: {
        emails: emails || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        }
      },
      message: 'Subscribers retrieved successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('Subscribers fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch subscribers'
    });
  }
});

// GET /api/v1/emails/export - Export subscribers as CSV (admin only)
router.get('/export', requirePermissions(['admin']), async (req, res) => {
  try {
    const purpose = req.query.purpose as string;
    const source = req.query.source as string;

    let query = supabase
      .from('emails')
      .select('name, email, purpose, source, created_at')
      .eq('subscribed', true)
      .order('created_at', { ascending: false });

    // Apply filters
    if (purpose) {
      query = query.eq('purpose', purpose);
    }
    if (source) {
      query = query.eq('source', source);
    }

    const { data: emails, error } = await query;

    if (error) {
      console.error('Error exporting subscribers:', error);
      return res.status(500).json({
        success: false,
        error: 'Database Error',
        message: 'Failed to export subscribers'
      });
    }

    // Generate CSV
    const csvHeader = 'Name,Email,Purpose,Source,Created At\n';
    const csvRows = (emails || []).map(email => 
      `"${email.name}","${email.email}","${email.purpose}","${email.source}","${email.created_at}"`
    ).join('\n');
    
    const csv = csvHeader + csvRows;

    // Set headers for file download
    const filename = `sigyl-subscribers-${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    res.send(csv);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to export subscribers'
    });
  }
});

// POST /api/v1/emails/subscribe - Add email to mailing list
router.post('/subscribe', async (req, res) => {
  try {
    const validationResult = emailSubscriptionSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: validationResult.error.errors[0].message
      });
    }

    const { name, email, purpose, message, source } = validationResult.data;

    const { data, error } = await supabase
      .from('emails')
      .upsert({
        name,
        email,
        purpose,
        message: message || '',
        source,
        subscribed: true,
        email_verified: false
      }, {
        onConflict: 'email,source',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (error) {
      console.error('Error subscribing email:', error);
      return res.status(500).json({
        success: false,
        error: 'Database Error',
        message: 'Failed to subscribe email'
      });
    }

    const response: APIResponse<typeof data> = {
      success: true,
      data,
      message: 'Successfully subscribed to mailing list'
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Subscribe error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to subscribe email'
    });
  }
});

// PUT /api/v1/emails/unsubscribe/:email - Unsubscribe email
router.put('/unsubscribe/:email', async (req, res) => {
  try {
    const { email } = req.params;

    if (!email || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Email',
        message: 'Valid email address is required'
      });
    }

    const { data, error } = await supabase
      .from('emails')
      .update({ subscribed: false, updated_at: new Date().toISOString() })
      .eq('email', email)
      .select()
      .single();

    if (error) {
      console.error('Error unsubscribing email:', error);
      return res.status(500).json({
        success: false,
        error: 'Database Error',
        message: 'Failed to unsubscribe email'
      });
    }

    const response: APIResponse<typeof data> = {
      success: true,
      data,
      message: 'Successfully unsubscribed from mailing list'
    };

    res.json(response);
  } catch (error) {
    console.error('Unsubscribe error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to unsubscribe email'
    });
  }
});

// DELETE /api/v1/emails/:id - Delete email (admin only)
router.delete('/:id', requirePermissions(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('emails')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting email:', error);
      return res.status(500).json({
        success: false,
        error: 'Database Error',
        message: 'Failed to delete email'
      });
    }

    const response: APIResponse<null> = {
      success: true,
      message: 'Email deleted successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('Delete email error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to delete email'
    });
  }
});

export default router; 