import React, { useEffect, useState } from "react";
import { XMarkIcon, PrinterIcon, DocumentArrowDownIcon } from "@heroicons/react/24/solid";

export default function SF2AttendanceForm({ 
  isOpen, 
  onClose, 
  attendanceData, 
  students, 
  selectedMonth, 
  selectedYear,
  selectedSection,
  schoolName = "WMSU ILS - Elementary Department"
}) {
  const [formattedData, setFormattedData] = useState([]);

  useEffect(() => {
    if (attendanceData && students) {
      // Format data for SF2 form
      const formatted = students.map(student => {
        const studentAttendance = attendanceData.filter(
          a => a.studentId === student.id || a.studentLRN === student.lrn
        );
        
        return {
          ...student,
          attendanceRecords: studentAttendance
        };
      });
      setFormattedData(formatted);
    }
  }, [attendanceData, students]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Generate PDF using print functionality
    const printWindow = window.open("", "", "height=800,width=1000");
    printWindow.document.write(document.querySelector(".sf2-form").innerHTML);
    printWindow.document.close();
    
    // Use setTimeout to ensure content is loaded before printing
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const getAttendanceStatus = (date) => {
    // This should be customized based on your actual attendance data structure
    // For now returning empty - will be populated based on actual data
    return "";
  };

  const getDaysInMonth = (month, year) => {
    return new Date(year, month, 0).getDate();
  };

  const daysInMonth = getDaysInMonth(selectedMonth, selectedYear);
  const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleDateString("en-US", { month: "long" });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto">
      <div className="flexjustify-center items-start p-4 min-h-screen">
        <div className="bg-white rounded-lg shadow-lg w-full max-w-6xl mt-4">
          {/* Header Controls */}
          <div className="flex justify-between items-center p-6 border-b">
            <h2 className="text-2xl font-bold">SF2 Daily Attendance Report</h2>
            <div className="flex gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <PrinterIcon className="w-5 h-5" />
                Print
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <DocumentArrowDownIcon className="w-5 h-5" />
                Download
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-6 h-6 text-gray-600" />
              </button>
            </div>
          </div>

          {/* SF2 Form */}
          <div className="sf2-form p-8 bg-white">
            {/* DepED Header */}
            <div className="text-center mb-2">
              <p className="text-xs font-semibold">Department of Education</p>
              <p className="text-xs">Republic of the Philippines</p>
            </div>

            {/* Form Title */}
            <div className="text-center mb-4">
              <h1 className="text-lg font-bold">DAILY ATTENDANCE REPORT</h1>
              <p className="text-xs">SF2</p>
            </div>

            {/* Form Header Info */}
            <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
              <div>
                <p><span className="font-semibold">School ID:</span> ___________________</p>
                <p><span className="font-semibold">School Name:</span> {schoolName}</p>
                <p><span className="font-semibold">Grade Level:</span> ___________________</p>
              </div>
              <div>
                <p><span className="font-semibold">School Year:</span> {selectedYear}</p>
                <p><span className="font-semibold">Grade Level:</span> ___________________</p>
                <p><span className="font-semibold">Month:</span> {monthName}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
              <div>
                <p><span className="font-semibold">Section:</span> {selectedSection || "___________________"}</p>
              </div>
            </div>

            {/* Attendance Table */}
            <div className="overflow-x-auto mb-6">
              <table className="w-full border-collapse border border-gray-800 text-xs">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-800 p-2 text-center font-semibold">No.</th>
                    <th className="border border-gray-800 p-2 text-center font-semibold">LEARNER'S NAME<br/>(Last Name, First Name, Middle Name)</th>
                    <th className="border border-gray-800 p-2 text-center font-semibold">LRN</th>
                    {/* Day columns */}
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
                      <th key={day} className="border border-gray-800 p-1 text-center font-semibold" style={{ width: "25px" }}>
                        {day}
                      </th>
                    ))}
                    <th className="border border-gray-800 p-2 text-center font-semibold">Flan</th>
                    <th className="border border-gray-800 p-2 text-center font-semibold">Total</th>
                    <th className="border border-gray-800 p-2 text-center font-semibold">ML</th>
                    <th className="border border-gray-800 p-2 text-center font-semibold">Tardy</th>
                    <th className="border border-gray-800 p-2 text-center font-semibold">Absent</th>
                  </tr>
                </thead>
                <tbody>
                  {formattedData.slice(0, 30).map((student, idx) => (
                    <tr key={idx}>
                      <td className="border border-gray-800 p-2 text-center">{idx + 1}</td>
                      <td className="border border-gray-800 p-2">
                        {student.lastName}, {student.firstName} {student.middleName || ""}
                      </td>
                      <td className="border border-gray-800 p-2 text-center text-xs">
                        {student.lrn || "___________"}
                      </td>
                      {/* Attendance cells for each day */}
                      {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
                        <td key={`${idx}-${day}`} className="border border-gray-800 p-1 text-center">
                          {/* Leave blank for manual entry or add logic here */}
                        </td>
                      ))}
                      <td className="border border-gray-800 p-2 text-center">___</td>
                      <td className="border border-gray-800 p-2 text-center">___</td>
                      <td className="border border-gray-800 p-2 text-center">___</td>
                      <td className="border border-gray-800 p-2 text-center">___</td>
                      <td className="border border-gray-800 p-2 text-center">___</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals Section */}
            <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
              <div>
                <p className="font-semibold mb-2">Total for the Month:</p>
                <p>_____Present  _____Absent  _____ML  _____Tardy</p>
              </div>
            </div>

            {/* Signature Section */}
            <div className="grid grid-cols-2 gap-8 text-sm">
              <div>
                <p className="border-t border-gray-800 pt-1">Prepared by:</p>
                <p className="text-xs text-center">Signature over Printed Name</p>
              </div>
              <div>
                <p className="border-t border-gray-800 pt-1">Certified Correct:</p>
                <p className="text-xs text-center">Signature over Printed Name</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 text-sm mt-4">
              <div>
                <p>Date: _______________</p>
              </div>
              <div>
                <p>Date: _______________</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
          .sf2-form {
            width: 100%;
            max-width: 100%;
            margin: 0;
            padding: 20px;
            background: white;
          }
          .sf2-form * {
            margin: 0;
            padding: 0;
          }
        }
      `}</style>
    </div>
  );
}
