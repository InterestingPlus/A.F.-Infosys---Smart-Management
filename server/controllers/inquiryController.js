import { Inquiry } from "../models/Inquiry.js";

export const createInquiry = async (req, res) => {
  try {
    const newInquiry = new Inquiry(req.body);
    const saved = await newInquiry.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ message: "Error saving inquiry", error: err });
  }
};

export const getAllInquiries = async (req, res) => {
  try {
    const inquiries = await Inquiry.find().sort({ createdAt: -1 });
    res.json(inquiries);
  } catch (err) {
    res.status(500).json({ message: "Error fetching inquiries", error: err });
  }
};

export const getInquiry = async (req, res) => {
  try {
    const inquiryId = req.params.id;
    console.log(inquiryId);
    const inquiry = await Inquiry.findById(inquiryId);

    res.json(inquiry);
  } catch (err) {
    res.status(500).json({ message: "Error fetching inquiries", error: err });
  }
};

export const editInquiry = async (req, res) => {
  try {
    const updatedInquiry = await Inquiry.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updatedInquiry)
      return res.status(404).json({ message: "Inquiry not found" });
    res.status(200).json(updatedInquiry);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

export const deleteInquiry = async (req, res) => {
  try {
    const result = await Inquiry.findByIdAndDelete(req.params.id);
    if (!result) return res.status(404).json({ message: "Inquiry not found" });
    res.status(200).json({ message: "Inquiry deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};
