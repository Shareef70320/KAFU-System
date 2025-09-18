// Photo utility functions for employee photos

/**
 * Get the photo URL for an employee based on their SID
 * @param {string} sid - Employee SID
 * @param {string} fallback - Fallback photo URL (optional)
 * @returns {string} Photo URL
 */
export const getEmployeePhoto = (sid, fallback = null) => {
  if (!sid) return fallback || '/default-avatar.png';
  
  // Try to load the photo from the photos directory
  const photoUrl = `/api/photos/${sid}`;
  
  // Return the photo URL (the image will show a broken image icon if it doesn't exist)
  return photoUrl;
};

/**
 * Get the photo URL with error handling
 * @param {string} sid - Employee SID
 * @param {string} fallback - Fallback photo URL (optional)
 * @returns {string} Photo URL
 */
export const getEmployeePhotoWithFallback = (sid, fallback = '/default-avatar.png') => {
  if (!sid) return fallback;
  
  // Return the photo URL - the img tag will handle the fallback
  return `/api/photos/${sid}`;
};

/**
 * Check if a photo exists for an employee
 * @param {string} sid - Employee SID
 * @returns {Promise<boolean>} Whether the photo exists
 */
export const checkPhotoExists = async (sid) => {
  if (!sid) return false;
  
  try {
    const response = await fetch(`/api/photos/${sid}`, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    return false;
  }
};

/**
 * Get photo dimensions for consistent sizing
 * @param {string} size - Size variant ('small', 'medium', 'large')
 * @returns {object} Width and height dimensions
 */
export const getPhotoDimensions = (size = 'medium') => {
  const dimensions = {
    small: { width: 32, height: 32 },
    medium: { width: 64, height: 64 },
    large: { width: 128, height: 128 }
  };
  
  return dimensions[size] || dimensions.medium;
};

/**
 * Get photo cropping styles for face-focused avatars
 * @param {string} size - Size variant
 * @param {string} cropType - Type of cropping ('face', 'head', 'shoulders')
 * @returns {object} CSS styles for photo cropping
 */
export const getPhotoCropStyles = (size = 'medium', cropType = 'face') => {
  const cropStyles = {
    face: {
      objectPosition: 'center 25%',
      transform: 'scale(1.15)',
      transformOrigin: 'center 30%'
    },
    head: {
      objectPosition: 'center 30%',
      transform: 'scale(1.1)',
      transformOrigin: 'center 35%'
    },
    shoulders: {
      objectPosition: 'center 40%',
      transform: 'scale(1.05)',
      transformOrigin: 'center 45%'
    }
  };

  return {
    objectFit: 'cover',
    width: '100%',
    height: '100%',
    ...cropStyles[cropType] || cropStyles.face
  };
};

/**
 * Generate a default avatar with initials
 * @param {string} firstName - Employee first name
 * @param {string} lastName - Employee last name
 * @param {string} size - Size variant
 * @returns {string} Data URL for the avatar
 */
export const generateDefaultAvatar = (firstName, lastName, size = 'medium') => {
  const { width, height } = getPhotoDimensions(size);
  const initials = `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  
  // Create a canvas element
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  // Create gradient background
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#10b981');
  gradient.addColorStop(1, '#059669');
  
  // Draw background
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  // Draw initials
  ctx.fillStyle = 'white';
  ctx.font = `bold ${Math.floor(width * 0.4)}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(initials, width / 2, height / 2);
  
  return canvas.toDataURL();
};
