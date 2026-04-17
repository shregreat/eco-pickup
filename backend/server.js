const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const User = require("./models/User");
const Request = require("./models/Request");
const bcrypt=require("bcrypt")
dotenv.config();
connectDB();
const app = express();
app.use(express.json());


// register api
app.post("/auth/register", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      msg: "All fields are required"
    });
  }

  try {
    const normalizedEmail = email.toLowerCase();

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({
        msg: "Email is already registered"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      name,
      email: normalizedEmail,
      password: hashedPassword
    });

    res.status(201).json({
      msg: "User created successfully",
      id: newUser._id
    });

  } catch (e) {
    res.status(500).json({
      msg: "Server error"
    });
  }
});


app.listen(5000, () => {
  console.log("Server started on port 5000");
});


app.post("/auth/login",(req,res)=>{})

app.post("/api/requests",(req,res)=>{})
app.get("/api/requests/my",(req,res)=>{})
app.get("/api/requests/:id",(req,res)=>{})