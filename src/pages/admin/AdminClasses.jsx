import React, { useState, useEffect } from "react";

import { BuildingLibraryIcon, ChevronDownIcon, UserGroupIcon, ArrowPathIcon, XMarkIcon } from "@heroicons/react/24/solid";

import { useNavigate } from "react-router-dom";

import { API_BASE_URL } from "../../api/config";
import axios from "../../api/axiosConfig";

import { toast } from 'react-toastify';
import { useSchoolYear } from "../../context/SchoolYearContext";



export default function AdminClasses() {

  const navigate = useNavigate();
  const { viewingSchoolYear, setViewingSchoolYear, setActiveSchoolYear: setContextActiveSchoolYear, isViewingLocked } = useSchoolYear();

  const [classesData, setClassesData] = useState([]);

  const [allStudents, setAllStudents] = useState([]);

  const [teachers, setTeachers] = useState([]);

  const [schoolYears, setSchoolYears] = useState([]);
  const [selectedSchoolYearId, setSelectedSchoolYearId] = useState('');
  const [activeSchoolYear, setActiveSchoolYear] = useState(null);

  const [sections, setSections] = useState([]);

  const [loading, setLoading] = useState(true);

  const [gradeFilter, setGradeFilter] = useState("All");

  const [expandedClass, setExpandedClass] = useState(null);

  const [showFetchModal, setShowFetchModal] = useState(false);

  const [prevClasses, setPrevClasses] = useState([]);

  const [selectedPrevIds, setSelectedPrevIds] = useState(new Set());

  const [fetchLoading, setFetchLoading] = useState(false);

  const normalizeGrade = (value) => String(value || '').trim().toLowerCase().replace(/^grade\s+/i, '');
  const normalizeSection = (value) => String(value || '').trim().toLowerCase();
  const sectionKey = (grade, section) => `${normalizeGrade(grade)}-${normalizeSection(section)}`;

  const getGradeSortOrder = (gradeValue = '') => {
    const raw = String(gradeValue || '').trim().toLowerCase();
    if (!raw) return 99;
    if (raw === 'kindergarten' || raw === 'kinder') return 0;

    const directMatch = raw.match(/^grade\s*(\d+)$/i);
    if (directMatch) return Number(directMatch[1]);

    const compactMatch = raw.match(/^grade(\d+)$/i);
    if (compactMatch) return Number(compactMatch[1]);

    const numberOnly = raw.match(/^(\d+)$/);
    if (numberOnly) return Number(numberOnly[1]);

    return 99;
  };

  const compareClassRows = (a, b) => {
    const gradeOrderA = getGradeSortOrder(a?.grade);
    const gradeOrderB = getGradeSortOrder(b?.grade);
    if (gradeOrderA !== gradeOrderB) return gradeOrderA - gradeOrderB;

    const gradeLabelCompare = String(a?.grade || '').localeCompare(String(b?.grade || ''), undefined, { sensitivity: 'base' });
    if (gradeLabelCompare !== 0) return gradeLabelCompare;

    return String(a?.section || '').localeCompare(String(b?.section || ''), undefined, { sensitivity: 'base' });
  };


  const fetchSchoolYears = async () => {
    try {
      const res = await axios.get('/school-years');
      const list = res.data?.data || res.data || [];
      setSchoolYears(Array.isArray(list) ? list : []);
      const active = Array.isArray(list) ? list.find((sy) => sy.is_active) : null;
      if (active) {
        setActiveSchoolYear(active);
        setContextActiveSchoolYear(active);
        if (viewingSchoolYear?.id) {
          setSelectedSchoolYearId(String(viewingSchoolYear.id));
        } else if (!selectedSchoolYearId) {
          setSelectedSchoolYearId(String(active.id));
          setViewingSchoolYear(active);
        }
      }
    } catch (error) {
      console.error('Failed to load school years:', error);
      toast.error('Failed to load school years');
    }
  };



  const fetchAndOrganizeClasses = async () => {
    try {
      if (!selectedSchoolYearId) {
        setClassesData([]);
        setAllStudents([]);
        return;
      }
      // Fetch active sections (to limit which classes display)
      let fetchedSections = [];
      try {
        const sectionsRes = await axios.get('/sections', {
          params: { schoolYearId: selectedSchoolYearId }
        });
        const sectionsJson = sectionsRes.data;
        fetchedSections = sectionsJson?.data || sectionsJson?.sections || [];
        setSections(fetchedSections);
        console.log('Sections fetched for classes:', fetchedSections.length);
        if (!Array.isArray(fetchedSections) || fetchedSections.length === 0) {
          toast.warning('No sections returned from server');
        } else {
          const sample = fetchedSections.slice(0, 3).map((s) => `${s.grade_level || s.grade || ''} - ${s.name || s.section || ''}`).join(', ');
          toast.success(`Sections loaded: ${fetchedSections.length}${sample ? ` (e.g. ${sample})` : ''}`);
        }
      } catch (err) {
        console.log('Could not fetch sections:', err.message);
        toast.error('Failed to load sections for classes');
      }

      const filterBySections = (classes) => {
        if (!fetchedSections || fetchedSections.length === 0) return classes;
        const allowed = new Set(
          fetchedSections.map((s) => sectionKey(s.grade_level || s.grade, s.name || s.section))
        );
        return classes.filter((cls) => allowed.has(sectionKey(cls.grade, cls.section)));
      };

      const mergeClasses = (lists) => {
        const map = new Map();
        lists.filter(Boolean).forEach((list) => {
          list.forEach((cls) => {
            const key = sectionKey(cls.grade, cls.section);
            if (!map.has(key)) {
              map.set(key, { ...cls });
            } else {
              const prev = map.get(key);
              map.set(key, {
                ...prev,
                ...cls,
                students: Math.max(prev.students || 0, cls.students || 0),
                studentList: [...(prev.studentList || []), ...(cls.studentList || [])]
              });
            }
          });
        });
        return Array.from(map.values());
      };

      const baseClasses = filterBySections(
        fetchedSections.map((s) => ({
          grade: s.grade_level || s.grade || '',
          section: s.name || s.section || '',
          students: 0,
          studentList: [],
        }))
      );

      // Fetch classes from backend (includes adviser_name)
      let backendClasses = [];
      try {
        const classesResponse = await axios.get('/classes', {
          params: { schoolYearId: selectedSchoolYearId }
        });
        const classesResult = classesResponse.data;
        backendClasses = Array.isArray(classesResult) ? classesResult : (classesResult.data || []);
        backendClasses = backendClasses.map((bc) => ({
          ...bc,
          grade: bc.grade || bc.grade_level || bc.gradeLevel || '',
          section: bc.section || '',
        }));
        console.log('Classes fetched from backend:', backendClasses);
      } catch (err) {
        console.log('Could not fetch classes from backend:', err.message);
      }

      // Fetch students for enrollment count
      const studentsResponse = await axios.get('/students', {
        params: { schoolYearId: selectedSchoolYearId }
      });
      if (studentsResponse.status === 200) {
        const result = studentsResponse.data;
        const students = result.data ? result.data : (Array.isArray(result) ? result : []);
        setAllStudents(students);
        console.log('Students fetched:', students.length);
        if (!Array.isArray(students) || students.length === 0) {
          toast.info('No students returned from server');
        }
        
        // Organize students by grade/section
        const studentClasses = organizeByGradeAndSection(students);

        // Merge adviser info from backend classes into student classes
        const studentPlusAdviser = studentClasses.map((studentClass) => {
          const backendClass = backendClasses.find(
            (bc) => sectionKey(bc.grade, bc.section) === sectionKey(studentClass.grade, studentClass.section)
          );
          return {
            ...studentClass,
            adviser_name: backendClass?.adviser_name || null,
            adviser_id: backendClass?.adviser_id || null,
          };
        });

        // Build union of sections, students, backend (no filtering so new sections always show)
        const union = mergeClasses([baseClasses, studentPlusAdviser, backendClasses]);
        setClassesData(union);
      } else {
        const union = mergeClasses([baseClasses, backendClasses]);
        setClassesData(union);
        setAllStudents([]);
      }

      // Fetch teachers
      try {
        const teachersResponse = await axios.get('/users', {
          params: { schoolYearId: selectedSchoolYearId }
        });
        if (teachersResponse.status === 200) {
          const data = teachersResponse.data;
          const allUsers = data.data?.users || data.users || data.data || [];
          console.log('All Users fetched:', Array.isArray(allUsers) ? allUsers.length : 0);
          const teachersList = Array.isArray(allUsers) 
            ? allUsers.filter(user => ['teacher', 'subject_teacher', 'adviser'].includes(user.role))
            : [];
          console.log('Teachers filtered:', teachersList.length);
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
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchSchoolYears();
  }, []);

  useEffect(() => {
    if (viewingSchoolYear?.id) {
      setSelectedSchoolYearId(String(viewingSchoolYear.id));
    }
  }, [viewingSchoolYear?.id]);

  useEffect(() => {
    if (selectedSchoolYearId) {
      setLoading(true);
      fetchAndOrganizeClasses();
    }
  }, [selectedSchoolYearId]);

  // Fetch classes from backend with adviser info
  useEffect(() => {
    fetchAndOrganizeClasses();
  }, []);


  const loadPrevClasses = async () => {
    if (isViewOnly) {
      toast.error('Previous school years are view-only. Switch to the active year to fetch classes.');
      return;
    }
    if (!selectedSchoolYearId) {
      toast.error('Select a school year first');
      return;
    }
    try {
      setFetchLoading(true);
      const res = await fetch(`${API_BASE_URL}/classes/previous-year?schoolYearId=${selectedSchoolYearId}`);
      if (!res.ok) throw new Error('Failed to load previous classes');
      const data = await res.json();
      const list = data?.data || [];
      setPrevClasses(list);
      setSelectedPrevIds(new Set());
    } catch (error) {
      console.error('Error loading previous year classes:', error);
      toast.error('Failed to load previous year classes');
    } finally {
      setFetchLoading(false);
    }
  };



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
      sectionKey(teacher.gradeLevel || teacher.grade_level, teacher.section)
      === sectionKey(grade, section)
    );

  };



  const sortedClasses = [...classesData].sort(compareClassRows);

  const filteredClasses = gradeFilter === "All" 

    ? sortedClasses 

    : sortedClasses.filter(cls => cls.grade === gradeFilter);


  const togglePrevSelection = (id) => {

    setSelectedPrevIds((prev) => {

      const next = new Set(prev);

      if (next.has(id)) next.delete(id);

      else next.add(id);

      return next;

    });

  };



  const toggleSelectAllPrev = () => {

    if (selectedPrevIds.size === prevClasses.length) {

      setSelectedPrevIds(new Set());

    } else {

      setSelectedPrevIds(new Set(prevClasses.map((c) => c.id)));

    }

  };



  const handleFetchFromPrevious = async () => {

    if (isViewOnly) {
      toast.error('Previous school years are view-only. Switch to the active year to copy classes.');
      return;
    }

    if (!selectedSchoolYearId) {
      toast.error('Select a school year first');
      return;
    }

    try {

      setFetchLoading(true);

      const ids = Array.from(selectedPrevIds);

      const res = await fetch(`${API_BASE_URL}/classes/fetch-from-previous?schoolYearId=${selectedSchoolYearId}`, {

        method: 'POST',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({ ids })

      });

      if (!res.ok) {

        const err = await res.json().catch(() => ({}));

        throw new Error(err.message || 'Failed to fetch classes');

      }

      const payload = await res.json();

      toast.success(`Fetched classes: inserted ${payload?.data?.inserted || 0}, skipped ${payload?.data?.skipped || 0}`);

      setShowFetchModal(false);

      setSelectedPrevIds(new Set());
      setLoading(true);
      await fetchAndOrganizeClasses();

    } catch (error) {

      console.error('Error fetching classes from previous year:', error);

      toast.error(error.message || 'Failed to fetch classes');

    } finally {

      setFetchLoading(false);

      setLoading(false);

    }

  };



  const totalStudents = classesData.reduce((sum, cls) => sum + cls.students, 0);

  const uniqueGrades = [...new Set(classesData.map(cls => cls.grade))].sort((a, b) => {
    const orderA = getGradeSortOrder(a);
    const orderB = getGradeSortOrder(b);
    if (orderA !== orderB) return orderA - orderB;
    return String(a || '').localeCompare(String(b || ''), undefined, { sensitivity: 'base' });
  });

  const uniqueSections = [...new Set(classesData.map(cls => cls.section))];

  const isViewOnly = activeSchoolYear && selectedSchoolYearId && Number(selectedSchoolYearId) !== Number(activeSchoolYear.id);



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

      <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm font-semibold text-gray-700">School Year</label>
          <select
            value={selectedSchoolYearId}
            onChange={(e) => {
              const nextId = e.target.value;
              setSelectedSchoolYearId(nextId);
              const matched = schoolYears.find((sy) => String(sy.id) === String(nextId));
              if (matched) setViewingSchoolYear(matched);
            }}
            className="border border-gray-300 rounded px-3 py-2 text-sm"
          >
            <option value="">Select school year</option>
            {schoolYears.map((sy) => (
              <option key={sy.id} value={sy.id}>{sy.label}</option>
            ))}
          </select>
          {isViewOnly && (
            <span className="text-xs text-orange-700 bg-orange-100 px-2 py-1 rounded">View-only for previous year</span>
          )}
        </div>
        {!selectedSchoolYearId && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded px-3 py-2">Select a school year to load classes.</p>
        )}
      </div>



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

          <div className="flex items-center gap-3">

            <button

              onClick={() => { setShowFetchModal(true); loadPrevClasses(); }}

              disabled={isViewOnly}

              className="flex items-center gap-2 bg-red-800 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"

            >

              <ArrowPathIcon className="w-5 h-5" />

              Fetch from Previous Year

            </button>

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

                        Students Enrolled: <span className="font-semibold">{cls.students || cls.studentList?.length || 0}</span>

                      </p>

                      {cls.adviser_name ? (

                        <p className="text-gray-600 mt-1 flex items-center gap-2">

                          <UserGroupIcon className="w-5 h-5 text-red-700" />

                          Adviser: <span className="font-semibold text-green-600">{cls.adviser_name}</span>

                        </p>

                      ) : getTeacherForClass(cls.grade, cls.section) ? (

                        <p className="text-gray-600 mt-1 flex items-center gap-2">

                          <UserGroupIcon className="w-5 h-5 text-red-700" />

                          Adviser: <span className="font-semibold">{getTeacherForClass(cls.grade, cls.section).firstName} {getTeacherForClass(cls.grade, cls.section).lastName}</span>

                        </p>

                      ) : (

                        <p className="text-gray-600 mt-1 flex items-center gap-2">

                          <UserGroupIcon className="w-5 h-5 text-red-700" />

                          Adviser: <span className="font-semibold text-red-500">Not Assigned</span>

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

                        onClick={() => {
                          const classRef = cls?.id ? String(cls.id) : `gs:${cls?.grade || ''}::${cls?.section || ''}`;
                          const params = new URLSearchParams({
                            schoolYearId: String(selectedSchoolYearId || ''),
                            grade: String(cls?.grade || ''),
                            section: String(cls?.section || '')
                          });
                          navigate(`/admin/admin/classlist/${encodeURIComponent(classRef)}?${params.toString()}`);
                        }}

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

      {/* Fetch from Previous Year Modal */}
      {showFetchModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-3xl mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">Fetch Classes from Previous School Year</h3>
              <button
                onClick={() => setShowFetchModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-600">Select classes to copy into the current school year. Grade/Section duplicates are skipped. Subject-teacher assignments are copied with each class.</p>
              <button
                onClick={toggleSelectAllPrev}
                className="text-sm px-3 py-1.5 rounded bg-red-800 text-white hover:bg-red-700"
              >
                {selectedPrevIds.size === prevClasses.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="border rounded-lg max-h-[420px] overflow-y-auto">
              {fetchLoading ? (
                <div className="flex items-center justify-center py-10 text-gray-500">Loading previous year classes...</div>
              ) : prevClasses.length === 0 ? (
                <div className="flex items-center justify-center py-10 text-gray-500">No classes found in previous year.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-3 text-left">Select</th>
                      <th className="p-3 text-left">Grade & Section</th>
                      <th className="p-3 text-left">Adviser</th>
                      <th className="p-3 text-left">Subject Teachers</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prevClasses.map((cls) => (
                      <tr key={cls.id} className="border-b">
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={selectedPrevIds.has(cls.id)}
                            onChange={() => togglePrevSelection(cls.id)}
                          />
                        </td>
                        <td className="p-3 font-medium text-gray-800">{cls.grade} – {cls.section}</td>
                        <td className="p-3 text-gray-600">{cls.adviser_name || '—'}</td>
                        <td className="p-3 text-gray-600">{cls.subject_teachers?.length || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={() => setShowFetchModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleFetchFromPrevious}
                disabled={fetchLoading || selectedPrevIds.size === 0}
                className="px-4 py-2 bg-red-800 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
              >
                {fetchLoading ? 'Fetching...' : `Fetch ${selectedPrevIds.size || ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>

  );

}

