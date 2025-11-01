export interface ImageUploadResult {
  success: boolean;
  data?: string; // base64 data URL
  error?: string;
}

export const uploadImage = (file: File): Promise<ImageUploadResult> => {
  return new Promise((resolve) => {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      resolve({
        success: false,
        error: 'Please select a valid image file (JPEG, PNG, or WebP)'
      });
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      resolve({
        success: false,
        error: 'Image file size must be less than 5MB'
      });
      return;
    }

    const reader = new FileReader();
    
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        resolve({
          success: true,
          data: result
        });
      } else {
        resolve({
          success: false,
          error: 'Failed to read image file'
        });
      }
    };

    reader.onerror = () => {
      resolve({
        success: false,
        error: 'Failed to read image file'
      });
    };

    reader.readAsDataURL(file);
  });
};

export const resizeImage = (dataUrl: string, maxWidth: number = 400, maxHeight: number = 400): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      // Calculate new dimensions
      let { width, height } = img;
      
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      
      // Draw and resize image
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert to base64 with reduced quality
      const resizedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
      resolve(resizedDataUrl);
    };
    
    img.onerror = () => {
      resolve(dataUrl);
    };
    
    img.src = dataUrl;
  });
}; // Image upload
