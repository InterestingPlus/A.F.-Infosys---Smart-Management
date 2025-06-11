import express from "express";
import { loginUser, registerUser } from "../controllers/authController.js";

import {
  authenticateToken,
  authorizeRoles,
} from "../middleware/auth.middleware.js";

const router = express.Router();

router.post(
  "/register",
  // authenticateToken,
  // authorizeRoles("owner"),
  registerUser
);
router.post("/login", loginUser);

export default router;
