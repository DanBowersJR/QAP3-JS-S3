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

// Session middleware
app.use(
    session({
        secret: "replace_this_with_a_secure_key",
        resave: false,
        saveUninitialized: true,
    })
);

// Flash message middleware
app.use((req, res, next) => {
    res.locals.message = req.session.message || null; // Pass the message to EJS
    delete req.session.message; // Clear message after it's accessed
    next();
});

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
    res.render("signup", { error: null });
});

// POST /signup - Handle user signup
app.post("/signup", async (req, res) => {
    const { username, email, password } = req.body;

    const existingUser = USERS.find(user => user.email === email);
    if (existingUser) {
        return res.render("signup", { error: "Email is already registered." });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    USERS.push({
        id: USERS.length + 1,
        username,
        email,
        password: hashedPassword,
        role: "user",
    });

    res.redirect("/login");
});

// GET /login - Render login form
app.get("/login", (req, res) => {
    res.render("login", { error: null });
});

// POST /login - Handle user login
app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    const user = USERS.find(user => user.email === email);
    if (!user) {
        return res.render("login", { error: "Invalid email or password." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        return res.render("login", { error: "Invalid email or password." });
    }

    req.session.user = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
    };

    res.redirect("/landing");
});

// GET /landing - Render landing page based on user role
app.get("/landing", (req, res) => {
    if (!req.session.user) {
        return res.redirect("/login"); // Redirect if not logged in
    }

    const currentUser = req.session.user;

    res.render("landing", {
        user: currentUser,
        users: currentUser.role === "admin" ? USERS : [], // Send all users only for admins
    });
});

// GET /logout - Log out user and redirect to homepage with success message
app.get("/logout", (req, res) => {
    req.session.message = "Successfully logged out.";
    req.session.destroy(err => {
        if (err) {
            console.error("Error destroying session:", err);
            return res.redirect("/landing");
        }
        res.redirect("/");
    });
});

// Handle 404 errors
app.use((req, res) => {
    res.status(404).render("404", { title: "Page Not Found" });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
