const express = require("express");
const cors = require("cors");
const http = require("http");
const privateRoute = require("./src/routes/private/routes.js");
const authRoutes = require("./src/modules/auth");
const publicRoutes = require("./src/routes/public/route.js");

const app = express();

app.use(cors());

app.use(express.json());

app.use("/public-api", publicRoutes);

app.use("/auth", authRoutes);

app.use("/api", privateRoute);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    data: null,
  });
});

const port = process.env.PORT || 5000;
const server = http.createServer(app);

server.listen(port, () => {
  console.log(`⚡ Server running on PORT: ${port}`);
  console.log(`📚 Documentation: http://localhost:${port}/public/docs`);
  console.log(`❤️  Health Check: http://localhost:${port}/public/health`);
});

module.exports = app;
