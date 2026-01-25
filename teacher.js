// teacher.js - Teacher dashboard and course management functions

import { renderHeader, showToast, showModal, closeModal, renderCharts, getSkillColorClass, calculateAverageScore, renderConfirmModal, saveSessionToLocalStorage, calculateSkillAverages } from './shared.js';
import { 
    getUsers, setCourses, getLessons, setLessons,
    getProgress, getEnrollments, getHomeworks,
    getCurrentUser, getCurrentView, getCurrentCourseId, getCurrentActiveTab, setCurrentView, 
    setCurrentCourseId, setCurrentStudentIdForProgress, getOverviewFilterLessonId, setOverviewFilterLessonId,
    getCourses, setCurrentActiveTab
} from './shared.js';
import { generateStudentProgressReport } from './student.js';
import { updateDoc, doc, deleteDoc, writeBatch, addDoc, collection, serverTimestamp, setDoc, deleteField, db } from './firebase.js';
import { navigate } from './navigation.js';

// ═══════════════════════════════════════════════════════════════════════════════════
// TEACHER RENDER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════════

export const renderTeacherDashboard = (appContainerEl = document.getElementById('app')) => {
    if (getCurrentView() !== 'course' && getCurrentView() !== 'studentProgress' && getCurrentView() !== 'studentReport') {
        setCurrentView('dashboard');
        saveSessionToLocalStorage();
    }
    document.title = "Teacher Dashboard | SmartEdu x AT";
    const users = getUsers();
    const myCourses = getCourses().filter(c => c.createdBy === getCurrentUser().id);
    const currentUser = getCurrentUser();
    appContainerEl.innerHTML = `<div class="w-full max-w-7xl mx-auto fade-in">${renderHeader('Teacher Dashboard')}<div class="grid grid-cols-1 md:grid-cols-3 gap-8 mt-6"><div class="md:col-span-2 bg-white p-6 rounded-xl shadow-lg"><h2 class="text-2xl font-bold mb-4">Khoá học của tôi</h2><div class="space-y-3">${myCourses.length > 0 ? myCourses.map(c => `<div class="p-4 bg-slate-50 rounded-lg flex items-start gap-4 overflow-hidden"><div class="flex-1 min-w-0 overflow-hidden"><h3 class="font-semibold text-lg truncate">${c.title}</h3><p class="text-sm text-slate-500 line-clamp-2 mt-1 overflow-hidden whitespace-pre-wrap break-words">${c.description}</p></div><div class="space-x-2 flex-shrink-0 flex whitespace-nowrap"><button class="edit-course-btn text-gray-500 hover:text-blue-700" data-id="${c.id}" title="Chỉnh sửa thông tin"><i class="fas fa-pen"></i></button><button class="manage-course-btn bg-blue-50 text-blue-600 px-4 py-1 rounded-full border border-blue-200 font-semibold text-sm hover:bg-blue-100 whitespace-nowrap" data-id="${c.id}">Quản lý</button></div></div>`).join('') : '<p class="text-slate-500">Bạn chưa tạo khoá học nào.</p>'}</div></div><div class="bg-white p-6 rounded-xl shadow-lg h-fit"><h2 class="text-2xl font-bold mb-4">Tạo khoá học mới</h2><div class="space-y-3"><input type="text" id="new-course-title" placeholder="Tiêu đề khoá học" class="w-full p-2 border rounded-lg"><textarea id="new-course-desc" placeholder="Mô tả khoá học" class="w-full p-2 border rounded-lg h-24"></textarea><input type="text" id="new-course-script-url" placeholder="URL Google Apps Script Web App (bắt buộc)" class="w-full p-2 border rounded-lg" title="URL để tạo folder khóa học tự động"><button id="add-course-btn" class="w-full bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700">Tạo mới</button></div></div></div></div>`;
};

export const renderEditCourseModal = (courseId) => {
    const course = getCourses().find(c => c.id === courseId);
    if (!course) return;
    const modalContent = `
         <div class="bg-white w-full max-w-2xl rounded-xl shadow-lg p-6 fade-in">
             <h2 class="text-2xl font-bold mb-4">Chỉnh sửa Khoá học</h2>
             <div class="space-y-4">
                 <div>
                     <label for="edit-course-title" class="block text-sm font-medium text-slate-600 mb-1">Tiêu đề khoá học:</label>
                     <input type="text" id="edit-course-title" class="w-full p-2 border rounded-lg" value="${course.title}">
                 </div>
                 <div>
                     <label for="edit-course-desc" class="block text-sm font-medium text-slate-600 mb-1">Mô tả:</label>
                     <textarea id="edit-course-desc" class="w-full p-2 border rounded-lg h-40">${course.description}</textarea>
                 </div>
                 ${course.courseFolderUrl ? `
                 <div>
                     <label class="block text-sm font-medium text-slate-600 mb-1">Thư mục lớp học:</label>
                     <a href="${course.courseFolderUrl}" target="_blank" class="inline-flex items-center bg-yellow-100 text-yellow-700 font-semibold px-4 py-2 rounded-lg hover:bg-yellow-200 transition-colors">
                         <i class="fab fa-google-drive mr-2"></i>Mở thư mục
                     </a>
                 </div>
                 ` : `
                 <div class="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                     <p class="text-sm text-blue-700"><i class="fas fa-info-circle mr-2"></i>Folder khóa học sẽ được tạo tự động khi bạn lưu.</p>
                 </div>
                 `}
                 <div>
                     <label for="edit-course-script-url" class="block text-sm font-medium text-slate-600 mb-1">URL Google Apps Script Web App:</label>
                     <input type="text" id="edit-course-script-url" class="w-full p-2 border rounded-lg" value="${course.scriptUrl || ''}" placeholder="https://script.google.com/macros/d/.../usercontent">
                     <p class="text-xs text-slate-500 mt-1">Để kích hoạt nộp bài tự động cho học sinh</p>
                 </div>
             </div>
             <div class="mt-6 flex justify-end space-x-3">
                 <button class="cancel-modal-btn px-4 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300">Huỷ</button>
                 <button id="save-course-btn" data-course-id="${courseId}" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Lưu thay đổi</button>
             </div>
         </div>
    `;
    showModal(modalContent);
};

export const renderTeacherCourseManagement = (courseId, isRestoring = false) => {
    if (!isRestoring) {
        setCurrentView('course');
    }
    setCurrentCourseId(courseId);
    const course = getCourses().find(c => c.id === courseId);
    if(!course) return renderTeacherDashboard();
    document.title = `Quản lý: ${course.title}`;
    
    const appContainer = document.getElementById('app');
    const currentActiveTab = getCurrentActiveTab();
    appContainer.innerHTML = `
         <div class="w-full max-w-7xl mx-auto fade-in">
             ${renderHeader(course.title, true)}
             <main class="mt-6">
                 <div class="border-b border-gray-200 mb-6 bg-white/80 backdrop-blur-sm shadow-sm rounded-t-lg sticky top-20 z-30">
                     <nav class="-mb-px flex space-x-6 overflow-x-auto px-6">
                         <button data-tab="overview" class="tab-btn ${currentActiveTab === 'overview' ? 'tab-active' : 'text-gray-500 hover:text-gray-700'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm">Tổng quan</button>
                         <button data-tab="lessons" class="tab-btn ${currentActiveTab === 'lessons' ? 'tab-active' : 'text-gray-500 hover:text-gray-700'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm">Bài học</button>
                         <button data-tab="students-progress" class="tab-btn ${currentActiveTab === 'students-progress' ? 'tab-active' : 'text-gray-500 hover:text-gray-700'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm">Học sinh & Tiến độ</button>
                     </nav>
                 </div>

                 <div class="bg-white p-6 md:p-8 rounded-b-xl shadow-lg -mt-8 pt-14">
                     <div id="tab-overview" class="tab-content ${currentActiveTab === 'overview' ? '' : 'hidden'}"></div>
                     <div id="tab-lessons" class="tab-content ${currentActiveTab === 'lessons' ? '' : 'hidden'}"></div>
                     <div id="tab-students-progress" class="tab-content ${currentActiveTab === 'students-progress' ? '' : 'hidden'}"></div>
                 </div>
             </main>
         </div>`;
    
    updateTeacherCourseTabs();
};

export const updateTeacherCourseTabs = () => {
    const users = getUsers();
    const enrollments = getEnrollments();
    const currentUser = getCurrentUser();
    const currentView = getCurrentView();
    const currentCourseId = getCurrentCourseId();
    
    if (currentView !== 'course' || currentUser?.role !== 'teacher') return;
    const courseId = currentCourseId;
    const enrolledStudents = users.filter(u => u.role === 'student' && enrollments.some(e => e.courseId === courseId && e.studentId === u.id));

    const overviewResult = renderTeacherCourseTabs.overview(courseId, enrolledStudents);
    const overviewTab = document.getElementById('tab-overview');
    if(overviewTab) {
        overviewTab.innerHTML = overviewResult.html;
        if(overviewResult.chartData) {
            setTimeout(() => renderCharts(overviewResult.chartData, 'overview-'), 50);
        }
    }
    
    const lessonsTab = document.getElementById('tab-lessons');
    if (lessonsTab) {
        lessonsTab.innerHTML = renderTeacherCourseTabs.lessons(courseId);
    }

    const studentsTab = document.getElementById('tab-students-progress');
    if (studentsTab) {
        studentsTab.innerHTML = renderTeacherCourseTabs.students(courseId, enrolledStudents);
    }
};

export const renderTeacherCourseTabs = {
    overview: (courseId, enrolledStudents) => {
        const lessons = getLessons();
        const homeworks = getHomeworks();
        const progress = getProgress();
        const overviewFilterLessonId = getOverviewFilterLessonId();
        
        let allLessonsWithHomework = lessons
            .filter(l => l.courseId === courseId && homeworks.some(h => h.lessonId === l.id))
            .sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
        
        const allLessonsInCourse = lessons
            .filter(l => l.courseId === courseId)
            .sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));

        if (enrolledStudents.length === 0 ) {
            return { html: '<div class="text-center py-12"><i class="fas fa-info-circle fa-2x text-slate-400"></i><p class="mt-4 text-slate-500">Chưa có học sinh trong khóa học.</p></div>' };
        }
        if (allLessonsWithHomework.length === 0) {
             return { html: '<div class="text-center py-12"><i class="fas fa-info-circle fa-2x text-slate-400"></i><p class="mt-4 text-slate-500">Chưa có bài tập nào để hiển thị tổng quan.</p></div>'};
        }
        
        const lessonsForStats = overviewFilterLessonId === 'all' 
            ? allLessonsWithHomework 
            : allLessonsWithHomework.filter(l => l.id === overviewFilterLessonId);
        
        // ...existing code...
        let totalSubmissions = 0, totalGraded = 0, totalDeadlineMissedForGrading = 0;
        let totalPresent = 0, totalLate = 0, totalAbsentExcused = 0, totalAbsentUnexcused = 0;
        const totalPossibleSubmissions = enrolledStudents.length * lessonsForStats.length;
        const totalAttendanceSlots = enrolledStudents.length * allLessonsInCourse.length;
        
        const allReadingScores = [], allListeningScores = [], allSpeakingScores = [], allWritingScores = [];

        enrolledStudents.forEach(student => {
            lessonsForStats.forEach(lesson => {
                const progressRecord = progress.find(p => p.studentId === student.id && p.lessonId === lesson.id);
                
                // Nếu đã nộp
                if (progressRecord?.submittedAt) {
                    totalSubmissions++;
                    if (progressRecord.grade != null) {
                        totalGraded++;
                        if (progressRecord.grades) {
                            allReadingScores.push(progressRecord.grades.reading ?? 0);
                            allListeningScores.push(progressRecord.grades.listening ?? 0);
                            allSpeakingScores.push(progressRecord.grades.speaking ?? 0);
                            allWritingScores.push(progressRecord.grades.writing ?? 0);
                        }
                    }
                }
                // Nếu chưa nộp nhưng giáo viên đánh dấu hết hạn → tính 0
                else if (!progressRecord?.submittedAt && progressRecord?.isDeadlineMissed) {
                    totalSubmissions++;
                    totalGraded++;
                    totalDeadlineMissedForGrading++;
                    allReadingScores.push(0);
                    allListeningScores.push(0);
                    allSpeakingScores.push(0);
                    allWritingScores.push(0);
                }
            });
            allLessonsInCourse.forEach(lesson => {
                const progressRecord = progress.find(p => p.studentId === student.id && p.lessonId === lesson.id);
                if (progressRecord?.attendanceStatus) {
                    switch (progressRecord.attendanceStatus) {
                        case 'present': totalPresent++; break;
                        case 'late': totalLate++; break;
                        case 'absent_excused': totalAbsentExcused++; break;
                        case 'absent_unexcused': totalAbsentUnexcused++; break;
                    }
                }
            });
        });

        const calculateAvg = (scores) => scores.length > 0 ? parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)) : 0;
        const classAvgReading = calculateAvg(allReadingScores);
        const classAvgListening = calculateAvg(allListeningScores);
        const classAvgSpeaking = calculateAvg(allSpeakingScores);
        const classAvgWriting = calculateAvg(allWritingScores);
        
        const totalRecorded = totalPresent + totalLate + totalAbsentExcused + totalAbsentUnexcused;
        const totalNotRecorded = totalAttendanceSlots - totalRecorded;
        
        const chartData = {
            submission: { labels: ['Đã nộp', 'Chưa nộp'], datasets: [{ data: [totalSubmissions, totalPossibleSubmissions > totalSubmissions ? totalPossibleSubmissions - totalSubmissions : 0], backgroundColor: ['#3b82f6', '#e2e8f0']}] },
            grading: { labels: ['Đã chấm', 'Chưa chấm', 'Hết hạn chấm'], datasets: [{ data: [totalGraded - totalDeadlineMissedForGrading, totalSubmissions - totalGraded, totalDeadlineMissedForGrading], backgroundColor: ['#22c55e', '#facc15', '#3b82f6']}] },
            attendance: { labels: ['Có mặt', 'Đi trễ', 'Vắng có phép', 'Vắng không phép', 'Chưa điểm danh'], datasets: [{ data: [totalPresent, totalLate, totalAbsentExcused, totalAbsentUnexcused, totalNotRecorded], backgroundColor: ['#22c55e', '#f97316', '#facc15', '#ef4444', '#e2e8f0'] }] },
            skills: { labels: ['Đọc', 'Nghe', 'Nói', 'Viết'], datasets: [{ label: 'Điểm trung bình', data: [classAvgReading, classAvgListening, classAvgSpeaking, classAvgWriting], backgroundColor: 'rgba(59, 130, 246, 0.2)', borderColor: 'rgba(59, 130, 246, 1)', pointBackgroundColor: 'rgba(59, 130, 246, 1)', }] }
        };

        const lessonsForTable = (overviewFilterLessonId === 'all') 
            ? allLessonsWithHomework 
            : allLessonsWithHomework.filter(l => l.id === overviewFilterLessonId);

        const filterMessage = "Nhấn vào ô để chỉnh sửa nhanh. 🟢 Xanh = đã chấm | 🟡 Vàng = chưa chấm | 🔴 Đỏ = chưa nộp | 🔵 Xanh dương = hết hạn nộp";

        // Heatmap view (12 bài 1 dòng, xuống hàng khi vượt quá)
        const heatmapView = enrolledStudents.length > 0 
            ? `<div class="rounded-2xl overflow-hidden shadow-2xl border-2 border-slate-100 bg-white">
                <!-- Header -->
                <div class="bg-gradient-to-r from-blue-700 to-blue-600 px-8 py-6 text-white">
                    <h3 class="text-2xl font-bold mb-3">📊 Bảng Tiến Độ Học Tập</h3>
                    <div class="flex flex-wrap gap-6 text-sm font-medium">
                        <div class="flex items-center gap-3"><div class="w-4 h-4 bg-green-400 rounded-full shadow-md"></div><span>Đã chấm</span></div>
                        <div class="flex items-center gap-3"><div class="w-4 h-4 bg-yellow-300 rounded-full shadow-md"></div><span>Chưa chấm</span></div>
                        <div class="flex items-center gap-3"><div class="w-4 h-4 bg-red-400 rounded-full shadow-md"></div><span>Chưa nộp</span></div>
                        <div class="flex items-center gap-3"><div class="w-4 h-4 bg-blue-600 rounded-full shadow-md"></div><span>Hết hạn nộp</span></div>
                    </div>
                </div>

                <!-- Column headers -->
                <div class="bg-gradient-to-r from-slate-50 to-slate-100 border-b-4 border-slate-300 px-6 py-4 grid grid-cols-12 gap-0 sticky top-0 z-10">
                    <div class="col-span-2 pr-4"><span class="text-sm font-bold text-slate-800 uppercase tracking-wider">Học sinh</span></div>
                    <div class="col-span-6 pr-4"><span class="text-sm font-bold text-slate-800 uppercase tracking-wider">Tiến độ</span></div>
                    <div class="col-span-2 pr-4 text-center"><span class="text-sm font-bold text-slate-800 uppercase tracking-wider">Kỹ năng</span></div>
                    <div class="col-span-2 pl-4 text-center"><span class="text-sm font-bold text-slate-800 uppercase tracking-wider">Điểm trung bình</span></div>
                </div>

                <!-- Rows -->
                <div class="divide-y-2 divide-slate-200">
                    ${enrolledStudents.map((student, rowIdx) => {
                        let totalScore = 0, scoredCount = 0;
                        const dotsHtml = lessonsForTable.map((lesson, idx) => {
                            const progressRecord = progress.find(p => p.studentId === student.id && p.lessonId === lesson.id);
                            let dotClass = 'bg-red-400';
                            let tooltipText = 'Chưa nộp';
                            
                            if (progressRecord?.submittedAt) {
                                if (progressRecord.grade === null || progressRecord.grade === undefined) {
                                    dotClass = 'bg-yellow-300';
                                    tooltipText = 'Chưa chấm';
                                } else {
                                    dotClass = 'bg-green-400';
                                    tooltipText = 'Điểm: ' + progressRecord.grade;
                                    totalScore += parseFloat(progressRecord.grade);
                                    scoredCount++;
                                }
                            }
                            // Nếu hết hạn nộp → tính 0
                            else if (progressRecord?.isDeadlineMissed) {
                                dotClass = 'bg-blue-600';
                                tooltipText = '⏰ Hết hạn nộp';
                                totalScore += 0;
                                scoredCount++;
                            }
                            
                            return '<div class="flex flex-col items-center edit-progress-shortcut-btn cursor-pointer group" data-student-id="' + student.id + '" data-lesson-id="' + lesson.id + '" title="' + tooltipText + ' - ' + lesson.title + '"><div class="w-6 h-6 rounded-full ' + dotClass + ' hover:scale-125 transition-all shadow-md ring-1 ring-offset-1 ring-white hover:ring-blue-400 group-hover:shadow-lg"></div><span class="text-xs font-bold text-slate-700 mt-1">' + (idx + 1) + '</span></div>';
                        }).join('');
                        
                        const avgScore = scoredCount > 0 ? (totalScore / scoredCount).toFixed(1) : '--';
                        
                        // Calculate skill averages using shared utility function
                        const studentProgress = progress.filter(p => p.studentId === student.id && lessonsForTable.some(l => l.id === p.lessonId));
                        const skillAverages = calculateSkillAverages(lessonsForTable, studentProgress);
                        const readingAvg = skillAverages.reading;
                        const listeningAvg = skillAverages.listening;
                        const speakingAvg = skillAverages.speaking;
                        const writingAvg = skillAverages.writing;
                        
                        const skillsHtml = `<div class="flex flex-col gap-6 items-center justify-center">
                            <div class="flex gap-6">
                                <span class="inline-block w-12 px-2 py-1.5 rounded-lg text-xs font-bold text-center ${getSkillColorClass(listeningAvg)} shadow-sm">Nghe ${listeningAvg}</span>
                                <span class="inline-block w-12 px-2 py-1.5 rounded-lg text-xs font-bold text-center ${getSkillColorClass(readingAvg)} shadow-sm">Đọc ${readingAvg}</span>
                            </div>
                            <div class="flex gap-6">
                                <span class="inline-block w-12 px-2 py-1.5 rounded-lg text-xs font-bold text-center ${getSkillColorClass(speakingAvg)} shadow-sm">Nói ${speakingAvg}</span>
                                <span class="inline-block w-12 px-2 py-1.5 rounded-lg text-xs font-bold text-center ${getSkillColorClass(writingAvg)} shadow-sm">Viết ${writingAvg}</span>
                            </div>
                        </div>`;
                        
                        return '<div class="grid grid-cols-12 gap-0 px-6 py-5 items-center hover:bg-gradient-to-r hover:from-blue-50 hover:to-transparent transition-all ' + (rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50') + '"><div class="col-span-2 pr-4"><span class="font-semibold text-sm text-slate-900 cursor-pointer hover:text-blue-700 view-student-progress-btn block truncate transition-colors" data-student-id="' + student.id + '" title="Click để xem báo cáo - ' + student.name + '">' + student.name + '</span></div><div class="col-span-6 flex flex-wrap gap-3 justify-start items-center content-center">' + dotsHtml + '</div><div class="col-span-2 flex items-center justify-center">' + skillsHtml + '</div><div class="col-span-2 pl-4 text-center"><span class="inline-block font-bold text-xl text-white bg-gradient-to-r from-blue-700 to-blue-600 px-4 py-3 rounded-full shadow-lg hover:shadow-xl transition-shadow">' + avgScore + '</span></div></div>';
                    }).join('')}
                </div>
            </div>`
            : '';

        const tableOrMessage = heatmapView;
        
        const html = `
        <div>
            <h3 class="text-xl font-bold mb-4">Tổng quan tiến độ lớp học</h3>
            <div class="mb-8 p-6 bg-slate-50 rounded-xl">
                <div class="flex justify-between items-center mb-4">
                    <h4 class="text-lg font-semibold text-slate-700">Thống kê chung</h4>
                    <div class="flex items-center">
                        <label for="overview-filter" class="text-sm font-medium text-slate-600">Lọc theo:</label>
                        <select id="overview-filter" class="ml-2 p-1.5 border rounded-md text-sm bg-white shadow-sm focus:ring-blue-500 focus:border-blue-500">
                            <option value="all">Tất cả bài tập</option>
                            ${allLessonsWithHomework.map(l => `<option value="${l.id}" ${overviewFilterLessonId === l.id ? 'selected' : ''}>${l.title}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div class="bg-white p-4 rounded-xl shadow-lg flex flex-col h-72"><h5 class="text-center font-semibold text-slate-600 mb-2 flex-shrink-0">Tỉ lệ Nộp & Chấm bài</h5><div class="relative flex-grow min-h-0"><canvas id="overview-submissionChart"></canvas></div></div>
                    <div class="bg-white p-4 rounded-xl shadow-lg flex flex-col h-72"><h5 class="text-center font-semibold text-slate-600 mb-2 flex-shrink-0">Tỉ lệ Chấm bài</h5><div class="relative flex-grow min-h-0"><canvas id="overview-gradingChart"></canvas></div></div>
                    <div class="bg-white p-4 rounded-xl shadow-lg flex flex-col h-72"><h5 class="text-center font-semibold text-slate-600 mb-2 flex-shrink-0">Chuyên cần</h5><div class="relative flex-grow min-h-0"><canvas id="overview-attendanceChart"></canvas></div></div>
                    <div class="bg-white p-4 rounded-xl shadow-lg flex flex-col h-72"><h5 class="text-center font-semibold text-slate-600 mb-2 flex-shrink-0">Điểm Kỹ năng TB</h5><div class="relative flex-grow min-h-0"><canvas id="overview-skillsChart"></canvas></div></div>
                </div>
            </div>
            <p class="text-sm text-slate-500 mb-6">${filterMessage}</p>
            ${tableOrMessage}
        </div>`;

        return { html, chartData };
    },
    lessons: (courseId) => {
        const lessons = getLessons();
        const homeworks = getHomeworks();
        const courseLessons = lessons.filter(l => l.courseId === courseId).sort((a,b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
        
        // Calculate skill distribution
        const skillCount = { reading: 0, listening: 0, speaking: 0, writing: 0 };
        let totalSkillSlots = 0;
        
        courseLessons.forEach(l => {
            const skillsToTeach = l.skillsToTeach || [];
            skillsToTeach.forEach(skill => {
                if (skill in skillCount) {
                    skillCount[skill]++;
                    totalSkillSlots++;
                }
            });
        });
        
        // Calculate percentages and find highest/lowest skills
        const skillPercentages = {};
        let maxPercentage = 0;
        let minPercentage = 100;
        let maxSkill = '';
        let minSkill = '';
        
        Object.keys(skillCount).forEach(skill => {
            const percentageNum = totalSkillSlots > 0 ? (skillCount[skill] / totalSkillSlots) * 100 : 0;
            const percentage = percentageNum.toFixed(1);
            skillPercentages[skill] = percentage;
            if (skillCount[skill] > 0) {
                if (percentageNum >= maxPercentage) {
                    maxPercentage = percentageNum;
                    maxSkill = skill;
                }
                if (percentageNum <= minPercentage) {
                    minPercentage = percentageNum;
                    minSkill = skill;
                }
            }
        });
        
        // Map skill names
        const skillNames = { reading: 'Đọc', listening: 'Nghe', speaking: 'Nói', writing: 'Viết' };
        const maxSkillName = skillNames[maxSkill] || '';
        const minSkillName = skillNames[minSkill] || '';
        
        const skillStatsHtml = totalSkillSlots > 0 ? `
            <div class="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200">
                <h4 class="text-lg font-bold text-slate-800 mb-4">📊 Thống kê Kỹ năng</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div class="grid grid-cols-2 gap-3">
                        <div class="p-3 bg-white rounded-lg shadow-sm border-l-4 border-blue-500">
                            <p class="text-xs text-slate-500">Nghe</p>
                            <p class="text-2xl font-bold text-blue-600">${skillCount.listening}</p>
                            <p class="text-xs text-slate-600">${skillPercentages.listening}%</p>
                        </div>
                        <div class="p-3 bg-white rounded-lg shadow-sm border-l-4 border-purple-500">
                            <p class="text-xs text-slate-500">Nói</p>
                            <p class="text-2xl font-bold text-purple-600">${skillCount.speaking}</p>
                            <p class="text-xs text-slate-600">${skillPercentages.speaking}%</p>
                        </div>
                        <div class="p-3 bg-white rounded-lg shadow-sm border-l-4 border-green-500">
                            <p class="text-xs text-slate-500">Đọc</p>
                            <p class="text-2xl font-bold text-green-600">${skillCount.reading}</p>
                            <p class="text-xs text-slate-600">${skillPercentages.reading}%</p>
                        </div>
                        <div class="p-3 bg-white rounded-lg shadow-sm border-l-4 border-orange-500">
                            <p class="text-xs text-slate-500">Viết</p>
                            <p class="text-2xl font-bold text-orange-600">${skillCount.writing}</p>
                            <p class="text-xs text-slate-600">${skillPercentages.writing}%</p>
                        </div>
                    </div>
                    <div class="p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg border-2 border-amber-300 flex flex-col justify-center">
                        <div class="mb-4">
                            <p class="text-sm font-semibold text-slate-700 mb-3">📈 Kỹ năng cao nhất & thấp nhất:</p>
                            <div class="space-y-2">
                                <div class="flex justify-between items-center p-2 bg-white rounded border-l-4 border-green-500">
                                    <span class="text-sm font-medium">🔼 Cao nhất:</span>
                                    <span class="text-lg font-bold text-green-600">${maxSkillName} (${maxPercentage.toFixed(1)}%)</span>
                                </div>
                                <div class="flex justify-between items-center p-2 bg-white rounded border-l-4 border-red-500">
                                    <span class="text-sm font-medium">🔽 Thấp nhất:</span>
                                    <span class="text-lg font-bold text-red-600">${minSkillName} (${minPercentage.toFixed(1)}%)</span>
                                </div>
                            </div>
                        </div>
                        <div class="p-3 bg-blue-100 rounded border-l-4 border-blue-500">
                            <p class="text-xs text-blue-800 font-semibold">💡 Khuyến nghị:</p>
                            <p class="text-xs text-blue-700 mt-1">Hãy thêm bài học tập trung vào <strong>${minSkillName}</strong> để cân bằng hơn với <strong>${maxSkillName}</strong></p>
                        </div>
                    </div>
                </div>
                <div class="text-xs text-slate-600 space-y-1">
                    <p><strong>Tổng kỹ năng:</strong> ${totalSkillSlots} (từ ${courseLessons.length} bài học)</p>
                </div>
            </div>
        ` : '';
        
        return `
        <div>
            <h3 class="text-xl font-bold mb-4">Danh sách bài học</h3>
            ${skillStatsHtml}
            ${courseLessons.map(l => {
                const hasHomework = homeworks.some(h => h.lessonId === l.id && h.title && h.description);
                const homeworkButtonClass = hasHomework ? 'text-green-600 hover:text-green-800' : 'text-red-500 hover:text-red-700';
                const skillsDisplay = (l.skillsToTeach || []).map(skill => {
                    const skillNames = { reading: 'Đọc', listening: 'Nghe', speaking: 'Nói', writing: 'Viết' };
                    const skillColors = { reading: 'bg-green-100 text-green-700', listening: 'bg-blue-100 text-blue-700', speaking: 'bg-purple-100 text-purple-700', writing: 'bg-orange-100 text-orange-700' };
                    return `<span class="inline-block px-2 py-1 rounded text-xs font-semibold ${skillColors[skill]}">${skillNames[skill]}</span>`;
                }).join(' ');
                
                return `
                <div class="p-3 bg-slate-50 rounded-lg mb-2 flex justify-between items-center">
                    <div class="flex-1">
                        <span class="font-medium">${l.title}</span>
                        <div class="mt-1 flex gap-2">${skillsDisplay}</div>
                    </div>
                    <div class="space-x-4">
                        <button class="manage-homework-btn ${homeworkButtonClass} text-sm" data-lesson-id="${l.id}"><i class="fas fa-tasks mr-1"></i>Bài tập</button>
                        <button class="edit-lesson-btn text-gray-500 hover:text-blue-700 text-sm" data-lesson-id="${l.id}"><i class="fas fa-edit mr-1"></i>Chỉnh sửa</button>
                        <button class="delete-lesson-btn text-red-500 hover:text-red-700 text-sm" data-lesson-id="${l.id}"><i class="fas fa-trash mr-1"></i>Xóa</button>
                    </div>
                </div>`;
            }).join('') || '<p class="text-slate-500 text-sm">Chưa có bài học nào.</p>'}
            <div class="p-4 bg-slate-50 rounded-lg border border-dashed mt-6">
                <h3 class="text-xl font-bold mb-3">Thêm bài học mới</h3>
                <div class="space-y-3">
                    <input type="text" id="new-lesson-title" placeholder="Tiêu đề bài học" class="w-full p-2 border rounded-lg">
                    <input type="text" id="new-lesson-video" placeholder="Link video YouTube (tùy chọn)" class="w-full p-2 border rounded-lg">
                    <textarea id="new-lesson-content" placeholder="Nội dung bài học" class="w-full p-2 border rounded-lg"></textarea>
                    <div>
                        <label class="block text-sm font-medium text-slate-600 mb-2">Chọn kỹ năng sẽ dạy trong bài học:</label>
                        <div class="space-y-2">
                            <label class="flex items-center">
                                <input type="checkbox" class="lesson-skill-checkbox" value="reading" checked> 
                                <span class="ml-2 text-sm">Kỹ năng Đọc</span>
                            </label>
                            <label class="flex items-center">
                                <input type="checkbox" class="lesson-skill-checkbox" value="listening" checked> 
                                <span class="ml-2 text-sm">Kỹ năng Nghe</span>
                            </label>
                            <label class="flex items-center">
                                <input type="checkbox" class="lesson-skill-checkbox" value="speaking" checked> 
                                <span class="ml-2 text-sm">Kỹ năng Nói</span>
                            </label>
                            <label class="flex items-center">
                                <input type="checkbox" class="lesson-skill-checkbox" value="writing" checked> 
                                <span class="ml-2 text-sm">Kỹ năng Viết</span>
                            </label>
                        </div>
                    </div>
                    <button id="add-lesson-btn" data-course-id="${courseId}" class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">Thêm bài học</button>
                </div>
            </div>
        </div>`;
    },
    students: (courseId, enrolledStudents) => {
         return `
         <div class="flex justify-between items-center mb-6">
             <div>
                 <h3 class="text-xl font-bold">Danh sách học sinh (${enrolledStudents.length})</h3>
                 <p class="text-sm text-slate-500">Chọn một học sinh để xem chi tiết tiến độ.</p>
             </div>
         </div>
         <div id="student-list-container">
            ${renderStudentsAndProgressTab(enrolledStudents)}
         </div>`;
    }
};

export const renderStudentsAndProgressTab = (enrolledStudents) => {
    if (enrolledStudents.length === 0) {
        return '<p class="text-slate-500 text-center py-4">Chưa có học sinh nào.</p>';
    }
    return `<div class="space-y-3">${enrolledStudents.map(student => `<div class="p-4 bg-slate-50 rounded-lg flex justify-between items-center cursor-pointer hover:bg-slate-100 transition-colors view-student-progress-btn" data-student-id="${student.id}"><span class="font-semibold">${student.name}</span><i class="fas fa-chevron-right text-gray-400"></i></div>`).join('')}</div>`;
};

export const renderStudentProgressView = (studentId, isRestoring = false) => {
    const users = getUsers();
    const lessons = getLessons();
    const currentCourseId = getCurrentCourseId();
    
    if (!isRestoring) {
        setCurrentView('studentProgress');
    }
    setCurrentStudentIdForProgress(studentId);
    const student = users.find(u => u.id === studentId);
    if (!student) {
        renderTeacherCourseManagement(currentCourseId);
        return;
    }

    const courseLessons = lessons.filter(l => l.courseId === currentCourseId).sort((a,b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
    document.title = `Tiến độ: ${student.name}`;

    const appContainer = document.getElementById('app');
    appContainer.innerHTML = `<div class="w-full max-w-7xl mx-auto fade-in">${renderHeader(`Chỉnh sửa: ${student.name}`, true)}<main class="bg-white p-6 md:p-8 mt-6 rounded-xl shadow-lg"><p class="text-sm text-slate-500 mb-6">Nhấn vào một bài học để chỉnh sửa điểm, điểm danh và nhận xét.</p><div class="space-y-4" id="progress-list-container" data-student-id="${studentId}">${renderProgressForStudent(studentId, courseLessons)}</div></main></div>`;
};

export const renderProgressForStudent = (studentId, courseLessons) => {
    const progress = getProgress();
    if (courseLessons.length === 0) {
        return '<p class="text-slate-500 text-sm text-center py-4">Chưa có bài học nào.</p>';
    }
    return courseLessons.map(lesson => {
        const progressRecord = progress.find(p => p.lessonId === lesson.id && p.studentId === studentId) || {};
        const { attendanceStatus, grade, submittedAt: submitted } = progressRecord;
        const presentClass = attendanceStatus === 'present' ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-500';
        const absentExcusedClass = attendanceStatus === 'absent_excused' ? 'bg-yellow-500 text-white' : 'bg-slate-200 text-slate-500';
        const absentUnexcusedClass = attendanceStatus === 'absent_unexcused' ? 'bg-red-500 text-white' : 'bg-slate-200 text-slate-500';
        const lateClass = attendanceStatus === 'late' ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-500';
        return `<div class="p-4 border rounded-lg bg-white shadow-sm lesson-progress-summary hover:shadow-md hover:border-blue-500 transition-all cursor-pointer" data-lesson-id="${lesson.id}" data-student-id="${studentId}" role="button" tabindex="0"><div class="flex flex-col sm:flex-row justify-between sm:items-start"><div><p class="font-medium">${lesson.title}</p>${submitted ? '<p class="text-xs text-green-600 font-semibold mt-1">ĐÃ NỘP BÀI</p>' : '<p class="text-xs text-slate-400 mt-1">Chưa nộp bài</p>'}</div><div class="flex items-center space-x-2 mt-3 sm:mt-0 flex-shrink-0 flex-wrap gap-2"><span class="text-xs px-2 py-1 border rounded-full ${presentClass}">Có mặt</span><span class="text-xs px-2 py-1 border rounded-full ${absentExcusedClass}">Vắng có phép</span><span class="text-xs px-2 py-1 border rounded-full ${absentUnexcusedClass}">Vắng không phép</span><span class="text-xs px-2 py-1 border rounded-full ${lateClass}">Không đúng giờ</span></div></div><div class="mt-4 pt-4 border-t flex justify-between items-center"><div><span class="text-sm font-medium text-slate-600">Điểm: </span><span class="font-bold text-lg text-blue-600">${grade ?? '--'}</span></div><div class="text-blue-600 hover:text-blue-800 text-sm font-semibold">Chỉnh sửa <i class="fas fa-edit ml-1"></i></div></div></div>`;
    }).join('');
};

export const renderEditProgressModal = (studentId, lessonId) => {
    const users = getUsers();
    const lessons = getLessons();
    const progress = getProgress();
    
    const student = users.find(u => u.id === studentId);
    const lesson = lessons.find(l => l.id === lessonId);
    if (!student || !lesson) return;

    const progressRecord = progress.find(p => p.lessonId === lesson.id && p.studentId === student.id) || {};
    const { attendanceStatus = '', comment = '', submittedAt = null, isDeadlineMissed = false, grade = null } = progressRecord;
    const course = getCourses().find(c => c.id === lesson.courseId);
    const hasSubmitted = !!submittedAt;

    // Determine submission status: graded, not graded, not submitted, deadline missed
    let submissionStatus = 'not_submitted';
    if (isDeadlineMissed && !hasSubmitted) {
        submissionStatus = 'deadline_missed';
    } else if (hasSubmitted && grade !== null && grade !== undefined && grade !== '') {
        submissionStatus = 'graded';
    } else if (hasSubmitted && (grade === null || grade === undefined || grade === '')) {
        submissionStatus = 'not_graded';
    }

    const modalContent = `<div class="bg-white w-full max-w-lg md:max-w-2xl rounded-xl shadow-lg p-8 fade-in max-h-[85vh] overflow-y-auto"><h2 class="text-2xl font-bold mb-2">Cập nhật tiến độ học tập</h2><p class="text-slate-600 mb-8">Học sinh: <strong class="font-semibold">${student.name}</strong></p><div class="space-y-8"><div><p class="block text-sm font-medium text-slate-600 mb-2">Bài học: <strong class="font-semibold text-slate-800">${lesson.title}</strong></p></div><div><label class="block text-sm font-medium text-slate-600 mb-3">Trạng thái nộp bài:</label><div class="flex flex-wrap items-center gap-2 submission-status-group"><button data-submission-status="graded" class="submission-status-btn text-sm px-4 py-2 border rounded-full transition-all ${submissionStatus === 'graded' ? 'bg-green-500 text-white border-green-600 font-bold' : 'bg-white text-slate-700 border-slate-300 hover:border-green-400'}"><i class="fas fa-check-circle mr-2"></i>Đã chấm</button><button data-submission-status="not_graded" class="submission-status-btn text-sm px-4 py-2 border rounded-full transition-all ${submissionStatus === 'not_graded' ? 'bg-yellow-400 text-white border-yellow-600 font-bold' : 'bg-white text-slate-700 border-slate-300 hover:border-yellow-300'}"><i class="fas fa-hourglass-half mr-2"></i>Chưa chấm</button><button data-submission-status="not_submitted" class="submission-status-btn text-sm px-4 py-2 border rounded-full transition-all ${submissionStatus === 'not_submitted' ? 'bg-red-500 text-white border-red-600 font-bold' : 'bg-white text-slate-700 border-slate-300 hover:border-red-300'}"><i class="fas fa-times-circle mr-2"></i>Chưa nộp</button><button data-submission-status="deadline_missed" class="submission-status-btn text-sm px-4 py-2 border rounded-full transition-all ${submissionStatus === 'deadline_missed' ? 'bg-blue-600 text-white border-blue-700 font-bold' : 'bg-white text-slate-700 border-slate-300 hover:border-blue-400'}"><i class="fas fa-clock mr-2"></i>Hết hạn nộp</button></div></div><div><label class="block text-sm font-medium text-slate-600 mb-2">Điểm danh:</label><div class="flex flex-wrap items-center gap-2 attendance-btn-group"><button data-status="present" class="attendance-btn text-sm px-3 py-1 border rounded-full ${attendanceStatus === 'present' ? 'attendance-btn-active' : 'bg-white hover:bg-slate-100'}">Có mặt</button><button data-status="absent_excused" class="attendance-btn text-sm px-3 py-1 border rounded-full ${attendanceStatus === 'absent_excused' ? 'attendance-btn-active bg-yellow-500' : 'bg-white hover:bg-slate-100'}">Vắng có phép</button><button data-status="absent_unexcused" class="attendance-btn text-sm px-3 py-1 border rounded-full ${attendanceStatus === 'absent_unexcused' ? 'attendance-btn-active bg-red-500' : 'bg-white hover:bg-slate-100'}">Vắng không phép</button><button data-status="late" class="attendance-btn text-sm px-3 py-1 border rounded-full ${attendanceStatus === 'late' ? 'attendance-btn-active bg-orange-500' : 'bg-white hover:bg-slate-100'}">Không đúng giờ</button></div></div>${course?.courseFolderUrl ? `<div><label class="block text-sm font-medium text-slate-600 mb-2">Bài tập đã nộp:</label><a href="${course.courseFolderUrl}" target="_blank" class="inline-flex items-center bg-yellow-500 text-white font-semibold px-4 py-2 rounded-lg hover:bg-yellow-600 transition-colors"><i class="fab fa-google-drive mr-2"></i>Mở thư mục bài tập</a></div>` : ''}<div class="space-y-6"><div><label class="block text-sm font-medium text-slate-600 mb-2">Điểm số:</label><div class="grid grid-cols-2 md:grid-cols-4 gap-4" id="grade-inputs">${lesson.skillsToTeach?.includes('reading') ? `<div><label for="edit-reading-score" class="block text-xs text-slate-500">Đọc</label><input type="number" id="edit-reading-score" class="score-input w-full p-2 border rounded text-center font-bold" value="${progressRecord.grades?.reading ?? ''}"></div>` : `<div style="display: none;"><input type="hidden" id="edit-reading-score" value="0"></div>`}${lesson.skillsToTeach?.includes('listening') ? `<div><label for="edit-listening-score" class="block text-xs text-slate-500">Nghe</label><input type="number" id="edit-listening-score" class="score-input w-full p-2 border rounded text-center font-bold" value="${progressRecord.grades?.listening ?? ''}"></div>` : `<div style="display: none;"><input type="hidden" id="edit-listening-score" value="0"></div>`}${lesson.skillsToTeach?.includes('speaking') ? `<div><label for="edit-speaking-score" class="block text-xs text-slate-500">Nói</label><input type="number" id="edit-speaking-score" class="score-input w-full p-2 border rounded text-center font-bold" value="${progressRecord.grades?.speaking ?? ''}"></div>` : `<div style="display: none;"><input type="hidden" id="edit-speaking-score" value="0"></div>`}${lesson.skillsToTeach?.includes('writing') ? `<div><label for="edit-writing-score" class="block text-xs text-slate-500">Viết</label><input type="number" id="edit-writing-score" class="score-input w-full p-2 border rounded text-center font-bold" value="${progressRecord.grades?.writing ?? ''}"></div>` : `<div style="display: none;"><input type="hidden" id="edit-writing-score" value="0"></div>`}</div><div class="mt-4"><span class="text-sm font-medium text-slate-600">Điểm trung bình: </span><span id="average-score-display" class="font-bold text-2xl text-blue-600">--</span></div></div><div><label for="edit-comment-input" class="block text-sm font-medium text-slate-600 mb-1">Nhận xét:</label><textarea id="edit-comment-input" class="w-full p-3 border rounded-lg text-sm h-40" placeholder="Nhập nhận xét…">${comment}</textarea></div></div></div><div class="mt-8 flex justify-end space-x-3"><button class="cancel-modal-btn px-4 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300">Huỷ</button><button id="save-progress-btn" data-student-id="${studentId}" data-lesson-id="${lessonId}" class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold">Lưu thay đổi</button></div></div>`;
    showModal(modalContent);
    calculateAverageScore();
};

export const renderEditLessonModal = (lessonId) => {
    const lessons = getLessons();
    const lesson = lessons.find(l => l.id === lessonId);
    if (!lesson) return;
    const skillsToTeach = lesson.skillsToTeach || [];
    const modalContent = `<div class="bg-white w-full max-w-lg rounded-xl shadow-lg p-6 fade-in"><h2 class="text-2xl font-bold mb-4">Chỉnh sửa bài học</h2><div class="space-y-4"><div><label for="edit-lesson-title" class="block text-sm font-medium text-slate-600 mb-1">Tiêu đề:</label><input type="text" id="edit-lesson-title" class="w-full p-2 border rounded-lg" value="${lesson.title}"></div><div><label for="edit-lesson-video" class="block text-sm font-medium text-slate-600 mb-1">Link video:</label><input type="text" id="edit-lesson-video" class="w-full p-2 border rounded-lg" value="${lesson.videoUrl || ''}"></div><div><label for="edit-lesson-content" class="block text-sm font-medium text-slate-600 mb-1">Nội dung:</label><textarea id="edit-lesson-content" class="w-full p-2 border rounded-lg h-32">${lesson.content}</textarea></div><div><label class="block text-sm font-medium text-slate-600 mb-2">Kỹ năng:</label><div class="space-y-2"><label class="flex items-center"><input type="checkbox" class="edit-lesson-skill-checkbox" value="reading" ${skillsToTeach.includes('reading') ? 'checked' : ''}><span class="ml-2 text-sm">Đọc</span></label><label class="flex items-center"><input type="checkbox" class="edit-lesson-skill-checkbox" value="listening" ${skillsToTeach.includes('listening') ? 'checked' : ''}><span class="ml-2 text-sm">Nghe</span></label><label class="flex items-center"><input type="checkbox" class="edit-lesson-skill-checkbox" value="speaking" ${skillsToTeach.includes('speaking') ? 'checked' : ''}><span class="ml-2 text-sm">Nói</span></label><label class="flex items-center"><input type="checkbox" class="edit-lesson-skill-checkbox" value="writing" ${skillsToTeach.includes('writing') ? 'checked' : ''}><span class="ml-2 text-sm">Viết</span></label></div></div></div><div class="mt-6 flex justify-end space-x-3"><button class="cancel-modal-btn px-4 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300">Huỷ</button><button id="save-lesson-btn" data-lesson-id="${lessonId}" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Lưu thay đổi</button></div></div>`;
    showModal(modalContent);
};

export const renderHomeworkModal = (lessonId) => {
    const homeworks = getHomeworks();
    const homework = homeworks.find(h => h.lessonId === lessonId);
    const modalContent = `<div class="bg-white w-full max-w-lg rounded-xl shadow-lg p-6 fade-in"><h2 class="text-2xl font-bold mb-4">${homework ? 'Chỉnh sửa' : 'Tạo'} Bài tập</h2><div class="space-y-4"><div><label for="homework-title" class="block text-sm font-medium text-slate-600 mb-1">Tiêu đề:</label><input type="text" id="homework-title" class="w-full p-2 border rounded-lg" value="${homework?.title || ''}"></div><div><label for="homework-desc" class="block text-sm font-medium text-slate-600 mb-1">Mô tả:</label><textarea id="homework-desc" class="w-full p-2 border rounded-lg h-24">${homework?.description || ''}</textarea></div></div><div class="mt-6 flex justify-between"><div>${homework ? `<button id="delete-homework-btn" data-homework-id="${homework.id}" class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">Xoá</button>` : ''}</div><div class="flex space-x-3"><button class="cancel-modal-btn px-4 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300">Huỷ</button><button id="save-homework-btn" data-lesson-id="${lessonId}" data-homework-id="${homework?.id || ''}" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Lưu</button></div></div></div>`;
    showModal(modalContent);
};

export const renderTeacherStudentReportView = (studentId, courseId, isRestoring = false) => {
    if (!isRestoring) {
        setCurrentView('studentReport');
    }
    setCurrentStudentIdForProgress(studentId);
    const students = getUsers();
    const appContainer = document.getElementById('app');
    const student = students.find(u => u.id === studentId);
    const course = getCourses().find(c => c.id === courseId);
    if (!student || !course) {
        return getCurrentView() === 'studentReport' ? null : null;
    }

    document.title = `Báo cáo: ${student.name}`;
    const { html, chartData } = generateStudentProgressReport(studentId, courseId, true);

    appContainer.innerHTML = `
         <div class="w-full max-w-7xl mx-auto fade-in">
             <header class="w-full bg-white p-4 rounded-xl shadow-lg flex justify-between items-center sticky top-0 z-40 h-20">
                 <div class="flex items-center min-w-0">
                     <button class="back-btn mr-4 text-slate-500 hover:text-blue-600 transition-colors"><i class="fas fa-arrow-left fa-lg"></i></button>
                     <h1 class="text-xl md:text-2xl font-bold text-slate-800 truncate">Báo cáo: ${student.name}</h1>
                 </div>
                 <div class="flex items-center space-x-4">
                     <button id="edit-student-progress-btn" data-student-id="${studentId}" class="bg-blue-500 text-white font-semibold px-4 py-2 rounded-lg hover:bg-blue-600">
                         <i class="fas fa-edit mr-2"></i>Chỉnh sửa
                     </button>
                 </div>
             </header>
             <main class="mt-6">
                ${html}
             </main>
         </div>
    `;
    setTimeout(() => renderCharts(chartData, 'report-'), 50);
};

// ═══════════════════════════════════════════════════════════════════════════════════
// TEACHER EVENT HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════════

export const handleTeacherClickEvents = async (e) => {
    const target = e.target;

    // Edit course
    if (target.closest('.edit-course-btn')) {
        renderEditCourseModal(target.closest('.edit-course-btn').dataset.id);
        return true;
    }

    if (target.closest('#save-course-btn')) {
        const courseId = target.closest('#save-course-btn').dataset.courseId;
        const title = document.getElementById('edit-course-title').value;
        const description = document.getElementById('edit-course-desc').value;
        const scriptUrl = document.getElementById('edit-course-script-url').value;
        
        if (title && description) {
            if (scriptUrl && !scriptUrl.includes('script.google.com')) {
                showToast('❌ Google Apps Script URL không hợp lệ', 'error');
                return true;
            }
            
            try {
                showToast('Đang cấp nhật khóa học...', 'info');
                
                // Get current course to check if folder already exists
                const course = getCourses().find(c => c.id === courseId);
                let courseFolderUrl = course?.courseFolderUrl;
                
                // If no folder URL yet and scriptUrl provided, create folder
                if (!courseFolderUrl && scriptUrl) {
                    const folderRes = await fetch(scriptUrl, {
                        method: 'POST',
                        body: JSON.stringify({
                            action: 'create_course_folder',
                            className: title
                        })
                    });
                    
                    const folderData = await folderRes.json();
                    if (folderData.status === 'success' && folderData.folderUrl) {
                        courseFolderUrl = folderData.folderUrl;
                        showToast('✅ Folder khóa học đã được tạo', 'success');
                    } else {
                        showToast('⚠️ Không thể tạo folder tự động, nhưng khóa học vẫn được lưu', 'warning');
                    }
                }
                
                await updateDoc(doc(db, 'courses', courseId), { 
                    title, 
                    description, 
                    scriptUrl,
                    ...(courseFolderUrl && { courseFolderUrl })
                });
                
                closeModal();
                showToast('Cập nhật khóa học thành công', 'success');
            } catch (err) {
                showToast('❌ Lỗi cập nhật khóa học: ' + err.message, 'error');
            }
        } else {
            showToast("Vui lòng điền đủ tiêu đề và mô tả.", 'error');
        }
        return true;
    }

    if (target.closest('#add-course-btn')) {
        const title = document.getElementById('new-course-title').value;
        const description = document.getElementById('new-course-desc').value;
        const scriptUrl = document.getElementById('new-course-script-url')?.value || '';
        if (title && description) {
            if (!scriptUrl) {
                showToast('❌ Google Apps Script URL là bắt buộc', 'error');
                return true;
            }
            if (scriptUrl && !scriptUrl.includes('script.google.com')) {
                showToast('❌ Google Apps Script URL không hợp lệ', 'error');
                return true;
            }
            
            try {
                showToast('Đang kiểm tra Google Apps Script...', 'info');
                
                // Test GAS connection first
                const testRes = await fetch(scriptUrl, {
                    method: 'POST',
                    body: JSON.stringify({
                        action: 'create_course_folder',
                        className: title
                    })
                });
                
                const testData = await testRes.json();
                if (testData.status !== 'success') {
                    showToast(`❌ Lỗi GAS: ${testData.message || 'Không thể kết nối'}`, 'error');
                    return true;
                }
                
                showToast('✅ Kết nối GAS thành công! Đang tạo folder...', 'success');
                
                const courseFolderUrl = testData.folderUrl || null;
                if (!courseFolderUrl) {
                    showToast('❌ GAS không trả về folder URL', 'error');
                    return true;
                }
                
                // Folder created successfully, now save course
                await addDoc(collection(db, 'courses'), { 
                    title, 
                    description, 
                    createdBy: getCurrentUser().id, 
                    scriptUrl,
                    courseFolderUrl
                });
                
                showToast('✅ Khóa học và folder đã được tạo thành công!', 'success');
                document.getElementById('new-course-title').value = '';
                document.getElementById('new-course-desc').value = '';
                if (document.getElementById('new-course-script-url')) document.getElementById('new-course-script-url').value = '';
            } catch (err) {
                showToast('❌ Lỗi: ' + err.message, 'error');
            }
        } else {
            showToast("Vui lòng điền đủ tiêu đề và mô tả.", 'error');
        }
        return true;
    }

    // Add lesson
    if (target.closest('#add-lesson-btn')) {
        const courseId = target.closest('#add-lesson-btn').dataset.courseId;
        const title = document.getElementById('new-lesson-title').value;
        const content = document.getElementById('new-lesson-content').value;
        const videoUrl = document.getElementById('new-lesson-video').value;
        const selectedSkills = Array.from(document.querySelectorAll('.lesson-skill-checkbox:checked')).map(cb => cb.value);
        
        if(title && content) {
            if (selectedSkills.length === 0) {
                showToast('Vui lòng chọn ít nhất một kỹ năng sẽ dạy', 'error');
                return true;
            }
            
            if (videoUrl && !videoUrl.includes('youtube.com') && !videoUrl.includes('youtu.be')) {
                showToast('⚠️ URL video phải là YouTube link', 'warning');
            }
            
            await addDoc(collection(db, 'lessons'), { courseId, title, content, videoUrl, skillsToTeach: selectedSkills, createdAt: serverTimestamp() });
            document.getElementById('new-lesson-title').value = '';
            document.getElementById('new-lesson-video').value = '';
            document.getElementById('new-lesson-content').value = '';
            document.querySelectorAll('.lesson-skill-checkbox').forEach(cb => cb.checked = false);
            showToast('Thêm bài học thành công', 'success');
        } else {
            showToast("Vui lòng điền đủ tiêu đề và nội dung.", 'error');
        }
        return true;
    }

    if (target.closest('.edit-lesson-btn')) {
        renderEditLessonModal(target.closest('.edit-lesson-btn').dataset.lessonId);
        return true;
    }

    if (target.closest('#save-lesson-btn')) {
        const lessonId = target.closest('#save-lesson-btn').dataset.lessonId;
        const title = document.getElementById('edit-lesson-title').value;
        const videoUrl = document.getElementById('edit-lesson-video').value;
        const content = document.getElementById('edit-lesson-content').value;
        const selectedSkills = Array.from(document.querySelectorAll('.edit-lesson-skill-checkbox:checked')).map(cb => cb.value);
        
        if (selectedSkills.length === 0) {
            showToast('Vui lòng chọn ít nhất một kỹ năng sẽ dạy', 'error');
            return true;
        }
        
        if (videoUrl && !videoUrl.includes('youtube.com') && !videoUrl.includes('youtu.be')) {
            showToast('⚠️ URL video phải là YouTube link', 'warning');
        }
        
        await updateDoc(doc(db, 'lessons', lessonId), { title, videoUrl, content, skillsToTeach: selectedSkills });
        closeModal();
        showToast('Cập nhật bài học thành công', 'success');
        return true;
    }

    if (target.closest('.delete-lesson-btn')) {
        const lessonId = target.dataset.lessonId;
        renderConfirmModal(
            'Xác nhận Xóa Bài học',
            'Bạn có chắc chắn muốn xóa bài học này? Mọi bài tập và điểm số liên quan cũng sẽ bị xóa vĩnh viễn.',
            'Xóa',
            'bg-red-600 hover:bg-red-700',
            async () => {
                const batch = writeBatch(db);
                getProgress().filter(p => p.lessonId === lessonId).forEach(p => batch.delete(doc(db, "progress", p.id)));
                getHomeworks().filter(h => h.lessonId === lessonId).forEach(h => batch.delete(doc(db, "homeworks", h.id)));
                batch.delete(doc(db, 'lessons', lessonId));
                await batch.commit();
                closeModal();
                updateTeacherCourseTabs();
                showToast('Đã xóa bài học', 'success');
            }
        );
        return true;
    }

    if (target.closest('.manage-homework-btn')) {
        renderHomeworkModal(target.closest('.manage-homework-btn').dataset.lessonId);
        return true;
    }

    if (target.closest('#save-homework-btn')) {
        const lessonId = target.closest('#save-homework-btn').dataset.lessonId;
        const homeworkId = target.closest('#save-homework-btn').dataset.homeworkId;
        const title = document.getElementById('homework-title').value;
        const description = document.getElementById('homework-desc').value;
        if (title && description) {
            if (homeworkId) {
                await updateDoc(doc(db, 'homeworks', homeworkId), { title, description });
            } else {
                await addDoc(collection(db, 'homeworks'), { lessonId, title, description });
            }
            closeModal();
            showToast('Lưu bài tập thành công', 'success');
        } else {
            showToast("Vui lòng điền đủ thông tin.", 'error');
        }
        return true;
    }

    if (target.closest('#delete-homework-btn')) {
        const homeworkId = target.dataset.homeworkId;
        renderConfirmModal(
            'Xác nhận Xóa Bài tập',
            'Bạn có chắc chắn muốn xóa bài tập này?',
            'Xóa',
            'bg-red-600 hover:bg-red-700',
            async () => {
                await deleteDoc(doc(db, 'homeworks', homeworkId));
                showToast('Đã xóa bài tập', 'success');
            }
        );
        return true;
    }

    if(target.closest('.tab-btn')) {
        const tabName = target.dataset.tab;
        setCurrentActiveTab(tabName);
        
        // Save ALL state to localStorage for F5 restore
        saveSessionToLocalStorage();
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('tab-active');
            btn.classList.add('text-gray-500', 'hover:text-gray-700');
        });
        target.classList.add('tab-active');
        target.classList.remove('text-gray-500', 'hover:text-gray-700');
        document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
        document.getElementById(`tab-${tabName}`).classList.remove('hidden');
        return true;
    }

    if (target.closest('.view-student-progress-btn')) {
        const studentId = target.closest('.view-student-progress-btn').dataset.studentId;
        setCurrentStudentIdForProgress(studentId);
        setCurrentView('studentReport');
        navigate();
        return true;
    }

    if (target.closest('#edit-student-progress-btn')) {
        const studentId = target.closest('#edit-student-progress-btn').dataset.studentId;
        setCurrentStudentIdForProgress(studentId);
        setCurrentView('studentProgress');
        navigate();
        return true;
    }

    if (target.closest('.lesson-progress-summary')) {
        const summaryCard = target.closest('.lesson-progress-summary');
        const studentId = summaryCard.dataset.studentId;
        const lessonId = summaryCard.dataset.lessonId;
        renderEditProgressModal(studentId, lessonId);
        return true;
    }

    if (target.closest('.edit-progress-shortcut-btn')) {
        const btn = target.closest('.edit-progress-shortcut-btn');
        renderEditProgressModal(btn.dataset.studentId, btn.dataset.lessonId);
        return true;
    }

    if (target.closest('.attendance-btn-group .attendance-btn')) {
        const group = target.closest('.attendance-btn-group');
        group.querySelectorAll('.attendance-btn').forEach(btn => {
            btn.classList.remove('attendance-btn-active', 'bg-red-500', 'bg-yellow-500', 'bg-orange-500');
            if(!btn.classList.contains('bg-white')) btn.classList.add('bg-white', 'hover:bg-slate-100');
        });

        const status = target.dataset.status;
        target.classList.add('attendance-btn-active');
        target.classList.remove('bg-white', 'hover:bg-slate-100');
        if (status === 'absent_unexcused') target.classList.add('bg-red-500');
        if (status === 'absent_excused') target.classList.add('bg-yellow-500');
        if (status === 'late') target.classList.add('bg-orange-500');
        return true;
    }

    if (target.closest('#save-progress-btn')) {
        const button = target.closest('#save-progress-btn');
        const studentId = button.dataset.studentId;
        const lessonId = button.dataset.lessonId;
        
        const lesson = getLessons().find(l => l.id === lessonId);
        const skillsToTeach = lesson?.skillsToTeach || [];
        const existingRecord = getProgress().find(p => p.lessonId === lessonId && p.studentId === studentId) || {};
        
        const readingScore = document.getElementById('edit-reading-score').value;
        const listeningScore = document.getElementById('edit-listening-score').value;
        const speakingScore = document.getElementById('edit-speaking-score').value;
        const writingScore = document.getElementById('edit-writing-score').value;
        
        const allScores = [readingScore, listeningScore, speakingScore, writingScore]
            .filter(s => s && s !== '')
            .map(s => parseFloat(s));
        
        for (let score of allScores) {
            if (isNaN(score) || score < 0 || score > 10) {
                showToast('Điểm số phải nằm trong khoảng 0-10', 'error');
                return true;
            }
        }

        const newGrades = {
            reading: skillsToTeach.includes('reading') ? (readingScore ? parseFloat(readingScore) : null) : 0,
            listening: skillsToTeach.includes('listening') ? (listeningScore ? parseFloat(listeningScore) : null) : 0,
            speaking: skillsToTeach.includes('speaking') ? (speakingScore ? parseFloat(speakingScore) : null) : 0,
            writing: skillsToTeach.includes('writing') ? (writingScore ? parseFloat(writingScore) : null) : 0,
        };

        const taughtSkillScores = Object.keys(newGrades)
            .filter(skill => skillsToTeach.includes(skill) && newGrades[skill] !== null)
            .map(skill => newGrades[skill]);
        
        let averageScore = null;
        if (taughtSkillScores.length > 0) {
            averageScore = parseFloat((taughtSkillScores.reduce((a, b) => a + b, 0) / taughtSkillScores.length).toFixed(1));
        }
        
        const newComment = document.getElementById('edit-comment-input').value;
        const activeButton = document.querySelector('.attendance-btn.attendance-btn-active');
        const newStatus = activeButton ? activeButton.dataset.status : null;
        const submissionStatusBtn = document.querySelector('.submission-status-btn.submission-status-active');
        const submissionStatus = submissionStatusBtn ? submissionStatusBtn.dataset.submissionStatus : null;
        
        if (!newStatus) {
            showToast('Vui lòng chọn trạng thái điểm danh', 'error');
            return true;
        }
        
        if (!submissionStatus) {
            showToast('Vui lòng chọn trạng thái nộp bài', 'error');
            return true;
        }

        // Convert submission status to submittedAt and isDeadlineMissed fields
        let submittedAt = null;
        let isDeadlineMissed = false;
        
        if (submissionStatus === 'graded' || submissionStatus === 'not_graded') {
            submittedAt = existingRecord.submittedAt || new Date().toISOString();
            isDeadlineMissed = false;
        } else if (submissionStatus === 'deadline_missed') {
            submittedAt = null;
            isDeadlineMissed = true;
        } else if (submissionStatus === 'not_submitted') {
            submittedAt = null;
            isDeadlineMissed = false;
        }

        // Build data to save
        const dataToSave = {
            grade: submissionStatus === 'graded' ? averageScore : null,
            grades: submissionStatus === 'graded' ? newGrades : null,
            comment: newComment,
            attendanceStatus: newStatus,
            studentId,
            lessonId,
            courseId: getCurrentCourseId(),
        };
        
        // Handle submittedAt field
        if (submittedAt) {
            dataToSave.submittedAt = submittedAt;
        } else {
            // Delete submittedAt if it exists
            dataToSave.submittedAt = deleteField();
        }
        
        // Handle isDeadlineMissed field
        if (isDeadlineMissed) {
            dataToSave.isDeadlineMissed = true;
        } else {
            // Delete isDeadlineMissed if it exists
            dataToSave.isDeadlineMissed = deleteField();
        }

        const docId = existingRecord.id || `${lessonId}_${studentId}`;
        
        await setDoc(doc(db, 'progress', docId), dataToSave, { merge: true });
        closeModal();
        showToast('Đã lưu tiến độ!', 'success');
        
        const currentView = getCurrentView();
        if (currentView === 'studentReport') {
            renderTeacherStudentReportView(studentId, getCurrentCourseId(), false);
        } else if (currentView === 'studentProgress') {
            renderStudentProgressView(studentId, false);
        }
        return true;
    }

    if (target.closest('.manage-course-btn')) {
        const courseId = target.closest('.manage-course-btn').dataset.id;
        setOverviewFilterLessonId('all');
        setCurrentCourseId(courseId);
        setCurrentView('course');
        navigate();
        return true;
    }

    return false;
};

// ═══════════════════════════════════════════════════════════════════════════════════
// TEACHER INPUT & CHANGE EVENT LISTENERS
// ═══════════════════════════════════════════════════════════════════════════════════

export const initTeacherListeners = () => {
    // Score input listener
    document.body.addEventListener('input', (e) => {
        if (e.target.classList.contains('score-input')) {
            calculateAverageScore();
        }
    });

    // Submission status button listener
    document.body.addEventListener('click', (e) => {
        if (e.target.closest('.submission-status-btn')) {
            const group = e.target.closest('.submission-status-group');
            if (!group) return;
            
            group.querySelectorAll('.submission-status-btn').forEach(btn => {
                btn.classList.remove('submission-status-active', 'bg-green-500', 'text-white', 'border-green-600', 'font-bold', 'bg-yellow-400', 'border-yellow-600', 'bg-red-500', 'border-red-600', 'bg-blue-600', 'border-blue-700');
                btn.classList.add('bg-white', 'text-slate-700', 'border-slate-300');
            });
            
            const btn = e.target.closest('.submission-status-btn');
            const status = btn.dataset.submissionStatus;
            
            btn.classList.add('submission-status-active', 'text-white', 'font-bold');
            btn.classList.remove('bg-white', 'text-slate-700', 'border-slate-300');
            
            if (status === 'graded') {
                btn.classList.add('bg-green-500', 'border-green-600');
            } else if (status === 'not_graded') {
                btn.classList.add('bg-yellow-400', 'border-yellow-600');
            } else if (status === 'not_submitted') {
                btn.classList.add('bg-red-500', 'border-red-600');
            } else if (status === 'deadline_missed') {
                btn.classList.add('bg-blue-600', 'border-blue-700');
            }
            
            // Update average score and enable/disable inputs
            calculateAverageScore();
        }
    });

    // Overview filter change listener
    document.body.addEventListener('change', async (e) => {
        const target = e.target;
        if (target.id === 'overview-filter') {
            setOverviewFilterLessonId(target.value);
            updateTeacherCourseTabs();
        }
    });
};