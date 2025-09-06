# KAFU System - Competency Framework Management

A comprehensive system for managing competency frameworks with user management, group organization, and role-based access control.

## Features

### Users Management
- ✅ **CSV/Excel Upload**: Import multiple users from CSV or Excel files
- ✅ **User Creation**: Add individual users with detailed information
- ✅ **Role Assignment**: Assign roles (Admin, Manager, Staff, Viewer) to users
- ✅ **Group Management**: Organize users into groups for better management
- ✅ **Search & Filter**: Find users by name, email, role, or group
- ✅ **Responsive Design**: Mobile-friendly interface with card-based layouts

### Groups Management
- ✅ **Group Creation**: Create and manage user groups
- ✅ **User Assignment**: Add/remove users from groups
- ✅ **Group Information**: Add descriptions and manage group details
- ✅ **Member Management**: View and manage group members

### Authentication & Security
- ✅ **JWT Authentication**: Secure token-based authentication
- ✅ **Role-based Access**: Different permissions for different roles
- ✅ **Protected Routes**: Secure access to system features

### UI/UX Features
- ✅ **Modern Design**: Clean, professional interface using Tailwind CSS
- ✅ **Responsive Layout**: Works on desktop, tablet, and mobile devices
- ✅ **Toast Notifications**: Real-time feedback for user actions
- ✅ **Loading States**: Smooth loading indicators
- ✅ **Error Handling**: Comprehensive error handling and user feedback

## Tech Stack

### Backend
- **Node.js** with Express.js
- **PostgreSQL** database with Prisma ORM
- **JWT** for authentication
- **Multer** for file uploads
- **XLSX** and **CSV-Parser** for file processing

### Frontend
- **React 18** with functional components and hooks
- **Tailwind CSS** for styling
- **shadcn/ui** for UI components
- **React Router** for navigation
- **TanStack Query** for data fetching
- **Lucide React** for icons

## Getting Started

### Option 1: Docker (Recommended - No Installation Required)

The easiest way to run KAFU System is using Docker. This method doesn't require installing Node.js or PostgreSQL locally.

#### Prerequisites
- Docker Desktop (Download from [docker.com](https://www.docker.com/products/docker-desktop))

#### Quick Start with Docker

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd kafu-system
   ```

2. **Run the Docker setup script**
   ```bash
   ./docker-setup.sh
   ```

3. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

#### Docker Commands

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f

# Restart services
docker-compose restart

# Rebuild and start
docker-compose up --build -d
```

### Option 2: Local Development

#### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL database
- npm or yarn package manager

#### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd kafu-system
   ```

2. **Install dependencies**
   ```bash
   npm run install-all
   ```

3. **Set up the database**
   ```bash
   # Create a PostgreSQL database
   createdb kafu_system
   
   # Navigate to backend directory
   cd backend
   
   # Set up environment variables
   cp .env.example .env
   # Edit .env with your database credentials
   
   # Run database migrations
   npx prisma db push
   ```

4. **Start the development servers**
   ```bash
   # From the root directory
   npm run dev
   ```

   This will start:
   - Backend server on http://localhost:5000
   - Frontend development server on http://localhost:3000

### Environment Variables

Create a `.env` file in the `backend` directory:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/kafu_system?schema=public"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRES_IN="7d"

# Server
PORT=5000
NODE_ENV="development"

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_PATH="./uploads"
```

## Usage

### First Time Setup

1. **Access the application**: Navigate to http://localhost:3000
2. **Create an account**: Use the registration form to create your first admin account
3. **Login**: Use your credentials to access the system

### Managing Users

1. **Upload Users**: 
   - Go to the Users page
   - Click "Upload Users"
   - Select a CSV or Excel file with user data
   - Required columns: email, firstName, lastName
   - Optional columns: role, groupName

2. **Create Individual Users**:
   - Click "Add User" on the Users page
   - Fill in the user details
   - Assign a role and optional group

3. **Manage Groups**:
   - Go to the Groups page
   - Create new groups
   - Add/remove users from groups

### File Upload Format

#### CSV Format
```csv
email,firstName,lastName,role,groupName
john.doe@example.com,John,Doe,STAFF,Marketing
jane.smith@example.com,Jane,Smith,MANAGER,Sales
```

#### Excel Format
The same columns as CSV, with the first row as headers.

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user

### Users
- `GET /api/users` - Get all users (with pagination and filters)
- `POST /api/users` - Create a new user
- `PUT /api/users/:id` - Update a user
- `DELETE /api/users/:id` - Delete a user
- `PATCH /api/users/:id/group` - Assign user to group

### Groups
- `GET /api/groups` - Get all groups
- `POST /api/groups` - Create a new group
- `PUT /api/groups/:id` - Update a group
- `DELETE /api/groups/:id` - Delete a group
- `POST /api/groups/:id/users` - Add users to group
- `DELETE /api/groups/:groupId/users/:userId` - Remove user from group

### Upload
- `POST /api/upload/users` - Upload users from file

## Database Schema

### Users Table
- `id` - Unique identifier
- `email` - User email (unique)
- `firstName` - User's first name
- `lastName` - User's last name
- `role` - User role (ADMIN, MANAGER, STAFF, VIEWER)
- `groupId` - Foreign key to groups table
- `isActive` - User status
- `createdAt` - Creation timestamp
- `updatedAt` - Last update timestamp

### Groups Table
- `id` - Unique identifier
- `name` - Group name (unique)
- `description` - Group description
- `createdAt` - Creation timestamp
- `updatedAt` - Last update timestamp

## Development

### Project Structure
```
kafu-system/
├── backend/
│   ├── routes/          # API routes
│   ├── middleware/      # Express middleware
│   ├── prisma/          # Database schema
│   └── uploads/         # File uploads directory
├── frontend/
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── pages/       # Page components
│   │   ├── contexts/    # React contexts
│   │   └── lib/         # Utility functions
│   └── public/          # Static assets
└── README.md
```

### Available Scripts

- `npm run dev` - Start both frontend and backend in development mode
- `npm run server` - Start only the backend server
- `npm run client` - Start only the frontend development server
- `npm run build` - Build the frontend for production
- `npm run install-all` - Install dependencies for all packages

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please contact the development team or create an issue in the repository.
