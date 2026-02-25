require("dotenv").config();
const express = require("express");
const cors = require("cors");
const db = require("./config/db");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/hotel", require("./routes/hotelRoutes"));
app.use("/api/restaurant", require("./routes/restaurantRoutes"));
app.use("/api/accounts", require("./routes/accountsRoutes"));
app.use("/api/banquet", require("./routes/banquetRoutes"));
app.use("/api/attendance", require("./routes/attendanceRoutes"));
app.use("/api/reports", require("./routes/reportsRoutes"));

app.get("/", (req, res) => {
  res.send("Backend Running 🚀");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});