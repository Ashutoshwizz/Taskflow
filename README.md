# TaskFlow — Project Management App

A full-stack project & task management app with role-based access control.

## Tech Stack
- **Frontend**: HTML, CSS, Vanilla JS
- **Backend**: Node.js, Express.js
- **Database**: MongoDB (Mongoose)
- **Auth**: JWT (jsonwebtoken) + bcryptjs

---

## Project Structure

```
taskflow/
├── backend/
│   ├── config/
│   │   └── db.js                  # MongoDB connection
│   ├── controllers/
│   │   ├── authController.js      # Signup, login, profile
│   │   ├── projectController.js   # CRUD + member management
│   │   ├── taskController.js      # CRUD + dashboard stats
│   │   └── userController.js      # Admin user management
│   ├── middleware/
│   │   ├── auth.js                # JWT protect + authorize + projectRole
│   │   └── validate.js            # express-validator error handler
│   ├── models/
│   │   ├── User.js                # User schema (admin/member role)
│   │   ├── Project.js             # Project schema with members array
│   │   └── Task.js                # Task schema with status/priority
│   ├── routes/
│   │   ├── auth.js                # POST /signup /login GET /me
│   │   ├── projects.js            # Full CRUD + member routes
│   │   ├── tasks.js               # Full CRUD + dashboard
│   │   └── users.js               # Admin-only user management
│   ├── server.js                  # Express app entry point
│   ├── .env.example               # Environment variables template
│   └── package.json
│
└── frontend/
    ├── css/
    │   └── style.css              # Full design system, dark theme
    ├── js/
    │   ├── api.js                 # Central fetch wrapper
    │   ├── auth.js                # Login/signup/logout logic
    │   ├── projects.js            # Projects CRUD + kanban nav
    │   ├── tasks.js               # Tasks CRUD + kanban board + dashboard
    │   ├── users.js               # Admin user management
    │   └── app.js                 # Router, view switching, init
    └── index.html                 # Single-page shell with all views
```

---

## Setup & Run

### 1. Install dependencies
```bash
cd backend
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env and set:
# MONGODB_URI=mongodb://localhost:27017/taskflow
# JWT_SECRET=your_secret_key_here
```

### 3. Start MongoDB
```bash
# Make sure MongoDB is running locally, or use MongoDB Atlas
mongod
```

### 4. Start the server
```bash
npm run dev      # development (nodemon)
# or
npm start        # production
```

### 5. Open in browser
```
http://localhost:5000
```

---

## API Endpoints

### Auth
| Method | Endpoint         | Access  | Description        |
|--------|------------------|---------|--------------------|
| POST   | /api/auth/signup | Public  | Register user      |
| POST   | /api/auth/login  | Public  | Login user         |
| GET    | /api/auth/me     | Private | Get current user   |
| PUT    | /api/auth/me     | Private | Update profile     |

### Projects
| Method | Endpoint                           | Access       | Description          |
|--------|------------------------------------|--------------|----------------------|
| GET    | /api/projects                      | Private      | Get all projects     |
| GET    | /api/projects/:id                  | Private      | Get single project   |
| POST   | /api/projects                      | Admin        | Create project       |
| PUT    | /api/projects/:id                  | Owner/Admin  | Update project       |
| DELETE | /api/projects/:id                  | Owner/Admin  | Delete project       |
| POST   | /api/projects/:id/members          | Owner/Admin  | Add member           |
| DELETE | /api/projects/:id/members/:userId  | Owner/Admin  | Remove member        |

### Tasks
| Method | Endpoint               | Access  | Description          |
|--------|------------------------|---------|----------------------|
| GET    | /api/tasks?project=id  | Private | Get project tasks    |
| GET    | /api/tasks/dashboard   | Private | Get dashboard stats  |
| POST   | /api/tasks             | Private | Create task          |
| PUT    | /api/tasks/:id         | Private | Update task          |
| DELETE | /api/tasks/:id         | Private | Delete task          |

### Users (Admin only)
| Method | Endpoint               | Access | Description         |
|--------|------------------------|--------|---------------------|
| GET    | /api/users             | Admin  | List all users      |
| GET    | /api/users/:id         | Admin  | Get single user     |
| PUT    | /api/users/:id/role    | Admin  | Update user role    |
| DELETE | /api/users/:id         | Admin  | Delete user         |

---

## Role-Based Access Control

| Feature                  | Admin | Member |
|--------------------------|-------|--------|
| Create projects          | ✅    | ❌     |
| Edit/delete own projects | ✅    | ❌     |
| View assigned projects   | ✅    | ✅     |
| Add/remove members       | ✅    | ❌     |
| Create tasks             | ✅    | ✅     |
| Edit/delete own tasks    | ✅    | ✅     |
| View all users           | ✅    | ❌     |
| Change user roles        | ✅    | ❌     |
| Delete users             | ✅    | ❌     |

> **Note**: The first user to sign up is automatically assigned the `admin` role.
