# 🎵 MoodTune AI – Smart Music Recommendation using Face Detection

A full-stack AI-powered music recommendation system that detects facial emotions in real-time and curates personalized music playlists.

---

## 📁 Project Structure

```
moodtune/
├── frontend/               # React.js frontend
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/     # SongCard, Toast, ChatBot
│   │   │   ├── layout/     # Sidebar
│   │   │   ├── mood/       # FaceDetector
│   │   │   └── player/     # MusicPlayer
│   │   ├── context/        # AppContext (auth, player, theme)
│   │   ├── pages/          # All page components
│   │   ├── styles/         # Global CSS
│   │   └── App.js
│   └── package.json
├── backend/                # Python Flask backend
│   ├── config/
│   │   └── database.py
│   ├── models/
│   │   ├── user.py
│   │   ├── song.py
│   │   ├── history.py
│   │   └── playlist.py
│   ├── routes/
│   │   ├── auth.py
│   │   ├── music.py
│   │   └── admin.py
│   ├── utils/
│   │   └── spotify_service.py
│   ├── app.py
│   ├── requirements.txt
│   └── .env.example
├── database_setup.sql
└── README.md
```

---

## ⚡ Quick Setup

### 1. Database
```bash
mysql -u root -p < database_setup.sql
```
If you'd like to use Oracle instead of MySQL, set `DB_TYPE=oracle` and provide Oracle connection details in `backend/.env` (for example `DB_SERVICE` or `DB_SID`, `DB_HOST`, `DB_PORT=1521`, `DB_USER`, `DB_PASSWORD`). The project uses SQLAlchemy with the `oracledb` Python driver and supports thin-mode connections (no Oracle client libraries) when the `oracledb` package is installed.

Note: `database_setup.sql` is MySQL-specific; for Oracle you must create the schema and users using Oracle-compatible DDL.

### 2. Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env with your credentials

python app.py
# Backend runs at http://localhost:5000
```

### 3. Frontend
```bash
cd frontend
npm install
echo "REACT_APP_API_URL=http://localhost:5000/api" > .env.local
npm start
# Frontend runs at http://localhost:3000
```

---

## 🔐 Environment Variables

### backend/.env
```
FLASK_ENV=development
SECRET_KEY=your-secret-key
JWT_SECRET_KEY=your-jwt-key
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=moodtune_db
MAIL_USERNAME=your@gmail.com
MAIL_PASSWORD=your-app-password
SPOTIFY_CLIENT_ID=your-spotify-client-id
SPOTIFY_CLIENT_SECRET=your-spotify-client-secret
ADMIN_EMAIL=admin@moodtune.com
ADMIN_PASSWORD=Admin@123
```

### frontend/.env.local
```
REACT_APP_API_URL=http://localhost:5000/api
```

---

## 🎭 Features

| Feature | Details |
|---------|---------|
| Face Detection | Real-time via face-api.js (TinyFaceDetector + FaceExpressionNet) |
| Emotions | Happy, Sad, Angry, Neutral, Surprised, Fearful, Disgusted |
| Mood Mapping | Happy→Pop, Sad→Lo-fi, Angry→Calm, Neutral→Trending, Excited→EDM, Fear→Meditation |
| Music Source | Spotify API with local fallback database |
| Authentication | JWT, email verification, password reset |
| Player | Play/Pause/Next/Prev, volume, progress seek, queue |
| AI Chatbot | Powered by Claude API |
| Dark/Light Mode | Persisted in localStorage |
| Admin Panel | User/song management, analytics |
| Multi-language | 6 language options |
| History Tracking | Mood-tagged listening history |

---

## 🌐 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login |
| GET  | /api/auth/me | Get current user |
| PUT  | /api/auth/profile | Update profile |
| GET  | /api/auth/verify/:token | Verify email |
| POST | /api/auth/forgot-password | Send reset email |
| POST | /api/auth/reset-password | Reset password |

### Music
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/music/recommend/:mood | Get mood-based recommendations |
| GET | /api/music/search?q=query | Search songs |
| GET | /api/music/trending | Get trending songs |
| GET/POST | /api/music/history | View/add listening history |
| GET/POST/DELETE | /api/music/favorites | Manage favorites |
| GET/POST | /api/music/playlists | Manage playlists |
| POST/DELETE | /api/music/playlists/:id/songs | Add/remove songs from playlist |

### Admin (requires is_admin=true)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/admin/dashboard | Stats overview |
| GET | /api/admin/users | List all users |
| PUT/DELETE | /api/admin/users/:id | Manage user |
| GET/POST | /api/admin/songs | Manage songs |
| PUT/DELETE | /api/admin/songs/:id | Update/delete song |
| GET | /api/admin/analytics | Mood/genre distribution |

---

## 🚀 Production Deployment

### Backend (Gunicorn + Nginx)
```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

### Frontend (Build + Nginx)
```bash
npm run build
# Serve /build folder with nginx
```

### Nginx config snippet
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        root /var/www/moodtune/build;
        try_files $uri /index.html;
    }

    location /api {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 🎵 Spotify API Setup

1. Go to https://developer.spotify.com/dashboard
2. Create new app → get Client ID & Secret
3. Add to backend `.env`

> The app has a full fallback database if Spotify is unavailable.

---

## 👤 Default Admin
- Email: `admin@moodtune.com`
- Password: `Admin@123`
- *(Change in .env before production)*

---

## 📦 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router 6, Axios, face-api.js, Framer Motion |
| Backend | Python Flask, Flask-JWT-Extended, Flask-SQLAlchemy, Flask-Mail |
| Database | MySQL 8+ |
| Face AI | face-api.js (TinyFaceDetector + FaceExpression models) |
| Music API | Spotify Web API + fallback DB |
| AI Chat | Anthropic Claude API |
| Auth | JWT tokens + bcrypt |

