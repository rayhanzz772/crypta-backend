const express = require("express");
const cors = require("cors");
const http = require("http");
const route = require("./src/routes.js");
const authRoutes = require("./src/modules/auth");

const app = express();

app.use(cors());

app.use(express.json());

app.use("/auth", authRoutes);

app.use("/api", route);

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
});

module.exports = app;
