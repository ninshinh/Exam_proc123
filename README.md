# IT I.T Proctool — Vanilla HTML/CSS/JS + PHP (XAMPP)

## Project Structure

```
exam_system/          ← Drop this folder in htdocs/
├── index.html        ← Main login portal
├── css/
│   └── style.css
├── js/
│   ├── app.js        ← Login page logic
│   ├── dashboard.js  ← Teacher dashboard logic
│   └── exam.js       ← Student exam proctoring
├── teacher/
│   └── dashboard.html
├── student/
│   └── exam.html
├── assets/
│   ├── photo1.jpg
│   ├── photo2.jpg
│   └── photo3.jpg
└── api/              ← PHP backend
    ├── db.php             ← Database config
    ├── auth_student.php   ← Student login (2-phase)
    ├── auth_teacher.php   ← Teacher login
    ├── exams.php          ← CRUD for exams
    ├── violations.php     ← Log & fetch violations
    └── exam_sessions.php  ← Active session tracking
```

---

## Setup Steps

### 1. Database
1. Open phpMyAdmin (`http://localhost/phpmyadmin`)
2. Create database: **`cec_exam_system`**
3. Import: `scripts/cec_exam_system.sql` (from original project)

### 2. XAMPP Config (api/db.php)
```php
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');        // default XAMPP has no password
define('DB_NAME', 'cec_exam_system');
```

### 3. Drop files into htdocs
Place the whole `exam_system/` folder in:
```
C:\xampp\htdocs\exam_system\
```

### 4. Configure API paths
By default, JS files use relative `../../api` or `../api` paths.
If your folder name differs from `exam_system`, update `API_BASE` at the top of each JS file:
```js
// js/app.js
const API_BASE = '../api';        // for index.html

// js/dashboard.js
const API_BASE = '../../api';     // for teacher/dashboard.html

// js/exam.js
const API_BASE = '../../api';     // for student/exam.html
```

### 5. Access the app
- **Portal:** `http://localhost/exam_system/index.html`
- **Teacher dashboard:** `http://localhost/exam_system/teacher/dashboard.html`

---

## Default Credentials

### Teachers
| Name             | Email                      | Password     |
|------------------|----------------------------|--------------|
| Dr. John Smith   | teacher@cec.edu            | teacher123   |
| Prof. Sarah Johnson | sarah.johnson@cec.edu   | password123  |

### Students
| Name          | Student ID |
|---------------|------------|
| Alice Johnson | STU001     |
| Bob Wilson    | STU002     |
| Carol Davis   | STU003     |
| (more in DB)  | STU004–010 |

### Test Exam Form IDs (from sample data)
| Unique ID   | Exam Title               | Status    |
|-------------|--------------------------|-----------|
| SURV065932  | survey                   | active    |
| EXAM001     | Database Systems Midterm | completed |

---

## Features
- ✅ 2-phase student login (Student ID → Form ID)
- ✅ Teacher dashboard with dark/glassmorphism UI
- ✅ Create, activate, deactivate, delete exams
- ✅ Real-time violation monitoring (10-second polling)
- ✅ Live session tracking
- ✅ Student exam page with proctoring:
  - Tab switching detection
  - Window blur detection
  - Right-click disabled
  - Copy/paste/cut blocked
  - Keyboard shortcut blocking (F12, DevTools)
  - Fullscreen enforcement
  - Countdown timer
  - Auto-terminate on excessive violations
- ✅ Carousel background on teacher dashboard
- ✅ Responsive design (mobile-friendly)
- ✅ No frameworks — pure HTML, CSS, JS + PHP

---

## API Endpoints

| File                  | Method | Purpose                         |
|-----------------------|--------|---------------------------------|
| api/auth_student.php  | POST   | Verify student ID / form ID     |
| api/auth_teacher.php  | POST   | Teacher login                   |
| api/exams.php         | GET    | List teacher's exams            |
| api/exams.php         | POST   | Create exam                     |
| api/exams.php?examId= | PATCH  | Update exam status              |
| api/exams.php?examId= | DELETE | Delete exam                     |
| api/violations.php    | GET    | Get violations for teacher      |
| api/violations.php    | POST   | Log a violation                 |
| api/exam_sessions.php | GET    | Get active sessions for teacher |
| api/exam_sessions.php | POST   | Create exam session             |
