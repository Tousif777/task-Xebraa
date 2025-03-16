# Real-Time Collaborative Notes App

A real-time collaborative notes application built with React, Express, MongoDB, and Socket.io.

## Project Structure

The project is divided into two main parts:

### Frontend (React + Tailwind CSS)

-   Located in the `frontend` directory
-   Built with React, TypeScript, and Tailwind CSS
-   Uses Vite as the build tool

### Backend (Express.js + Node.js)

-   Located in the `backend` directory
-   Built with Express.js, TypeScript, and MongoDB
-   Uses Socket.io for real-time communication

## Getting Started

### Prerequisites

-   Node.js (v14 or higher)
-   MongoDB (local or Atlas)

### Installation

1. Clone the repository
2. Install dependencies for both frontend and backend:

```bash
# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install
```

3. Configure environment variables:
    - Create a `.env` file in the backend directory (or modify the existing one)
    - Set the required environment variables (MongoDB URI, JWT secrets, etc.)

### Running the Application

#### Development Mode

```bash
# Start the backend server
cd backend
npm run dev

# Start the frontend development server
cd frontend
npm run dev
```

#### Production Mode

```bash
# Build and start the backend
cd backend
npm run build
npm start

# Build the frontend
cd frontend
npm run build
```

## Features

-   User authentication (register, login, logout)
-   Create, read, update, and delete notes
-   Real-time collaboration on notes
-   User presence indicators
