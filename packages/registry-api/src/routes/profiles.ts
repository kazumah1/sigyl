import { Router, Request, Response } from 'express';
import { supabase } from '../config/database';
import { requireHybridAuth } from '../middleware/auth';
import { APIResponse } from '../types';
import { supabaseAdmin } from '../config/supabaseAdmin';

const router = Router();

interface Profile {
  id: string;
  email: string;
  full_name?: string;
  username?: string;
  avatar_url?: string;
  github_id?: string;
  github_username?: string;
  created_at: string;
  updated_at: string;
}

// GET /api/v1/profiles/me - Get current user's profile
router.get('/me', requireHybridAuth, async (req: Request, res: Response) => {
  try {
    // Extract Supabase user ID from key_id (format: "supabase_<user_id>")
    let supabaseUserId: string | null = null;
    if (req.user!.key_id.startsWith('supabase_')) {
      supabaseUserId = req.user!.key_id.substring('supabase_'.length);
    }

    let profile: any = null;

    // First try to find profile by internal user_id (api_users table)
    const { data: profileByUserId, error: userIdError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', req.user!.user_id)
      .maybeSingle();

    if (!userIdError && profileByUserId) {
      profile = profileByUserId;
    } else if (supabaseUserId) {
      // Try to find profile by Supabase user ID
      const { data: profileBySupabaseId, error: supabaseIdError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', supabaseUserId)
        .maybeSingle();

      if (!supabaseIdError && profileBySupabaseId) {
        profile = profileBySupabaseId;
      } else {
        // Profile doesn't exist, create one based on the authenticated user
        // Get user info from api_users table
        const { data: apiUser, error: apiUserError } = await supabase
          .from('api_users')
          .select('*')
          .eq('id', req.user!.user_id)
          .single();

        if (apiUserError || !apiUser) {
          console.error('Error fetching API user:', apiUserError);
          return res.status(500).json({
            success: false,
            error: 'Failed to fetch user information',
            message: 'Could not retrieve user details'
          });
        }

        // Create profile using Supabase user ID and info from api_users
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: supabaseUserId,
            email: apiUser.email,
            full_name: apiUser.name,
            github_id: apiUser.github_id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating profile:', createError);
          return res.status(500).json({
            success: false,
            error: 'Failed to create profile',
            message: createError.message
          });
        }

        profile = newProfile;
      }
    }

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found',
        message: 'User profile not found and could not be created'
      });
    }

    const response: APIResponse<Profile> = {
      success: true,
      data: profile,
      message: 'Profile retrieved successfully'
    };

    return res.json(response);
  } catch (error) {
    console.error('Error fetching profile:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch profile'
    });
  }
});

// PUT /api/v1/profiles/me - Update current user's profile
router.put('/me', requireHybridAuth, async (req: Request, res: Response) => {
  try {
    const { full_name, username, avatar_url } = req.body;

    const updates: Partial<Profile> = {
      updated_at: new Date().toISOString()
    };

    if (full_name !== undefined) updates.full_name = full_name;
    if (username !== undefined) updates.username = username;
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;

    // Extract Supabase user ID from key_id (format: "supabase_<user_id>")
    let profileId = req.user!.user_id; // Default to internal user ID
    if (req.user!.key_id.startsWith('supabase_')) {
      profileId = req.user!.key_id.substring('supabase_'.length);
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', profileId)
      .select()
      .single();

    if (error) {
      console.error('Error updating profile:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update profile',
        message: error.message
      });
    }

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found',
        message: 'User profile not found'
      });
    }

    const response: APIResponse<Profile> = {
      success: true,
      data: profile,
      message: 'Profile updated successfully'
    };

    return res.json(response);
  } catch (error) {
    console.error('Error updating profile:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to update profile'
    });
  }
});

// DELETE /api/v1/profiles/me - Delete current user's profile
router.delete('/me', requireHybridAuth, async (req: Request, res: Response) => {
  try {
    // Extract Supabase user ID from key_id (format: "supabase_<user_id>")
    let profileId = req.user!.user_id; // Default to internal user ID
    if (req.user!.key_id.startsWith('supabase_')) {
      profileId = req.user!.key_id.substring('supabase_'.length);
    }

    // 1. Delete from 'profiles' table (optional, as it might be handled by foreign keys)
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', profileId);

    if (profileError) {
      console.warn('Warning: could not delete from profiles table:', profileError.message);
      // Not returning an error, as the auth user deletion is more critical
    }
    
    // 2. Delete from Supabase Auth
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(profileId);

    if (authError) {
      console.error('Error deleting user from Supabase Auth:', authError);
      return res.status(500).json({
        success: false,
        error: 'Failed to delete user authentication data',
        message: authError.message
      });
    }

    const response: APIResponse<null> = {
      success: true,
      data: null,
      message: 'Profile and associated user deleted successfully'
    };

    return res.json(response);
  } catch (error) {
    console.error('Error deleting profile:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to delete profile'
    });
  }
});

// GET /api/v1/profiles/:id - Get profile by ID
router.get('/:id', requireHybridAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url, created_at')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch profile',
        message: error.message
      });
    }

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found',
        message: 'Profile not found'
      });
    }

    const response: APIResponse<Partial<Profile>> = {
      success: true,
      data: profile,
      message: 'Profile retrieved successfully'
    };

    return res.json(response);
  } catch (error) {
    console.error('Error fetching profile:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch profile'
    });
  }
});

// GET /api/v1/profiles/github/:githubId - Get profile by GitHub ID
router.get('/github/:githubId', requireHybridAuth, async (req: Request, res: Response) => {
  try {
    const { githubId } = req.params;

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('github_id', githubId)
      .single();

    if (error) {
      console.error('Error fetching profile by GitHub ID:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch profile',
        message: error.message
      });
    }

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found',
        message: 'No profile found with the specified GitHub ID'
      });
    }

    const response: APIResponse<Profile> = {
      success: true,
      data: profile,
      message: 'Profile retrieved successfully'
    };

    return res.json(response);
  } catch (error) {
    console.error('Error fetching profile by GitHub ID:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch profile'
    });
  }
});

export default router; 