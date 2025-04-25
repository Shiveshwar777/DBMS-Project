const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// MySQL connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',      // Change as per your MySQL config
  password: 'Mysql7',      // Add your password if required
  database: 'RestaurantDB'
});

// Connect to database
db.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err);
    return;
  }
  console.log('Connected to MySQL database.');
});

// POST route to add new food item
app.post('/api/menu', (req, res) => {
  const { foodId, name, price, description, specification, qty } = req.body;

  const sql = `INSERT INTO food (Food_id, Name, Price, Description, Specification, Qty)
               VALUES (?, ?, ?, ?, ?, ?)`;

  db.query(sql, [foodId, name, price, description, specification, qty], (err, result) => {
    if (err) {
      console.error('Error inserting item:', err);
      return res.status(500).json({ message: 'Database insert failed.' });
    }

    res.json({ message: 'Food item added successfully!' });
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
