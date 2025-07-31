import { supabase } from './supabaseClient';

export interface StorageUploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export const uploadToStorage = async (
  file: File, 
  bucketName: string, 
  path: string
): Promise<StorageUploadResult> => {
  try {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return {
        success: false,
        error: 'Please select a valid image file (JPEG, PNG, or WebP)'
      };
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return {
        success: false,
        error: 'Image file size must be less than 5MB'
      };
    }

    // Upload file to Supabase storage
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Storage upload error:', error);
      return {
        success: false,
        error: error.message
      };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(path);

    return {
      success: true,
      url: urlData.publicUrl
    };
  } catch (error) {
    console.error('Storage upload error:', error);
    return {
      success: false,
      error: 'Failed to upload image'
    };
  }
};

export const deleteFromStorage = async (
  bucketName: string, 
  path: string
): Promise<boolean> => {
  try {
    const { error } = await supabase.storage
      .from(bucketName)
      .remove([path]);

    if (error) {
      console.error('Storage delete error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Storage delete error:', error);
    return false;
  }
};

export const generateImagePath = (employeeId: string, fileName: string): string => {
  const timestamp = Date.now();
  const extension = fileName.split('.').pop();
  return `employees/${employeeId}/${timestamp}.${extension}`;
}; 