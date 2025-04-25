const mysql = require('mysql2');
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root', // use your own MySQL username
  password: 'Mysql7', // replace with your MySQL password
  database: 'RestaurantDB'
});

// Connect to the DB
db.connect(err => {
  if (err) {
    console.error('Database connection failed:', err.message);
    return;
  }
  console.log('Connected to MySQL database.');
});

// Handle form submission
app.post('/submit', (req, res) => {
  const { passport_id, name, email, contact } = req.body;

  const sql = 'INSERT INTO customer (passport_id, name, email, Contact_No) VALUES (?, ?, ?, ?)';
  db.query(sql, [passport_id, name, email, contact], (err, result) => {
    if (err) {
      console.error('Error inserting data:', err.message);
      res.status(500).send('Database insertion error');
    } else {
      res.status(200).send('Customer data inserted successfully');
    }
  });
});

app.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});
