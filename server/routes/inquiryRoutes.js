import express from "express";
import {
  createInquiry,
  getAllInquiries,
  getInquiry,
  editInquiry,
  deleteInquiry,
} from "../controllers/inquiryController.js";

const router = express.Router();

router.post("/", createInquiry);
router.get("/", getAllInquiries);

router.get("/lead/:id", getInquiry);
router.put("/edit/:id", editInquiry);
router.delete("/delete/:id", deleteInquiry);

export default router;
