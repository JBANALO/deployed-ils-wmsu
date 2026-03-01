import { UserCircleIcon } from "@heroicons/react/24/solid";
import { API_BASE_URL } from "../../api/config";

export default function EditStudentModal({ student, formData, setFormData, onSave, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-screen overflow-y-auto scrollbar-hide">
        <div className="p-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">Edit Student Details</h3>

          {/* Profile Photo */}
          <div className="flex justify-center mb-10">
            <div className="relative">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-gray-300 shadow-lg">
                {formData.profilePic ? (
                  <img src={formData.profilePic.startsWith('http') ? formData.profilePic : `${API_BASE_URL.replace('/api', '')}${formData.profilePic}`} alt="Student" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <UserCircleIcon className="w-20 h-20 text-gray-400" />
                  </div>
                )}
              </div>
              <label className="absolute bottom-0 right-0 bg-red-800 text-white p-3 rounded-full cursor-pointer shadow-lg hover:bg-red-700 transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => setFormData({ ...formData, profilePic: reader.result });
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-6">
            <input type="text" placeholder="First Name" value={formData.firstName || ""} onChange={e => setFormData({ ...formData, firstName: e.target.value })} className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 focus:border-transparent" />
            <input type="text" placeholder="Middle Name" value={formData.middleName || ""} onChange={e => setFormData({ ...formData, middleName: e.target.value })} className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 focus:border-transparent" />
            <input type="text" placeholder="Last Name" value={formData.lastName || ""} onChange={e => setFormData({ ...formData, lastName: e.target.value })} className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 focus:border-transparent" />

            {/* LRN Field */}
            <input type="text" placeholder="LRN" value={formData.lrn || ""} onChange={e => setFormData({ ...formData, lrn: e.target.value })} className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 focus:border-transparent" />

            <div className="grid grid-cols-2 gap-4">
              <input type="number" placeholder="Age" value={formData.age || ""} onChange={e => setFormData({ ...formData, age: e.target.value })} className="border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500" />
              <select value={formData.sex || ""} onChange={e => setFormData({ ...formData, sex: e.target.value })} className="border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500">
                <option value="">Sex</option>
                <option>Male</option>
                <option>Female</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <input type="text" placeholder="Grade Level" value={formData.gradeLevel || ""} onChange={e => setFormData({ ...formData, gradeLevel: e.target.value })} className="border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500" />
              <input type="text" placeholder="Section" value={formData.section || ""} onChange={e => setFormData({ ...formData, section: e.target.value })} className="border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500" />
            </div>

            <input type="text" placeholder="Contact Number" value={formData.contact || ""} onChange={e => setFormData({ ...formData, contact: e.target.value })} className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500" />
            <input type="email" placeholder="WMSU Email (Cannot Edit)" value={formData.wmsuEmail || ""} disabled className="w-full bg-gray-100 text-gray-500 border border-gray-200 rounded-xl px-4 py-3 cursor-not-allowed" />
          </div>

          {/* Buttons */}
          <div className="flex gap-4 mt-10">
            <button onClick={onSave} className="flex-1 bg-green-600 text-white py-3 rounded-xl hover:bg-green-700 font-bold text-lg transition shadow-lg">Save Changes</button>
            <button onClick={onClose} className="flex-1 bg-gray-500 text-white py-3 rounded-xl hover:bg-gray-600 font-bold text-lg transition">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}