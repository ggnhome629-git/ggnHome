# ggnHome - Real Estate Platform

A modern, full-stack real estate platform designed to simplify property discovery, management, and communication between renters, buyers, owners, and administrators. Built with React, Node.js, and MongoDB, ggnHome provides an AI-assisted property recommendation system (ARIA), comprehensive analytics, payment processing, and flatmate matching.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Usage](#usage)
- [Configuration](#configuration)
- [Dependencies](#dependencies)
- [API Endpoints](#api-endpoints)
- [Contribution Guide](#contribution-guide)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Security](#security)
- [License](#license)

---

## Project Overview

**ggnHome** is a comprehensive real estate management platform that connects property seekers, owners, and agents. The platform features:

- **AI-Powered Property Matching (ARIA)**: Intelligent recommendations based on user preferences
- **Multi-Role Support**: Separate interfaces for users, owners, agents, and admins
- **Real-Time Analytics**: Dashboard insights for properties, users, and revenue
- **Payment Integration**: Secure payment processing and management
- **Flatmate Matching**: Find compatible roommates with preference matching
- **Background Synchronization**: Automatic data sync with NoBroker listings

The application is structured as a monorepo with separate frontend (React) and backend (Express.js) directories, enabling independent development and deployment.

---

## Tech Stack

### Frontend
- **Framework**: React 19.2.0 with React Router 7.9.3
- **Build Tool**: Vite
- **UI Components**: Material-UI (MUI) 7.3.4, Lucide React Icons
- **Styling**: Emotion (CSS-in-JS), TailwindCSS
- **State Management**: React Hooks, Axios for API calls
- **Animations**: Framer Motion 12.23.24
- **Charts**: Recharts 3.3.0
- **Maps**: Leaflet 1.9.4
- **Testing**: React Testing Library 16.3.0
- **Utilities**: React Toastify, React QR Code, React Helmet

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js 5.1.0
- **Database**: MongoDB with Mongoose 8.19.1 ORM
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: Bcrypt 6.0.0
- **File Uploads**: Multer 2.0.2, Sharp 0.34.5
- **Cloud Storage**: Cloudinary 2.7.0
- **Email Service**: Nodemailer 7.0.6, Brevo (Sendinblue) SDK
- **Caching**: Redis (optional, via ioredis 5.4.1)
- **Task Scheduling**: node-cron 4.6.0
- **Validation**: express-validator 7.3.1
- **Data Export**: XLSX 0.18.5
- **Utilities**: Axios 1.12.2, dotenv 17.2.3, cookie-parser 1.4.7

### DevTools
- **Development Server**: Nodemon 3.1.10 (backend), React Scripts 5.0.1 (frontend)
- **Testing**: Jest, React Testing Library
- **Version Control**: Git

---

## Features

### User Features
- **Property Browsing**: Browse rental and sale properties with filters
- **AI-Powered Recommendations (ARIA)**: Get personalized property suggestions
- **Favorites Management**: Save and track favorite properties
- **Property Analytics**: View engagement metrics (views, saves, ratings)
- **Search History**: Maintain and revisit previous searches
- **Callback Requests**: Request property owner callbacks
- **Flatmate Matching**: Find compatible roommates based on preferences
- **Price Prediction**: AI-assisted property price estimation

### Owner/Agent Features
- **Property Management**: Post, edit, and manage rental and sale properties
- **Analytics Dashboard**: Track property engagement and performance
- **Lead Management**: View and manage user inquiries
- **Payment Processing**: Handle subscription payments
- **Revenue Tracking**: Monitor income from properties
- **Service Requests**: Track maintenance and support requests
- **Preferred Sectors**: Set availability in specific areas/sectors

### Admin Features
- **User Management**: Manage all users (renters, owners, admins)
- **Property Management**: Approve, reject, or modify all properties
- **Payment Approval**: Review and approve/reject payment transactions
- **Comprehensive Analytics Dashboard**:
  - Total users breakdown (renters, owners, admins)
  - Revenue statistics and trends
  - Active vs inactive user metrics
  - Property engagement analytics
  - Search trends and popular properties
  - Monthly user growth tracking
  - Lead conversion metrics
- **Reward System**: Manage rewards and track claims
- **Service Requests**: Review customer support tickets
- **Account Usage Tracking**: Monitor API and service usage
- **Role Management**: Assign and modify user roles

---

## Project Structure

```
ggnHome/
├── server/                              # Express.js backend
│   ├── controllers/                     # Route handlers (26 files)
│   │   ├── login.controller.js
│   │   ├── userdetails.controller.js
│   │   ├── admin.controller.js
│   │   ├── admin.agent.controller.js
│   │   ├── payment.controller.js
│   │   ├── Rentalproperty.controller.js
│   │   ├── Saleproperty.controller.js
│   │   ├── Searchproperties.controller.js
│   │   ├── PropertyAnalysis.controller.js
│   │   ├── agentDashboard.controller.js
│   │   ├── Flatmates.controller.js
│   │   ├── ChatBot.controller.js
│   │   ├── aimodel.controller.js
│   │   └── ... (other controllers)
│   ├── models/                          # MongoDB schemas (18 models)
│   │   ├── user.model.js
│   │   ├── Rentalproperty.model.js
│   │   ├── SaleProperty.model.js
│   │   ├── Agent.model.js
│   │   ├── Payment.model.js
│   │   ├── PropertyAnalysis.model.js
│   │   ├── Flatmates.model.js
│   │   ├── Rewards.model.js
│   │   └── ... (other models)
│   ├── Route/
│   │   └── route.js                     # All API endpoint definitions
│   ├── middleware/
│   │   ├── auth.js                      # JWT authentication
│   │   └── multer.js                    # File upload configuration
│   ├── config/
│   │   ├── db.js                        # MongoDB connection
│   │   ├── cache.js                     # Redis cache setup
│   │   └── FileHandling.js
│   ├── cron/
│   │   └── nobrokerSyncCron.js          # Background property sync
│   ├── scripts/
│   │   └── nobrokerSync.js              # NoBroker sync logic
│   ├── utils/                           # Utility functions
│   ├── package.json
│   ├── index.js                         # Server entry point
│   └── seedProperties.js
│
├── client/                              # React frontend
│   ├── src/
│   │   ├── components/                  # Reusable components
│   │   ├── pages/                       # Page components
│   │   ├── hooks/                       # Custom React hooks
│   │   ├── utils/                       # Utility functions
│   │   └── main.jsx
│   ├── public/                          # Static assets
│   ├── package.json
│   └── ... (build config files)
│
├── Images/                              # Logo, cards, advertisements
│   ├── Logo/
│   ├── Card/
│   └── Ad's/
│
├── README.md                            # This file
├── SECURITY_AUDIT.md                    # Security findings
├── Colorpallet.txt                      # UI color palette
├── Cloudinary Details.docx              # Cloud storage config
├── package.json                         # Root package config
├── .gitignore
└── .gitattributes
```

### Key Folders Explained

| Folder | Purpose |
|--------|---------|
| `controllers/` | Business logic for API endpoints |
| `models/` | Database schemas and data validation |
| `Route/` | API route definitions and middleware application |
| `middleware/` | Authentication, file uploads, CORS |
| `config/` | Database, cache, and external service configuration |
| `cron/` | Scheduled background tasks |
| `client/src/components/` | React components for UI |

---

## Installation

### Prerequisites

- **Node.js** v16+ and npm v8+ (or yarn)
- **MongoDB** (local or MongoDB Atlas)
- **Redis** (optional, for caching)
- **Cloudinary Account** (for image uploads)
- **Git**

### Step 1: Clone the Repository

```bash
git clone https://github.com/ggnhome629-git/ggnHome.git
cd ggnHome
```

### Step 2: Install Server Dependencies

```bash
cd server
npm install
```

### Step 3: Install Client Dependencies

```bash
cd ../client
npm install
```

### Step 4: Configure Environment Variables

Create `.env` files in both server and client directories with the following variables:

#### Server `.env` (`server/.env`)

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
MONGO_URI=mongodb://localhost:27017/ggn-home
# OR MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/dbname

# Authentication
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=7d
AGENT_JWT_SECRET=your_agent_jwt_secret_here

# Cloudinary (Image Upload)
CLOUDINARY_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Email Service (Brevo/Sendinblue)
BREVO_API_KEY=your_brevo_api_key

# Redis Cache (Optional)
REDIS_URI=redis://localhost:6379
# Leave empty to disable caching

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:4173

# Map Integration (LocationIQ)
LOCATION_IQ_API_KEY=your_locationiq_api_key

# Payment Gateway (Optional)
RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret

# Admin Email
ADMIN_EMAIL=admin@ggn-home.com
```

#### Client `.env` (`client/.env`)

```env
# API Configuration
VITE_BACKEND_URL=http://localhost:5000
```

### Step 5: Start the Application

#### Terminal 1 - Backend

```bash
cd server
npm run dev
```

The backend will start on `http://localhost:5000` (or the port specified in `.env`).

#### Terminal 2 - Frontend

```bash
cd client
npm start
# OR with Vite:
npm run dev
```

The frontend will start on `http://localhost:3000` (React Scripts) or `http://localhost:5173` (Vite).

---

## Usage

### Accessing the Application

**Frontend**: Open `http://localhost:3000` in your browser

### User Workflows

#### 1. **Register and Login**
- Navigate to the signup page
- Enter mobile number to receive OTP
- Verify OTP and set password
- Or use existing account to login

#### 2. **Browse Properties**
- Go to "Browse Properties"
- Filter by type (rental/sale), location, price, etc.
- View detailed property information
- Save favorite properties

#### 3. **Use AI Recommendations (ARIA)**
- Complete your preferences in the preferences section
- ARIA will recommend properties based on your profile

#### 4. **Post a Property (Owners)**
- Login as property owner
- Navigate to "Post Property"
- Fill rental or sale property details
- Upload property images
- Submit for admin approval

#### 5. **Payment Management**
- Owners can initiate subscription payments
- Admins can review and approve payments
- Payment status is tracked in dashboard

#### 6. **Flatmate Matching**
- Create or search flatmate listings
- Filter by preferences (location, budget, lifestyle)
- Send/receive flatmate inquiries

### Admin Dashboard
- Access admin panel (requires admin role)
- View analytics and metrics
- Manage users and properties
- Process payments and requests

---

## Configuration

### Database Connection

**MongoDB Local:**
```env
MONGO_URI=mongodb://localhost:27017/ggn-home
```

**MongoDB Atlas:**
```env
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname?retryWrites=true&w=majority
```

### Caching (Redis)

**Enable Caching:**
```env
REDIS_URI=redis://localhost:6379
```

Property listings are cached with:
- Card projections for list endpoints (~350 bytes per listing)
- Short TTL (time-to-live)
- Automatic invalidation on write operations

**Recommended Redis Settings:**
- `maxmemory-policy`: `allkeys-lru`
- `maxmemory`: 30 MB (or appropriate for plan)

### Email Configuration

Uses Brevo (Sendinblue) for email notifications:
```env
BREVO_API_KEY=your_api_key
```

Emails include:
- OTP verification
- Password reset links
- Callback notifications
- Payment confirmations

### Image Upload Configuration

Images are stored on Cloudinary. Configuration in `server/config/FileHandling.js`.

**Max file sizes and allowed types:**
- Images: JPG, PNG, WebP
- Optimized via Sharp before upload

### Rate Limiting

**Status**: Not implemented (Security risk - see SECURITY section)

Recommended: Add express-rate-limit middleware

### Session Management

- JWT tokens stored in cookies (secure, httpOnly in production)
- Token expiry: configurable (default 7 days)
- Separate tokens for users and agents

---

## Dependencies

### Backend Key Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| express | ^5.1.0 | Web framework |
| mongoose | ^8.19.1 | MongoDB ORM |
| jsonwebtoken | ^9.0.2 | Authentication |
| bcryptjs | ^3.0.3 | Password hashing |
| multer | ^2.0.2 | File uploads |
| axios | ^1.12.2 | HTTP client |
| ioredis | ^5.4.1 | Redis client |
| node-cron | ^4.6.0 | Task scheduling |
| nodemailer | ^7.0.6 | Email sending |
| sharp | ^0.34.5 | Image optimization |
| cloudinary | ^2.7.0 | Cloud storage |
| dotenv | ^17.2.3 | Environment variables |

### Frontend Key Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| react | ^19.2.0 | UI library |
| react-router-dom | ^7.9.3 | Routing |
| @mui/material | ^7.3.4 | Component library |
| axios | ^1.13.1 | API calls |
| framer-motion | ^12.23.24 | Animations |
| recharts | ^3.3.0 | Data visualization |
| leaflet | ^1.9.4 | Maps |
| react-toastify | ^11.0.5 | Notifications |

### View Package Files

- Backend: `/tmp/ggnHome/server/package.json`
- Frontend: `/tmp/ggnHome/client/package.json`

---

## API Endpoints

### Authentication Routes

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/requestOtp` | Request OTP for login | No |
| POST | `/api/auth/verifyOtp` | Verify OTP | No |
| POST | `/api/auth/login` | Login with password | No |
| POST | `/api/auth/setPassword` | Set password after OTP | Yes |
| POST | `/api/auth/logout` | Logout user | Yes |

### User Routes

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/user/details` | Get user profile | Yes |
| PUT | `/api/user/details` | Update user profile | Yes |
| GET | `/api/user/preferences` | Get ARIA preferences | Yes |
| POST | `/api/user/preferences` | Save ARIA preferences | Yes |
| GET | `/api/user/searchHistory` | Get search history | Yes |
| GET | `/api/user/rewards` | Get rewards status | Yes |

### Property Routes

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/property/rental` | Get rental properties | No |
| GET | `/api/property/rental/:id` | Get rental property details | No |
| POST | `/api/property/rental` | Create rental property | Yes |
| PUT | `/api/property/rental/:id` | Update rental property | Yes |
| DELETE | `/api/property/rental/:id` | Delete rental property | Yes |
| GET | `/api/property/sale` | Get sale properties | No |
| POST | `/api/property/sale` | Create sale property | Yes |
| GET | `/api/property/analysis/:id` | Get property analytics | No |

### Search Routes

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/search` | Search properties | No |
| GET | `/api/search/suggestions` | Get location suggestions | No |
| GET | `/api/search/sectors` | Get sector suggestions | No |

### Admin Routes

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/admin/overview` | Dashboard overview | Admin |
| GET | `/api/admin/users` | List all users | Admin |
| GET | `/api/admin/payments` | List all payments | Admin |
| PUT | `/api/admin/payment/:id` | Approve/reject payment | Admin |
| GET | `/api/admin/callback-requests` | Get callback requests | Admin |
| PUT | `/api/admin/user/:id/role` | Change user role | Admin |

### Payment Routes

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/payment/initiate` | Initiate payment | Yes |
| POST | `/api/payment/verify` | Verify payment | Yes |
| GET | `/api/payment/history` | Get payment history | Yes |

### Flatmate Routes

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/flatmate/listings` | Get flatmate listings | No |
| POST | `/api/flatmate/listings` | Create flatmate listing | Yes |
| GET | `/api/flatmate/listings/:id` | Get listing details | No |
| POST | `/api/flatmate/enquiry` | Send flatmate inquiry | Yes |

### Chat/AI Routes

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/chat/message` | Send chat message to bot | Yes |
| GET | `/api/chat/initial-questions` | Get starting questions | No |
| POST | `/api/ai/price-predict` | Predict property price | No |

For complete endpoint documentation, see `server/Route/route.js`.

---

## Contribution Guide

### Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Test your changes thoroughly
- Follow the existing code style

### Getting Started with Contribution

1. **Fork the Repository**
   ```bash
   # Click "Fork" on GitHub
   ```

2. **Clone Your Fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/ggnHome.git
   cd ggnHome
   ```

3. **Create a Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or for bug fixes:
   git checkout -b bugfix/issue-description
   ```

4. **Follow Naming Conventions**
   - Feature branches: `feature/descriptive-name`
   - Bug fixes: `bugfix/issue-description`
   - Hotfixes: `hotfix/critical-issue`

### Development Workflow

1. **Create .env files** as described in Installation section
2. **Start both servers** (backend and frontend)
3. **Make your changes**
4. **Test locally**
   - Manual testing in browser
   - Use Postman for API testing
   - Run existing tests: `npm test`

5. **Commit with Clear Messages**
   ```bash
   git commit -m "feat: Add flatmate preference matching"
   git commit -m "fix: Resolve payment approval bug"
   ```

6. **Push to Your Fork**
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Create a Pull Request**
   - Write a clear description
   - Reference any related issues
   - Wait for review

### Code Style Guidelines

- **JavaScript**: Use ES6+ syntax
- **Comments**: Add comments for complex logic
- **Variables**: Use camelCase for variables and functions
- **Constants**: Use UPPER_SNAKE_CASE
- **Components (React)**: Use PascalCase
- **Imports**: Organize imports at the top of files
- **Async/Await**: Prefer async/await over .then() chains

### Testing

```bash
# Backend
cd server
npm test

# Frontend
cd client
npm test
```

### Submitting Issues

1. Check existing issues first
2. Use descriptive titles
3. Include:
   - Environment details
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if applicable

---

## Deployment

### Frontend Deployment (Vercel/Netlify)

**With Vercel:**
```bash
npm i -g vercel
vercel
```

**With Netlify:**
1. Push code to GitHub
2. Connect repository in Netlify dashboard
3. Set build command: `npm run build`
4. Set publish directory: `build`
5. Add environment variables

**Environment Variables in Netlify:**
```env
VITE_BACKEND_URL=https://your-backend-url.com
```

### Backend Deployment (Render/Railway)

**With Render:**
1. Connect GitHub repository
2. Set build command: `npm install`
3. Set start command: `npm start`
4. Add environment variables
5. Deploy

**With Railway:**
```bash
railway link
railway up
```

**Add Environment Variables:**
```env
MONGO_URI=your_mongodb_atlas_uri
JWT_SECRET=your_jwt_secret
PORT=5000
NODE_ENV=production
# ... other variables
```

### Database Deployment

**MongoDB Atlas (Recommended):**
1. Create account at https://www.mongodb.com/cloud/atlas
2. Create a cluster
3. Get connection string
4. Add to `MONGO_URI` in backend .env

**Redis Deployment:**
- Redis Cloud (https://redis.com/try-free/)
- Heroku Redis (free tier available)
- Add URL to `REDIS_URI` in backend .env

### Production Checklist

- [ ] All environment variables set
- [ ] JWT secrets are strong and unique
- [ ] CORS origins configured correctly
- [ ] Database backups enabled
- [ ] HTTPS/SSL enabled
- [ ] Security headers configured
- [ ] Rate limiting implemented
- [ ] Error logging set up
- [ ] Monitoring and alerts configured
- [ ] CDN configured (CloudFlare recommended)

### CI/CD Pipeline

Create `.github/workflows/deploy.yml` for automated testing and deployment:

```yaml
name: Deploy

on:
  push:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd server && npm install && npm test
      - run: cd client && npm install && npm test
```

---

## Troubleshooting

### Common Issues and Solutions

#### 1. MongoDB Connection Fails

**Error**: `MongoNetworkError: connect ECONNREFUSED`

**Solution**:
```bash
# Start MongoDB locally
mongod

# OR verify MongoDB Atlas connection string
# Check username, password, network access in MongoDB Atlas
```

#### 2. CORS Errors

**Error**: `Access to XMLHttpRequest blocked by CORS policy`

**Solution**:
```env
# In server/.env, add your frontend URL:
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,https://yourdomain.com
```

#### 3. Cloudinary Upload Fails

**Error**: `Cloudinary authentication failed`

**Solution**:
```env
# Verify credentials in server/.env:
CLOUDINARY_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Check credentials at https://cloudinary.com/console

#### 4. JWT Token Issues

**Error**: `Invalid token` or `Token expired`

**Solution**:
- Clear cookies/localStorage
- Log in again
- Check `JWT_EXPIRE` in server/.env
- Ensure `JWT_SECRET` is set

#### 5. Port Already in Use

**Error**: `Error: listen EADDRINUSE :::5000`

**Solution**:
```bash
# On Linux/Mac:
lsof -i :5000
kill -9 <PID>

# On Windows:
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Or change port in .env:
PORT=5001
```

#### 6. Redis Connection Issues

**Error**: `Redis connection refused`

**Solution**:
- Ensure Redis is running: `redis-cli ping`
- Or disable caching by removing `REDIS_URI` from .env
- Redis is optional; app works without it

#### 7. Package Installation Fails

**Solution**:
```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### 8. Build Fails

**Frontend**:
```bash
cd client
npm run build  # Check for errors
```

**Backend**: No build step, but verify:
```bash
cd server
node index.js  # Test if it starts
```

### Getting Help

1. Check existing GitHub issues
2. Review SECURITY_AUDIT.md for known issues
3. Check server logs: `npm run dev` outputs logs
4. Use browser DevTools for frontend issues
5. Test API endpoints with Postman

---

## Security

### Current Security Status

**Important**: This project has known security vulnerabilities. See `SECURITY_AUDIT.md` for details.

### Known Issues (OPEN)

- **CRITICAL (C-1)**: Unauthenticated password set → account takeover
- **CRITICAL (C-2)**: Upload filename not sanitized → arbitrary file write
- **HIGH (H-1)**: Admin property creation reachable without auth
- **HIGH (H-2)**: No rate limiting anywhere
- **HIGH (H-3)**: Admin sign-in code never expires
- **HIGH (H-4)**: Third-party API key returned to anonymous callers

See `SECURITY_AUDIT.md` for complete list and remediation guidance.

### Security Best Practices

1. **Environment Variables**
   - Never commit .env files
   - Use strong, unique secrets
   - Rotate secrets regularly

2. **Authentication**
   - Always verify tokens server-side
   - Use HTTPS/SSL in production
   - Implement rate limiting
   - Add password strength requirements

3. **Database**
   - Enable MongoDB authentication
   - Use network ACLs
   - Regular backups
   - Never expose connection strings

4. **File Uploads**
   - Validate file types
   - Set size limits
   - Scan for malware (optional)
   - Store outside webroot

5. **API Security**
   - Validate all inputs
   - Use HTTPS
   - Implement CORS correctly
   - Add security headers (Helmet.js)

6. **Dependency Management**
   - Keep dependencies updated
   - Use `npm audit` regularly
   - Monitor for vulnerabilities

### Security Audit

Refer to `SECURITY_AUDIT.md` for:
- Detailed vulnerability descriptions
- Affected code locations
- Remediation steps
- Priority levels

---

## License

This project is licensed under the **MIT License**.

```
MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```

See LICENSE file for full text.

---

## Credits

**Developed by**: ggnHome Team  
**Project**: Real Estate Platform with AI-Assisted Recommendations  
**Built with**: React, Node.js, MongoDB, Express.js

---

## Contact & Support

- **GitHub**: https://github.com/ggnhome629-git/ggnHome
- **Issues**: Report bugs and feature requests via GitHub Issues
- **Email**: admin@ggn-home.com

---

## Roadmap

### Planned Features
- Advanced property filters (furnished, pet-friendly, etc.)
- Video property tours
- Mobile app (React Native)
- Virtual property viewing (360° tour)
- Enhanced AI recommendations with ML
- Social features (property reviews, ratings)
- Integration with more property scrapers
- Analytics API for property insights

### In Progress
- Flatmate preference matching improvements
- Payment gateway integration enhancements
- Admin dashboard UI improvements
- Security vulnerability fixes

---

**Last Updated**: September 2026  
**Status**: Active Development  
**Maintainers**: ggnHome Team
