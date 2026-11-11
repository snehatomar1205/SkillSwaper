
# SkillSwap — Exchange Skills, Grow Together

A peer-to-peer skill exchange platform where people teach what they know and learn what they want through a time-based credit system.

SkillSwap connects learners and teachers, making knowledge sharing accessible through skill discovery, exchange requests, real-time communication, credit settlement, and gamification.

---

## 1. Local Setup and Installation

Follow these instructions to run SkillSwap on your local machine.

### Prerequisites

Install the following:

- [Node.js](https://nodejs.org/) (LTS recommended)
- npm
- [Git](https://git-scm.com/)
- [MongoDB Atlas](https://www.mongodb.com/atlas) account or local MongoDB
- [Cloudinary](https://cloudinary.com/) account for media uploads

### Step 1: Clone the Repository

```bash
git clone https://github.com/snehatomar1205/SkillSwaper.git
cd SkillSwaper
```

### Step 2: Install Backend Dependencies

```bash
cd backend
npm install
```

### Step 3: Configure Backend Environment Variables

Create a `.env` file inside the `backend` directory.

Example configuration (use the exact variable names required by your backend configuration):

```env
NODE_ENV=development
PORT=5000

MONGO_URI=your_mongodb_connection_string

JWT_SECRET=your_access_token_secret
JWT_REFRESH_SECRET=your_refresh_token_secret

CLIENT_URL=http://localhost:5173

CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

**Important:**
- Replace placeholder values with your actual credentials.
- Never upload `.env` files to GitHub.
- Use strong, unique secrets.
- Verify the required environment variable names in the backend configuration.

### Step 4: Start the Backend

From the `backend` directory:

```bash
npm run dev
```

If the project does not define a `dev` script, use the start command specified in `backend/package.json`.

Backend URL:

```text
http://localhost:5000
```

### Step 5: Install Frontend Dependencies

Open a new terminal and navigate to the frontend directory:

```bash
cd frontend
npm install
```

### Step 6: Configure Frontend Environment Variables

Create a `.env` file inside the `frontend` directory.

Example:

```env
VITE_API_URL=http://localhost:5000/api
```

Use the environment variable name expected by the frontend API configuration.

### Step 7: Start the Frontend

```bash
npm run dev
```

Open the application in your browser:

```text
http://localhost:5173
```

### Local Setup Checklist

- [ ] MongoDB connection successful.
- [ ] Backend server running.
- [ ] Frontend running.
- [ ] User registration working.
- [ ] User login working.
- [ ] Skill discovery working.
- [ ] Exchange requests working.
- [ ] Chat and notifications working.

---

## 2. Project Overview

SkillSwap is designed around a simple concept:

**Teach a Skill → Earn Credits → Learn Another Skill**

Traditional learning platforms often require users to pay for courses or subscriptions. SkillSwap introduces a peer-to-peer learning model where users exchange knowledge through time-based credits.

Every user can act as both a teacher and a learner.

### Problem Statement

- Learning new skills can be expensive.
- People have valuable knowledge but lack opportunities to share it.
- Finding suitable learning partners can be difficult.
- Coordinating sessions and tracking completed exchanges requires effort.

### Our Solution

SkillSwap provides a centralized platform where users can:

- Share skills they can teach.
- Discover skills they want to learn.
- Exchange requests with other users.
- Communicate and schedule sessions.
- Earn and spend time-based credits.
- Track learning progress through XP, levels and achievements.

---

## 3. Key Features

### 3.1 User Authentication

- User registration and login.
- JWT-based authentication.
- Access-token and refresh-token management.
- Protected routes and user sessions.
- Separate administrator authentication and authorization.

### 3.2 Skill Management

- Create skill posts.
- Browse available skills.
- View detailed skill information.
- Manage personal skill listings.
- Upload profile and skill-related images.

### 3.3 Exchange Requests

- Send learning requests.
- Accept or reject requests.
- Track exchange status.
- Manage ongoing and completed exchanges.

### 3.4 Credit Management

SkillSwap uses a time-based credit system.

- Teachers earn credits for completed exchanges.
- Learners use credits to participate in exchanges.
- Credits are reserved during the appropriate request workflow.
- Completion triggers settlement.
- Transaction records support tracking and accountability.

### 3.5 Real-Time Communication

- Real-time chat using Socket.IO.
- Persistent message storage in MongoDB.
- Conversation-based communication.
- Notifications for important activities.
- Chat-room membership validation.

### 3.6 Session Completion

SkillSwap uses a dual-confirmation mechanism.

1. The learner confirms completion.
2. The teacher confirms completion.
3. The system finalizes the exchange.
4. Credits and eligible XP are updated.

An exchange cannot be finalized through only one participant's confirmation.

### 3.7 Gamification

- XP rewards.
- Separate teacher and learner progression.
- Levels and achievements.
- XP transaction history.
- Teacher and learner leaderboards.

### 3.8 Seasonal Events

- Participate in learning challenges.
- Track challenge progress.
- Earn event rewards.
- View event leaderboards.
- Participate in time-based activities.

### 3.9 Dispute Management

- Raise disputes regarding exchanges.
- Submit supporting evidence.
- Allow administrators to review disputes.
- Request additional evidence.
- Resolve disputes through appropriate credit refunds or payouts.

### 3.10 Admin Dashboard

- Dedicated administrator access.
- Manage seasonal events.
- Review disputes.
- Monitor platform activity.
- Manage administrative workflows.

---

## 4. Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 |
| Build Tool | Vite |
| Styling | Tailwind CSS 4 |
| Routing | React Router |
| Backend | Node.js |
| Server Framework | Express 5 |
| Database | MongoDB |
| ODM | Mongoose |
| Authentication | JWT |
| Real-time Communication | Socket.IO |
| File Uploads | Multer |
| Media Storage | Cloudinary |
| API Communication | REST APIs |

---

## 5. System Architecture

SkillSwap follows a modular monolithic architecture.

The frontend communicates with the backend through REST APIs, while Socket.IO handles real-time communication.

MongoDB stores application data, and Cloudinary handles media storage.

```text
                 USER
                   |
                   v
            REACT FRONTEND
                (Vite)
                   |
          -------------------
          |                 |
          v                 v
       REST API          Socket.IO
          |                 |
          v                 v
          NODE.JS + EXPRESS
                   |
          -------------------
          |                 |
          v                 v
        MongoDB          Cloudinary
      (Database)       (Media Storage)
```

### Backend Architecture

The backend separates responsibilities into:

- Routes: Define API endpoints.
- Controllers: Handle incoming requests.
- Middleware: Authentication, validation and security.
- Models: Define database schemas.
- Services: Handle reusable business logic.
- Utilities: Shared helper functions.

---

## 6. Project Structure

```text
SkillSwap/
│
├── backend/
│   ├── config/
│   ├── constants/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── scripts/
│   ├── services/
│   ├── tests/
│   ├── utils/
│   ├── app.js
│   ├── server.js
│   └── package.json
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── App.jsx
│   │   └── index.css
│   ├── index.html
│   └── package.json
│
└── README.md
```

---

## 7. How SkillSwap Works

A typical skill exchange follows this workflow:

1. **Post a Skill:** A user lists a skill they can teach.
2. **Send Request:** Another user requests to learn that skill.
3. **Accept Request:** The teacher accepts the request.
4. **Connect:** Both users communicate through chat.
5. **Schedule:** They coordinate the learning session.
6. **Complete:** Both participants confirm completion.
7. **Settle:** The system updates credits and eligible XP.

---

## 8. Security and Reliability

SkillSwap incorporates several backend safeguards:

- JWT-based authentication.
- Refresh-token rotation and session management.
- Separate admin authorization.
- Request validation and centralized error handling.
- API and authentication rate limiting.
- Chat-room membership verification.
- MongoDB transactions for related financial and progression updates.
- Idempotency mechanisms to prevent duplicate credit, XP and reward operations.
- Request IDs for easier debugging and traceability.
- Graceful server shutdown.

---

## 9. Database and Transaction Management

MongoDB and Mongoose are used to manage application data.

The application contains models for users, skills, exchange requests, messages, notifications, credit transactions, XP transactions, seasonal events, event participation, rewards and disputes.

Credit-related operations are designed to maintain consistency.

For example, an exchange completion involves:

1. Validating both participants' confirmations.
2. Updating the exchange status.
3. Recording the credit settlement.
4. Updating progression and XP.
5. Preventing duplicate processing.

Related database changes are grouped into transactions where supported.

---

## 10. Future Enhancements

Potential improvements include:

- AI-powered skill recommendations.
- Integrated video learning sessions.
- User ratings and reviews.
- Advanced skill matching.
- Dedicated mobile application.
- Enhanced analytics and reporting.

---

## 11. Project Objective

SkillSwap aims to make learning more collaborative, accessible and community-driven.

By allowing people to exchange knowledge instead of relying exclusively on monetary payments, the platform encourages continuous learning and mutual growth.

**Discover. Connect. Exchange. Grow.**

---

## 12. Repository

**GitHub:** [SkillSwaper](https://github.com/snehatomar1205/SkillSwaper)