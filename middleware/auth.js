import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase.js';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    console.log('🔐 Auth middleware - Header:', authHeader ? 'Present' : 'Missing');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ No valid auth header');
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.substring(7);
    console.log('🔑 Token extracted, length:', token.length);

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.log('❌ Auth failed:', error?.message || 'No user');
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    console.log('✅ User authenticated:', user.id);
    req.user = user;
    next();
  } catch (error) {
    console.error('💥 Auth error:', error);
    res.status(401).json({ message: 'Authentication failed' });
  }
};

export const requireAdmin = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const isAdmin = req.user.user_metadata?.role === 'admin';

  if (!isAdmin) {
    return res.status(403).json({ message: 'Admin access required' });
  }

  next();
};
