const jwt = require("jsonwebtoken");

function auth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "dev-secret"
    );

    req.user = decoded; // attach user data
    next(); // move to next middleware/route

  } catch (err) {
    console.log("Invalid Token:", err.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}
module.exports={
  auth
}