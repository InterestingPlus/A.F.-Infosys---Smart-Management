import mongoose from "mongoose";

const inquirySchema = new mongoose.Schema(
  {
    srNo: Number,
    customerName: { type: String, required: true },
    mobileNumber: { type: String, required: true },
    whatsappNumber: { type: String },
    village: String,
    houseCount: Number, // ઘર/ખાતા કેટલા છે
    pricePerHouse: Number, // ભાવ per house
    estimatedBill: Number,
    inquiryFor: String, // phone for what service
    designation: String, // TCM, Sarpanch, etc.
    district: String,
    taluko: String,
    referenceSource: String, // from where customer came
    incomingCallDate: Date,
    remarks: String,
    reminderDate: Date,
  },
  {
    timestamps: true,
  }
);

export const Inquiry = mongoose.model("Inquiry", inquirySchema);
