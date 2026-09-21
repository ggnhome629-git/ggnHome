

# ggnHome

ggnHome is a modern real‑estate platform designed to simplify property discovery, management, and communication between renters, buyers, owners, and administrators.  
This README provides complete project documentation including setup, features, architecture, and development workflow.

---

## 🚀 Features

### 👤 User Features
- Browse rental and sale properties  
- AI‑assisted property recommendations (ARIA)  
- Save and track favorite properties  
- View detailed property analytics (views, saves, engagement)  
- Maintain search history  
- Receive callback responses  

### 🏘 Owner Features
- Post and manage rental properties  
- Post and manage sale properties  
- Track property engagement  
- Payment management  
- View service/support requests  

### 🛠 Admin Panel
- Manage all users  
- Manage all properties  
- Approve or reject payments  
- Full analytics dashboard:
  - Total users (renters, owners, admins)
  - Revenue statistics
  - Active vs inactive users
  - Property engagement
  - Searches & trends
  - Top properties (views, saves, ratings)
  - Monthly user growth
- Review callback and service requests  
- Reward system & claim tracking  

---

## 🧱 Tech Stack

### Frontend
- React.js  
- Vite  
- TailwindCSS / Custom UI components  
- Axios  
- React Router  

### Backend
- Node.js  
- Express.js  
- JWT Authentication  
- Mongoose ORM  

### Database
- MongoDB  

### Cloud & External Services
- Cloudinary (property image uploads)  
- Email / Notification provider (if used)  
- Razorpay/Stripe (if payment integration exists)  

---

## 📁 Folder Structure (Suggested)
```
Neo-Urban/
│── server/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   ├── utils/
│   ├── config/
│   └── server.js
│
└── client/
    ├── src/
    ├── components/
    ├── pages/
    ├── hooks/
    ├── utils/
    └── main.jsx
```

---

## 🛠 Installation & Setup

### 1. Clone the repository
```
git clone https://github.com/your-username/ggnHome.git
cd ggnHome
```

### 2. Install server dependencies
```
cd server
npm install
```

### 3. Install client dependencies
```
cd ../client
npm install
```

### 4. Environment Variables
Create `.env` files in both **server** and **client** folders.

### Example Server `.env`
```
MONGO_URI=
JWT_SECRET=
CLOUDINARY_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Optional. Enables the Redis cache in front of the property endpoints.
# Leave it unset and the app runs exactly as before, reading from MongoDB.
REDIS_URI=
```

#### Caching (optional)

Property listing and detail responses are cached in Redis when `REDIS_URI` is
set. The cache is designed to fit a 30 MB plan: list endpoints store trimmed
card projections (~350 bytes per listing rather than ~5 KB full documents) and
everything carries a short TTL. If Redis is unset, unreachable or out of
memory, every read falls through to MongoDB — the cache can never fail a
request.

Writes invalidate automatically: a Mongoose plugin on the property models
clears the cached feeds on any save, update or delete, debounced so a bulk
sync triggers one sweep instead of thousands.

Recommended plan settings: `maxmemory-policy allkeys-lru`, and a single shared
client per process (free tiers usually cap connections at 30).

### Example Client `.env`
```
VITE_BACKEND_URL=http://localhost:2000
```

---

## ▶ Running the Project

### Start Backend
```
cd server
npm run dev
```

### Start Frontend
```
cd client
npm run dev
```

Both apps will run independently on different ports.

---

## 📊 Admin Overview (Dashboard Summary)
The admin dashboard includes:
- Summary tiles  
- Revenue insights  
- User distribution  
- Property statistics  
- Active user tracking  
- Top performing properties  
- Search insights  
- Reward management  

---

## 🔌 API Endpoints (High-level)
### User
- `/api/user/register`
- `/api/user/login`
- `/api/user/preferences`
- `/api/user/searchHistory`

### Property
- `/api/property/rental`
- `/api/property/sale`
- `/api/property/analysis`

### Admin
- `/api/admin/overview`
- `/api/admin/callbackRequests`
- `/api/admin/allUsersDetailed`

### Payments
- `/api/payment/initiate`
- `/api/payment/confirm`
- `/api/payment/pending`
- `/api/payment/approved`

---

## 🧪 Testing
API testing can be done using:
- Postman  
- Thunder Client  
- Swagger (optional)

---

## 📦 Deployment
Recommended services:
- **Frontend:** Vercel / Netlify  
- **Backend:** Render / Railway / VPS  
- **Database:** MongoDB Atlas  
- **Images:** Cloudinary  

---

## 👥 Contributing
1. Fork the repository  
2. Create a new feature branch  
3. Commit changes  
4. Create a Pull Request  

---

## 📄 License
This project is licensed under the MIT License.

---

## ❤️ Credits
Developed for ggnHome – a smarter way to explore, manage, and deliver real‑estate experiences.