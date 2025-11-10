import { supabase } from '../supabaseClient.js';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password) {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

/**
 * Login endpoint - POST /api/auth/login
 */
export async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Please provide both email and password.' 
      });
    }

    // Fetch user by email
    const { data, error: queryError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (queryError || !data) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid email or password.' 
      });
    }

    // Verify password
    let isValid = await verifyPassword(password, data.password_hash);

    // Seamless migration for legacy plaintext passwords
    if (!isValid && data.password_hash === password) {
      const newHash = await hashPassword(password);
      await supabase
        .from('users')
        .update({ password_hash: newHash })
        .eq('id', data.id);
      isValid = true;
      data.password_hash = newHash;
    }

    if (!isValid) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid email or password.' 
      });
    }

    // Remove password hash before sending
    const { password_hash, ...userWithoutPassword } = data;

    return res.json({ 
      success: true, 
      user: userWithoutPassword 
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'An error occurred during login.' 
    });
  }
}

/**
 * Register endpoint - POST /api/auth/register
 */
export async function register(req, res) {
  try {
    const { name, email, password, confirm, description, logo } = req.body;

    if (!name || !email || !password || !confirm || !description) {
      return res.status(400).json({ 
        success: false, 
        error: 'Please fill in all fields.' 
      });
    }

    if (password !== confirm) {
      return res.status(400).json({ 
        success: false, 
        error: 'Passwords do not match.' 
      });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Insert user
    const { data: userData, error: insertError } = await supabase
      .from('users')
      .insert([{
        name,
        email,
        password_hash: passwordHash,
        description,
        logo: logo || ''
      }])
      .select()
      .single();

    if (insertError) {
      if (insertError.code === '23505') { // Unique violation
        return res.status(409).json({ 
          success: false, 
          error: 'Email already exists.' 
        });
      }
      throw insertError;
    }

    // Create default business settings
    const defaultWorkingHours = [
      { day: 'Monday', open: '09:00', close: '17:00', isClosed: false },
      { day: 'Tuesday', open: '09:00', close: '17:00', isClosed: false },
      { day: 'Wednesday', open: '09:00', close: '17:00', isClosed: false },
      { day: 'Thursday', open: '09:00', close: '17:00', isClosed: false },
      { day: 'Friday', open: '09:00', close: '17:00', isClosed: false },
      { day: 'Saturday', open: '10:00', close: '15:00', isClosed: false },
      { day: 'Sunday', open: '00:00', close: '00:00', isClosed: true }
    ];

    await supabase.from('business_settings').insert([{
      business_id: userData.id,
      name,
      working_hours: defaultWorkingHours,
      blocked_dates: [],
      breaks: [],
      appointment_duration: 30
    }]);

    // Create default services
    const defaultServices = [
      {
        business_id: userData.id,
        name: 'Consultation',
        description: 'Initial consultation and assessment',
        duration: 30,
        price: 25.00
      },
      {
        business_id: userData.id,
        name: 'Basic Service',
        description: 'Standard service offering',
        duration: 60,
        price: 50.00
      }
    ];

    await supabase.from('services').insert(defaultServices);

    // Create default employee
    await supabase.from('employees').insert([{
      business_id: userData.id,
      name: 'Main Staff',
      email,
      phone: '+1234567890',
      role: 'Service Provider'
    }]);

    // Remove password hash before sending
    const { password_hash, ...userWithoutPassword } = userData;

    return res.status(201).json({ 
      success: true, 
      user: userWithoutPassword,
      message: 'Registration successful!' 
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'An error occurred during registration.' 
    });
  }
}

/**
 * Upload logo endpoint - POST /api/auth/upload-logo
 */
export async function uploadLogo(req, res) {
  try {
    const { fileName, fileContent, contentType } = req.body;

    if (!fileName || !fileContent) {
      return res.status(400).json({ 
        success: false, 
        error: 'fileName and fileContent are required.' 
      });
    }

    // Decode base64 file content
    const buffer = Buffer.from(fileContent, 'base64');

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('logos')
      .upload(fileName, buffer, {
        contentType: contentType || 'image/png',
        upsert: true
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to upload logo: ' + uploadError.message 
      });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('logos')
      .getPublicUrl(fileName);

    return res.json({ 
      success: true, 
      logoUrl: urlData.publicUrl 
    });
  } catch (error) {
    console.error('Logo upload error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'An error occurred during logo upload.' 
    });
  }
}

/**
 * Update profile endpoint - PATCH /api/auth/profile/:userId
 */
export async function updateProfile(req, res) {
  try {
    const { userId } = req.params;
    const updates = req.body;

    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'User ID is required.' 
      });
    }

    // Update user
    const { data, error: updateError } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select('*')
      .single();

    if (updateError) {
      throw updateError;
    }

    if (!data) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found.' 
      });
    }

    // Remove password hash before sending
    const { password_hash, ...userWithoutPassword } = data;

    return res.json({ 
      success: true, 
      user: userWithoutPassword 
    });
  } catch (error) {
    console.error('Profile update error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'An error occurred while updating profile.' 
    });
  }
}

/**
 * Change password endpoint - POST /api/auth/change-password
 */
export async function changePassword(req, res) {
  try {
    const { userId, currentPassword, newPassword, confirmPassword } = req.body;

    if (!userId || !currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ 
        success: false, 
        error: 'Please fill in all fields.' 
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ 
        success: false, 
        error: 'New passwords do not match.' 
      });
    }

    // Fetch current password hash
    const { data: userRow, error: fetchError } = await supabase
      .from('users')
      .select('id, password_hash')
      .eq('id', userId)
      .single();

    if (fetchError || !userRow) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found.' 
      });
    }

    // Verify current password
    const matches = await verifyPassword(currentPassword, userRow.password_hash);
    if (!matches) {
      return res.status(401).json({ 
        success: false, 
        error: 'Current password is incorrect.' 
      });
    }

    // Hash new password
    const newHash = await hashPassword(newPassword);

    // Update password
    const { error: updateError } = await supabase
      .from('users')
      .update({ password_hash: newHash })
      .eq('id', userId);

    if (updateError) {
      throw updateError;
    }

    return res.json({ 
      success: true, 
      message: 'Password changed successfully!' 
    });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'An error occurred while changing password.' 
    });
  }
}

