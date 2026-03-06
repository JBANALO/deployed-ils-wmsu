import React, { useState, useEffect, useContext } from "react";
import { 
  PhoneIcon, 
  EnvelopeIcon, 
  MapPinIcon, 
  ClockIcon, 
  UserGroupIcon,
  XMarkIcon 
} from "@heroicons/react/24/solid";
import { useNavigate } from "react-router-dom";
import StudentTopbar from "../../layouts/student/StudentTopbar";
import { UserContext } from "@/context/UserContext";

export default function CustomerService() {
  const navigate = useNavigate();
  const [studentData, setStudentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useContext(UserContext);

  // Get studentId from localStorage user data (stored during login)
  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
  const studentId = user?.id || storedUser.id || localStorage.getItem('studentId');

  useEffect(() => {
    const fetchStudentData = async () => {
      if (!studentId || studentId === 'null') {
        setLoading(false);
        return;
      }

      try {
        const baseURL = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 
                 (window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api');
        const res = await fetch(`${baseURL}/students/portal?studentId=${studentId}`, { credentials: 'include' });
        if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
        const result = await res.json();
        
        // Map API response structure to frontend expectations
        if (result.status === 'success' && result.data?.student) {
          const student = result.data.student;
          setStudentData({
            fullName: student.fullName || `${student.firstName} ${student.lastName}`,
            gradeLevel: student.gradeLevel
          });
        }
      } catch (err) {
        console.error('Fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStudentData();
  }, [studentId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 font-montserrat">
      <StudentTopbar studentName={studentData?.fullName} gradeLevel={studentData?.gradeLevel || "Grade"} />

      <main className="pt-25 px-4 lg:px-6 pb-10 max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-300 relative">

          {/* Header */}
          <div className="text-center py-4 px-4 border-b border-gray-200">
            <h1 className="text-2xl md:text-3xl font-bold text-red-900 mb-1">
              Need Help?
            </h1>
            <p className="text-base text-gray-700">
              We're here to assist you! Choose the best way to reach us.
            </p>
          </div>

          {/* Cards grid */}
          <div className="p-4 lg:p-6">
            <div className="grid gap-4 md:grid-cols-2">

              {/* Card 1 */}
              <div className="bg-gray-50 rounded-xl p-3 border-t-4 border-red-800 hover:shadow-lg transition">
                <UserGroupIcon className="w-10 h-10 text-red-800 mb-1" />
                <h3 className="text-lg font-bold text-gray-800 mb-1">Talk to Your Class Adviser</h3>
                <p className="text-gray-600 leading-snug mb-1 text-xs">
                  For questions about grades, attendance, homework, or behavior — your class adviser is the best person to help!
                </p>
                <ul className="text-gray-700 space-y-1 text-xs">
                  <li>• Ask during class time</li>
                  <li>• Write a note in your notebook</li>
                  <li>• Ask your parent to message your adviser</li>
                </ul>
              </div>

              {/* Card 2 */}
              <div className="bg-gray-50 rounded-xl p-3 border-t-4 border-blue-700 hover:shadow-lg transition">
                <MapPinIcon className="w-10 h-10 text-blue-700 mb-1" />
                <h3 className="text-lg font-bold text-gray-800 mb-1">Guidance Office</h3>
                <p className="text-gray-600 leading-snug mb-1 text-xs">
                  Feeling sad? Being bullied? Need someone to talk to? <strong>Go to the Guidance Office</strong> — we care about you!
                </p>
                <p className="text-xs font-bold text-blue-700">Location: Faculty Room (2nd Floor)</p>
              </div>

              {/* Card 3 */}
              <div className="bg-gray-50 rounded-xl p-3 border-t-4 border-green-700 hover:shadow-lg transition">
                <EnvelopeIcon className="w-10 h-10 text-green-700 mb-1" />
                <h3 className="text-lg font-bold text-gray-800 mb-1">Registrar's Office</h3>
                <p className="text-gray-600 leading-snug mb-1 text-xs">
                  Need Form 137, Good Moral Certificate, or enrollment papers?
                </p>
                <div className="space-y-1 text-gray-700 text-xs">
                  <p className="flex items-center gap-2"><PhoneIcon className="w-3 h-3 text-green-600" /> (062) 991-1234 loc. 123</p>
                  <p className="flex items-center gap-2"><EnvelopeIcon className="w-3 h-3 text-green-600" /> registrar@wmsu-ils.edu.ph</p>
                  <p className="flex items-center gap-2"><ClockIcon className="w-3 h-3 text-green-600" /> Mon–Fri: 8:00 AM – 5:00 PM</p>
                </div>
              </div>

              {/* Card 4 */}
              <div className="bg-gray-50 rounded-xl p-3 border-t-4 border-orange-600 hover:shadow-lg transition">
                <PhoneIcon className="w-10 h-10 text-orange-600 mb-1" />
                <h3 className="text-lg font-bold text-gray-800 mb-1">Emergency / Principal's Office</h3>
                <p className="text-gray-600 leading-snug mb-1 text-xs">
                  For accidents, lost items, or any urgent safety concerns
                </p>
                <p className="text-lg font-bold text-orange-600">Call: (062) 991-5678</p>
              </div>

            </div>
          </div>

          {/* Footer */}
          <div className="text-center py-3 bg-gray-50 border-t border-gray-200">
            <p className="text-gray-600 font-medium text-xs">
              Your safety and happiness are important to us!
            </p>
          </div>

        </div>
      </main>
    </div>
  );
}