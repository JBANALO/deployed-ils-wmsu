import { UserCircleIcon } from "@heroicons/react/24/solid";
import { API_BASE_URL } from "../../api/config";

export default function ViewStudentModal({ student, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full my-8">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-3xl font-bold text-gray-900">Student Profile</h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 transition">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 3-Column Layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            {/* Left: Picture + Name */}
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-40 h-40 rounded-full bg-linear-to-br from-blue-500 to-purple-600 p-2 shadow-2xl">
                <div className="w-full h-full rounded-full bg-white p-3 overflow-hidden">
                  {student.profilePic ? (
                    <img src={student.profilePic.startsWith('http') ? student.profilePic : `${API_BASE_URL.replace('/api', '')}${student.profilePic}`} alt={student.fullName} className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <UserCircleIcon className="w-full h-full text-gray-300" />
                  )}
                </div>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mt-4">{student.fullName}</h2>
            </div>

            {/* Middle: Details */}
            <div className="space-y-6">
              {[
                { label: "Age", value: student.age },
                { label: "Sex", value: student.sex },
                { label: "LRN", value: student.lrn, mono: true },
                { label: "Grade Level", value: student.gradeLevel },
                { label: "Section", value: student.section },
                { label: "WMSU Email", value: student.wmsuEmail, email: true },
                { label: "Parents/Guardian Contact", value: student.contact || "N/A" },
                { label: "Status", value: student.status, badge: true },
              ].map((item) => (
                <div key={item.label} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                  <span className="font-semibold text-gray-700">{item.label}:</span>
                  <span className={`font-medium ${item.mono ? "font-mono text-sm" : ""} ${item.email ? "text-blue-600 font-mono text-sm" : "text-gray-900"}`}>
                    {item.badge ? (
                      <span className={`px-4 py-1.5 rounded-full text-xs font-bold ${item.value === "Active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                        {item.value}
                      </span>
                    ) : item.value}
                  </span>
                </div>
              ))}
            </div>

            {/* Right: QR Code */}
            <div className="flex flex-col items-center">
              <div className="bg-gray-50 p-6 rounded-2xl shadow-inner border-4 border-white">
                <img src={student.qrCode.startsWith('http') ? student.qrCode : `${API_BASE_URL.replace('/api', '')}${student.qrCode}`} alt="QR Code" className="w-56 h-56 object-contain" />
              </div>
              <p className="mt-4 text-sm text-gray-600 font-medium">Student QR Code</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}