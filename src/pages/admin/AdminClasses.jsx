import React, { useState, useEffect } from "react";

import { BuildingLibraryIcon, ChevronDownIcon, UserGroupIcon } from "@heroicons/react/24/solid";

import { useNavigate } from "react-router-dom";

import { API_BASE_URL } from "../../api/config";

import { toast } from 'react-toastify';



export default function AdminClasses() {

  const navigate = useNavigate();

  const [classesData, setClassesData] = useState([]);

  const [allStudents, setAllStudents] = useState([]);

  const [teachers, setTeachers] = useState([]);

  const [loading, setLoading] = useState(true);

  const [gradeFilter, setGradeFilter] = useState("All");

  const [expandedClass, setExpandedClass] = useState(null);



  // Fetch students and organize by grade and section

  useEffect(() => {

    const fetchAndOrganizeClasses = async () => {

      try {

        // Fetch students

        const studentsResponse = await fetch(`${API_BASE_URL}/students`);

        if (studentsResponse.ok) {

          const result = await studentsResponse.json();

          const students = result.data ? result.data : (Array.isArray(result) ? result : []);

          setAllStudents(students);

          const classes = organizeByGradeAndSection(students);

          setClassesData(classes);

        } else {

          setClassesData([]);

          setAllStudents([]);

        }



        // Fetch teachers

        try {

          const teachersResponse = await fetch(`${API_BASE_URL}/users`);

          if (teachersResponse.ok) {

            const data = await teachersResponse.json();

            const allUsers = data.data?.users || data.users || [];

            console.log('All Users fetched:', allUsers.length);

            const teachersList = Array.isArray(allUsers) 

              ? allUsers.filter(user => ['teacher', 'subject_teacher', 'adviser'].includes(user.role))

              : [];

            console.log('Teachers filtered:', teachersList.length);

            teachersList.forEach(t => {

              console.log(`Teacher: ${t.firstName} ${t.lastName} | Grade: ${t.gradeLevel} | Section: ${t.section} | Role: ${t.role}`);

            });

            setTeachers(teachersList);

          } else {

            console.log('Teachers response not ok');

            setTeachers([]);

          }

        } catch (teacherError) {

          console.error('Error fetching teachers:', teacherError);

          setTeachers([]);

        }

      } catch (error) {

        console.error('Error fetching data:', error);

        setClassesData([]);

        setAllStudents([]);

      }

      setLoading(false);

    };



    fetchAndOrganizeClasses();

  }, []);



  // Organize students by grade and section

  const organizeByGradeAndSection = (students) => {

    const gradeOrder = ['Kindergarten', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'];

    const sectionOrder = ['Wisdom', 'Kindness', 'Humility', 'Diligence'];

    const grouped = {};



    students.forEach(student => {

      const key = `${student.gradeLevel}-${student.section}`;

      if (!grouped[key]) {

        grouped[key] = {

          grade: student.gradeLevel,

          section: student.section,

          students: 0,

          studentList: []

        };

      }

      grouped[key].students++;

      grouped[key].studentList.push(student);

    });



    return Object.values(grouped)

      .sort((a, b) => {

        const gradeCompare = gradeOrder.indexOf(a.grade) - gradeOrder.indexOf(b.grade);

        if (gradeCompare !== 0) return gradeCompare;

        return sectionOrder.indexOf(a.section) - sectionOrder.indexOf(b.section);

      });

  };



  // Get teacher for a specific class

  const getTeacherForClass = (grade, section) => {

    return teachers.find(teacher => 

      teacher.gradeLevel === grade && teacher.section === section

    );

  };



  const filteredClasses = gradeFilter === "All" 

    ? classesData 

    : classesData.filter(cls => cls.grade === gradeFilter);



  const totalStudents = classesData.reduce((sum, cls) => sum + cls.students, 0);

  const uniqueGrades = [...new Set(classesData.map(cls => cls.grade))];

  const uniqueSections = [...new Set(classesData.map(cls => cls.section))];



  return (

    <div className="space-y-8">

      <div className="bg-white rounded-lg shadow p-5 border border-gray-300 border-b-red-800 border-b-4">

        <div className="flex items-center gap-4 mb-4">

          <BuildingLibraryIcon className="w-20 h-20 text-red-800 transition-transform duration-300 hover:scale-105 translate-x-[5px]" />

          <h2 className="text-5xl pl-5 font-bold text-gray-900">

            Classes Management

          </h2>

        </div>

      </div>



      <p className="text-gray-600 mb-6">

        Manage class sections, subjects, and teacher assignments.

      </p>



      <div className="grid grid-cols-3 gap-6">

        <div className="bg-red-50 rounded-lg p-4 border border-red-100 text-center">

          <h3 className="text-lg font-semibold text-red-800">Total Classes</h3>

          <p className="text-2xl font-bold">{classesData.length}</p>

        </div>



        <div className="bg-red-50 rounded-lg p-4 border border-red-100 text-center">

          <h3 className="text-lg font-semibold text-red-800">Active Sections</h3>

          <p className="text-2xl font-bold">{uniqueSections.length}</p>

        </div>



        <div className="bg-red-50 rounded-lg p-4 border border-red-100 text-center">

          <h3 className="text-lg font-semibold text-red-800">Total Students</h3>

          <p className="text-2xl font-bold">{totalStudents}</p>

        </div>

      </div>



      <div className="mt-10">

        <div className="flex justify-between items-center mb-4">

          <h3 className="text-2xl font-bold text-gray-800">Class Sections</h3>

          

          {/* Grade Filter */}

          <div>

            <label className="text-sm font-medium text-gray-700 mr-2">Filter by Grade:</label>

            <select

              value={gradeFilter}

              onChange={(e) => setGradeFilter(e.target.value)}

              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-800"

            >

              <option value="All">All Grades</option>

              {uniqueGrades.map(grade => (

                <option key={grade} value={grade}>{grade}</option>

              ))}

            </select>

          </div>

        </div>



        {loading ? (

          <div className="text-center py-10 text-gray-500">

            Loading classes...

          </div>

        ) : filteredClasses.length === 0 ? (

          <div className="text-center py-10 text-gray-500">

            No classes found.

          </div>

        ) : (

          <div className="space-y-6">

            {filteredClasses.map((cls, idx) => {

              const classKey = `${cls.grade}-${cls.section}`;

              const isExpanded = expandedClass === classKey;

              return (

                <div

                  key={classKey}

                  className="bg-white rounded-xl border shadow"

                >

                  <div

                    onClick={() => setExpandedClass(isExpanded ? null : classKey)}

                    className="p-5 cursor-pointer hover:bg-gray-50 transition flex justify-between items-center"

                  >

                    <div>

                      <h4 className="text-xl font-bold text-red-800">

                        {cls.grade} – {cls.section}

                      </h4>

                      <p className="text-gray-600 mt-1 flex items-center gap-2">

                        <UserGroupIcon className="w-5 h-5 text-gray-600" />

                        Students Enrolled: <span className="font-semibold">{cls.students}</span>

                      </p>

                      {getTeacherForClass(cls.grade, cls.section) && (

                        <p className="text-gray-600 mt-1 flex items-center gap-2">

                          <UserGroupIcon className="w-5 h-5 text-red-700" />

                          Adviser: <span className="font-semibold">{getTeacherForClass(cls.grade, cls.section).firstName} {getTeacherForClass(cls.grade, cls.section).lastName}</span>

                        </p>

                      )}

                    </div>

                    <ChevronDownIcon 

                      className={`w-6 h-6 text-gray-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`}

                    />

                  </div>



                  {isExpanded && (

                    <div className="border-t p-5 bg-gray-50">

                      {cls.studentList && cls.studentList.length > 0 ? (

                        <div className="space-y-2 max-h-96 overflow-y-auto">

                          <table className="w-full text-sm">

                            <thead className="bg-gray-200">

                              <tr>

                                <th className="text-left p-2 font-semibold">LRN</th>

                                <th className="text-left p-2 font-semibold">Student Name</th>

                                <th className="text-left p-2 font-semibold">Sex</th>

                                <th className="text-left p-2 font-semibold">Status</th>

                              </tr>

                            </thead>

                            <tbody>

                              {cls.studentList.map(student => (

                                <tr key={student.id} className="border-b hover:bg-white">

                                  <td className="p-2">{student.lrn}</td>

                                  <td className="p-2 font-semibold">{student.fullName || `${student.firstName} ${student.lastName}`}</td>

                                  <td className="p-2">{student.sex || 'N/A'}</td>

                                  <td className="p-2">

                                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-semibold">

                                      {student.status || 'Active'}

                                    </span>

                                  </td>

                                </tr>

                              ))}

                            </tbody>

                          </table>

                        </div>

                      ) : (

                        <p className="text-gray-500 text-center py-4">No students in this class yet.</p>

                      )}

                      <button

                        onClick={() => navigate(`/admin/admin/classlist/${idx}`)}

                        className="mt-4 w-full bg-red-800 text-white py-2 rounded-lg hover:bg-red-700 transition"

                      >

                        View Full Class List

                      </button>

                    </div>

                  )}

                </div>

              );

            })}

          </div>

        )}

      </div>

    </div>

  );

}

