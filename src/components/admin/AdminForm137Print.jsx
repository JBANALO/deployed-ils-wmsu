import React from 'react';

const normalizeSubjectName = (value) => String(value || '')
  .replace(/\s*\(Grade\s+\d+\)\s*$/i, '')
  .replace(/\s*\(Kindergarten\)\s*$/i, '')
  .trim()
  .toLowerCase();

const findGradeBySubject = (gradesObj, subjectName) => {
  if (gradesObj?.[subjectName]) return gradesObj[subjectName];
  const normalized = normalizeSubjectName(subjectName);
  const key = Object.keys(gradesObj || {}).find((k) => normalizeSubjectName(k) === normalized);
  return key ? gradesObj[key] : {};
};

const toFinalRating = (grade = {}) => {
  const values = [grade.q1, grade.q2, grade.q3, grade.q4]
    .map((v) => Number(v))
    .filter((v) => !Number.isNaN(v) && v > 0);
  if (values.length === 0) return '';
  return (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2);
};

const toRemarks = (finalRating) => {
  const val = Number(finalRating);
  if (Number.isNaN(val) || val <= 0) return '';
  return val >= 75 ? 'Passed' : 'Failed';
};

export default function AdminForm137Print({ records = [], schoolYearLabel = '', onClose }) {
  const handlePrint = () => window.print();

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-auto" id="form137-modal">
        <div className="sticky top-0 z-10 bg-white border-b p-4 flex items-center justify-between print:hidden">
          <h3 className="text-lg font-bold text-gray-900">Form 137 Print Preview</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              Print
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-gray-500 text-white hover:bg-gray-600"
            >
              Close
            </button>
          </div>
        </div>

        <div id="form137-print-root" className="bg-white p-6 print:p-0">
          {records.map((record, index) => {
            const student = record.student || {};
            const grades = record.grades || {};
            const subjects = Array.isArray(record.subjects) ? record.subjects : [];
            const studentName = student.fullName || `${student.firstName || ''} ${student.lastName || ''}`.trim();

            return (
              <section
                key={student.id || index}
                className="form137-page border border-gray-300 p-6 mb-8 bg-white"
              >
                <header className="text-center mb-4">
                  <div className="flex items-center justify-center gap-4 mb-2">
                    <img src="/wmsu-logo.jpg" alt="WMSU Logo" className="w-12 h-12 object-cover rounded-full" />
                    <div>
                      <p className="text-xs">Republic of the Philippines</p>
                      <p className="text-xs">Department of Education</p>
                      <p className="text-sm font-bold">WMSU ILS - Elementary Department</p>
                    </div>
                  </div>
                  <h4 className="text-base font-bold">ELEMENTARY SCHOOL PERMANENT RECORD (FORM 137-E)</h4>
                </header>

                <div className="grid grid-cols-2 gap-3 text-xs mb-4">
                  <p><span className="font-semibold">Name:</span> {studentName || 'N/A'}</p>
                  <p><span className="font-semibold">LRN:</span> {student.lrn || 'N/A'}</p>
                  <p><span className="font-semibold">Grade & Section:</span> {student.gradeLevel || ''} - {student.section || ''}</p>
                  <p><span className="font-semibold">School Year:</span> {schoolYearLabel || 'N/A'}</p>
                </div>

                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-500 p-1 text-left">Learning Areas</th>
                      <th className="border border-gray-500 p-1">Q1</th>
                      <th className="border border-gray-500 p-1">Q2</th>
                      <th className="border border-gray-500 p-1">Q3</th>
                      <th className="border border-gray-500 p-1">Q4</th>
                      <th className="border border-gray-500 p-1">Final Rating</th>
                      <th className="border border-gray-500 p-1">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjects.map((subject) => {
                      const grade = findGradeBySubject(grades, subject);
                      const finalRating = toFinalRating(grade);
                      return (
                        <tr key={subject}>
                          <td className="border border-gray-400 p-1">{subject}</td>
                          <td className="border border-gray-400 p-1 text-center">{grade.q1 || ''}</td>
                          <td className="border border-gray-400 p-1 text-center">{grade.q2 || ''}</td>
                          <td className="border border-gray-400 p-1 text-center">{grade.q3 || ''}</td>
                          <td className="border border-gray-400 p-1 text-center">{grade.q4 || ''}</td>
                          <td className="border border-gray-400 p-1 text-center">{finalRating}</td>
                          <td className="border border-gray-400 p-1 text-center">{toRemarks(finalRating)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td className="border border-gray-500 p-1 font-semibold text-right" colSpan={5}>General Average</td>
                      <td className="border border-gray-500 p-1 text-center font-semibold">{student.average || ''}</td>
                      <td className="border border-gray-500 p-1 text-center">{toRemarks(student.average)}</td>
                    </tr>
                  </tfoot>
                </table>

                <div className="mt-8 text-xs grid grid-cols-2 gap-8">
                  <div>
                    <p className="border-t border-gray-600 pt-1 text-center">Class Adviser</p>
                  </div>
                  <div>
                    <p className="border-t border-gray-600 pt-1 text-center">Principal</p>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      </div>

      <style>{`
        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }

          body * {
            visibility: hidden !important;
          }

          #form137-print-root,
          #form137-print-root * {
            visibility: visible !important;
          }

          #form137-print-root {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }

          .form137-page {
            page-break-after: always;
            break-after: page;
            border: none !important;
            margin: 0 !important;
            padding: 12mm !important;
          }

          .form137-page:last-child {
            page-break-after: auto;
            break-after: auto;
          }

          @page {
            size: A4 portrait;
            margin: 8mm;
          }
        }
      `}</style>
    </div>
  );
}
