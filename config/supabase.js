import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export const uploadFile = async (bucket, path, file) => {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file.buffer, {
        contentType: file.mimetype,
        cacheControl: '3600',
        upsert: false,
      });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
};

export const getPublicUrl = (bucket, path) => {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
};

export const deleteFile = async (bucket, path) => {
  try {
    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (error) throw error;
  } catch (error) {
    console.error('Delete error:', error);
    throw error;
  }
};
