# Employee Photo Upload Instructions

## 📁 Where to Place Photos

### Option 1: Using the Web Interface (Recommended)
1. **Access the System**: Go to http://localhost:3000
2. **Login as Admin**: Use the role switch if needed
3. **Navigate to Photo Upload**: Click "Photo Upload" in the admin menu
4. **Upload Photos**: Select multiple photos and upload them through the interface

### Option 2: Direct File Placement
If you prefer to place photos directly in the file system:

1. **Navigate to the photos directory**:
   ```bash
   cd /Users/shareefmahrooqi/Desktop/Work/KAFU System/backend/uploads/photos
   ```

2. **Place your photos** in this directory with the naming convention:
   - `2254.jpg` (for SID 2254)
   - `1234.png` (for SID 1234)
   - `5678.webp` (for SID 5678)

## 📋 Photo Requirements

### File Format
- **Supported formats**: JPG, JPEG, PNG, WEBP
- **Recommended**: JPG for best compatibility

### File Size
- **Maximum**: 2MB per photo
- **Recommended**: 500KB - 1MB for optimal performance

### Dimensions
- **Aspect ratio**: Square (1:1) recommended
- **Minimum size**: 200x200 pixels
- **Recommended size**: 300x300 to 500x500 pixels

### Quality
- **Resolution**: Clear, professional headshots
- **Lighting**: Good lighting, no shadows on face
- **Background**: Plain or professional background
- **Expression**: Professional, friendly expression

## 🏷️ Naming Convention

### Required Format
- **Filename**: `{SID}.{extension}`
- **Examples**:
  - `2254.jpg` ✅
  - `1234.png` ✅
  - `5678.webp` ✅
  - `John_Doe.jpg` ❌ (Use SID, not name)
  - `2254 (1).jpg` ❌ (No spaces or special characters)

### Finding Employee SIDs
1. Go to the **Employees** page in the admin interface
2. Look at the **SID** column for each employee
3. Use these exact SIDs as filenames

## 🔄 How Photos Are Used

### Automatic Integration
Once uploaded, photos will automatically appear in:
- **Employee Management page**: Card layout with photos
- **User Profile page**: Personal information section
- **Any other employee displays**: Throughout the system

### Fallback System
- If no photo exists for an employee, a **colored avatar with initials** will be displayed
- The system gracefully handles missing photos
- You can upload photos at any time to replace avatars

## 🚀 Quick Start

### For SID 2254 (Shareef Yahya Sulaiman Al Mahrooqi)
1. Find a professional photo of this person
2. Name it exactly: `2254.jpg`
3. Upload it using the Photo Upload page
4. The photo will immediately appear in the user interface

### For Multiple Employees
1. Prepare photos for all employees you want to add
2. Name each photo with the corresponding SID
3. Use the bulk upload feature in the Photo Upload page
4. All photos will be processed and integrated automatically

## 🛠️ Technical Details

### File Storage
- **Location**: `backend/uploads/photos/`
- **Access**: Photos are served via `/api/photos/{SID}` endpoint
- **Backup**: Photos are stored in the Docker container

### API Endpoints
- **Upload**: `POST /api/photos/upload-multiple`
- **Get Photo**: `GET /api/photos/{SID}`
- **List Photos**: `GET /api/photos/`
- **Delete Photo**: `DELETE /api/photos/{SID}`

### Database Integration
- Photos are linked to employees by SID
- No database changes required
- Photos are served as static files

## ✅ Verification

After uploading photos:
1. **Check Employee Cards**: Photos should appear in the Employees page
2. **Check User Profile**: Switch to user view and check the profile page
3. **Test Different SIDs**: Verify photos for different employees

## 🔧 Troubleshooting

### Photo Not Appearing
1. **Check filename**: Must be exactly `{SID}.{extension}`
2. **Check file format**: Must be JPG, PNG, or WEBP
3. **Check file size**: Must be under 2MB
4. **Refresh page**: Clear browser cache and reload

### Upload Errors
1. **File too large**: Compress the image
2. **Invalid format**: Convert to JPG, PNG, or WEBP
3. **Network error**: Check internet connection
4. **Server error**: Check Docker containers are running

### Missing Photos
1. **Check SID exists**: Verify the employee exists in the system
2. **Check file location**: Ensure photo is in the correct directory
3. **Check permissions**: Ensure the file is readable

---

**Ready to upload photos?** Start with the Photo Upload page at http://localhost:3000/photo-upload

