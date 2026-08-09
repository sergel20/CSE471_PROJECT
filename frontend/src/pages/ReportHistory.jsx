import { useState } from "react";
import axios from "axios";

const API_URL = "http://localhost:1520/api/reports";

function ReportHistory() {
  const [phone, setPhone] = useState("");
  const [reports, setReports] = useState([]);

  const fetchReportHistory = async (e) => {
    e.preventDefault();

    try {
      const res = await axios.get(`${API_URL}/history/${phone}`);
      setReports(res.data);
    } catch (error) {
      console.log(error);
      alert("Failed to fetch report history");
    }
  };

  const downloadReport = (id) => {
    window.open(`${API_URL}/download/${id}`, "_blank");
  };

  return (
    <div style={{ padding: "30px", fontFamily: "Arial" }}>
      <h1>Report History</h1>
      <p>
        Patients can view previous diagnostic reports and download approved
        reports.
      </p>

      <form onSubmit={fetchReportHistory} style={{ marginBottom: "25px" }}>
        <input
          type="text"
          placeholder="Enter patient phone number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          style={{
            padding: "10px",
            width: "300px",
            marginRight: "10px",
          }}
        />

        <button type="submit" style={{ padding: "10px 15px" }}>
          Search Reports
        </button>
      </form>

      <h2>Previous Reports</h2>

      <table border="1" cellPadding="10" cellSpacing="0" width="100%">
        <thead>
          <tr>
            <th>Sample ID</th>
            <th>Patient Name</th>
            <th>Test Name</th>
            <th>Result</th>
            <th>Unit</th>
            <th>Reference Range</th>
            <th>Flag</th>
            <th>Status</th>
            <th>Download</th>
          </tr>
        </thead>

        <tbody>
          {reports.length === 0 ? (
            <tr>
              <td colSpan="9" align="center">
                No report history found
              </td>
            </tr>
          ) : (
            reports.map((report) => (
              <tr key={report._id}>
                <td>{report.sampleId}</td>
                <td>{report.patientName}</td>
                <td>{report.testName}</td>
                <td>{report.resultValue}</td>
                <td>{report.unit}</td>
                <td>{report.referenceRange}</td>
                <td>{report.resultFlag}</td>
                <td>{report.approvalStatus}</td>
                <td>
                  {report.approvalStatus === "Approved" ? (
                    <button onClick={() => downloadReport(report._id)}>
                      Download PDF
                    </button>
                  ) : (
                    "Not Approved"
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default ReportHistory;