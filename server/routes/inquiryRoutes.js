import express from "express";
import {
  createInquiry,
  getAllInquiries,
  getInquiry,
  editInquiry,
} from "../controllers/inquiryController.js";

const router = express.Router();

router.post("/", createInquiry);
router.get("/", getAllInquiries);

router.get("/:inquiryId", getInquiry);
// router.post("/edit", editInquiry);

export default router;
