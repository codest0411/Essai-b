import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { email, password, username, full_name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          full_name,
          role: 'user',
        },
      },
    });

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    const { data: userData, error: insertError } = await supabase
      .from('users')
      .insert([
        {
          id: data.user.id,
          email: data.user.email,
          username: username || email.split('@')[0],
          full_name: full_name || '',
          role: 'user',
        },
      ])
      .select()
      .single();

    if (insertError) {
      console.error('Error creating user record:', insertError);
    }

    res.status(201).json({
      message: 'User registered successfully',
      user: data.user,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(401).json({ message: error.message });
    }

    // Ensure user record exists in users table
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', data.user.id)
      .single();

    if (!existingUser) {
      console.log('Creating user record for existing auth user:', data.user.id);
      const { error: insertError } = await supabase
        .from('users')
        .insert([
          {
            id: data.user.id,
            email: data.user.email,
            username: data.user.user_metadata?.username || data.user.email.split('@')[0],
            full_name: data.user.user_metadata?.full_name || '',
            role: 'user',
          },
        ]);

      if (insertError) {
        console.error('Error creating user record on login:', insertError);
      } else {
        console.log('✅ User record created successfully');
      }
    }

    res.json({
      message: 'Login successful',
      user: data.user,
      session: data.session,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed' });
  }
});

router.get('/me', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (error) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(data);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Failed to get user data' });
  }
});

router.post('/logout', authenticate, async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Logout failed' });
  }
});

export default router;
