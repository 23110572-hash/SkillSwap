# SkillSwap

Welcome to SkillSwap, my full-stack peer-to-peer skill exchange platform. I created this project to enable community-driven learning where users can teach each other skills without money. Instead, the platform uses a virtual currency called Skill Coins. Every user starts with a balance of coins. Booking a session costs 1 coin, and teaching a session earns you 1 coin. This ensures that everyone contributes to the community to keep learning.

This project is hosted on GitHub at:
https://github.com/23110572-hash/SkillSwap

## Live Deployment Links
* Frontend Web Application: https://skill-swap-nine-xi.vercel.app
* Backend API Server: https://skillswap-zgub.onrender.com

## Project Overview
I designed SkillSwap to solve a simple problem: money should not be a barrier to acquiring new skills. For instance, if a software engineer wants to learn graphic design, and a graphic designer wants to learn software engineering, they can trade knowledge directly. The platform manages the entire lifecycle of this exchange, including listing skills, discovering classes, direct messaging, booking sessions, scheduling individual class times, conducting video calls via Jitsi, generating AI-powered syllabi, auditing session quality, and submitting reviews.

## Tech Stack
I chose the following technologies to build this platform:

### Frontend
* React 18 with Vite - For a fast, responsive component-based UI.
* Tailwind CSS - For modern utility-first styling.
* Axios - For making API requests to the backend server.
* Jitsi Meet External API - For embedding video conference rooms directly in the application.
* Lucide React - For clean, modern iconography.

### Backend
* Python 3.12 with Flask - For a lightweight and powerful API server.
* Flask-SQLAlchemy - ORM for database interaction.
* Flask-Migrate - For database schema migrations.
* Flask-JWT-Extended - For handling user authentication and token verification.
* Flask-CORS - To enable cross-origin requests from the React frontend.
* Groq API (llama-3.1-8b-instant) - For AI features like generating syllabi, descriptions, and class summaries.
* Gmail SMTP - For email notifications (utilizing a Vercel HTTP relay to bypass Render SMTP blocks).

### Database
* Production: Neon PostgreSQL (serverless, cloud-hosted).
* Local Development: SQLite (file-based database).

## Project Structure
Here is how the files are organized in my repository:

* backend/
  * app.py - Entry point, configuration, database initialization, and seeding.
  * routes.py - REST API endpoints handling auth, matches, skills, messages, and AI calls.
  * models.py - SQLAlchemy database models.
  * email_utils.py - SMTP email dispatch logic with Vercel HTTP relay integration.
  * config.py - Configuration files for development, testing, and production.
* frontend/
  * src/
    * App.jsx - Main entry point, state management, and page routes.
    * pages/ - Pages including Auth.jsx, Dashboard.jsx, Marketplace.jsx, Messages.jsx, and SessionRoom.jsx.
* api/ - Vercel serverless function folder for the SMTP email relay.
* start.bat - Windows batch file to run both frontend and backend concurrently.

## Database Schema
The database consists of the following tables:
* users - Stores user profiles, credentials, credit balances, and verification states.
* skills - Stores the listings offered by users in the marketplace.
* user_skills - User profiles' list of skills.
* matches - Tracks bookings and matches between learners and teachers.
* class_sessions - Individual sessions under a match with scheduled dates, notes, and AI summaries.
* messages - Direct message histories between users.
* reviews - Ratings and feedback left after completed sessions.
* credits - Logs of coin transactions for auditing.
* validations - AI validation scores and feedback for sessions.

## Setup and Running the Project Locally
If you want to run this project on your machine, follow these instructions:

### Prerequisites
* Python 3.10 or newer
* Node.js 18 or newer
* A virtual environment created at .venv in the project root

### Installation Steps
Run these commands from the root directory:

1. Create and activate a Python virtual environment:
   python -m venv .venv
   .venv\Scripts\activate

2. Install backend dependencies:
   pip install -r backend/requirements.txt

3. Install frontend dependencies:
   cd frontend
   npm install

4. Configure environment variables by creating a backend/.env file:
   FLASK_ENV=development
   DATABASE_URL=sqlite:///skilstation_dev.db
   SECRET_KEY=your_secret_key
   JWT_SECRET_KEY=your_jwt_secret_key
   GROQ_API_KEY=your_groq_key

### Running the Servers
You can start both servers by running my start.bat script in the root directory (on Windows). Alternatively, run them manually:

* Backend:
  cd backend
  python app.py
  (Runs on http://127.0.0.1:5000)

* Frontend:
  cd frontend
  npm run dev
  (Runs on http://localhost:5173)

## Verified Seed Accounts
I have pre-created the following accounts in the database for testing. They have been verified and seeded with 10 Skill Coins each:

* Username: krishna
  * Password: 12345
  * Email: krishnaagrawal898@gmail.com
* Username: subham
  * Password: 12345
  * Email: subhamkewat482@gmail.com
* Username: vikas
  * Password: 12345
  * Email: 23110572@outr.ac.in

All other demo accounts have been removed to keep the workspace clean.
