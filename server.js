const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com"]
    }
  }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Middleware
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Initialize SQLite database
const db = new sqlite3.Database('./sarkarijob.db', (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
    initializeDatabase();
  }
});

// Initialize database tables
function initializeDatabase() {
  // Jobs table
  db.run(`CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    department TEXT NOT NULL,
    category TEXT NOT NULL,
    location TEXT,
    qualification TEXT,
    posts INTEGER,
    last_date DATE,
    application_link TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) {
      console.error('Error creating jobs table:', err);
    } else {
      console.log('Jobs table ready');
    }
  });

  // Results table
  db.run(`CREATE TABLE IF NOT EXISTS results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    exam_name TEXT NOT NULL,
    result_link TEXT,
    published_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) {
      console.error('Error creating results table:', err);
    } else {
      console.log('Results table ready');
    }
  });

  // Admit Cards table
  db.run(`CREATE TABLE IF NOT EXISTS admit_cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    exam_name TEXT NOT NULL,
    download_link TEXT,
    exam_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) {
      console.error('Error creating admit_cards table:', err);
    } else {
      console.log('Admit cards table ready');
    }
  });

  // Answer Keys table
  db.run(`CREATE TABLE IF NOT EXISTS answer_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    exam_name TEXT NOT NULL,
    download_link TEXT,
    published_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) {
      console.error('Error creating answer_keys table:', err);
    } else {
      console.log('Answer keys table ready');
      // Insert sample data after all tables are created
      setTimeout(insertSampleData, 1000);
    }
  });
}

function insertSampleData() {
  // Check if data already exists
  db.get("SELECT COUNT(*) as count FROM jobs", (err, row) => {
    if (err) {
      console.error('Error checking jobs table:', err);
      return;
    }
    
    if (row.count === 0) {
      // Sample jobs
      const sampleJobs = [
        {
          title: 'Railway Recruitment Board - Junior Engineer',
          department: 'Railway',
          category: 'Central Government',
          location: 'All India',
          qualification: 'Diploma/B.Tech',
          posts: 13487,
          last_date: '2024-08-15',
          application_link: 'https://rrbcdg.gov.in'
        },
        {
          title: 'SSC Combined Graduate Level Examination',
          department: 'SSC',
          category: 'Central Government',
          location: 'All India',
          qualification: 'Graduate',
          posts: 1867,
          last_date: '2024-08-20',
          application_link: 'https://ssc.nic.in'
        },
        {
          title: 'IBPS PO Recruitment',
          department: 'Banking',
          category: 'Banking',
          location: 'All India',
          qualification: 'Graduate',
          posts: 4135,
          last_date: '2024-08-25',
          application_link: 'https://ibps.in'
        },
        {
          title: 'UPSC Civil Services Examination',
          department: 'UPSC',
          category: 'Central Government',
          location: 'All India',
          qualification: 'Graduate',
          posts: 712,
          last_date: '2024-08-30',
          application_link: 'https://upsc.gov.in'
        },
        {
          title: 'Delhi Police Constable Recruitment',
          department: 'Police',
          category: 'State Government',
          location: 'Delhi',
          qualification: '12th Pass',
          posts: 5846,
          last_date: '2024-09-05',
          application_link: 'https://delhipolice.nic.in'
        }
      ];

      sampleJobs.forEach(job => {
        db.run(`INSERT INTO jobs (title, department, category, location, qualification, posts, last_date, application_link) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [job.title, job.department, job.category, job.location, job.qualification, job.posts, job.last_date, job.application_link]);
      });
    }
  });

  // Check if results data already exists
  db.get("SELECT COUNT(*) as count FROM results", (err, row) => {
    if (err) {
      console.error('Error checking results table:', err);
      return;
    }
    
    if (row.count === 0) {
      // Sample results
      const sampleResults = [
        {
          title: 'SSC CHSL Result 2024',
          exam_name: 'Staff Selection Commission CHSL',
          result_link: 'https://ssc.nic.in/result',
          published_date: '2024-07-10'
        },
        {
          title: 'Railway Group D Result 2024',
          exam_name: 'Railway Recruitment Board Group D',
          result_link: 'https://rrbcdg.gov.in/result',
          published_date: '2024-07-08'
        },
        {
          title: 'IBPS Clerk Prelims Result',
          exam_name: 'IBPS Clerk Preliminary Examination',
          result_link: 'https://ibps.in/result',
          published_date: '2024-07-05'
        }
      ];

      sampleResults.forEach(result => {
        db.run(`INSERT INTO results (title, exam_name, result_link, published_date) 
                VALUES (?, ?, ?, ?)`,
          [result.title, result.exam_name, result.result_link, result.published_date]);
      });
    }
  });

  // Sample admit cards
  db.get("SELECT COUNT(*) as count FROM admit_cards", (err, row) => {
    if (!err && row.count === 0) {
      const sampleAdmitCards = [
        {
          title: 'SSC CGL Admit Card 2024',
          exam_name: 'Staff Selection Commission CGL',
          download_link: 'https://ssc.nic.in/admit-card',
          exam_date: '2024-08-15'
        },
        {
          title: 'UPSC Prelims Admit Card',
          exam_name: 'Civil Services Preliminary Examination',
          download_link: 'https://upsc.gov.in/admit-card',
          exam_date: '2024-08-20'
        }
      ];

      sampleAdmitCards.forEach(card => {
        db.run(`INSERT INTO admit_cards (title, exam_name, download_link, exam_date) 
                VALUES (?, ?, ?, ?)`,
          [card.title, card.exam_name, card.download_link, card.exam_date]);
      });
    }
  });

  // Sample answer keys
  db.get("SELECT COUNT(*) as count FROM answer_keys", (err, row) => {
    if (!err && row.count === 0) {
      const sampleAnswerKeys = [
        {
          title: 'Railway Group D Answer Key',
          exam_name: 'Railway Recruitment Board Group D',
          download_link: 'https://rrbcdg.gov.in/answer-key',
          published_date: '2024-07-01'
        },
        {
          title: 'SSC CHSL Answer Key 2024',
          exam_name: 'Staff Selection Commission CHSL',
          download_link: 'https://ssc.nic.in/answer-key',
          published_date: '2024-06-28'
        }
      ];

      sampleAnswerKeys.forEach(key => {
        db.run(`INSERT INTO answer_keys (title, exam_name, download_link, published_date) 
                VALUES (?, ?, ?, ?)`,
          [key.title, key.exam_name, key.download_link, key.published_date]);
      });
    }
  });
}

// API Routes

// Get latest jobs
app.get('/api/jobs', (req, res) => {
  const { category, search, limit = 10 } = req.query;
  let query = 'SELECT * FROM jobs WHERE 1=1';
  const params = [];

  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }

  if (search) {
    query += ' AND (title LIKE ? OR department LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(parseInt(limit));

  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get job by ID
app.get('/api/jobs/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM jobs WHERE id = ?', [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }
    res.json(row);
  });
});

// Get results
app.get('/api/results', (req, res) => {
  const { limit = 10 } = req.query;
  db.all('SELECT * FROM results ORDER BY published_date DESC LIMIT ?', [parseInt(limit)], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get admit cards
app.get('/api/admit-cards', (req, res) => {
  const { limit = 10 } = req.query;
  db.all('SELECT * FROM admit_cards ORDER BY created_at DESC LIMIT ?', [parseInt(limit)], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get answer keys
app.get('/api/answer-keys', (req, res) => {
  const { limit = 10 } = req.query;
  db.all('SELECT * FROM answer_keys ORDER BY published_date DESC LIMIT ?', [parseInt(limit)], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Serve main pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/jobs', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'jobs.html'));
});

app.get('/results', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'results.html'));
});

app.get('/admit-cards', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admit-cards.html'));
});

app.get('/answer-keys', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'answer-keys.html'));
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`SarkariJob Portal running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
    } else {
      console.log('Database connection closed.');
    }
    process.exit(0);
  });
});