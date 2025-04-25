const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const mysql = require("mysql2");
const app = express();
const PORT = 3000;

// MySQL connection
const db = mysql.createConnection({
    host: "localhost",
    user: "root",     // <-- change this
    password: "Mysql7", // <-- change this
    database: "RestaurantDB"
});

db.connect((err) => {
    if (err) {
        console.error("MySQL connection error:", err);
        return;
    }
    console.log("Connected to MySQL Database.");
});

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));

app.post("/submit", (req, res) => {
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

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
