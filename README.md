# TaskFlow — Team Task Management Web Application

A full-stack collaborative task management system built with the MERN stack. Teams can manage projects, assign tasks, and track progress with role-based access control.

**Live Demo:** https://gentle-enthusiasm-production-f2ad.up.railway.app

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite) + Tailwind CSS |
| Backend | Node.js + Express |
| Database | MongoDB (Mongoose) |
| Auth | JWT (Access + Refresh tokens) |
| State Management | React Query (TanStack Query) |
| Deployment | Railway |

---

## Features

### Authentication

- Signup with name, email, password
- Login with JWT access + refresh token
- Bcrypt password hashing (salt rounds 12)
- Auto token refresh via Axios interceptor
- Protected routes on both frontend and backend

### Project Management

- Create projects (creator automatically becomes Admin)
- Admin can add/remove members by searching users
- Members can only view projects they belong to
- Project-scoped roles (Admin / Member)

### Task Management

- Create tasks with title, description, due date, priority, status
- Assign tasks to project members only
- Kanban board view (To Do / In Progress / Done)
- Admin: full CRUD on all tasks
- Member: can only update status of their assigned tasks

### Dashboard

- Total task count
- Tasks grouped by status with progress bars
- Tasks per user with completion ratio
- Overdue task count

### Role-Based Access Control (RBAC)

| Action | Admin | Member |
|---|---|---|
| Create task | Yes | No |
| Edit any task | Yes | No |
| Delete task | Yes | No |
| Update status of assigned task | Yes | Yes |
| Add/remove members | Yes | No |
| View project | Yes | Yes |

---

## Project Structure

```
Ethara/
├── backend/
│   ├── server.js
│   └── src/
│       ├── config/        # MongoDB connection
│       ├── controllers/   # auth, projects, tasks, dashboard
│       ├── middleware/    # auth, role, error
│       ├── models/        # User, Project, Task
│       ├── routes/        # auth, projects, dashboard
│       └── validators/    # express-validator rules
└── frontend/
    └── src/
        ├── api/           # Axios instance with interceptors
        ├── components/    # Layout, Sidebar, Modal, TaskCard, Badge, etc.
        ├── context/       # AuthContext (global auth state)
        └── pages/         # Login, Signup, Dashboard, Projects, ProjectDetail
```

---

## Database Schema

**User**

```
name, email, password (bcrypt hashed), avatar, refreshToken
```

**Project**

```
name, description, color, creator (ref: User)
members: [{ user (ref: User), role: 'admin' | 'member' }]
```

**Task**

```
title, description, priority (low/medium/high)
status (todo/inprogress/done), dueDate
project (ref: Project), assignedTo (ref: User), createdBy (ref: User)
```

---

## API Endpoints

### Auth

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/signup` | Register new user |
| POST | `/api/auth/login` | Login, returns tokens |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Get current user |

### Projects

| Method | Endpoint | Role Required |
|---|---|---|
| GET | `/api/projects` | Any member |
| POST | `/api/projects` | Any logged-in user |
| GET | `/api/projects/:id` | Project member |
| PUT | `/api/projects/:id` | Admin |
| DELETE | `/api/projects/:id` | Admin |
| POST | `/api/projects/:id/members` | Admin |
| DELETE | `/api/projects/:id/members/:userId` | Admin |

### Tasks

| Method | Endpoint | Role Required |
|---|---|---|
| GET | `/api/projects/:id/tasks` | Project member |
| POST | `/api/projects/:id/tasks` | Admin |
| PUT | `/api/projects/:id/tasks/:taskId` | Admin or assignee |
| DELETE | `/api/projects/:id/tasks/:taskId` | Admin |

### Dashboard

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/dashboard` | Stats across all user's projects |

---

## Local Development

### Prerequisites

- Node.js >= 18
- MongoDB Atlas account

### Backend

```bash
cd backend
cp .env.example .env
# Fill in your MONGODB_URI and JWT secrets
npm install
npm run dev
# Runs on http://localhost:5000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

Vite proxies `/api` requests to `localhost:5000` automatically — no CORS issues locally.

---

## Environment Variables

### Backend `.env`

```
PORT=5000
MONGODB_URI=mongodb+srv://...
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

### Frontend `.env`

```
VITE_API_URL=http://localhost:5000/api
```

---

## Deployment on Railway

Both services are deployed as separate Railway services from the same GitHub repo.

| Service | Root Directory | Start Command |
|---|---|---|
| Backend | `/backend` | `node server.js` |
| Frontend | `/frontend` | `serve dist -p $PORT` |

**Railway environment variables to set:**

- Frontend: `VITE_API_URL=https://<backend>.railway.app/api`
- Backend: `CLIENT_URL=https://<frontend>.railway.app`
