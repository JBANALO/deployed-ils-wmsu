export default function DeleteRequestModal({ student, reason, setReason, onSubmit, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
        <h3 className="text-2xl font-bold text-red-800 mb-4">Request Student Deletion</h3>
        <div className="bg-gray-100 p-5 rounded-xl mb-6">
          <p className="font-bold text-lg">{student.fullName}</p>
          <p className="text-sm text-gray-600">LRN: {student.lrn}</p>
          <p className="text-sm text-gray-600">{student.gradeLevel} - {student.section}</p>
        </div>
        <textarea
          placeholder="Enter reason for deletion (required)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full border-2 border-gray-300 rounded-xl p-4 h-32 resize-none focus:border-red-500 focus:ring-0"
        />
        <div className="flex gap-4 mt-6">
          <button onClick={onSubmit} className="flex-1 bg-red-600 text-white py-4 rounded-xl hover:bg-red-700 font-bold transition">Send Request</button>
          <button onClick={onClose} className="flex-1 bg-gray-500 text-white py-4 rounded-xl hover:bg-gray-600 transition">Cancel</button>
        </div>
      </div>
    </div>
  );
}