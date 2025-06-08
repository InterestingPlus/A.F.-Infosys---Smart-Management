import React, { useEffect, useState } from "react";
import "./LeadTable.scss";

export default function LeadTable() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const res = await fetch("http://localhost:4000/api/leads");
        const data = await res.json();
        setLeads(data);
        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch leads", err);
        setLoading(false);
      }
    };

    fetchLeads();
  }, []);

  return (
    <div className="lead-table-page">
      <h2>Customer Lead Inqiry [ C. L. I.]</h2>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Sr. No.</th>
                <th>Customer Name</th>
                <th>Mobile</th>
                <th>WhatsApp</th>
                <th>Village</th>
                <th>House Count</th>
                <th>Price/House</th>
                <th>Estimated Bill</th>
                <th>Inquiry For</th>
                <th>Designation</th>
                <th>District</th>
                <th>Taluko</th>
                <th>Reference</th>
                <th>Call Date</th>
                <th>Reminder</th>
                <th>Remarks</th>
                <th>Edit</th>
              </tr>
            </thead>
            <tbody>
              {[...leads].reverse().map((lead, idx) => (
                <tr key={lead._id}>
                  <td>{idx + 1}</td>
                  <td>{lead.customerName}</td>
                  <td>{lead.mobileNumber}</td>
                  <td>{lead.whatsappNumber}</td>
                  <td>{lead.village}</td>
                  <td>{lead.houseCount}</td>
                  <td>{lead.pricePerHouse}</td>
                  <td>₹{lead.estimatedBill}</td>
                  <td>{lead.inquiryFor}</td>
                  <td>{lead.designation}</td>
                  <td>{lead.district}</td>
                  <td>{lead.taluko}</td>
                  <td>{lead.referenceSource}</td>
                  <td>
                    {new Date(lead.incomingCallDate).toLocaleDateString()}
                  </td>
                  <td>{new Date(lead.reminderDate).toLocaleDateString()}</td>
                  <td>{lead.remarks}</td>
                  <td>
                    <button>Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
