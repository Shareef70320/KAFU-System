import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { 
  Upload, 
  Image, 
  CheckCircle, 
  AlertCircle, 
  X,
  FileImage,
  Download,
  Info
} from 'lucide-react';
import { useToast } from '../components/ui/use-toast';

const PhotoUpload = () => {
  const { toast } = useToast();
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState([]);

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length !== files.length) {
      toast({
        title: "Invalid Files",
        description: "Some files are not images and were skipped.",
        variant: "destructive",
      });
    }

    const newFiles = imageFiles.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      name: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
      size: file.size,
      status: 'pending'
    }));

    setSelectedFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (id) => {
    setSelectedFiles(prev => prev.filter(file => file.id !== id));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const uploadPhotos = async () => {
    if (selectedFiles.length === 0) {
      toast({
        title: "No Files Selected",
        description: "Please select at least one photo to upload.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    const results = [];

    for (const fileData of selectedFiles) {
      try {
        const formData = new FormData();
        formData.append('photos', fileData.file);

        const response = await fetch('/api/photos/upload-multiple', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();
        
        if (data.success) {
          results.push({
            ...fileData,
            status: 'success',
            message: 'Uploaded successfully'
          });
        } else {
          results.push({
            ...fileData,
            status: 'error',
            message: data.message || 'Upload failed'
          });
        }
      } catch (error) {
        results.push({
          ...fileData,
          status: 'error',
          message: 'Upload failed: ' + error.message
        });
      }
    }

    setUploadResults(results);
    setUploading(false);

    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    toast({
      title: "Upload Complete",
      description: `${successCount} photos uploaded successfully. ${errorCount} failed.`,
      variant: successCount > 0 ? "default" : "destructive",
    });

    // Clear selected files after successful upload
    if (successCount > 0) {
      setSelectedFiles([]);
    }
  };

  const downloadTemplate = () => {
    const template = `Instructions for Employee Photo Upload:

1. Photo Requirements:
   - Format: JPG, PNG, or WEBP
   - Size: Maximum 2MB per photo
   - Dimensions: Square aspect ratio recommended (e.g., 300x300px)
   - Quality: Clear, professional headshot

2. Naming Convention:
   - Each photo must be named with the employee's SID
   - Example: 2254.jpg, 1234.png, 5678.webp
   - No spaces or special characters in filename

3. Upload Process:
   - Select multiple photos at once
   - System will automatically match SID from filename
   - Photos will be resized and optimized automatically

4. Supported SIDs:
   - Check the Employees page for valid SIDs
   - Only upload photos for existing employees

5. After Upload:
   - Photos will appear in employee cards
   - Fallback avatars will show for missing photos
   - You can re-upload to replace existing photos`;

    const blob = new Blob([template], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'photo-upload-instructions.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Employee Photo Upload</h1>
          <p className="text-gray-600">Upload employee photos named with their SID</p>
        </div>
        <Button onClick={downloadTemplate} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Download Instructions
        </Button>
      </div>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Info className="h-5 w-5 mr-2 text-blue-600" />
            Upload Instructions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
              <p><strong>Naming:</strong> Name each photo file with the employee's SID (e.g., 2254.jpg)</p>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
              <p><strong>Format:</strong> JPG, PNG, or WEBP files only</p>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
              <p><strong>Size:</strong> Maximum 2MB per photo, square aspect ratio recommended</p>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
              <p><strong>Quality:</strong> Clear, professional headshots work best</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Upload className="h-5 w-5 mr-2 text-green-600" />
            Select Photos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
              <FileImage className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <Label htmlFor="photo-upload" className="cursor-pointer">
                <div className="space-y-2">
                  <p className="text-lg font-medium text-gray-900">Click to select photos</p>
                  <p className="text-sm text-gray-500">or drag and drop files here</p>
                </div>
              </Label>
              <Input
                id="photo-upload"
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {/* Selected Files */}
            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-medium text-gray-900">Selected Files ({selectedFiles.length})</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {selectedFiles.map((fileData) => (
                    <div key={fileData.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Image className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900">{fileData.name}</p>
                          <p className="text-sm text-gray-500">{formatFileSize(fileData.size)}</p>
                        </div>
                      </div>
                      <Button
                        onClick={() => removeFile(fileData.id)}
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload Button */}
            {selectedFiles.length > 0 && (
              <Button 
                onClick={uploadPhotos} 
                disabled={uploading}
                className="w-full loyverse-button-primary"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload {selectedFiles.length} Photos
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Upload Results */}
      {uploadResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
              Upload Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {uploadResults.map((result, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {result.status === 'success' ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-600" />
                    )}
                    <div>
                      <p className="font-medium text-gray-900">{result.name}</p>
                      <p className="text-sm text-gray-500">{result.message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PhotoUpload;
