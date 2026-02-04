import React, { useState, useEffect } from "react";
import { UserGroupIcon, CheckCircleIcon, XCircleIcon, TrashIcon } from "@heroicons/react/24/solid";
import api from "../../api/axiosConfig";

export default function AdminAssignSubjectTeacher() {
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedDay, setSelectedDay] = useState("Monday - Friday");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("09:00");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState(""); // "success" or "error"

  const subjects = [
    "English",
    "Mathematics",
    "Science",
    "Filipino",
    "Social Studies",
    "Physical Education",
    "Music",
    "Arts",
    "Computer",
    "Values Education"
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch all classes with adviser info
      const classesResponse = await api.get('/classes');
      const classList = Array.isArray(classesResponse.data.data) ? classesResponse.data.data : [];
      console.log('Classes loaded:', classList);
      setClasses(classList);

      // Fetch teachers/subject teachers
      const teachersResponse = await api.get('/users');
      const allUsers = teachersResponse.data.data?.users || teachersResponse.data.users || [];
      
      // Filter for subject teachers and regular teachers
      const teachersList = allUsers.filter(user => {
        const role = (user.role || '').toLowerCase().trim();
        return role === 'subject_teacher' || role === 'teacher';
      });
      
      console.log(`Found ${teachersList.length} subject teachers:`, teachersList.map(t => `${t.firstName} ${t.lastName} (${t.role})`));
      setTeachers(teachersList);
    } catch (error) {
      console.error('Error fetching data:', error);
      setMessage("Error loading data: " + error.message);
      setMessageType("error");
    }
    setLoading(false);
  };

  const handleAssignSubjectTeacher = async () => {
    if (!selectedClass || !selectedTeacher || !selectedSubject) {
      setMessage("Please select class, subject teacher, and subject");
      setMessageType("error");
      return;
    }

    try {
      const teacher = teachers.find(t => t.id === selectedTeacher);
      console.log('Assigning teacher:', teacher);
      console.log('To class:', selectedClass);
      console.log('Subject:', selectedSubject);
      console.log('Schedule:', selectedDay, startTime, endTime);
      
      const response = await api.put(
        `/classes/${selectedClass.id}/assign-subject-teacher`,
        {
          teacher_id: teacher.id,
          teacher_name: `${teacher.firstName} ${teacher.lastName}`,
          subject: selectedSubject,
          day: selectedDay,
          start_time: startTime,
          end_time: endTime
        }
      );

      console.log('Response:', response.status, response.data);

      setMessage(`Successfully assigned ${teacher.firstName} ${teacher.lastName} (${selectedSubject}) to ${selectedClass.grade} - ${selectedClass.section}`);
      setMessageType("success");
      setSelectedTeacher("");
      setSelectedSubject("");
      setStartTime("08:00");
      setEndTime("09:00");
      
      // Refetch all data to update the list immediately
      await fetchData();
    } catch (error) {
      console.error('Error assigning subject teacher:', error);
      setMessage("Error assigning subject teacher: " + (error.response?.data?.message || error.message));
      setMessageType("error");
    }
  };

  const handleRemoveSubjectTeacher = async (classId, teacherId) => {
    try {
      const response = await api.put(
        `/classes/${classId}/unassign-subject-teacher/${teacherId}`
      );

      setMessage("Subject teacher removed successfully");
      setMessageType("success");
      
      // Refetch all data to update the list immediately
      await fetchData();
    } catch (error) {
      console.error('Error removing subject teacher:', error);
      setMessage("Error removing subject teacher: " + error.message);
      setMessageType("error");
    }
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-800 mb-8 flex items-center gap-3">
          <UserGroupIcon className="w-10 h-10 text-red-600" />
          Assign Subject Teachers to Classes
        </h1>

        {/* Message Display */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${messageType === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
            <div className="flex items-center gap-2">
              {messageType === 'success' ? (
                <CheckCircleIcon className="w-5 h-5" />
              ) : (
                <XCircleIcon className="w-5 h-5" />
              )}
              {message}
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-600">Loading data...</p>
          </div>
        ) : (
          <>
            {/* Assignment Form */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Create New Assignment</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Class
                  </label>
                  <select
                    value={selectedClass ? selectedClass.id : ""}
                    onChange={(e) => {
                      const classId = e.target.value;
                      const selected = classes.find(c => c.id === classId);
                      setSelectedClass(selected);
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option value="">-- Select a class --</option>
                    {classes.map(cls => (
                      <option key={cls.id} value={cls.id}>
                        {cls.grade} - {cls.section}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Subject Teacher
                  </label>
                  <select
                    value={selectedTeacher}
                    onChange={(e) => setSelectedTeacher(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option value="">-- Select a subject teacher --</option>
                    {teachers.map(teacher => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.firstName} {teacher.lastName} ({teacher.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Subject
                  </label>
                  <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option value="">-- Select a subject --</option>
                    {subjects.map(subject => (
                      <option key={subject} value={subject}>
                        {subject}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Day
                  </label>
                  <select
                    value={selectedDay}
                    onChange={(e) => setSelectedDay(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option value="Monday - Friday">Monday - Friday</option>
                    <option value="Monday">Monday</option>
                    <option value="Tuesday">Tuesday</option>
                    <option value="Wednesday">Wednesday</option>
                    <option value="Thursday">Thursday</option>
                    <option value="Friday">Friday</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Time Period
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-600 mb-1">From</label>
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-gray-600 mb-1">To</label>
                      <input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={handleAssignSubjectTeacher}
                className="mt-6 w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition"
              >
                Assign Subject Teacher
              </button>
            </div>

            {/* Classes List */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">All Classes and Subject Teachers</h2>
              
              <div className="space-y-6">
                {classes.map(cls => (
                  <div key={cls.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-lg font-bold text-gray-800">
                          {cls.grade} - {cls.section}
                        </h3>
                        {cls.adviser_name && (
                          <p className="text-sm text-gray-600">
                            Adviser: <span className="font-medium">{cls.adviser_name}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Subject Teachers List */}
                    {cls.subject_teachers && cls.subject_teachers.length > 0 ? (
                      <div className="mt-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">Subject Teachers:</p>
                        <div className="space-y-2">
                          {cls.subject_teachers.map((st, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-blue-50 p-3 rounded">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-800">
                                  {st.teacher_name} - <span className="text-blue-600">{st.subject}</span>
                                </p>
                                <p className="text-xs text-gray-600 mt-1">
                                  <span className="font-semibold">{st.day || 'Monday - Friday'}</span> • <span className="font-semibold">{st.start_time || '08:00'} - {st.end_time || '09:00'}</span>
                                </p>
                              </div>
                              <button
                                onClick={() => handleRemoveSubjectTeacher(cls.id, st.teacher_id)}
                                className="text-red-600 hover:text-red-800 p-1 flex-shrink-0"
                                title="Remove subject teacher"
                              >
                                <TrashIcon className="w-5 h-5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 italic mt-2">No subject teachers assigned</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
