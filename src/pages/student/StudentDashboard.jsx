import React, { useState, useEffect } from 'react';
import { Download, Calendar, BookOpen } from 'lucide-react';
import StudentTopbar from '@/layouts/student/StudentTopbar'; // ← Use @/ if you have alias, or correct path

const StudentPortal = () => {
  const [activeTab, setActiveTab] = useState('grades');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // ← FIXED: Was localStorage.getItem(1) → WRONG!
  const studentId = localStorage.getItem('studentId') || '1'; // fallback to 1 for testing

  useEffect(() => {
    const fetchPortalData = async () => {
      if (!studentId || studentId === 'null') {
        setLoading(false);
        return;
      }

      try {
        console.log('Fetching for studentId:', studentId); // ← DEBUG
        const res = await fetch(`http://localhost:5000/api/student/portal?studentId=${studentId}`);
        if (!res.ok) throw new Error('Failed to fetch');
        const result = await res.json();
        console.log('Data received:', result); // ← DEBUG
        setData(result);
      } catch (err) {
        console.error('Fetch error:', err);
        alert('No student data found. Did you log in? Try setting localStorage.setItem("studentId", "1") in console.');
      } finally {
        setLoading(false);
      }
    };

    fetchPortalData();
  }, []);

  // ← SHOW THIS WHILE LOADING
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-900 border-t-transparent"></div>
        <p className="text-xl text-gray-700">Loading your portal...</p>
        <p className="text-sm text-gray-500">Student ID: {studentId || 'Not found'}</p>
      </div>
    );
  }

  if (!data || !data.profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-6">
        <div className="text-center">
          <p className="text-2xl text-red-600 font-bold">No Student Data Found</p>
          <p className="text-gray-600 mt-2">For testing, run this in browser console:</p>
          <code className="bg-gray-800 text-white px-4 py-2 rounded text-sm block mt-3">
            localStorage.setItem('studentId', '1')
          </code>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 bg-red-900 text-white px-6 py-3 rounded-lg hover:bg-red-800"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  const { profile, grades = [] } = data;

  // ← REST OF YOUR BEAUTIFUL UI (unchanged)
  return (
    <>
      <StudentTopbar studentName={profile.fullName || 'Student'} />

      <div className="pt-20 min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Your existing header, tabs, grades table — all perfect */}
          <div className="bg-gradient-to-r from-red-900 to-red-800 text-white rounded-lg p-6 mb-6 shadow-lg">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-white rounded-lg flex items-center justify-center">
                <BookOpen className="w-12 h-12 text-red-900" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{profile.gradeLevel} - {profile.section}</h2>
                <p className="text-red-100">Welcome back, <strong>{profile.fullName}</strong></p>
                <p className="text-red-100">LRN: {profile.lrn}</p>
              </div>
            </div>
          </div>

          {/* Tabs & Content */}
          <div className="flex gap-2 mb-6 bg-white rounded-lg p-2 shadow-sm">
            {['grades', 'attendance', 'schedule'].map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 px-4 rounded-md font-medium capitalize transition-all ${
                  activeTab === tab ? 'bg-red-900 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab === 'grades' ? 'My Grades' : tab === 'attendance' ? 'Attendance' : 'Schedule'}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            {activeTab === 'grades' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-800">My Grades</h3>
                    <p className="text-sm text-gray-600">
                      Final Average: <strong className="text-2xl text-green-600">{profile.finalAverage || 'N/A'}</strong>
                    </p>
                  </div>
                  <button onClick={() => alert('Download coming soon!')} className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg flex items-center gap-2">
                    <Download className="w-5 h-5" /> Download
                  </button>
                </div>

                {grades.length === 0 ? (
                  <div className="text-center py-16 text-gray-500">
                    <p className="text-lg">No grades yet. Teachers are still updating!</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-6 py-3 text-left">Subject</th>
                          <th className="px-6 py-3 text-center">Q1</th>
                          <th className="px-6 py-3 text-center">Q2</th>
                          <th className="px-6 py-3 text-center">Q3</th>
                          <th className="px-6 py-3 text-center">Q4</th>
                          <th className="px-6 py-3 text-center">Average</th>
                          <th className="px-6 py-3 text-center">Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {grades.map((g, i) => (
                          <tr key={i} className="border-b hover:bg-gray-50">
                            <td className="px-6 py-4 font-medium">{g.subject}</td>
                            <td className="px-6 py-4 text-center">{g.q1 || '-'}</td>
                            <td className="px-6 py-4 text-center">{g.q2 || '-'}</td>
                            <td className="px-6 py-4 text-center">{g.q3 || '-'}</td>
                            <td className="px-6 py-4 text-center">{g.q4 || '-'}</td>
                            <td className="px-6 py-4 text-center font-bold text-blue-700">{g.average || 'N/A'}</td>
                            <td className="px-6 py-4 text-center">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                g.average >= 90 ? 'bg-green-100 text-green-800' :
                                g.average >= 85 ? 'bg-blue-100 text-blue-800' :
                                g.average >= 80 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {g.remarks || 'Pending'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default StudentPortal;