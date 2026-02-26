import React, { useEffect, useState } from "react";
import { XMarkIcon, PrinterIcon, DocumentArrowDownIcon, DocumentTextIcon, DocumentIcon } from "@heroicons/react/24/solid";
import { toast } from 'react-toastify';
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { saveAs } from "file-saver";
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, PageOrientation } from "docx";

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
  const [showDownloadOptions, setShowDownloadOptions] = useState(false);

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
    const printContent = document.querySelector(".sf2-form");
    
    // Create print preview window
    const printWindow = window.open("", "_blank", "width=800,height=600,scrollbars=yes");
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>SF2 Attendance Report</title>
          <style>
            body { margin: 0; padding: 20px; font-family: Arial, sans-serif; background: white; }
            .sf2-form { width: 100%; max-width: 100%; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #000; padding: 2px; font-size: 10px; }
            th { background-color: #f3f4f6; font-weight: bold; }
            .text-center { text-align: center; }
            .text-sm { font-size: 12px; }
            .text-xs { font-size: 10px; }
            .font-semibold { font-weight: 600; }
            .font-bold { font-weight: bold; }
            .grid { display: grid; }
            .grid-cols-2 { grid-template-columns: repeat(2, 1fr); gap: 1rem; }
            .border-t { border-top: 1px solid #000; padding-top: 4px; }
            @media print { body { margin: 0; padding: 10px; }
            .no-print { display: none; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    
    // Show print dialog
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  const handleDownload = (format) => {
    const formElement = document.querySelector(".sf2-form");
    const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleDateString("en-US", { month: "long" });
    const monthYear = `${monthName}_${selectedYear}`;
    
    if (format === 'pdf') {
      downloadAsPDF(formElement, monthYear);
    } else if (format === 'docx') {
      downloadAsDOCX(formElement, monthYear);
    }
    
    setShowDownloadOptions(false);
  };

const downloadAsPDF = async (element, filename = "February") => {
  if (!element) {
    toast.error("Attendance form element not found.");
    return;
  }

  try {
    toast.info('Starting PDF generation...');

    let cleanHTML = element.innerHTML
      .replace(/class="[^"]*"/g, '')
      .replace(/style="[^"]*"/g, '')
      .replace(/id="[^"]*"/g, '')
      .replace(/<link[^>]*>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/data-\w+="[^"]*"/g, '');

    const wrapperHTML = `
      <div style="
        width: 1400px;
        min-height: 980px;
        background: white;
        color: black;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 9pt;
        line-height: 1.3;
        padding: 15px 20px;
        box-sizing: border-box;
        margin: 0;
        letter-spacing: 0;
      ">
        ${cleanHTML}
      </div>
    `;

    const container = document.createElement('div');
    container.innerHTML = wrapperHTML;
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    document.body.appendChild(container);

    await new Promise(resolve => setTimeout(resolve, 800)); // longer wait for table layout

    const canvas = await html2canvas(container.firstElementChild, {
      scale: 2.2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      allowTaint: false,
      windowWidth: 1400,
      windowHeight: 1050,
      scrollX: 0,
      scrollY: 0,
      onclone: (clonedDoc) => {

  // Remove all classes
  clonedDoc.querySelectorAll('*').forEach(el => {
    el.removeAttribute('class');
    el.removeAttribute('id');
  });

  // Base page styling
  clonedDoc.body.style.fontFamily = "Arial, Helvetica, sans-serif";
  clonedDoc.body.style.color = "#000";
  clonedDoc.body.style.background = "#fff";

  // HEADER CENTER ALIGN
  const centerBlocks = clonedDoc.querySelectorAll("h1, h2, p");
  centerBlocks.forEach(el => {
    if (el.textContent.includes("Department of Education") ||
        el.textContent.includes("Republic of the Philippines") ||
        el.textContent.includes("DAILY ATTENDANCE REPORT") ||
        el.textContent.includes("SF2")) {
      el.style.textAlign = "center";
    }
  });

  // TABLE FIX
  clonedDoc.querySelectorAll('table').forEach(table => {
    table.style.borderCollapse = 'collapse';
    table.style.width = '100%';
    table.style.tableLayout = 'fixed';
  });

  // HEADER CELLS
  clonedDoc.querySelectorAll('th').forEach(th => {
    th.style.border = '1px solid #000';
    th.style.fontSize = '7pt';
    th.style.fontWeight = 'bold';
    th.style.textAlign = 'center';
    th.style.verticalAlign = 'middle';
    th.style.padding = '2px';
    th.style.whiteSpace = 'nowrap';
    th.style.boxSizing = 'border-box';
  });

  // BODY CELLS
  clonedDoc.querySelectorAll('td').forEach(td => {
    td.style.border = '1px solid #000';
    td.style.fontSize = '8pt';
    td.style.textAlign = 'center';
    td.style.verticalAlign = 'middle';
    td.style.padding = '2px';
    td.style.boxSizing = 'border-box';
  });

  // LEARNER NAME COLUMN LEFT ALIGN
  clonedDoc.querySelectorAll('td:nth-child(2)').forEach(td => {
    td.style.textAlign = 'left';
    td.style.paddingLeft = '5px';
  });

  // DAY NUMBER HEADERS SMALLER
  clonedDoc.querySelectorAll('th').forEach(th => {
    if (/^\d+$/.test(th.textContent.trim())) {
      th.style.fontSize = '6pt';
      th.style.padding = '1px';
      th.style.width = '25px';
    }
  });

}
    });

    document.body.removeChild(container);

    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = pdf.internal.pageSize.getWidth();  // 297
    const pageHeight = pdf.internal.pageSize.getHeight(); // 210

    const margin = 5;
    const maxW = pageWidth - margin * 2;
    const maxH = pageHeight - margin * 2;

    const srcW = canvas.width;
    const srcH = canvas.height;
    const ratio = srcH / srcW;

    let outW = maxW;
    let outH = outW * ratio;

    let yPos = 0;
    let page = 1;

    while (yPos < srcH) {
      if (page > 1) pdf.addPage();

      const sliceSrcH = Math.min(maxH / ratio, srcH - yPos);

      pdf.addImage(
        canvas,
        'PNG',
        margin,
        margin,
        outW,
        outH,
        undefined,
        'FAST',
        0,
        (yPos / srcH) * outH
      );

      yPos += sliceSrcH;
      page++;
    }

    pdf.save(`SF2_${filename}_Attendance_${new Date().toISOString().slice(0,10)}.pdf`);
    toast.success('SF2 PDF downloaded successfully!');

} catch (err) {
  toast.error('PDF generation failed: ' + err.message);
}
};

  const downloadAsDOCX = async (element, filename) => {
    try {
      const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleDateString("en-US", { month: "long" });
      const daysInMonth = getDaysInMonth(selectedMonth, selectedYear);
      
      // Create document sections
      const children = [];
      
      // Header
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: "Department of Education", bold: true, size: 20 }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Republic of the Philippines", size: 20 }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "DAILY ATTENDANCE REPORT", bold: true, size: 24 }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "SF2", size: 20 }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 }
        })
      );
      
      // School info
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: "School ID: ___________________", size: 20 }),
          ],
          spacing: { after: 100 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: `School Name: ${schoolName}`, size: 20 }),
          ],
          spacing: { after: 100 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Grade Level: ___________________", size: 20 }),
          ],
          spacing: { after: 100 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: `School Year: ${selectedYear}`, size: 20 }),
          ],
          spacing: { after: 100 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Grade Level: ___________________", size: 20 }),
          ],
          spacing: { after: 100 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: `Month: ${monthName}`, size: 20 }),
          ],
          spacing: { after: 100 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: `Section: ${selectedSection || "___________________"}`, size: 20 }),
          ],
          spacing: { after: 400 }
        })
      );
      
      // Table headers
      const tableHeaders = [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "No.", bold: true, size: 18 })], alignment: AlignmentType.CENTER })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "LEARNER'S NAME\n(Last Name, First Name, Middle Name)", bold: true, size: 18 })], alignment: AlignmentType.CENTER })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "LRN", bold: true, size: 18 })], alignment: AlignmentType.CENTER })] }),
        ...Array.from({ length: daysInMonth }, (_, i) => 
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(i + 1), bold: true, size: 16 })], alignment: AlignmentType.CENTER })], width: { size: 800, type: WidthType.DXA } })
        ),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Flan", bold: true, size: 18 })], alignment: AlignmentType.CENTER })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Total", bold: true, size: 18 })], alignment: AlignmentType.CENTER })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "ML", bold: true, size: 18 })], alignment: AlignmentType.CENTER })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Tardy", bold: true, size: 18 })], alignment: AlignmentType.CENTER })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Absent", bold: true, size: 18 })], alignment: AlignmentType.CENTER })] }),
      ];
      
      // Table rows
      const tableRows = [new TableRow({ children: tableHeaders })];
      
      formattedData.slice(0, 30).forEach((student, idx) => {
        const rowCells = [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(idx + 1), size: 18 })], alignment: AlignmentType.CENTER })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${student.lastName}, ${student.firstName} ${student.middleName || ""}`, size: 18 })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: student.lrn || "___________", size: 18 })], alignment: AlignmentType.CENTER })] }),
          ...Array.from({ length: daysInMonth }, () => 
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: getAttendanceStatus(`${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-${(idx + 1).toString().padStart(2, '0')}`), size: 18 })], alignment: AlignmentType.CENTER })], width: { size: 800, type: WidthType.DXA } })
          ),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "___", size: 18 })], alignment: AlignmentType.CENTER })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "___", size: 18 })], alignment: AlignmentType.CENTER })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "___", size: 18 })], alignment: AlignmentType.CENTER })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "___", size: 18 })], alignment: AlignmentType.CENTER })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "___", size: 18 })], alignment: AlignmentType.CENTER })] }),
        ];
        tableRows.push(new TableRow({ children: rowCells }));
      });
      
      // Add table
      children.push(
        new Table({
          rows: tableRows,
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: "single", size: 1 },
            bottom: { style: "single", size: 1 },
            left: { style: "single", size: 1 },
            right: { style: "single", size: 1 },
            insideHorizontal: { style: "single", size: 1 },
            insideVertical: { style: "single", size: 1 },
          },
        })
      );
      
      // Totals and signatures
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: "Total for the Month:", bold: true, size: 20 }),
          ],
          spacing: { before: 400, after: 200 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "_____Present  _____Absent  _____ML  _____Tardy", size: 20 }),
          ],
          spacing: { after: 400 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Prepared by:", size: 20 }),
          ],
          spacing: { after: 100 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "_____________________________", size: 20 }),
          ],
          spacing: { after: 100 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Signature over Printed Name", size: 16 }),
          ],
          spacing: { after: 400 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Certified Correct:", size: 20 }),
          ],
          spacing: { after: 100 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "_____________________________", size: 20 }),
          ],
          spacing: { after: 100 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Signature over Printed Name", size: 16 }),
          ],
          spacing: { after: 400 }
        })
      );
      
      // Create document
      const doc = new Document({
        sections: [{
          properties: {
            page: {
              size: {
                orientation: PageOrientation.LANDSCAPE,
                // A4 size in landscape: 297mm x 210mm
                width: 11906, // 297mm in twips
                height: 8391,  // 210mm in twips
                margin: {
                  top: 1440,    // 1 inch in twips
                  right: 1440,
                  bottom: 1440,
                  left: 1440,
                },
              },
            },
          },
          children: children,
        }],
      });
      
      // Generate and save DOCX
      const blob = await Packer.toBlob(doc);
      saveAs(blob, `SF2_Attendance_${filename}.docx`);
      
    } catch (error) {
      console.error('Error generating DOCX:', error);
      toast.error('Error generating Word document: ' + error.message + '. Please try again.');
    }
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 overflow-y-auto hide-scrollbar">
      <div className="flex justify-center items-start p-4 min-h-screen">
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
              <div className="relative">
                <button
                  onClick={() => setShowDownloadOptions(!showDownloadOptions)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <DocumentArrowDownIcon className="w-5 h-5" />
                  Download
                </button>
                
                {showDownloadOptions && (
                  <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                    <button
                      onClick={() => handleDownload('pdf')}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors flex items-center gap-2"
                    >
                      <DocumentTextIcon className="w-4 h-4 text-red-600" />
                      Download as PDF
                    </button>
                    <button
                      onClick={() => handleDownload('docx')}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors flex items-center gap-2"
                    >
                      <DocumentIcon className="w-4 h-4 text-blue-600" />
                      Download as DOCX
                    </button>
                  </div>
                )}
              </div>
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
          /* Hide buttons and controls in print */
          .fixed > div > div:first-child {
            display: none !important;
          }
          .fixed {
            position: static !important;
            background: none !important;
          }
        }
      `}</style>
    </div>
  );
}