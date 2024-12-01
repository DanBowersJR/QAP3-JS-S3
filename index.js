const express = require("express");
const path = require("path");
const session = require("express-session");
const bcrypt = require("bcrypt");

const app = express();
const PORT = 3000;
const SALT_ROUNDS = 10;

// Middleware to parse form data and serve static files
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Session middleware (in-memory store for session data)
app.use(
    session({
        secret: "replace_this_with_a_secure_key", // Use a strong key
        resave: false,
        saveUninitialized: true,
    })
);

// Set up EJS view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// In-memory user storage
const USERS = [
    {
        id: 1,
        username: "AdminUser",
        email: "admin@example.com",
        password: bcrypt.hashSync("admin123", SALT_ROUNDS),
        role: "admin",
    },
    {
        id: 2,
        username: "RegularUser",
        email: "user@example.com",
        password: bcrypt.hashSync("user123", SALT_ROUNDS),
        role: "user",
    },
];

// Routes

// GET / - Render index page or redirect to landing if logged in
app.get("/", (req, res) => {
    if (req.session.user) {
        return res.redirect("/landing");
    }
    res.render("index");
});

// GET /signup - Render signup form
app.get("/signup", (req, res) => {
    res.render("signup", { error: undefined }); // Pass no error initially
});

// POST /signup - Handle user signup
app.post("/signup", async (req, res) => {
    const { username, email, password } = req.body;

    // Check if email is already registered
    const existingUser = USERS.find(user => user.email === email);
    if (existingUser) {
        return res.render("signup", { error: "Email is already registered." }); // Send error to view
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Add the new user to the in-memory USERS array
    USERS.push({
        id: USERS.length + 1,
        username,
        email,
        password: hashedPassword,
        role: "user",
    });

    console.log("Users after signup:", USERS); // Debugging

    res.redirect("/login");
});

// GET /login - Render login form
app.get("/login", (req, res) => {
    res.render("login");
});

// POST /login - Handle user login
app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    // Find user by email
    const user = USERS.find(user => user.email === email);
    if (!user) {
        return res.status(400).send("Invalid email or password.");
    }

    // Compare the provided password with the hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        return res.status(400).send("Invalid email or password.");
    }

    // Save user info in the session
    req.session.user = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
    };

    console.log("Session after login:", req.session.user); // Debugging
    res.redirect("/landing");
});

// GET /landing - Render landing page based on user role
app.get("/landing", (req, res) => {
    console.log("Session at landing page:", req.session.user); // Debugging

    if (!req.session.user) {
        return res.redirect("/login");
    }

    const currentUser = req.session.user;

    res.render("landing", {
        user: currentUser,
        users: currentUser.role === "admin" ? USERS : [],
    });
});

// GET /logout - Log out user and destroy session
app.get("/logout", (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.redirect("/landing");
        }
        res.redirect("/");
    });
});

// Debugging route to verify session data
app.get("/test-session", (req, res) => {
    res.send(req.session.user ? `Session Active: ${JSON.stringify(req.session.user)}` : "No active session");
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
