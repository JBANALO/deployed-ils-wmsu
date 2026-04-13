import React, { useState, useEffect } from 'react';
import { PencilIcon, AcademicCapIcon, UserIcon } from '@heroicons/react/24/outline';

const PromptModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  title, 
  message, 
  placeholder = '',
  defaultValue = '',
  submitText = 'Submit',
  cancelText = 'Cancel',
  type = 'text', // text, select
  options = [], // for select type
  icon = null
}) => {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (value.trim()) {
      onSubmit(value.trim());
      setValue('');
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'grade':
        return AcademicCapIcon;
      case 'user':
        return UserIcon;
      default:
        return icon || PencilIcon;
    }
  };

  const IconComponent = getIcon();

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 m-4 max-w-md w-full border-2 border-blue-200">
        {/* Icon */}
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
          <IconComponent className="h-6 w-6 text-blue-600" />
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-center text-gray-900 mb-2">
          {title}
        </h3>

        {/* Message */}
        <p className="text-sm text-gray-600 text-center mb-4">
          {message}
        </p>

        {/* Input */}
        {type === 'select' ? (
          <select
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-4"
          >
            <option value="">Select an option...</option>
            {options.map((option, index) => (
              <option key={index} value={option}>
                {option}
              </option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-4"
            autoFocus
            onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
          />
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!value.trim()}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PromptModal;
