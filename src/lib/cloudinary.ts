import imageCompression from 'browser-image-compression';

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Compress image before upload
 */
export async function compressImage(file: File): Promise<File> {
  const options = {
    maxSizeMB: 1, // Max 1MB
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: 'image/jpeg' as const,
  };

  try {
    const compressedFile = await imageCompression(file, options);
    console.log('Original file size:', (file.size / 1024 / 1024).toFixed(2), 'MB');
    console.log('Compressed file size:', (compressedFile.size / 1024 / 1024).toFixed(2), 'MB');
    return compressedFile;
  } catch (error) {
    console.error('Error compressing image:', error);
    return file; // Return original if compression fails
  }
}

/**
 * Upload image to Cloudinary
 */
export async function uploadToCloudinary(
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  try {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      return { success: false, error: 'Please select an image file' };
    }

    // Validate file size (5MB max before compression)
    if (file.size > 5 * 1024 * 1024) {
      return { success: false, error: 'Image size must be less than 5MB' };
    }

    // Compress image
    const compressedFile = await compressImage(file);

    // Create form data
    const formData = new FormData();
    formData.append('file', compressedFile);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', 'profile-pictures');

    // Upload to Cloudinary
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('Cloudinary upload error:', error);
      return { success: false, error: 'Failed to upload image' };
    }

    const data = await response.json();
    
    // Return the secure URL
    return {
      success: true,
      url: data.secure_url,
    };
  } catch (error) {
    console.error('Upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload image',
    };
  }
}

/**
 * Delete image from Cloudinary (requires backend with API secret)
 * For now, we'll just remove the URL from Firestore
 */
export async function deleteFromCloudinary(publicId: string): Promise<boolean> {
  // This would require backend API with Cloudinary API secret
  // For now, we just remove the reference from Firestore
  console.log('Image reference removed from profile:', publicId);
  return true;
}

/**
 * Get optimized image URL with transformations
 */
export function getOptimizedImageUrl(url: string, width: number = 400, height: number = 400): string {
  if (!url) return '';
  
  // If it's already a Cloudinary URL, add transformations
  if (url.includes('cloudinary.com')) {
    const parts = url.split('/upload/');
    if (parts.length === 2) {
      return `${parts[0]}/upload/c_fill,w_${width},h_${height},q_auto,f_auto/${parts[1]}`;
    }
  }
  
  return url;
}
