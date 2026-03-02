import React from 'react';

const PermanentDeleteTeacherModal = ({ 
  showPermanentDeleteModal, 
  teacherToPermanentDelete, 
  onConfirm, 
  onCancel 
}) => {
  if (!showPermanentDeleteModal || !teacherToPermanentDelete) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 m-4 max-w-md w-full">
        <div className="flex items-center mb-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M5.05 6.05L7 4l10 10-1.95 1.95L5.05 6.05z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Permanent Delete</h3>
            <p className="text-sm text-gray-600 mt-1">This action cannot be undone and will permanently remove all data.</p>
          </div>
        </div>
        
        <div className="mb-4">
          <div className="bg-gray-50 p-3 rounded border">
            <p className="text-sm font-medium text-gray-900">
              <strong>Teacher:</strong> {teacherToPermanentDelete.firstName || teacherToPermanentDelete.first_name} {teacherToPermanentDelete.lastName || teacherToPermanentDelete.last_name}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              <strong>Email:</strong> {teacherToPermanentDelete.email}
            </p>
            <p className="text-sm text-red-600 mt-2">
              <strong>⚠️ WARNING:</strong> This will permanently delete the teacher account and all associated data.
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
            className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 font-medium"
          >
            Delete Permanently
          </button>
        </div>
      </div>
    </div>
  );
};

export default PermanentDeleteTeacherModal;
