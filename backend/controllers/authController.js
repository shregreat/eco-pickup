const User = require("../models/user");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { sendVerificationEmail } = require("../utils/emailService");

const normalizeRole = (role) => {
  if (!role) return "user";
  if (role === "customer") return "user";
  return String(role).toLowerCase();
};

const register = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ msg: "All fields are required" });
  }

  try {
    const normalizedEmail = email.toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({ msg: "Email is already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const newUser = await User.create({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      role: "user",
      isVerified: false,
      verificationToken,
      verificationTokenExpiry,
    });

    try {
      await sendVerificationEmail(newUser.email, verificationToken);
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError);
      // We still return 201, but maybe warn the user
    }

    res.status(201).json({
      msg: "User created successfully. Please check your email to verify your account.",
      id: newUser._id
    });

  } catch (e) {
    console.error("Register Error:", e);
    res.status(500).json({ msg: "Server error" });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;
  const selectedRole = normalizeRole(req.body.role);

  if (!email || !password) {
    return res.status(400).json({ msg: "Email and password are required" });
  }

  try {
    const normalizedEmail = email.toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({ msg: "Invalid email or password" });
    }

    if (!user.isVerified) {
      return res.status(403).json({ msg: "Please verify your email before logging in" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ msg: "Invalid email or password" });
    }

    const userRole = normalizeRole(user.role);

    if (selectedRole && selectedRole !== userRole) {
      return res.status(403).json({
        msg: `This account is registered as ${userRole}. Please choose the correct role.`
      });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, role: userRole },
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
    console.error("Login Error:", error);
    res.status(500).json({ msg: "Server error" });
  }
};

const verifyEmail = async (req, res) => {
  const { token } = req.params;

  try {
    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpiry: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ msg: "Invalid or expired verification token" });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpiry = undefined;
    await user.save();

    res.status(200).json({ msg: "Email verified successfully. You can now log in." });
  } catch (error) {
    console.error("Verify Error:", error);
    res.status(500).json({ msg: "Server error" });
  }
};

const resendVerification = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ msg: "Email is required" });
  }

  try {
    const normalizedEmail = email.toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    if (user.isVerified) {
      return res.status(400).json({ msg: "User is already verified" });
    }

    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    user.verificationToken = verificationToken;
    user.verificationTokenExpiry = verificationTokenExpiry;
    await user.save();

    await sendVerificationEmail(user.email, verificationToken);

    res.status(200).json({ msg: "Verification email sent successfully" });
  } catch (error) {
    console.error("Resend Verification Error:", error);
    res.status(500).json({ msg: "Server error" });
  }
};

module.exports = { register, login, verifyEmail, resendVerification };
