# Real-Time Collaborative Notes App

A real-time collaborative notes application built with React, Express, MongoDB, and Socket.io. This app allows users to create, edit, and collaborate on notes in real-time.

## Features

- 🔐 User authentication (register, login, logout)
- 📝 Create, read, update, and delete notes
- 👥 Real-time collaboration on notes
- 👋 User presence indicators
- 🔄 Automatic saving
- 🤝 Collaborator management
- 📱 Responsive design

## Prerequisites

Before you begin, ensure you have installed:

- Node.js (v16 or higher)
- npm (usually comes with Node.js)
- MongoDB (local installation or MongoDB Atlas account)

## Installation & Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd task
```

### 2. Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a .env file in the backend directory with the following variables:
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_jwt_refresh_secret
FRONTEND_URL=http://localhost:5173
```

4. Start the development server:
```bash
npm run dev
```

The backend server will start on http://localhost:5000

### 3. Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create a .env file in the frontend directory:
```env
VITE_API_URL=http://localhost:5000
```

4. Start the development server:
```bash
npm run dev
```

The frontend application will start on http://localhost:5173

## Project Structure

### Backend (Express.js + Node.js)

```
backend/
├── src/
│   ├── config/         # Configuration files
│   ├── controllers/    # Route controllers
│   ├── middleware/     # Custom middleware
│   ├── models/         # Database models
│   ├── routes/         # API routes
│   ├── utils/          # Utility functions
│   ├── socket.ts       # Socket.io implementation
│   └── index.ts        # Application entry point
```

### Frontend (React + Vite + TypeScript)

```
frontend/
├── src/
│   ├── components/     # React components
│   ├── contexts/       # React contexts
│   ├── hooks/         # Custom hooks
│   ├── lib/           # Utility functions
│   ├── services/      # API services
│   └── App.tsx        # Root component
```

## Development

### Running in Development Mode

1. Start the backend server:
```bash
cd backend
npm run dev
```

2. In a new terminal, start the frontend:
```bash
cd frontend
npm run dev
```

### Building for Production

1. Build the backend:
```bash
cd backend
npm run build
```

2. Build the frontend:
```bash
cd frontend
npm run build
```

The frontend build will be in `frontend/dist` directory, and the backend build will be in `backend/dist`.

## Environment Variables

### Backend (.env)

- `PORT`: Server port (default: 5000)
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT access tokens
- `JWT_REFRESH_SECRET`: Secret key for JWT refresh tokens
- `FRONTEND_URL`: Frontend application URL

### Frontend (.env)

- `VITE_API_URL`: Backend API URL

## Contributing

1. Fork the repository
2. Create a new branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License.
