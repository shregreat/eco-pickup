const express = require("express");
const dotenv = require("dotenv");
const path = require("path");
const jwt = require("jsonwebtoken");
const connectDB = require("./config/db");
const User = require("./models/user");
const Request = require("./models/request");
const bcrypt = require("bcrypt");
const {auth}=require("./auth");

dotenv.config({ path: path.join(__dirname, ".env") });

const cors = require("cors");

const app = express();
app.use(cors({
  origin: "https://waste-managmen-lpu.vercel.app/", // 👈 YOUR VERCEL URL
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));
const PORT = process.env.PORT || 5000;
let isDatabaseReady = false;
const allowedRoles = new Set(["user", "worker", "admin"]);
const normalizeRole = (role) => {
  if (!role) {
    return "user";
  }

  if (role === "customer") {
    return "user";
  }

  return String(role).toLowerCase();
};

app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "frontend")));

const requireDatabase = (req, res, next) => {
  if (!isDatabaseReady) {
    return res.status(503).json({
      msg: "Database is not configured yet. Add MONGO_URI in backend/.env to enable auth and request APIs."
    });
  }

  next();
};


// New User Registration api 
//Pending task: 1.input validation 2.verfied registration
app.post("/auth/register", requireDatabase, async (req, res) => {
  const { name, email, password } = req.body;
  const normalizedRole = normalizeRole(req.body.role);

  if (!name || !email || !password) {
    return res.status(400).json({
      msg: "All fields are required"
    });
  }

  if (!allowedRoles.has(normalizedRole)) {
    return res.status(400).json({
      msg: "Invalid role selected"
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
      password: hashedPassword,
      role: normalizedRole
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

// User Login Api
app.post("/auth/login", requireDatabase, async (req, res) => {
  const { email, password } = req.body;
  const selectedRole = normalizeRole(req.body.role);

  if (!email || !password) {
    return res.status(400).json({
      msg: "Email and password are required"
    });
  }

  try {
    const normalizedEmail = email.toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({
        msg: "Invalid email or password"
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        msg: "Invalid email or password"
      });
    }

    const userRole = normalizeRole(user.role);

    if (selectedRole && selectedRole !== userRole) {
      return res.status(403).json({
        msg: `This account is registered as ${userRole}. Please choose the correct role.`
      });
    }

    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: userRole
      },
      process.env.JWT_SECRET || "dev-secret",
      { expiresIn: "1d" }
    );

    res.status(200).json({
      msg: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: userRole,
        points: user.points
      }
    });
  } catch (error) {
    res.status(500).json({
      msg: "Server error"
    });
  }
});

// Authenticated api for inserting a new Request
app.post("/api/requests", requireDatabase, auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const {description,location,imageUrl}=req.body;
    
    const u=await User.findById(userId)
    if(!u){
      return res.status(400).json({
        "msg":"User is no longer valid"
      })
    }
    const newRequest=await Request.create({
      userId,
      description,
      location,
      imageUrl
    })
    if(newRequest){
      return res.status(200).json({
        "msg":"new request logged succesfully",
        "reqId":newRequest._id

      })
    }else{
      return res.status(400).json({
        "msg":"Please try again"
      })
    }
  }catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Authenticated api for geting the request for specific user
app.get("/api/requests/my", requireDatabase, auth, async (req,res)=>{
  try {
    const userId = req.user.id;
    console.log(userId)
    const allRequests=await Request.find({userId})
    console.log(allRequests)
    if(!allRequests){
      return res.status(400).json({
        "msg":"No requests"
      })
    }
    res.status(200).json({
      "msg":"Here is your all requests",
      allRequests
    })
  }catch (err) {
    res.status(500).json({ message: "Server error" });
  }
})

// Authenticated api for Admin to fetch all request 
app.get("/api/requests", requireDatabase, auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        msg: "Admins only"
      });
    }

    const allRequests = await Request.find().sort({ createdAt: -1 });

    res.status(200).json({
      msg: "All requests fetched",
      allRequests
    });

  } catch (e) {
    console.log(e.message);
    res.status(500).json({
      msg: "Server error"
    });
  }
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "frontend", "index.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "frontend", "login.html"));
});

app.get("/login/:role", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "frontend", "login.html"));
});

app.get("/register", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "frontend", "login.html"));
});

app.get("/register/:role", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "frontend", "login.html"));
});

const startServer = async () => {
  isDatabaseReady = await connectDB();

  app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);

    if (!isDatabaseReady) {
      console.log("Running in frontend-only mode until MongoDB is configured.");
    }
  });
};

startServer();
