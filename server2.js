const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const mysql = require("mysql2");

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// MySQL Connection
const db = mysql.createConnection({
  host: "localhost",      // or your DB host
  user: "root",           // your MySQL username
  password: "Mysql7", // your MySQL password
  database: "RestaurantDB"  // your MySQL database name
});

db.connect((err) => {
  if (err) {
    console.error("MySQL connection failed:", err);
    return;
  }
  console.log("Connected to MySQL database.");
});

// POST route to save discount
app.post("/api/discounts", (req, res) => {
  const { discountId, discountPercentage, description } = req.body;

  if (!discountId || !discountPercentage || !description) {
    return res.status(400).json({ message: "All fields are required." });
  }

  const sql = "INSERT INTO discounts (Discount_id, Discount_Percentage, Description) VALUES (?, ?, ?)";
  db.query(sql, [discountId, discountPercentage, description], (err, result) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ message: "Discount ID already exists." });
      }
      console.error("Insert failed:", err);
      return res.status(500).json({ message: "Database error." });
    }
    res.status(201).json({ message: "Discount added to database." });
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
