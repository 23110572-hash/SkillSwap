# SkillSwap

SkillSwap is a full-stack peer-to-peer skill exchange platform built as a web application. Users teach each other without any money changing hands. Instead of paying for a course, you offer a skill you know and earn Skill Coins, which you then spend to learn from someone else. The platform manages the complete lifecycle of these exchanges: listing skills, discovering others, booking sessions, scheduling individual classes, running live video calls, generating AI-powered curricula, auditing session quality, messaging between users, and collecting reviews.

---

## Table of Contents

1. Project Overview
2. Tech Stack
3. Project Structure
4. Database Schema
5. Backend API Endpoints
6. Frontend Pages and User Flow
7. Features In Detail
8. Environment Variables
9. Running the Project
10. Deployment
11. Known Seed Accounts

---

## Project Overview

SkillSwap is built for the scenario where knowledge exists in a community but money is not the right medium of exchange. A software developer who wants to learn graphic design can list their programming knowledge, find a designer who wants to learn programming, and both gain without paying anything external. The platform enforces fairness through Skill Coins: every user starts with 5 coins, spending 1 coin to book a session and earning 1 coin when they teach one. This ensures that users who contribute actively on the teaching side are rewarded with the ability to learn more.

---

## Tech Stack

### Frontend

| Technology | Purpose |
|---|---|
| React 18 with Vite | Component-based UI framework and fast development server |
| Tailwind CSS | Utility-first styling with a custom colour palette |
| Axios | HTTP client for all API calls to the Flask backend |
| Jitsi Meet External API | Embedded browser-based video conferencing |
| Lucide React | Icon set used throughout the interface |
| LocalStorage | Persisting syllabus checklist progress and session state between reloads |

### Backend

| Technology | Purpose |
|---|---|
| Python 3.12 with Flask | Web framework and application server |
| Flask-SQLAlchemy | ORM for database access |
| Flask-Migrate with Alembic | Schema versioning and migration management |
| Flask-JWT-Extended | JWT token issuance and verification for authentication |
| Flask-CORS | Cross-origin request headers for the Vite frontend |
| psycopg2-binary | PostgreSQL adapter for Neon database connection |
| Werkzeug | Password hashing utilities |
| Gunicorn | Production WSGI server |
| python-dotenv | Loading environment variables from .env file |
| Groq API (llama-3.1-8b-instant) | AI syllabus generation, AI description generation, and AI class summaries |
| OpenAI API (gpt-3.5-turbo, optional) | AI session auditing if key is provided |

### Database

| Environment | Database |
|---|---|
| Cloud / Production | Neon PostgreSQL (serverless, hosted on AWS us-east-1) |
| Local fallback | SQLite (file-based, created automatically) |

---

## Project Structure

```
SkillSwap/
  backend/
    app.py              Flask application factory, DB setup, seed data, server entry point
    routes.py           All REST API endpoint definitions (1000+ lines of clean, optimized code)
    models.py           SQLAlchemy ORM model definitions for database tables
    config.py           Environment-specific configuration classes (Dev, Prod, Test)
    extensions.py       Flask extension instances: db, migrate, jwt
    requirements.txt    Python package dependencies for deployment
    .env                Environment variables (not committed to version control)

  frontend/
    src/
      App.jsx           Root React component, authentication state, page routing
      App.css           Root-level component styles
      index.css         Global design system, Tailwind base overrides
      main.jsx          React DOM entry point
      apiCache.js       Lightweight API response cache with TTL support
      pages/
        Auth.jsx          Login and registration forms, demo login shortcuts
        Dashboard.jsx     Personal session management, profile editing, skill listings
        Marketplace.jsx   Skill discovery, filtering, search, skill creation with AI assist
        Messages.jsx      Real-time direct messaging between users
        SessionRoom.jsx   Live video classroom, syllabus tracker, AI session auditor
    index.html          HTML entry point
    vite.config.js      Vite build configuration
    tailwind.config.js  Tailwind CSS configuration
    package.json        Node package dependencies

  database/
    migrations/         Alembic migration history (Flask-Migrate generated)
    README.md           Database-specific documentation

  start.bat             Windows batch script: kills port conflicts, starts both servers
  README.md             This file
```

---

## Database Schema

The application uses Neon PostgreSQL as its primary database (cloud-hosted, serverless). On startup the Flask app calls db.create_all() which creates any missing tables automatically. No manual migration step is required for first-time setup.

### Tables

**users**

Stores all registered user accounts.

| Column | Type | Description |
|---|---|---|
| id | Integer, Primary Key | Auto-incremented identifier |
| username | String(80), Unique | Display name used for login |
| email | String(120), Unique | Contact email address |
| password_hash | String(255) | Bcrypt hash of the password |
| credits | Integer, default 5 | Current Skill Coin balance |
| profile_pic | Text, nullable | Base64-encoded profile photo |
| created_at | DateTime | Account creation timestamp |

**skills**

Stores every skill listing published by users in the marketplace.

| Column | Type | Description |
|---|---|---|
| id | Integer, Primary Key | Auto-incremented identifier |
| user_id | Integer, FK to users | The user offering this skill (instructor) |
| title | String(100) | Short title of the skill |
| description | Text | Detailed description of what will be covered |
| category | String(50) | Grouping category (Programming, Design, Languages, etc.) |
| num_classes | Integer, default 1 | How many sessions the skill runs across |
| timing | String(120), default Flexible | Schedule preference |
| created_at | DateTime | Listing creation timestamp |

**user_skills**

Stores each user's personal skills for profile purposes (separate from marketplace listings).

| Column | Type | Description |
|---|---|---|
| id | Integer, Primary Key | Auto-incremented identifier |
| user_id | Integer, FK to users | The user this skill belongs to |
| skill_name | String(100) | Name of the skill |
| proficiency_level | String(50), nullable | Beginner, Intermediate, or Advanced |

**matches**

Records every session match request between a learner and a teacher.

| Column | Type | Description |
|---|---|---|
| id | Integer, Primary Key | Auto-incremented identifier |
| learner_id | Integer, FK to users | The user who requested the session |
| teacher_id | Integer, FK to users | The user offering the skill |
| skill_id | Integer, FK to skills | The skill being exchanged |
| status | String(50), default pending | pending, accepted, completed, or rejected |
| created_at | DateTime | Request creation timestamp |

**class_sessions**

Tracks progress of individual classes within a match. Created automatically when a match status is updated to accepted.

| Column | Type | Description |
|---|---|---|
| id | Integer, Primary Key | Auto-incremented identifier |
| match_id | Integer, FK to matches | The match relationship this session belongs to |
| class_number | Integer | Sequence number of the class (1 to num_classes) |
| title | String(255) | Topic title of this class (AI-generated) |
| scheduled_at | DateTime, nullable | Time the class is scheduled to take place |
| completed_at | DateTime, nullable | Time the class was marked completed |
| summary | Text, nullable | Completed session description |
| notes | Text, nullable | Custom notes written during the class |
| ai_feedback | Text, nullable | Feedback or suggestions generated by AI |

**messages**

Stores direct messages sent between users.

| Column | Type | Description |
|---|---|---|
| id | Integer, Primary Key | Auto-incremented identifier |
| sender_id | Integer, FK to users | User who sent the message |
| recipient_id | Integer, FK to users | User who received the message |
| content | Text | The message body |
| created_at | DateTime | Time the message was sent |

**reviews**

Stores ratings and written comments left by learners after completed sessions.

| Column | Type | Description |
|---|---|---|
| id | Integer, Primary Key | Auto-incremented identifier |
| reviewer_id | Integer, FK to users | User who wrote the review (learner) |
| reviewed_user_id | Integer, FK to users | User being reviewed (teacher) |
| match_id | Integer, FK to matches, nullable | The session match this review relates to |
| rating | Integer | Star rating from 1 to 5 |
| comment | Text, nullable | Written feedback |
| created_at | DateTime | Submission timestamp |

**credits**

Audit log of every Skill Coin transaction.

| Column | Type | Description |
|---|---|---|
| id | Integer, Primary Key | Auto-incremented identifier |
| user_id | Integer, FK to users | The user whose balance changed |
| amount | Integer | Positive (earned/refund) or negative (spent) |
| transaction_type | String(50) | earned, spent, or refund |
| description | String(255), nullable | Human-readable reason for the transaction |
| created_at | DateTime | Transaction timestamp |

**validations**

Stores AI validation scores and written feedback for session quality analysis.

| Column | Type | Description |
|---|---|---|
| id | Integer, Primary Key | Auto-incremented identifier |
| user_id | Integer, FK to users | The user being validated |
| skill_id | Integer, FK to skills | The skill being assessed |
| validation_score | Float | Numeric score from the AI (0.0 to 100.0) |
| ai_feedback | Text, nullable | AI-generated written feedback |
| created_at | DateTime | Validation timestamp |

### Neon PostgreSQL Connection

The application connects to a Neon serverless PostgreSQL database. The connection string is stored in the DATABASE_URL environment variable. The backend automatically converts the postgresql:// prefix to postgresql+psycopg2:// which is required by SQLAlchemy 2.x.

Connection pool settings are applied specifically for PostgreSQL to handle Neon's serverless cold-start behaviour:
* pool_pre_ping is enabled so broken connections are detected before use
* pool_recycle is set to 300 seconds to prevent stale connections
* pool_timeout is set to 10 seconds to prevent the server from hanging on startup
* connect_timeout of 10 seconds is passed directly to psycopg2

---

## Backend API Endpoints

All endpoints are prefixed with /api. The backend runs on http://127.0.0.1:5000 by default.

### Health

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | /api/health | None | Returns OK status to confirm the server is running |

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | /api/auth/register | None | Creates a new user account |
| POST | /api/auth/login | None | Validates credentials and returns a JWT token |
| GET | /api/auth/me | JWT | Returns the profile of the currently logged-in user |
| PATCH | /api/auth/profile | JWT | Updates username, email, or profile photo |
| GET | /api/auth/quick-users | None | Returns or creates demo accounts for quick login |

### Skills

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | /api/skills | Optional | Returns all skill listings with instructor ratings (optimized batch query) |
| POST | /api/skills | JWT | Creates a new skill listing (checks for duplicate listing titles) |
| DELETE | /api/skills/`<skill_id>` | JWT | Deletes a skill listing (blocked if there are active bookings) |

### Matches (Sessions)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | /api/matches | Optional | Returns all matches involving the requesting user (optimized batch query) |
| POST | /api/matches | JWT | Books a session, deducting 1 Skill Coin from the learner |
| PATCH | /api/matches/`<match_id>` | None | Updates match status to accepted, completed, or rejected |

Accepting a match triggers automated class session creation. Marking a match completed awards 1 Skill Coin to the teacher. Rejecting a pending match refunds the learner's coin.

### Class Sessions

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | /api/matches/`<match_id>`/classes | JWT | Returns all classes in sequence for a given match (or dynamically generates topics if empty) |
| PATCH | /api/classes/`<class_id>` | JWT | Updates scheduling dates, completion details, notes, and AI summaries. Triggers auto-completion of match when all classes are finished |

### Messaging

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | /api/messages | JWT | Returns all messages in a conversation with a specific user |
| POST | /api/messages | JWT | Sends a new message |
| GET | /api/messages/conversations | JWT | Returns a list of all active conversation partners |

### Reviews

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | /api/reviews | JWT | Submits a star rating and comment for a completed session |
| GET | /api/users/`<user_id>`/reviews | None | Returns all reviews for a given user with their average rating |

### AI Features

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | /api/sessions/audit | None | Analyses a session transcript and returns a technical accuracy and pedagogy report |
| POST | /api/ai/generate-description | None | Generates a skill listing description from a title using Groq |
| POST | /api/ai/generate-syllabus | None | Generates a structured lecture list for a skill using Groq |
| POST | /api/ai/generate-summary | JWT | Generates a text summary of an individual class session from titles and notes using Groq |

---

## Frontend Pages and User Flow

### Auth.jsx

Displayed when no user is logged in. Contains two tabs: Login and Register. Login accepts username and password. Register accepts username, email, and password. Both submit to the Flask API. On success, the JWT token and user object are stored in the parent App component and in localStorage. The page also provides quick-login buttons for the demo accounts.

### Marketplace.jsx

The main discovery interface. Displays all skill listings as cards. Each card shows the skill title, description, category, instructor name, number of classes, timing, and average star rating. Users can filter by category using tabs and search by keyword using a text input.

A modal allows logged-in users to create a new skill listing. The form includes a title, category selector, number of classes, timing, and description. The description field has an AI generate button that calls /api/ai/generate-description with the title and category and fills in the description automatically. There is also a syllabus preview inside the listing creation modal so users can see what the AI will generate before committing.

Clicking Request on a listing from another user triggers the booking flow. A confirmation modal appears. On confirm, 1 Skill Coin is deducted and a match record is created.

### Dashboard.jsx

Divided into four major sections:

* Profile Card - Shows the user's avatar, username, email, Skill Coin balance, number of active offerings, number of active requests, and average rating. An Edit Profile button opens a modal where the user can update their username, email, and upload a new photo (limited to 1.5 MB).
* Sessions I'm Learning - Lists all sessions the user has requested from others. Each entry shows the skill title, the teacher's name, and the current status. For accepted sessions, a View Schedule button opens a modal showing the class syllabus with dates and completion buttons. For completed sessions, a Review button opens a rating and comment form.
* Sessions I'm Offering - Shows all incoming requests from other users. Active requests with a pending status link to the Auditor Room for acceptance or rejection. Accepted sessions show a View Schedule button. Completed sessions are grouped separately.
* My Skill Listings - Displays all skills the user has published in the Marketplace. Shows the category, timing, number of classes, and how many active matches are linked to each listing. A Delete button allows removing listings that do not have active matches.

### Messages.jsx

Shows a two-panel messaging layout. The left panel lists all conversation partners with the last message preview and time. The right panel shows the full message thread for the selected conversation. Messages are displayed with the sender name and a timestamp. New messages are sent via a text input and a send button. The message list polls the API every few seconds to display incoming messages without needing a page refresh.

### SessionRoom.jsx

The class workspace page. Divided into two main areas:

**Left panel - Session Hub**

Lists every active match the user is involved in. Each session card shows the skill, the other participant's name, and the current status. For sessions where the user is the teacher and the status is pending, Accept and Decline buttons are shown directly on the card.

Expanding a session card reveals the AI-generated syllabus for that skill. The syllabus displays as a numbered checklist of lecture topics. Each topic has a checkbox. Checkbox state is saved in localStorage keyed to the match ID. When all topics are checked, a Mark as Complete button appears. Pressing it sends a PATCH request to update the match status to completed and triggers the coin transfer.

An Enter Classroom button appears on accepted sessions. Clicking it opens the live Jitsi video call in the right panel.

**Right panel - Live Classroom**

When no session is active, this area shows instructions. When a classroom is entered, it shows a Jitsi Meet iframe embedded directly in the browser. The Jitsi room name is constructed from the match ID so both the learner and the teacher automatically land in the same room.

While the video call is running, a sidebar offers two tabs:
* Syllabus - Mirrors the checklist from the left panel.
* Audit - Provides a text area where the user can paste a conversation transcript after the session ends. Submitting the transcript calls /api/sessions/audit and displays a structured quality report showing overall score, clarity score, accuracy score, an accuracy checklist, pedagogical feedback, communication feedback, and a list of suggested improvements. Three preset transcript buttons allow demonstrating the auditor without a real transcript.

---

## Features In Detail

### Skill Coin Economy

Every account is created with 5 Skill Coins. Booking a session costs 1 coin. The coin is deducted from the learner immediately when the request is made. When the session is marked as completed, the teacher receives 1 coin. If the teacher declines the request, the learner is refunded the coin. Every transaction is logged in the credits table with a description to ensure full auditing capabilities.

### JWT Authentication

Login returns a JWT token with a 7-day expiry. The token is stored in localStorage. On every page load, the app attempts to verify the token against /api/auth/me. If the backend is offline or slow during startup, the app does not clear the stored token. Only a genuine HTTP 401 Unauthorized response from the server causes the user to be logged out. When the backend comes online, the profile is fetched automatically without requiring a manual login.

### AI Syllabus Generation

When a user requests to view the schedule for an accepted session, or when expanding a session card in the Auditor Room, the app calls /api/ai/generate-syllabus with the skill title, description, category, and number of classes. The Groq API (llama-3.1-8b-instant model) returns a JSON object containing a list of lecture topic strings. These topics are displayed as a numbered checklist. If the API call fails for any reason, the app falls back to generic session labels.

### Class-by-Class Scheduling and Tracking

When a match is accepted, the system generates a list of ClassSession records mapping to each lecture topic. Users can schedule individual dates for each session. When a class finishes, teachers can check off the class, submit a brief text summary or raw notes, and the backend will call the Groq API (/api/ai/generate-summary) to draft a polished summary of the class content. Once all ClassSessions for a match are marked completed, the backend automatically transitions the overall match status to completed and transfers the Skill Coin.

### AI Session Auditing

After a live session, the teacher or learner can paste a transcript of the conversation into the Audit tab. The backend analyses the transcript. If an OpenAI API key is configured, it uses GPT-3.5-turbo with a structured JSON response format. Without a key, it uses a built-in keyword-based analyser that detects the subject from terms like "python", "variable", "react", "hooks", "useEffect" and generates appropriate accuracy checklist items and improvement suggestions. The output always includes numeric scores for clarity, accuracy, and overall quality.

### Profile Photos

Profile photos are uploaded as base64-encoded strings. The frontend reads the selected image file using the FileReader API, converts it to base64, and sends it to the backend in a PATCH request. The backend stores the string directly in the profile_pic column. There is a 1.5 MB file size limit enforced on the frontend before the upload begins.

### Performance Optimization (N+1 Query Resolution)

Both the skills and matches data-fetching processes on the backend have been optimized. Instead of fetching reviews and user associations sequentially in a loop (which triggered N+1 query patterns), the API endpoints now fetch all required records in a single batched join, reducing database latency and reducing round-trips significantly.

---

## Environment Variables

Create a file named `.env` inside the `backend` directory with the following content:

```
FLASK_ENV=development
FLASK_APP=app.py
SECRET_KEY=your_flask_secret_key_here

DATABASE_URL=postgresql+psycopg2://your_user:your_password@your_host/your_db?sslmode=require

JWT_SECRET_KEY=your_jwt_secret_key_here
JWT_ACCESS_TOKEN_EXPIRES=3600

OPENAI_API_KEY=your_openai_api_key_here

DEBUG=True
PORT=5000
```

The Groq API key is hardcoded in routes.py for the current deployment. The OPENAI_API_KEY is optional and enables the GPT-based session auditor. Without it, the built-in keyword auditor handles all transcript analysis requests.

---

## Running the Project

### Prerequisites

* Python 3.10 or newer
* Node.js 18 or newer
* A virtual environment created at `.venv` in the project root

### First-Time Setup

Configure the environment by running the following commands from the root directory:

```powershell
python -m venv .venv
.venv\Scripts\activate
pip install -r backend\requirements.txt
cd frontend
npm install
```

### Starting the Backend

With your virtual environment active:

```powershell
cd backend
python app.py
```

The Flask server starts on http://127.0.0.1:5000. On startup it connects to the configured database, creates any missing tables, and inserts the seed users if they do not already exist.

### Starting the Frontend

```powershell
cd frontend
npm run dev
```

The Vite development server starts on http://localhost:5173.

### Using start.bat (Windows)

Double-click start.bat in the project root. The script:

1. Checks that the virtual environment exists
2. Kills any existing process running on port 5000 to prevent address conflicts
3. Opens a new terminal window running the Flask backend
4. Opens a new terminal window running the Vite frontend
5. Waits for the frontend to start on port 5173
6. Opens the application in the default browser

Keep both terminal windows open while using the application. Close them to stop the servers.

---

## Deployment

The backend is designed to deploy to any platform that supports Python web applications. The requirements.txt file includes Gunicorn as the production WSGI server.

For Gunicorn:

```bash
gunicorn -w 4 -b 0.0.0.0:5000 "app:create_app()"
```

The database is hosted on Neon PostgreSQL. The connection string in DATABASE_URL should be set as an environment variable on the deployment platform rather than stored in a .env file.

For the frontend, run npm run build inside the frontend directory to produce a static build in the dist folder. This can be served by any static hosting service (Vercel, Netlify, Cloudflare Pages) or by a web server pointed at the dist directory.

---

## Known Seed Accounts

The following accounts are created automatically on first startup if they do not exist. They are intended for development and demonstration purposes.

| Username | Password | Starting Coins |
|---|---|---|
| krishna | 12345 | 5 |
| subham | 12345 | 5 |
| vikas | 12345 | 5 |

The Quick Users endpoint (/api/auth/quick-users) also creates the following demo accounts on first call:

| Username | Password |
|---|---|
| JuniorDev | devpass123 |
| SeniorEngineer | seniorpass |
| DesignerPro | design123 |
| AIExtremist | aipassword |

These accounts appear as one-click login buttons on the Auth page of the application for ease of testing.
