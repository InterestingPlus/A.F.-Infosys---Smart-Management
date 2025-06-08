import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { connectDB } from "./config/db.js";

import userRoutes from "./routes/userRoutes.js";
import inquiryRoutes from "./routes/inquiryRoutes.js";

import job from "./cron";

dotenv.config();

const app = express();

job.start();

// Middleware
app.use(cors());
app.use(express.json());

// DB Connection
connectDB();

// Routes
app.use("/api/users", userRoutes);
app.use("/api/leads", inquiryRoutes);

// Server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
