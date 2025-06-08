import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./LeadForm.scss";

export default function LeadForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    customerName: "",
    mobileNumber: "",
    whatsappNumber: "",
    village: "",
    houseCount: "",
    pricePerHouse: "",
    inquiryFor: "",
    designation: "",
    district: "",
    taluko: "",
    referenceSource: "",
    incomingCallDate: "",
    remarks: "",
    reminderDate: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    console.log(form);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const estimatedBill = Number(form.houseCount) * Number(form.pricePerHouse);

    try {
      const res = await fetch(
        "https://a-f-infosys-smart-management.onrender.com/api/leads",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, estimatedBill }),
        }
      );

      if (res.ok) {
        alert("Lead added successfully!");
        navigate("/leads");
      } else {
        alert("Failed to add lead");
      }
    } catch (error) {
      console.error("Error submitting form", error);
    }
  };

  return (
    <div className="lead-form-page">
      <h2 className="title">
        {" "}
        1 - Customer Lead Inqiry [ C. L. I.] FORM
        <br />
        પત્રક - 1 ઇન્કવાયરી યાદી - ફોર્મ
        <br />( ટેલીકોલર ડેટા એન્ટ્રી કરશે )
      </h2>
      <form className="lead-form" onSubmit={handleSubmit}>
        <Input
          name="customerName"
          label="Customer Name"
          placeholder="Customer Name"
          value={form.customerName}
          onChange={handleChange}
          required
        />
        <Input
          name="mobileNumber"
          label="Mobile Number"
          value={form.mobileNumber}
          onChange={handleChange}
          required
        />
        <Input
          name="whatsappNumber"
          label="WhatsApp Number"
          value={form.whatsappNumber}
          onChange={handleChange}
          required
        />
        <Input
          name="district"
          label="District"
          value={form.district}
          onChange={handleChange}
          required
        />
        <Input
          name="taluko"
          label="Taluko"
          value={form.taluko}
          onChange={handleChange}
          required
        />
        <Input
          name="village"
          label="Village"
          value={form.village}
          onChange={handleChange}
          required
        />
        <Input
          name="houseCount"
          label="House Count"
          type="number"
          value={form.houseCount}
          onChange={handleChange}
          required
        />
        <Input
          name="pricePerHouse"
          label="Price per House"
          type="number"
          value={form.pricePerHouse}
          onChange={handleChange}
          required
        />
        <Input
          name="estimatedBill"
          label="Estimated Bill"
          type="number"
          value={
            Number(form.houseCount) && Number(form.pricePerHouse)
              ? Number(form.houseCount) * Number(form.pricePerHouse)
              : ""
          }
          readOnly
        />
        <Input
          name="inquiryFor"
          label="Inquiry For"
          value={form.inquiryFor}
          onChange={handleChange}
          required
        />
        <Input
          name="designation"
          label="Designation"
          value={form.designation}
          onChange={handleChange}
          required
        />
        <Input
          name="referenceSource"
          label="Reference Source"
          value={form.referenceSource}
          onChange={handleChange}
          required
        />
        <Input
          name="incomingCallDate"
          label="Incoming Call Date"
          type="date"
          value={form.incomingCallDate}
          onChange={handleChange}
          required
        />
        <Input
          name="reminderDate"
          label="Reminder Date"
          type="date"
          value={form.reminderDate}
          onChange={handleChange}
          required
        />
        <TextArea
          name="remarks"
          label="Remarks"
          value={form.remarks}
          onChange={handleChange}
          placeholder="Remarks"
        />

        <br />

        <div className="form-actions">
          <button
            type="button"
            className="cancel"
            onClick={() => navigate("/")}
          >
            Cancel
          </button>
          <button type="submit" className="submit">
            Save
          </button>
        </div>
      </form>
    </div>
  );
}

function Input({ name, label, value, onChange, type = "text", required }) {
  return (
    <div className="form-group">
      <label htmlFor={name}>{label}</label>
      <input
        id={name}
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
      />
    </div>
  );
}
function TextArea({ name, label, value, onChange, type = "text", required }) {
  return (
    <div className="form-group">
      <label htmlFor={name}>{label}</label>
      <textarea
        id={name}
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
      />
    </div>
  );
}
