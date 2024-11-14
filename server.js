import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = 3000;

app.use(express.json());

const db = new pg.Client({
    host: process.env.HOST,
    user: process.env.USER,
    database: process.env.DATABASE_NAME,
    password: process.env.PASSWORD,
    port: process.env.PORT
});

db.connect();

let items;

app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static("public"));

app.get("/", async (req, res) => {
    res.render("index.ejs")
});

app.post("/login", async (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    const result = await db.query("SELECT * FROM user_account");
    const accounts = result.rows;

    let userAuthenticated = false;
    let passwordIncorrect = false;

    for (const account of accounts) {
        if (username === account.username) {
            if (password === account.password) {
                userAuthenticated = true;
                break;
            } else {
                passwordIncorrect = true;
                break;
            }

        }
    }

    if (userAuthenticated) {
        res.render("task.ejs", { items: accounts });
    } else if (passwordIncorrect) {
        res.status(401).json("Incorrect password");
    } else {
        res.status(404).json("User not found");
    }
});

app.post("/register", async (req, res) => {
    const { username, password, passwordrepeated } = req.body;

    if (password != passwordrepeated) {
        return res.status(400).json("Password do not match");
    };

    if (!username) {
        return res.status(400).json("Username cannot be empty")
    }

    const result = await db.query("SELECT * FROM user_account WHERE username = $1", [username]);
    if (result.rows > 0) {
        return res.status(400).json("User already exist")
    }

    await db.query("INSERT INTO user_account (username, password) VALUES ($1, $2)", [username, password]);

    res.status(201).json("User registered successfully");
});

app.get("/", async (req, res) => {
    const result = await db.query("SELECT * FROM content");
    items = result.rows

    res.render("task.ejs", {
        items: items
    })
});

app.post("/add", async (req, res) => {
    const content = req.body.content;
    const result = await db.query("INSERT INTO content (content) VALUES ($1) RETURNING *", [content]);
    res.json({ content: result.rows[0].content })

});

app.patch("/edit/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const userEdit = req.body.content;


    if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
    }

    if (!userEdit || userEdit.trim() === "") {
        return res.status(400).json({ message: "Content cannot be empty" });
    }

    try {
        const result = await db.query("UPDATE content SET content = $1 WHERE id = $2", [userEdit, id]);

        if (result.rowCount > 0) {
            res.status(200).json({ message: "Item updated successfully" });
        } else {
            res.status(404).json({ message: "Item not found" });
        }
    } catch (error) {
        console.error("Database update error:", error);
        res.status(500).json({ message: "An error occurred while updating the item" });
    }
});



app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});