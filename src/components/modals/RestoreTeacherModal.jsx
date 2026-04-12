import React from 'react';

const RestoreTeacherModal = ({ 
  showRestoreModal, 
  teacherToRestore, 
  onConfirm, 
  onCancel 
}) => {
  if (!showRestoreModal || !teacherToRestore) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 m-4 max-w-md w-full">
        <div className="flex items-center mb-4">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Restore Teacher</h3>
            <p className="text-sm text-gray-600 mt-1">This action will restore the teacher account back to active status.</p>
          </div>
        </div>
        
        <div className="mb-4">
          <div className="bg-gray-50 p-3 rounded border">
            <p className="text-sm font-medium text-gray-900">
              <strong>Teacher:</strong> {teacherToRestore.firstName || teacherToRestore.first_name} {teacherToRestore.lastName || teacherToRestore.last_name}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              <strong>Email:</strong> {teacherToRestore.email}
            </p>
            <p className="text-sm text-green-600 mt-2">
              <strong>✅ Ready to restore:</strong> The teacher will be able to access their account again.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 font-medium"
          >
            Restore Teacher
          </button>
        </div>
      </div>
    </div>
  );
};

export default RestoreTeacherModal;
