const express = require("express");
const mysql = require("mysql2/promise");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config();

const app = express();
const PORT = 3000;
const SECRET = process.env.JWT_SECRET || "Admin123"; // Use env variable

app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public")); // Serve static files like HTML/CSS if needed

// MySQL Connection Pool
const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "Mysql7", // <- your MySQL password
  database: "RestaurantDB",
});

// JWT middleware
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader)
    return res.status(403).send({ message: "No token provided." });

  const token = authHeader.split(" ")[1];
  if (!token) return res.status(403).send({ message: "Token missing." });

  jwt.verify(token, SECRET, (err, decoded) => {
    if (err) return res.status(401).send({ message: "Invalid token." });
    req.user = decoded; // Attach decoded info to the request object
    next();
  });
};

// ========== Routes ========== //

// Signup Route
app.post("/api/signup", async (req, res) => {
  const { username, fname, lname, password, role = "user" } = req.body;

  // Check if all required fields are provided
  if (!username || !fname || !lname || !password) {
    return res.status(400).json({ message: "All fields are required." });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query(
      "INSERT INTO signup (Username, Password, fname, lname, role) VALUES (?, ?, ?, ?, ?)",
      [username, hashedPassword, fname, lname, role]
    );
    res.json({ message: "Signup successful!", username });
  } catch (err) {
    res.status(500).send("Signup failed. " + err.message);
  }
});

// Login Route
app.post("/api/Login", async (req, res) => {
  console.log(req.body);
  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ message: "Username and password are required." });
  }

  try {
    const [results] = await pool.query(
      "SELECT * FROM signup WHERE Username = ?",
      [username]
    );

    if (results.length === 0) {
      return res.status(401).json({ message: "Invalid username or password." });
    }

    const user = results[0];
    // Special case: admin login with plain text password
    let isMatch;
    let userRole = user.role;

    if (username === "admin" && password === "admin123") {
      isMatch = true;
      userRole = "admin"; // Force admin role for admin credentials
    } else {
      isMatch = await bcrypt.compare(password, user.Password);
    }

    console.log("Login attempt:", username, password);
    console.log("User from DB:", user);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid username or password." });
    }

    // Check if this user has already filled customer details
    let hasFilledDetails = false;
    try {
      // This is a simple check - in a real app, you might want to link customers to users more directly
      const [customerResults] = await pool.query(
        "SELECT * FROM customer WHERE Name LIKE ?",
        [`%${user.fname}%`]
      );
      hasFilledDetails = customerResults.length > 0;
    } catch (checkErr) {
      console.error("Error checking customer details:", checkErr);
      // Continue with login even if this check fails
    }

    const token = jwt.sign(
      { username: user.Username, role: userRole },
      SECRET,
      {
        expiresIn: "1h",
      }
    );

    res.json({
      message: "Login successful",
      token,
      role: userRole,
      userId: user.Username, // Add this line
      hasFilledDetails: hasFilledDetails,
    });
  } catch (err) {
    res.status(500).json({ message: "Database error", error: err.message });
  }
});

// Check if user has filled customer details
app.get("/api/customer/check", authenticate, async (req, res) => {
  try {
    // Get the user's information from the token
    const username = req.user.username;

    // Get the user's details from the signup table
    const [userResults] = await pool.query(
      "SELECT * FROM signup WHERE Username = ?",
      [username]
    );

    if (userResults.length === 0) {
      return res.status(404).json({
        hasFilledDetails: false,
        message: "User not found",
      });
    }

    const user = userResults[0];

    // Check if there's a customer with a similar name
    const [customerResults] = await pool.query(
      "SELECT * FROM customer WHERE Name LIKE ?",
      [`%${user.fname}%`]
    );

    res.json({
      hasFilledDetails: customerResults.length > 0,
      message:
        customerResults.length > 0
          ? "Customer details found"
          : "Customer details not found",
    });
  } catch (err) {
    console.error("Error checking customer details:", err);
    res.status(500).json({
      error: "server_error",
      message: "Failed to check customer details. " + err.message,
    });
  }
});

// Add customer
app.post("/api/customer", async (req, res) => {
  const { passport_id, name, email, contact } = req.body;
  try {
    await pool.query(
      "INSERT INTO customer (Passport_id, Name, Email, Contact_No) VALUES (?, ?, ?, ?)",
      [passport_id, name, email, contact]
    );
    res.json({ message: "Customer added successfully." });
  } catch (err) {
    console.error("Error adding customer:", err);

    // Check for duplicate key errors
    if (err.code === "ER_DUP_ENTRY") {
      // Extract the duplicate key from the error message
      const errorMessage = err.message;

      if (errorMessage.includes("for key 'PRIMARY'")) {
        return res.status(409).json({
          error: "duplicate_primary_key",
          message: "A customer with this Passport ID already exists.",
        });
      } else if (
        errorMessage.includes("for key 'Email'") ||
        errorMessage.includes("for key 'customer.Email'")
      ) {
        return res.status(409).json({
          error: "duplicate_email",
          message: "A customer with this Email already exists.",
        });
      }
    }

    // Generic error response
    res.status(500).json({
      error: "server_error",
      message: "Failed to add customer. " + err.message,
    });
  }
});

// Get food items (simplified - only from food table)
app.get("/api/food", async (req, res) => {
  try {
    // Only fetch from food table without joining menu
    const [rows] = await pool.query(`
      SELECT Food_id, Name, Price, Description, Specification, Qty
      FROM food
      ORDER BY Name
    `);

    console.log("Fetched food items:", rows.length);

    // Log the first item to help with debugging
    if (rows.length > 0) {
      console.log("First food item:", rows[0]);
    }

    res.json(rows);
  } catch (err) {
    console.error("Error fetching food items:", err);
    res.status(500).json({
      error: "server_error",
      message: "Error fetching food items.",
      details: err.message,
    });
  }
});

// Add new food (admin only)
app.post("/api/food", authenticate, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ message: "Admins only." });

  const {
    Food_id,
    Name,
    Price,
    Description,
    Specification,
    Qty,
    Menu_id,
    Category,
  } = req.body;

  // Validate required fields
  if (
    !Food_id ||
    !Name ||
    !Price ||
    !Description ||
    !Specification ||
    !Qty ||
    !Menu_id ||
    !Category
  ) {
    return res.status(400).json({ message: "All fields are required." });
  }

  try {
    console.log("Adding food item:", {
      Food_id,
      Name,
      Price,
      Description,
      Specification,
      Qty,
    });

    // First insert into food table
    await pool.query(
      "INSERT INTO food (Food_id, Name, Price, Description, Specification, Qty) VALUES (?, ?, ?, ?, ?, ?)",
      [Food_id, Name, Price, Description, Specification, Qty]
    );

    console.log("Food item added, now adding to menu");

    // Then insert into menu table
    await pool.query(
      "INSERT INTO menu (Menu_id, Food_id, Category) VALUES (?, ?, ?)",
      [Menu_id, Food_id, Category]
    );

    console.log("Menu item added successfully");
    res.json({ message: "Menu item added successfully." });
  } catch (err) {
    console.error("Error adding menu item:", err);

    // Check for duplicate key errors
    if (err.code === "ER_DUP_ENTRY") {
      const errorMessage = err.message;

      if (errorMessage.includes("for key 'PRIMARY'")) {
        return res.status(409).json({
          error: "duplicate_primary_key",
          message: "A food item with this Food ID already exists.",
        });
      } else if (errorMessage.includes("for key 'menu.PRIMARY'")) {
        return res.status(409).json({
          error: "duplicate_menu_key",
          message: "This Menu ID and Food ID combination already exists.",
        });
      }
    }

    res.status(500).json({
      error: "server_error",
      message: "Failed to add menu item.",
      details: err.message,
      sqlState: err.sqlState,
      code: err.code,
    });
  }
});

// Add discount (admin only)
app.post("/api/discounts", authenticate, async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).send("Admins only.");

  const { discountId, discountPercentage, description } = req.body;
  try {
    await pool.query("INSERT INTO discounts VALUES (?, ?, ?)", [
      discountId,
      discountPercentage,
      description,
    ]);
    res.json({ message: "Discount added successfully." });
  } catch (err) {
    console.error("Error adding discount:", err);

    // Check for duplicate key errors
    if (err.code === "ER_DUP_ENTRY") {
      const errorMessage = err.message;

      if (errorMessage.includes("for key 'PRIMARY'")) {
        return res.status(409).json({
          error: "duplicate_primary_key",
          message: "A discount with this Discount ID already exists.",
        });
      }
    }

    res.status(500).json({
      error: "server_error",
      message: "Failed to add discount.",
      details: err.message,
    });
  }
});

// Validate discount by ID
app.get("/api/discounts/:id", async (req, res) => {
  const discountId = req.params.id;
  try {
    const [rows] = await pool.query(
      "SELECT * FROM discounts WHERE Discount_id = ?",
      [discountId]
    );
    if (!rows.length) return res.status(404).send("Invalid discount ID");
    res.json(rows[0]); // return discount details
  } catch (err) {
    res.status(500).send("Error checking discount.");
  }
});

// Validate and consume (delete) discount by ID
app.post("/api/discounts/consume", async (req, res) => {
  const { discountId } = req.body;

  console.log("Received Discount ID:", discountId); // Debug log

  if (!discountId) {
    return res
      .status(400)
      .json({ valid: false, message: "Discount ID required" });
  }

  try {
    // Use the pool for queries
    const [rows] = await pool.query(
      "SELECT Discount_Percentage FROM discounts WHERE Discount_id = ?",
      [discountId]
    );

    if (rows.length === 0) {
      return res.json({
        valid: false,
        message: "Invalid or already used Discount ID",
      });
    }

    const discountPercentage = rows[0].Discount_Percentage;

    // Delete the discount after use (as per your current SQL design)
    await pool.query("DELETE FROM discounts WHERE Discount_id = ?", [
      discountId,
    ]);

    return res.json({ valid: true, percentage: discountPercentage });
  } catch (error) {
    console.error("Database error:", error);
    return res.status(500).json({ valid: false, message: "Server error" });
  }
});

// Add this route after your other routes

app.post("/api/orders", async (req, res) => {
  const { orderNo, passportId, discountId, cart, totalAmount } = req.body;
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const time = now.toTimeString().slice(0, 8);

  try {
    // Insert into orders table
    await pool.query(
      "INSERT INTO orders (Order_No, Date, Time, Passport_id, Discount_id) VALUES (?, ?, ?, ?, ?)",
      [orderNo, date, time, passportId, discountId || null]
    );

    // Insert each item into order_details
    for (const item of cart) {
      await pool.query(
        "INSERT INTO order_details (Order_No, Food_id, Qty, Amount) VALUES (?, ?, ?, ?)",
        [orderNo, item.foodId, item.qty, item.qty * item.price]
      );
    }

    res.json({ message: "Order stored successfully." });
  } catch (err) {
    console.error("Error storing order:", err);
    res.status(500).json({ error: "Failed to store order." });
  }
});

// Get any (first) Passport_id from customer table
app.get("/api/customer/any-passport", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT Passport_id FROM customer LIMIT 1");
    if (rows.length > 0) {
      res.json({ passportId: rows[0].Passport_id });
    } else {
      res.status(404).json({ error: "No customers found" });
    }
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});

// document.addEventListener("DOMContentLoaded", function () {
//   applyDiscountAndUpdate();
// });
