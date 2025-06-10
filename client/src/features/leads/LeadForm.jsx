import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./LeadForm.scss";
import apiPath from "../../isProduction";

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
      const res = await fetch(`${await apiPath()}/api/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, estimatedBill }),
      });

      if (res.ok) {
        alert("Lead added successfully!");
        navigate("/leads/report");
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
        1 - Form (C.L.I.) Customer Lead Inqiry
        <br />
        પત્રક - 1 ઇન્કવાયરી યાદી - ફોર્મ
        <br />( ટેલીકોલર ડેટા એન્ટ્રી કરશે )
      </h2>
      <form className="lead-form" onSubmit={handleSubmit}>
        <Input
          name="customerName"
          label="1 Customer Full Name / નામ"
          placeholder="Customer Name"
          value={form.customerName}
          onChange={handleChange}
          required
        />
        <Input
          name="mobileNumber"
          label="2 Mobile No. / મોબાઈલ નંબર"
          placeholder="Mobile Number"
          value={form.mobileNumber}
          onChange={handleChange}
          required
        />
        <Input
          name="whatsappNumber"
          label="3 Whatsaap No. / વોટસેઅપ નબંર"
          placeholder="WhatsApp Number"
          value={form.whatsappNumber}
          onChange={handleChange}
          required
        />
        <Input
          name="district"
          label="4 Jilla / જિલ્લો"
          placeholder="District"
          value={form.district}
          onChange={handleChange}
          required
        />
        <Input
          name="taluko"
          label="5 Taluko / તાલુકો"
          placeholder="Taluko"
          value={form.taluko}
          onChange={handleChange}
          required
        />
        <Input
          name="village"
          label="6 Village / ગામ"
          placeholder="Village"
          value={form.village}
          onChange={handleChange}
          required
        />
        <Input
          name="houseCount"
          label="7 ઘર/ ખાતા ગામના કેટલા છે"
          placeholder="House Count"
          type="number"
          value={form.houseCount}
          onChange={handleChange}
          minValue={1}
          maxValue={10000}
          required
        />
        <Input
          name="pricePerHouse"
          label="8 ભાવ ઘર/ખાતા દીઠ કહેલ"
          placeholder="Price per House"
          type="number"
          value={form.pricePerHouse}
          onChange={handleChange}
          minValue={1}
          maxValue={500}
          required
        />
        <Input
          name="estimatedBill"
          label="9 અંદાજીત બીલ રકમ રૂI."
          placeholder="Estimated Bill"
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
          label="10 કયુ કામ/વસ્તુ માટે ફોન કરેલ"
          placeholder="Inquiry For"
          value={form.inquiryFor}
          onChange={handleChange}
          required
        />
        <Select
          name="designation"
          label="11 Designation / હોદ્દો"
          value={form.designation}
          onChange={handleChange}
          required
        />
        <Input
          name="referenceSource"
          label="12 ગ્રાહક ક્યા રેફરન્સથી આવ્યા"
          placeholder="Reference Source"
          value={form.referenceSource}
          onChange={handleChange}
          required
        />
        <Input
          name="incomingCallDate"
          label="13 Incuming call / કોલ આવ્યા તારીખ"
          placeholder="Incoming Call Date"
          type="date"
          value={form.incomingCallDate}
          onChange={handleChange}
          required
        />
        <Input
          name="reminderDate"
          label="14 Reminder Call Date / કઈ તારીખે ફોન કરવો"
          placeholder="Reminder Date"
          type="date"
          value={form.reminderDate}
          onChange={handleChange}
          required
        />
        <TextArea
          name="remarks"
          label="15 Remark / રીમાર્કસ"
          placeholder="Remarks"
          value={form.remarks}
          onChange={handleChange}
          required
        />

        <br />

        <div className="form-actions">
          <button
            type="button"
            className="cancel"
            onClick={() => navigate("/leads/report")}
          >
            Cancel
          </button>
          <button type="submit" className="submit">
            Add
          </button>
        </div>
      </form>
    </div>
  );
}

function Input({
  name,
  label,
  value,
  onChange,
  type = "text",
  required,
  placeholder,

  minValue,
  maxValue,
}) {
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
        placeholder={placeholder}
        {...(minValue !== undefined ? { min: minValue } : {})}
        {...(maxValue !== undefined ? { max: maxValue } : {})}
      />
    </div>
  );
}

function Select({ name, label, value, onChange, required }) {
  return (
    <div className="form-group">
      <label htmlFor={name}>{label}</label>
      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
      >
        <option value="TCM">TCM / તલાટી કમ મંત્રી</option>
        <option value="Sarpanch">Sarpanch / સરપંચ</option>
      </select>
    </div>
  );
}
function TextArea({
  name,
  label,
  value,
  onChange,
  type = "text",
  required,
  placeholder,
}) {
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
        placeholder={placeholder}
      />
    </div>
  );
}
