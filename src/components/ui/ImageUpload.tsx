import React, { useState, useRef } from 'react';
import { Upload, X, User } from 'lucide-react';
import { uploadToStorage, generateImagePath } from '../../utils/storageService';

interface ImageUploadProps {
  value?: string;
  onChange: (imageUrl: string) => void;
  onRemove: () => void;
  className?: string;
  disabled?: boolean;
  employeeId?: string; // For generating unique file paths
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  value,
  onChange,
  onRemove,
  className = '',
  disabled = false,
  employeeId
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      // Generate unique path for the image
      const path = generateImagePath(employeeId || 'temp', file.name);
      
      // Upload to Supabase storage
      const uploadResult = await uploadToStorage(file, 'employee-images', path);
      
      if (!uploadResult.success) {
        setError(uploadResult.error || 'Upload failed');
        return;
      }

      onChange(uploadResult.url!);
    } catch (err) {
      setError('Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove();
    setError(null);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div
        onClick={handleClick}
        className={`
          relative group cursor-pointer rounded-lg border-2 border-dashed transition-all duration-200
          ${disabled ? 'border-gray-200 bg-gray-50 cursor-not-allowed' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'}
          ${error ? 'border-red-300 bg-red-50' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled}
        />
        
        {value ? (
          // Image preview
          <div className="relative p-4">
            <img
              src={value}
              alt="Employee"
              className="w-32 h-32 object-cover rounded-lg mx-auto"
            />
            {!disabled && (
              <button
                onClick={handleRemove}
                className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors duration-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          // Upload placeholder
          <div className="p-8 text-center">
            {isUploading ? (
              <div className="space-y-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-sm text-gray-600">Uploading...</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                  <Upload className="w-6 h-6 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    {disabled ? 'No image' : 'Click to upload image'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    PNG, JPG, WebP up to 5MB
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export default ImageUpload; 