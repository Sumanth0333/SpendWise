const path = require("path");
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const pool = require("./db");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../frontend")));


// 2. Check backend and database connection
app.get("/api/health", async (req, res) => {
    try {
        const result = await pool.query("SELECT NOW() AS current_time");

        res.json({
            status: "success",
            message: "SpendWise backend connected to Neon database!",
            databaseTime: result.rows[0].current_time
        });
    } catch (error) {
        console.error("Database connection error:", error.message);

        res.status(500).json({
            message: "Database connection failed."
        });
    }
});

// 3. Register a new user
app.post("/api/auth/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (
            typeof name !== "string" ||
            typeof email !== "string" ||
            typeof password !== "string" ||
            !name.trim() ||
            !email.trim() ||
            !password
        ) {
            return res.status(400).json({
                message: "Name, email, and password are required."
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                message: "Password must be at least 8 characters."
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const existingUser = await pool.query(
            "SELECT id FROM users WHERE email = $1",
            [normalizedEmail]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                message: "An account with this email already exists."
            });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const result = await pool.query(
            `INSERT INTO users (name, email, password_hash)
             VALUES ($1, $2, $3)
             RETURNING id, name, email, created_at`,
            [name.trim(), normalizedEmail, passwordHash]
        );

        res.status(201).json({
            message: "Account created successfully.",
            user: result.rows[0]
        });
    } catch (error) {
        console.error("Registration error:", error.message);

        res.status(500).json({
            message: "Unable to create account."
        });
    }
});

// 4. Log in an existing user
app.post("/api/auth/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (
            typeof email !== "string" ||
            typeof password !== "string" ||
            !email.trim() ||
            !password
        ) {
            return res.status(400).json({
                message: "Email and password are required."
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const result = await pool.query(
            `SELECT id, name, email, password_hash
             FROM users
             WHERE email = $1`,
            [normalizedEmail]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                message: "Invalid email or password."
            });
        }

        const user = result.rows[0];

        const passwordMatches = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!passwordMatches) {
            return res.status(401).json({
                message: "Invalid email or password."
            });
        }

        if (!process.env.JWT_SECRET) {
            return res.status(500).json({
                message: "JWT_SECRET is missing from the .env file."
            });
        }

        const token = jwt.sign(
            { userId: user.id },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.json({
            message: "Login successful.",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        });
    } catch (error) {
        console.error("Login error:", error.message);

        res.status(500).json({
            message: "Unable to log in."
        });
    }
});

// 5. Authentication middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({
            message: "Please sign in first."
        });
    }

    if (!process.env.JWT_SECRET) {
        return res.status(500).json({
            message: "Authentication is not configured."
        });
    }

    jwt.verify(token, process.env.JWT_SECRET, (error, decoded) => {
        if (error) {
            return res.status(403).json({
                message: "Invalid or expired login. Please sign in again."
            });
        }

        req.userId = decoded.userId;
        next();
    });
}

// 6. Get the logged-in user's transactions
app.get("/api/transactions", authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, description, amount, type, category, transaction_date
             FROM transactions
             WHERE user_id = $1
             ORDER BY transaction_date DESC, id DESC`,
            [req.userId]
        );

        res.json(result.rows);
    } catch (error) {
        console.error("Fetch transactions error:", error.message);

        res.status(500).json({
            message: "Unable to fetch transactions."
        });
    }
});

// 7. Add a transaction
app.post("/api/transactions", authenticateToken, async (req, res) => {
    try {
        const {
            description,
            amount,
            type,
            category,
            transaction_date
        } = req.body;

        if (
            typeof description !== "string" ||
            !description.trim() ||
            description.trim().length > 255 ||
            typeof category !== "string" ||
            !category.trim() ||
            category.trim().length > 100 ||
            !["income", "expense"].includes(type) ||
            amount === undefined ||
            amount === null ||
            amount === "" ||
            !Number.isFinite(Number(amount)) ||
            Number(amount) <= 0 ||
            Number(amount) > 9999999999
        ) {
            return res.status(400).json({
                message: "Please enter valid transaction details."
            });
        }

        const date = transaction_date ||
            new Date().toISOString().slice(0, 10);

        if (
            typeof date !== "string" ||
            !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
            Number.isNaN(Date.parse(`${date}T00:00:00Z`)) ||
            new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date
        ) {
            return res.status(400).json({
                message: "Please enter a valid transaction date."
            });
        }

        const result = await pool.query(
            `INSERT INTO transactions
                (user_id, description, amount, type, category, transaction_date)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id, description, amount, type, category, transaction_date`,
            [
                req.userId,
                description.trim(),
                Number(amount),
                type,
                category.trim(),
                date
            ]
        );

        res.status(201).json({
            message: "Transaction added successfully.",
            transaction: result.rows[0]
        });
    } catch (error) {
        console.error("Add transaction error:", error.message);

        res.status(500).json({
            message: "Unable to add transaction."
        });
    }
});

// 8. Delete a transaction
app.delete("/api/transactions/:id", authenticateToken, async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isSafeInteger(id) || id <= 0) {
            return res.status(400).json({
                message: "Invalid transaction ID."
            });
        }

        const result = await pool.query(
            `DELETE FROM transactions
             WHERE id = $1 AND user_id = $2
             RETURNING id`,
            [id, req.userId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                message: "Transaction not found."
            });
        }

        res.json({
            message: "Transaction deleted successfully."
        });
    } catch (error) {
        console.error("Delete transaction error:", error.message);

        res.status(500).json({
            message: "Unable to delete transaction."
        });
    }
});

// 9. Start the server
app.listen(PORT, () => {
    console.log(`SpendWise server running on port ${PORT}`);
});