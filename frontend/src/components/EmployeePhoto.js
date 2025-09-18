import React, { useState } from 'react';
import { getEmployeePhotoWithFallback, generateDefaultAvatar, getPhotoCropStyles } from '../utils/photoUtils';

const EmployeePhoto = ({ 
  sid, 
  firstName, 
  lastName, 
  size = 'medium', 
  className = '',
  showFallback = true,
  cropType = 'face' // 'face', 'head', 'shoulders'
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleImageError = () => {
    setImageError(true);
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const getSizeClasses = (size) => {
    const sizeMap = {
      small: 'h-8 w-8',
      medium: 'h-16 w-16',
      large: 'h-32 w-32'
    };
    return sizeMap[size] || sizeMap.medium;
  };

  const getTextSizeClasses = (size) => {
    const sizeMap = {
      small: 'text-xs',
      medium: 'text-lg',
      large: 'text-3xl'
    };
    return sizeMap[size] || sizeMap.medium;
  };

  // If image failed to load and we have fallback enabled
  if (imageError && showFallback) {
    return (
      <div className={`${getSizeClasses(size)} ${className} rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white font-semibold ${getTextSizeClasses(size)}`}>
        {firstName?.[0] || ''}{lastName?.[0] || ''}
      </div>
    );
  }

  return (
    <div className={`${getSizeClasses(size)} ${className} rounded-full overflow-hidden bg-gray-200 flex items-center justify-center`}>
      <img
        src={getEmployeePhotoWithFallback(sid)}
        alt={`${firstName} ${lastName}`}
        className={`${getSizeClasses(size)} object-cover object-center transition-opacity duration-200 ${
          imageLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        style={getPhotoCropStyles(size, cropType)}
        onError={handleImageError}
        onLoad={handleImageLoad}
      />
      {!imageLoaded && !imageError && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
        </div>
      )}
    </div>
  );
};

export default EmployeePhoto;
