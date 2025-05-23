<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Customer Entry Form</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="stylesheet" href="style.css" />
    <style>
      :root {
        --primary-color: #ff6600;
        --secondary-color: #f8f8f8;
        --dark-color: #333;
      }

      body {
        font-family: Arial, sans-serif;
        background: var(--secondary-color);
        padding: 20px;
        margin: 0;
      }

      header,
      footer {
        text-align: center;
        padding: 10px;
        background-color: var(--primary-color);
        color: white;
      }

      nav {
        margin: 10px;
        text-align: center;
      }

      nav a {
        text-decoration: none;
        color: var(--primary-color);
        font-weight: bold;
        font-size: 1.1rem;
      }

      .form-container {
        max-width: 600px;
        margin: 30px auto;
        background: white;
        padding: 25px;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }

      .form-container h2 {
        text-align: center;
        color: var(--dark-color);
        margin-bottom: 20px;
      }

      .form-group {
        margin-bottom: 15px;
      }

      .form-group label {
        display: block;
        font-weight: bold;
        margin-bottom: 6px;
        color: var(--dark-color);
      }

      .form-group input {
        width: 100%;
        padding: 10px;
        border-radius: 8px;
        border: 1px solid #ccc;
        font-size: 1rem;
      }

      button {
        background-color: var(--primary-color);
        color: white;
        padding: 12px 20px;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        width: 100%;
        font-size: 1rem;
        margin-top: 10px;
      }

      button:hover {
        background-color: #ff4d4d;
      }

      .success-message {
        display: none;
        text-align: center;
        color: green;
        font-weight: bold;
        margin-top: 15px;
      }
      #foot {
        background: black;
      }
    </style>
  </head>
  <body>
    <header>
      <h1>Customer Details</h1>
    </header>

    <nav>
      <a href="index.html">Home</a>
      <a href="customers.html" id="customerNav">Customers</a>
    </nav>

    <section class="form-container">
      <h2>Enter Customer Information</h2>
      <form id="customerForm" method="POST">
        <div class="form-group">
          <label for="passport_id">Passport ID</label>
          <input type="text" id="passport_id" name="passport_id" required />
        </div>

        <div class="form-group">
          <label for="name">Name</label>
          <input type="text" id="name" name="name" required />
        </div>

        <div class="form-group">
          <label for="email">Email</label>
          <input type="email" id="email" name="email" required />
        </div>

        <div class="form-group">
          <label for="contact">Contact No</label>
          <input
            type="tel"
            id="contact"
            name="contact"
            required
            pattern="[0-9]{10}"
          />
        </div>

        <button type="submit">Submit</button>
        <div class="success-message" id="successMessage">
          Customer information submitted successfully!
        </div>
      </form>
    </section>

    <footer>&copy; 2025 Quick & Smart Restaurant</footer>

    <script>
      const userRole = localStorage.getItem("role");
      const userId = localStorage.getItem("userId");
      if (!userId) {
        window.location.href = "Login.html";
      }
      const customerDetailsKey = `customerDetailsFilled_${userId}`;
      const customerDetailsFilled = localStorage.getItem(customerDetailsKey);

      function hideCustomerNav() {
        const navLink = document.getElementById("customerNav");
        if (navLink) navLink.style.display = "none";
      }

      // Redirect admin users back to index page
      if (userRole === "admin") {
        window.location.href = "index.html";
        throw new Error("Admin users should not access this page");
      }

      // Check if user has already filled out customer details
      if (customerDetailsFilled === "true") {
        hideCustomerNav();
        window.location.href = "index.html";
      }

      // Double-check with the server if this user has filled details
      const token = localStorage.getItem("token");
      if (token && userId) {
        fetch(
          `http://localhost:3000/api/customer/check?userId=${encodeURIComponent(
            userId
          )}`,
          {
            headers: {
              Authorization: "Bearer " + token,
            },
          }
        )
          .then((response) => response.json())
          .then((data) => {
            if (data.hasFilledDetails) {
              localStorage.setItem(customerDetailsKey, "true");
              hideCustomerNav();
              window.location.href = "index.html";
            }
          })
          .catch((error) => {
            console.error("Error checking customer details:", error);
          });
      }

      // Hide Customers nav on all pages if details are filled
      if (customerDetailsFilled === "true") {
        hideCustomerNav();
      }

      document
        .getElementById("customerForm")
        .addEventListener("submit", function (e) {
          e.preventDefault();

          const passport = document.getElementById("passport_id").value.trim();
          const name = document.getElementById("name").value.trim();
          const email = document.getElementById("email").value.trim();
          const contact = document.getElementById("contact").value.trim();

          if (!passport || !name || !email || !contact) {
            alert("Please fill out all fields.");
            return;
          }

          fetch("http://localhost:3000/api/customer", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              passport_id: passport,
              name,
              email,
              contact,
              userId,
            }),
          })
            .then(async (response) => {
              const data = await response.json();

              if (!response.ok) {
                if (response.status === 409) {
                  if (data.error === "duplicate_primary_key") {
                    alert(
                      "Error: " +
                        data.message +
                        " Please use a different Passport ID."
                    );
                  } else if (data.error === "duplicate_email") {
                    alert(
                      "Error: " +
                        data.message +
                        " Please use a different Email address."
                    );
                  } else {
                    alert(
                      "Error: Duplicate entry. Please check your information and try again."
                    );
                  }
                } else {
                  alert(
                    "Error: " +
                      (data.message ||
                        "Something went wrong. Please try again.")
                  );
                }
                throw new Error(data.message || "Server error");
              }

              return data;
            })
            .then((data) => {
              localStorage.setItem(customerDetailsKey, "true");
              hideCustomerNav();
              document.getElementById("successMessage").style.display = "block";
              document.getElementById("customerForm").reset();

              setTimeout(() => {
                window.location.href = "index.html";
              }, 2000);
            })
            .catch((error) => {
              console.error("Error:", error);
            });
        });
    </script>
  </body>
</html>
