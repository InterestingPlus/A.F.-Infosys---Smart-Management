import React, { useEffect, useState } from "react";
import "./LeadTable.scss";
import apiPath from "../../isProduction";

export default function LeadTable() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const res = await fetch(`${await apiPath()}/api/leads`);
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
      <h1>Report</h1>
      <h2>
        Customer Lead Inqiry [ C. L. I.] <br />
        by - A.F. Infosys
      </h2>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>1. Sr. No. ક્રમ</th>
                <th>2. Customer Full Name / નામ</th>
                <th>3. Mobile No. / મોબાઈલ નંબર</th>
                <th>4. Whatsaap No. / વોટસેઅપ નબંર</th>
                <th>5. Village / ગામ</th>
                <th>6. ઘર/ ખાતા ગામના કેટલા છે</th>
                <th>7. ભાવ ઘર/ખાતા દીઠ કહેલ</th>
                <th>8. અંદાજીત બીલ રકમ રૂI.</th>
                <th>9. કયુ કામ/વસ્તુ માટે ફોન કરેલ</th>
                <th>10. Designation હોદ્દો TCM - SARAPNACH</th>
                <th>11. Jilla / જિલ્લો</th>
                <th>12. Taluko / તાલુકો</th>
                <th>13. ગ્રાહક ક્યા રેફરન્સથી આવ્યા</th>
                <th>14. Incuming call / કોલ આવ્યા તારીખ</th>
                <th>15. Reminder Call Date / કઈ તારીખે ફોન કરવો</th>
                <th>16. Remark / રીમાર્કસ</th>
                <th>Edit</th>
                <th>Delete</th>
              </tr>
              <tr>
                <th>1. </th>
                <th>2. </th>
                <th>3. </th>
                <th>4. </th>
                <th>5. </th>
                <th>6. </th>
                <th>7. </th>
                <th>8. </th>
                <th>9. </th>
                <th>10.</th>
                <th>11.</th>
                <th>12.</th>
                <th>13.</th>
                <th>14.</th>
                <th>15.</th>
                <th>16.</th>
                <th></th>
                <th></th>
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
                    <button onClick={() => handleEdit(lead._id)}>Edit</button>
                  </td>
                  <td>
                    <button>Delete</button>
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

async function handleEdit(leadId) {
  try {
    const res = await fetch(`${await apiPath()}/api/leads/${leadId}`);
    const data = await res.json();
    console.log(data);
  } catch (err) {
    console.error("Failed to fetch leads", err);
  }
}
