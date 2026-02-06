import React, { useState, useEffect } from "react";
import { UserGroupIcon, CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/solid";
import { API_BASE_URL } from "../../api/config";

export default function AdminAssignAdviser() {
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedAdviser, setSelectedAdviser] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState(""); // "success" or "error"

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch classes with adviser info
      const classesResponse = await fetch(`${API_BASE_URL}/classes`);
      if (classesResponse.ok) {
        const classesData = await classesResponse.json();
        console.log('Raw classes response:', classesData);
        
        // Handle different response formats
        let classesArray = [];
        if (Array.isArray(classesData)) {
          classesArray = classesData;
        } else if (Array.isArray(classesData.data)) {
          classesArray = classesData.data;
        } else if (Array.isArray(classesData.classes)) {
          classesArray = classesData.classes;
        }
        
        console.log('Classes loaded:', classesArray);
        setClasses(classesArray);
      } else {
        console.error('Classes response not OK:', classesResponse.status);
      }

      // Fetch teachers/advisers
      const teachersResponse = await fetch(`${API_BASE_URL}/users`);
      if (teachersResponse.ok) {
        const data = await teachersResponse.json();
        const allUsers = data.data?.users || data.users || [];
        
        // Filter for all teaching roles: teacher, subject_teacher, adviser
        const teachersList = allUsers.filter(user => {
          const role = (user.role || '').toLowerCase().trim();
          return role === 'teacher' || role === 'subject_teacher' || role === 'adviser';
        });
        
        console.log(`Found ${teachersList.length} teachers/advisers:`, teachersList.map(t => `${t.firstName} ${t.lastName} (${t.role})`));
        setTeachers(teachersList);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setMessage("Error loading data: " + error.message);
      setMessageType("error");
    }
    setLoading(false);
  };

  const handleAssignAdviser = async () => {
    if (!selectedClass || !selectedAdviser) {
      setMessage("Please select both a class and an adviser");
      setMessageType("error");
      return;
    }

    try {
      const adviser = teachers.find(t => t.id === selectedAdviser);
      console.log('Assigning adviser:', adviser);
      console.log('To class:', selectedClass);
      
      const response = await fetch(
        `${API_BASE_URL}/classes/${selectedClass.id}/assign`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            adviser_id: adviser.id,
            adviser_name: `${adviser.firstName} ${adviser.lastName}`
          })
        }
      );

      const responseData = await response.json();
      console.log('Response:', response.status, responseData);

      if (response.ok) {
        setMessage(`Successfully assigned ${adviser.firstName} ${adviser.lastName} to ${selectedClass.grade} - ${selectedClass.section}`);
        setMessageType("success");
        setSelectedClass(null);
        setSelectedAdviser("");
        
        // Refetch data to get updated adviser assignments from database
        await fetchData();
      } else {
        setMessage(`Error assigning adviser: ${responseData.message || response.statusText}`);
        setMessageType("error");
      }
    } catch (error) {
      console.error('Error assigning adviser:', error);
      setMessage("Error assigning adviser: " + error.message);
      setMessageType("error");
    }
  };

  const handleUnassignAdviser = async (classItem) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/classes/${classItem.id}/unassign`,
        { method: 'PUT' }
      );

      if (response.ok) {
        setMessage(`Adviser removed from ${classItem.grade} - ${classItem.section}`);
        setMessageType("success");
        
        // Refetch data to get updated adviser assignments from database
        await fetchData();
      } else {
        setMessage("Error removing adviser");
        setMessageType("error");
      }
    } catch (error) {
      console.error('Error removing adviser:', error);
      setMessage("Error removing adviser");
      setMessageType("error");
    }
  };

  if (loading) {
    return <div className="p-6 text-center">Loading...</div>;
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8 flex items-center gap-2">
          <UserGroupIcon className="w-8 h-8 text-red-600" />
          Assign Adviser to Class
        </h1>

        {message && (
          <div className={`p-4 mb-6 rounded-md ${messageType === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
            {message}
          </div>
        )}

        {/* Assignment Form */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Create New Assignment</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Select Class */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Class</label>
              <select
                value={selectedClass ? selectedClass.id : ""}
                onChange={(e) => {
                  const selected = classes.find(c => c.id === e.target.value);
                  setSelectedClass(selected);
                }}
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="">-- Choose a class --</option>
                {classes.map(classItem => (
                  <option key={classItem.id} value={classItem.id}>
                    {classItem.grade} - {classItem.section}
                    {classItem.adviser_name && ` (Currently: ${classItem.adviser_name})`}
                  </option>
                ))}
              </select>
            </div>

            {/* Select Adviser */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Adviser</label>
              <select
                value={selectedAdviser}
                onChange={(e) => setSelectedAdviser(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="">-- Choose an adviser --</option>
                {teachers.map(teacher => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.firstName} {teacher.lastName} ({teacher.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={handleAssignAdviser}
            className="w-full bg-red-600 text-white font-semibold py-3 rounded-md hover:bg-red-700 transition"
          >
            Assign Adviser
          </button>
        </div>

        {/* Classes List */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <h2 className="text-xl font-semibold text-gray-700 p-6 border-b">All Classes and Assigned Advisers</h2>
          
          <div className="divide-y">
            {classes.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No classes found. Make sure students are registered.
              </div>
            ) : (
              classes.map(classItem => (
                <div key={classItem.id} className="p-6 flex items-center justify-between hover:bg-gray-50">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      {classItem.grade} - {classItem.section}
                    </h3>
                    {classItem.adviser_name ? (
                      <p className="text-green-600 text-sm mt-1 flex items-center gap-1">
                        <CheckCircleIcon className="w-4 h-4" />
                        Adviser: {classItem.adviser_name}
                      </p>
                    ) : (
                      <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                        <XCircleIcon className="w-4 h-4" />
                        No adviser assigned
                      </p>
                    )}
                  </div>
                  
                  {classItem.adviser_name && (
                    <button
                      onClick={() => handleUnassignAdviser(classItem)}
                      className="bg-red-100 text-red-600 px-4 py-2 rounded-md hover:bg-red-200 transition text-sm font-medium"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
