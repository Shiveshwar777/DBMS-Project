const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const mysql = require("mysql2");
const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

// MySQL connection
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "Mysql7",
    database: "RestaurantDB"
});

db.connect((err) => {
    if (err) {
        console.error("MySQL connection error:", err);
        return;
    }
    console.log("Connected to MySQL Database.");
});

// POST route for signup (from server.js)
app.post("/api/signup", (req, res) => {
    const { username, fname, lname, password } = req.body;

    if (!username || !fname || !lname || !password) {
        return res.status(400).send("All fields are required.");
    }

    const sql = "INSERT INTO signup (username, fname, lname, password) VALUES (?, ?, ?, ?)";
    const values = [username, fname, lname, password];

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error("Database insert error:", err);
            return res.status(500).send("Failed to store user.");
        }

        console.log("User data inserted:", result.insertId);
        res.status(200).send("User successfully registered and stored in database!");
    });
});

// POST route for customer (from server1.js)
app.post("/api/customer", (req, res) => {
    const { passport_id, name, email, contact } = req.body;

    if (!passport_id || !name || !email || !contact) {
        return res.status(400).send("All fields are required.");
    }

    const sql = "INSERT INTO customer (passport_id, name, email, Contact_No) VALUES (?, ?, ?, ?)";
    db.query(sql, [passport_id, name, email, contact], (err, result) => {
        if (err) {
            console.error("Error inserting data:", err.message);
            res.status(500).send("Database insertion error");
        } else {
            res.status(200).send("Customer data inserted successfully");
        }
    });
});

// POST route for discounts (from server2.js)
app.post("/api/discounts", (req, res) => {
    const { discountId, discountPercentage, description } = req.body;

    if (!discountId || !discountPercentage || !description) {
        return res.status(400).json({ message: "All fields are required." });
    }

    const sql = "INSERT INTO discounts (Discount_id, Discount_Percentage, Description) VALUES (?, ?, ?)";
    db.query(sql, [discountId, discountPercentage, description], (err, result) => {
        if (err) {
            if (err.code === "ER_DUP_ENTRY") {
                return res.status(409).json({ message: "Discount ID already exists." });
            }
            console.error("Insert failed:", err);
            return res.status(500).json({ message: "Database error." });
        }
        res.status(201).json({ message: "Discount added to database." });
    });
});

// POST route for menu items (from server3.js)
app.post("/api/menu", (req, res) => {
    const { foodId, name, price, description, specification, qty } = req.body;

    if (!foodId || !name || !price || !description || !specification || !qty) {
        return res.status(400).json({ message: "All fields are required." });
    }

    const sql = "INSERT INTO food (Food_id, Name, Price, Description, Specification, Qty) VALUES (?, ?, ?, ?, ?, ?)";
    db.query(sql, [foodId, name, price, description, specification, qty], (err, result) => {
        if (err) {
            console.error("Error inserting item:", err);
            return res.status(500).json({ message: "Database insert failed." });
        }

        res.json({ message: "Food item added successfully!" });
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
