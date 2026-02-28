# 🏨 Hotel Management - Login Fix Guide

## Problem
You were getting "Invalid Credentials" error because **no test users existed** in your database.

## ✅ Solution Implemented

I've added:
1. ✨ **Register endpoint** - Users can now self-register
2. 🌱 **Seed script** - Auto-populate test data with default passwords
3. 🔐 **Password hashing** - Bcrypt properly hashes all passwords

---

## 🚀 Quick Start

### Step 1: Make sure your backend is NOT running
Close the backend server if it's currently running.

### Step 2: Create the test database
Run this command in the `backend` folder:

```bash
npm run seed
```

**Expected Output:**
```
Starting database seed...
✅ Users table created/exists
✅ User added: admin@hotel.com
✅ User added: john@hotel.com
✅ User added: manager@hotel.com

🎉 Database seeding completed!

📝 Test Credentials:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Email: admin@hotel.com
Password: admin123
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Email: john@hotel.com
Password: user123
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Step 3: Start your backend server
```bash
npm run dev
```

### Step 4: Try logging in with these credentials

**Email:** `admin@hotel.com`  
**Password:** `admin123`

---

## 📝 New Features

### Register Endpoint
Now you can register new users via API:

```bash
POST http://localhost:5000/api/auth/register

Body (JSON):
{
  "name": "Your Name",
  "email": "your@email.com",
  "password": "yourpassword",
  "role": "Admin"
}
```

---

## 🔧 What Changed

### Backend Files Modified:
1. **authController.js** - Added `register` function
2. **authRoutes.js** - Added `/register` endpoint
3. **package.json** - Added `seed` script
4. **seed.js** - New file for database initialization

### Database Schema Created:
```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'Admin',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

---

## ⚠️ Troubleshooting

### If seed still fails:

1. **Check MySQL is running**
   - XAMPP Control Panel → Start Apache & MySQL

2. **Check database credentials** in `backend/config/db.js`:
   ```javascript
   const db = mysql.createConnection({
     host: 'localhost',
     user: 'root',
     password: '',    // Usually empty for XAMPP
     database: 'hotel_db'
   });
   ```

3. **Create database manually if needed**:
   ```sql
   CREATE DATABASE IF NOT EXISTS hotel_db;
   ```

---

## 💡 Tips
- Change test passwords after first login for security
- Always hash passwords when creating new users
- Use the `/register` endpoint for production user creation

Enjoy your Hotel Management System! 🚀
