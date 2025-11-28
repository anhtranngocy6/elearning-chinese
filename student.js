// student.js - Student dashboard and learning functions

import {
    renderHeader,
    renderConfirmModal,
    showToast,
    closeModal,
    showModal,
    renderCharts,
    getYoutubeEmbedUrl,
    getCurrentUser,
    getCurrentView,
    setCurrentView,
    getCurrentCourseId,
    setCurrentCourseId,
    getCurrentLessonId,
    setCurrentLessonId,
    getCurrentStudentIdForProgress,
    setCurrentStudentIdForProgress,
    getUsers,
    getCourses,
    getLessons,
    getHomeworks,
    getProgress,
    getEnrollments,
    saveSessionToLocalStorage
} from './shared.js';

import {
    db,
    updateDoc,
    doc,
    deleteField,
    setDoc
} from './firebase.js';

// ═══════════════════════════════════════════════════════════════════════════════════
// STUDENT RENDER FUNCTIONS - HÀM RENDER CHO HỌC SINH
// ═══════════════════════════════════════════════════════════════════════════════════

export const renderStudentDashboard = () => {
    const currentUser = getCurrentUser();
    const currentView = getCurrentView();
    const courses = getCourses();
    const enrollments = getEnrollments();
    const appContainer = document.getElementById('app');
    
    if (currentView !== 'course' && currentView !== 'lesson' && currentView !== 'myProgress') {
        setCurrentView('dashboard');
    }
    document.title = "Student Dashboard | SmartEdu x AT";
    const myCourseIds = enrollments.filter(e => e.studentId === currentUser.id).map(e => e.courseId);
    const myCourses = courses.filter(c => myCourseIds.includes(c.id));
    appContainer.innerHTML = `<div class="w-full max-w-7xl mx-auto fade-in">${renderHeader('Các khoá học của tôi')}<main class="mt-6"><div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">${myCourses.length > 0 ? myCourses.map(c => renderCourseCard(c)).join('') : '<p class="text-slate-500 md:col-span-3 text-center py-8">Bạn chưa được ghi danh vào khoá học nào.</p>'}</div></main></div>`;
};

export const renderCourseCard = (course) => {
    const currentUser = getCurrentUser();
    const users = getUsers();
    const lessons = getLessons();
    const progress = getProgress();
    
    const teacher = users.find(u => u.id === course.createdBy);
    const courseLessons = lessons.filter(l => l.courseId === course.id);
    const completedLessons = progress.filter(p => p.studentId === currentUser.id && courseLessons.some(l => l.id === p.lessonId) && p.submittedAt).length;
    const progressPercentage = courseLessons.length > 0 ? Math.round((completedLessons / courseLessons.length) * 100) : 0;
    return `
         <div class="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col">
             <div class="p-6 flex-grow">
                 <p class="text-sm text-blue-500 font-semibold">${teacher?.name || 'Unknown Teacher'}</p>
                 <h3 class="font-bold text-xl mt-1 text-slate-800">${course.title}</h3>
                 <p class="text-sm text-slate-600 mt-2 h-10">${course.description}</p>
             </div>
             <div class="px-6 pb-6">
                 <div class="flex justify-between items-center mb-2">
                     <span class="text-xs font-semibold text-slate-500">TIẾN ĐỘ</span>
                     <span class="text-xs font-bold text-blue-600">${progressPercentage}%</span>
                 </div>
                 <div class="w-full bg-slate-200 rounded-full h-2">
                     <div class="bg-blue-600 h-2 rounded-full" style="width: ${progressPercentage}%"></div>
                 </div>
             </div>
             <div class="bg-slate-50 p-4">
                 <button class="w-full text-center font-semibold text-blue-600 hover:text-blue-800 view-course-btn transition-colors" data-id="${course.id}">Vào học <i class="fas fa-arrow-right ml-2"></i></button>
             </div>
         </div>`;
};

export const renderStudentCourseView = (courseId, isRestoring = false) => {
    const currentUser = getCurrentUser();
    const courses = getCourses();
    const lessons = getLessons();
    const progress = getProgress();
    const appContainer = document.getElementById('app');
    
    if (!isRestoring) {
        setCurrentView('course');
    }
    setCurrentCourseId(courseId);
    const course = courses.find(c => c.id === courseId);
    if (!course) return renderStudentDashboard(); // Fallback
    const courseLessons = lessons.filter(l => l.courseId === courseId).sort((a,b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
    document.title = course.title;
    appContainer.innerHTML = `<div class="w-full max-w-7xl mx-auto fade-in">${renderHeader(course.title, true)}<div class="bg-white p-8 mt-6 rounded-xl shadow-lg">
         <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
             <div>
                 <h2 class="text-2xl font-bold">Nội dung khoá học</h2>
                 <p class="text-slate-600">${course.description}</p>
             </div>
         <div class="flex-shrink-0 flex items-center space-x-2">
                  <button class="view-course-folder-btn bg-yellow-50 text-yellow-700 font-semibold px-4 py-2 rounded-lg hover:bg-yellow-100 transition-colors" data-course-id="${courseId}"><i class="fab fa-google-drive mr-2"></i>Thư mục lớp học</button>
                 <button class="view-my-progress-btn bg-blue-50 text-blue-600 font-semibold px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors" data-course-id="${courseId}">
                     <i class="fas fa-chart-line mr-2"></i>Xem tiến độ
                 </button>
             </div>
         </div>

         <div class="space-y-3">${courseLessons.map((lesson, index) => { 
             const progressRecord = progress.find(p => p.lessonId === lesson.id && p.studentId === currentUser.id);
             const isSubmitted = !!progressRecord?.submittedAt;
             
             return `<div class="p-4 bg-slate-100 rounded-lg flex justify-between items-center"><div class="flex items-center"><span class="mr-4 font-bold text-slate-400 text-lg">${index + 1}</span>${isSubmitted ? '<i class="fas fa-check-circle text-green-500 mr-3"></i>' : '<i class="far fa-circle text-blue-500 mr-3"></i>'}<span class="font-medium ${isSubmitted ? 'text-slate-500' : ''}">${lesson.title}</span></div><button class="view-lesson-btn bg-white text-blue-600 px-4 py-1 rounded-full border border-blue-200 font-semibold text-sm hover:bg-blue-50" data-lesson-id="${lesson.id}">${isSubmitted ? 'Xem lại' : 'Bắt đầu'}</button></div>` 
         }).join('') || '<p class="text-slate-500 text-center py-4">Chưa có bài học nào trong khóa học này.</p>'}</div></div></div>`;
};

export const renderLessonView = (lessonId, isRestoring = false) => {
    const currentUser = getCurrentUser();
    const courses = getCourses();
    const lessons = getLessons();
    const homeworks = getHomeworks();
    const progress = getProgress();
    const appContainer = document.getElementById('app');
    
    if (!isRestoring && getCurrentView() !== 'lesson') {
        setCurrentView('lesson');
    }
    setCurrentLessonId(lessonId);
    const lesson = lessons.find(l => l.id === lessonId);
    if (!lesson) return renderStudentCourseView(getCurrentCourseId());
    const course = courses.find(c => c.id === lesson.courseId);
    const homework = homeworks.find(h => h.lessonId === lessonId);
    document.title = lesson.title;
    const progressRecord = progress.find(p => p.lessonId === lesson.id && p.studentId === currentUser.id);
    const hasSubmitted = progressRecord?.submittedAt;
    const embedUrl = getYoutubeEmbedUrl(lesson.videoUrl);

    appContainer.innerHTML = `<div class="w-full max-w-7xl mx-auto fade-in">${renderHeader(lesson.title, true)}<div class="bg-white p-6 md:p-8 mt-6 rounded-xl shadow-lg">${embedUrl ? `<div class="video-container shadow-md mb-8"><iframe src="${embedUrl}" frameborder="0" allowfullscreen></iframe></div>` : ''}<h2 class="text-3xl font-bold mb-4 text-slate-800">Nội dung bài học</h2><div class="prose max-w-none text-slate-700 mb-8 whitespace-pre-wrap">${lesson.content || '<p><em>Chưa có nội dung cho bài học này.</em></p>'}</div>
        
        ${homework ? `<hr class="my-8"><div class="p-6 bg-slate-50 rounded-lg"><h2 class="text-2xl font-bold mb-2">Bài tập: ${homework.title}</h2><p class="text-slate-600 mb-6 whitespace-pre-wrap">${homework.description}</p>${currentUser.role === 'student' ? (hasSubmitted ? `<div class="p-4 border rounded-lg ${progressRecord.grade !== null && progressRecord.grade !== undefined ? 'bg-green-50 border-green-300' : 'bg-blue-50 border-blue-200'}"><div class="flex justify-between items-start"><div class="flex items-start"><i class="fas fa-check-circle ${progressRecord.grade !== null && progressRecord.grade !== undefined ? 'text-green-600' : 'text-blue-600'} mr-3 fa-lg mt-1"></i><div><p class="font-bold ${progressRecord.grade !== null && progressRecord.grade !== undefined ? 'text-green-800' : 'text-blue-800'}">Bạn đã nộp bài.</p><p class="mt-2"><strong>Điểm:</strong> ${progressRecord.grade !== null && progressRecord.grade !== undefined ? `<span class="font-bold text-lg">${progressRecord.grade}</span>` : 'Chưa được chấm'}</p>                     </div></div><div class="flex gap-2 flex-col sm:flex-row flex-wrap">${(progressRecord.grade === null || progressRecord.grade === undefined) ? `<button class="cancel-submission-btn bg-gray-200 text-gray-700 text-xs font-semibold px-3 py-1 rounded-full hover:bg-gray-300" data-lesson-id="${lesson.id}">Hủy xác nhận</button>` : ''}<button class="view-lesson-folder-btn bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full hover:bg-blue-200 transition-colors" data-lesson-id="${lesson.id}"><i class="fab fa-google-drive mr-1"></i>Thư mục bài tập của tôi</button></div></div>${progressRecord.comment ? `<div class="border-t pt-3 mt-3"><p class="font-semibold text-slate-700">Nhận xét của giáo viên:</p><p class="text-slate-600 whitespace-pre-wrap mt-1">${progressRecord.comment}</p></div>` : ''}</div>`: `<div class="flex items-center space-x-3"><button class="confirm-submission-btn bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors" data-lesson-id="${lesson.id}"><i class="fas fa-upload mr-2"></i>Nộp Bài</button><p class="text-slate-600 text-sm">Nhấn nút để tải file bài làm lên hệ thống</p></div>`) : ''}</div>` : ''}
        
        </div></div>`;
};

export const generateStudentProgressReport = (studentId, courseId, isTeacher = false) => {
    const courses = getCourses();
    const lessons = getLessons();
    const homeworks = getHomeworks();
    const progress = getProgress();
    const users = getUsers();
    
    const course = courses.find(c => c.id === courseId);
    if (!course) return { html: '', chartData: {} };

    const courseLessons = lessons.filter(l => l.courseId === courseId);
    const lessonsWithHomework = courseLessons.filter(l => homeworks.some(h => h.lessonId === l.id));
    const studentProgress = progress.filter(p => p.studentId === studentId && courseLessons.some(l => l.id === p.lessonId));

    const totalSubmissions = studentProgress.filter(p => p.submittedAt && lessonsWithHomework.some(l => l.id === p.lessonId)).length;
    const totalGraded = studentProgress.filter(p => p.submittedAt && p.grade != null && lessonsWithHomework.some(l => l.id === p.lessonId)).length;
    const totalPossibleSubmissions = lessonsWithHomework.length;
    
    const totalPresent = studentProgress.filter(p => p.attendanceStatus === 'present').length;
    const totalLate = studentProgress.filter(p => p.attendanceStatus === 'late').length;
    const totalAbsentExcused = studentProgress.filter(p => p.attendanceStatus === 'absent_excused').length;
    const totalAbsentUnexcused = studentProgress.filter(p => p.attendanceStatus === 'absent_unexcused').length;
    const totalAttendanceSlots = courseLessons.length;
    const totalRecorded = totalPresent + totalLate + totalAbsentExcused + totalAbsentUnexcused;
    const totalNotRecorded = totalAttendanceSlots - totalRecorded;

    // Calculate skill averages for this student
    // Sum all grades from graded work only (grade != null)
    const skillTotals = { reading: 0, listening: 0, speaking: 0, writing: 0 };
    let gradedCount = 0;
    lessonsWithHomework.forEach(lesson => {
        const progressRecord = studentProgress.find(p => p.lessonId === lesson.id && p.submittedAt && p.grade != null);
        if (progressRecord) {
            skillTotals.reading += progressRecord.grades?.reading ?? 0;
            skillTotals.listening += progressRecord.grades?.listening ?? 0;
            skillTotals.speaking += progressRecord.grades?.speaking ?? 0;
            skillTotals.writing += progressRecord.grades?.writing ?? 0;
            gradedCount++;
        }
    });
    
    const readingAvg = gradedCount > 0 ? (skillTotals.reading / gradedCount).toFixed(1) : '--';
    const listeningAvg = gradedCount > 0 ? (skillTotals.listening / gradedCount).toFixed(1) : '--';
    const speakingAvg = gradedCount > 0 ? (skillTotals.speaking / gradedCount).toFixed(1) : '--';
    const writingAvg = gradedCount > 0 ? (skillTotals.writing / gradedCount).toFixed(1) : '--';
    
    // For backward compatibility with existing code
    const readingScores = [readingAvg === '--' ? 0 : parseFloat(readingAvg)];
    const listeningScores = [listeningAvg === '--' ? 0 : parseFloat(listeningAvg)];
    const speakingScores = [speakingAvg === '--' ? 0 : parseFloat(speakingAvg)];
    const writingScores = [writingAvg === '--' ? 0 : parseFloat(writingAvg)];
    const calculateAverage = (scores) => scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : 0;
    
    
    const chartData = {
        submission: { labels: ['Đã nộp', 'Chưa nộp'], datasets: [{ data: [totalSubmissions, totalPossibleSubmissions > totalSubmissions ? totalPossibleSubmissions - totalSubmissions : 0], backgroundColor: ['#3b82f6', '#e2e8f0'] }] },
        grading: { labels: ['Đã chấm', 'Chưa chấm'], datasets: [{ data: [totalGraded, totalSubmissions - totalGraded], backgroundColor: ['#22c55e', '#facc15'] }] },
        attendance: { labels: ['Có mặt', 'Đi trễ', 'Vắng có phép', 'Vắng không phép', 'Chưa điểm danh'], datasets: [{ data: [totalPresent, totalLate, totalAbsentExcused, totalAbsentUnexcused, totalNotRecorded], backgroundColor: ['#22c55e', '#f97316', '#facc15', '#ef4444', '#e2e8f0'] }] },
        skills: { labels: ['Đọc', 'Nghe', 'Nói', 'Viết'], datasets: [{ label: 'Điểm trung bình', data: [readingAvg === '--' ? 0 : readingAvg, listeningAvg === '--' ? 0 : listeningAvg, speakingAvg === '--' ? 0 : speakingAvg, writingAvg === '--' ? 0 : writingAvg], backgroundColor: 'rgba(59, 130, 246, 0.2)', borderColor: 'rgba(59, 130, 246, 1)', pointBackgroundColor: 'rgba(59, 130, 246, 1)' }] }
    };

    const progressHTML = courseLessons.sort((a,b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0)).map(lesson => {
        const progressRecord = studentProgress.find(p => p.lessonId === lesson.id) || {};
        const { attendanceStatus, grade, submittedAt: submitted } = progressRecord;
        
        const attendanceMap = {
            present: { text: 'Có mặt', class: 'bg-blue-500 text-white' },
            absent_excused: { text: 'Vắng có phép', class: 'bg-yellow-500 text-white' },
            absent_unexcused: { text: 'Vắng không phép', class: 'bg-red-500 text-white' },
            late: { text: 'Không đúng giờ', class: 'bg-orange-500 text-white' }
        };
        const attendanceInfo = attendanceMap[attendanceStatus] || { text: 'Chưa điểm danh', class: 'bg-slate-200 text-slate-500' };

        return `
             <div class="p-4 border rounded-lg bg-white shadow-sm">
                 <div class="flex flex-col sm:flex-row justify-between sm:items-start mb-4">
                     <div>
                         <p class="font-medium text-lg">${lesson.title}</p>
                         ${submitted ? '<p class="text-xs text-green-600 font-semibold mt-1">ĐÃ NỘP BÀI</p>' : '<p class="text-xs text-slate-400 mt-1">Chưa nộp bài</p>'}
                     </div>
                     <div class="mt-3 sm:mt-0">
                         <span class="text-sm font-medium">Điểm danh: </span>
                         <span class="text-sm px-3 py-1 border rounded-full ${attendanceInfo.class}">${attendanceInfo.text}</span>
                     </div>
                 </div>
                 
                 <div class="border-t pt-4">
                     <div class="grid grid-cols-2 md:grid-cols-5 gap-4 items-center">
                         ${isTeacher ? `<div class="col-span-2 md:col-span-4">
                             <p class="font-semibold text-slate-700 mb-2">Điểm chi tiết:</p>
                             <div class="grid grid-cols-2 gap-3 text-sm">
                                 <p><span class="text-slate-500">Đọc:</span> <strong class="text-slate-800">${progressRecord.grades?.reading ?? '--'}</strong></p>
                                 <p><span class="text-slate-500">Nghe:</span> <strong class="text-slate-800">${progressRecord.grades?.listening ?? '--'}</strong></p>
                                 <p><span class="text-slate-500">Nói:</span> <strong class="text-slate-800">${progressRecord.grades?.speaking ?? '--'}</strong></p>
                                 <p><span class="text-slate-500">Viết:</span> <strong class="text-slate-800">${progressRecord.grades?.writing ?? '--'}</strong></p>
                             </div>
                         </div>` : ''}
                         <div class="text-center ${isTeacher ? '' : 'col-span-2 md:col-span-5'}">
                             <p class="text-sm font-medium text-slate-600">Điểm Đánh Giá Năng Lực</p>
                             <p class="font-bold text-3xl text-blue-600">${grade ?? '--'}</p>
                         </div>
                     </div>
                 </div>

                 ${progressRecord.comment ? `
                 <div class="mt-4 pt-4 border-t">
                      <p class="font-semibold text-slate-700">Nhận xét của giáo viên:</p>
                      <p class="text-slate-600 whitespace-pre-wrap mt-1 bg-slate-50 p-3 rounded-md">${progressRecord.comment}</p>
                 </div>
                 ` : ''}
             </div>
        `;
    }).join('');
    
    // Calculate overall average score from all graded submissions
    const allGradedRecords = studentProgress.filter(p => p.submittedAt && p.grade != null && lessonsWithHomework.some(l => l.id === p.lessonId));
    const allGrades = allGradedRecords.map(p => parseFloat(p.grade));
    const overallAverage = allGrades.length > 0 ? (allGrades.reduce((a, b) => a + b, 0) / allGrades.length).toFixed(1) : '--';
    
    const fullHTML = `
        <div class="p-6 bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl shadow-lg mb-6 border border-blue-100">
            <h3 class="text-xl font-bold mb-6 text-slate-800">📊 Tổng quan kết quả học tập</h3>
            
            <div class="grid grid-cols-1 ${isTeacher ? 'md:grid-cols-5' : 'md:grid-cols-3'} gap-4 mb-8">
                <div class="bg-white p-5 rounded-lg shadow-sm border-l-4 border-blue-500">
                    <p class="text-sm font-medium text-slate-600 mb-2">Điểm Đánh Giá Năng Lực</p>
                    <p class="text-3xl font-bold text-blue-600">${overallAverage}</p>
                    <p class="text-xs text-slate-500 mt-2">Từ ${allGradedRecords.length} bài đã chấm</p>
                </div>
                
                ${isTeacher ? `
                <div class="bg-white p-5 rounded-lg shadow-sm border-l-4 border-green-500">
                    <p class="text-sm font-medium text-slate-600 mb-2">Đọc</p>
                    <p class="text-3xl font-bold text-green-600">${readingAvg}</p>
                    <p class="text-xs text-slate-500 mt-2">${gradedCount > 0 ? 'Trung bình' : 'Chưa đánh giá'}</p>
                </div>
                
                <div class="bg-white p-5 rounded-lg shadow-sm border-l-4 border-purple-500">
                    <p class="text-sm font-medium text-slate-600 mb-2">Nghe</p>
                    <p class="text-3xl font-bold text-purple-600">${listeningAvg}</p>
                    <p class="text-xs text-slate-500 mt-2">${gradedCount > 0 ? 'Trung bình' : 'Chưa đánh giá'}</p>
                </div>
                
                <div class="bg-white p-5 rounded-lg shadow-sm border-l-4 border-orange-500">
                    <p class="text-sm font-medium text-slate-600 mb-2">Nói</p>
                    <p class="text-3xl font-bold text-orange-600">${speakingAvg}</p>
                    <p class="text-xs text-slate-500 mt-2">${gradedCount > 0 ? 'Trung bình' : 'Chưa đánh giá'}</p>
                </div>
                
                <div class="bg-white p-5 rounded-lg shadow-sm border-l-4 border-red-500">
                    <p class="text-sm font-medium text-slate-600 mb-2">Viết</p>
                    <p class="text-3xl font-bold text-red-600">${writingAvg}</p>
                    <p class="text-xs text-slate-500 mt-2">${gradedCount > 0 ? 'Trung bình' : 'Chưa đánh giá'}</p>
                </div>
                ` : `
                <div class="bg-white p-5 rounded-lg shadow-sm border-l-4 border-slate-400">
                    <p class="text-sm font-medium text-slate-600 mb-2">Số bài đã nộp</p>
                    <p class="text-3xl font-bold text-slate-600">${totalSubmissions}/${totalPossibleSubmissions}</p>
                    <p class="text-xs text-slate-500 mt-2">Tiến độ nộp bài</p>
                </div>
                
                <div class="bg-white p-5 rounded-lg shadow-sm border-l-4 border-slate-400">
                    <p class="text-sm font-medium text-slate-600 mb-2">Chuyên cần</p>
                    <p class="text-3xl font-bold text-slate-600">${totalPresent}/${totalAttendanceSlots}</p>
                    <p class="text-xs text-slate-500 mt-2">Buổi có mặt / Tổng buổi</p>
                </div>
                `}
            </div>
        </div>
        
        <div class="p-6 bg-white rounded-xl shadow-lg mb-6">
            <h3 class="text-xl font-bold mb-4">Biểu đồ thống kê</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div class="bg-slate-50 p-4 rounded-xl flex flex-col h-72"><h5 class="text-center font-semibold text-slate-600 mb-2 flex-shrink-0">Tỉ lệ Nộp bài</h5><div class="relative flex-grow min-h-0"><canvas id="report-submissionChart"></canvas></div></div>
                 <div class="bg-slate-50 p-4 rounded-xl flex flex-col h-72"><h5 class="text-center font-semibold text-slate-600 mb-2 flex-shrink-0">Tỉ lệ Chấm bài</h5><div class="relative flex-grow min-h-0"><canvas id="report-gradingChart"></canvas></div></div>
                 <div class="bg-slate-50 p-4 rounded-xl flex flex-col h-72"><h5 class="text-center font-semibold text-slate-600 mb-2 flex-shrink-0">Chuyên cần</h5><div class="relative flex-grow min-h-0"><canvas id="report-attendanceChart"></canvas></div></div>
                 <div class="bg-slate-50 p-4 rounded-xl flex flex-col h-72"><h5 class="text-center font-semibold text-slate-600 mb-2 flex-shrink-0">Điểm Kỹ năng TB</h5><div class="relative flex-grow min-h-0"><canvas id="report-skillsChart"></canvas></div></div>
            </div>
        </div>
        <h3 class="text-xl font-bold mb-4">Chi tiết từng buổi học</h3>
        <div class="space-y-4">${courseLessons.length > 0 ? progressHTML : '<p class="text-slate-500 text-center py-8">Chưa có bài học nào trong khóa học này.</p>'}</div>
    `;
    
    return { html: fullHTML, chartData };
};

export const renderMyProgressView = (courseId, isRestoring = false) => {
    const currentUser = getCurrentUser();
    const courses = getCourses();
    const appContainer = document.getElementById('app');
    
    if (!isRestoring) {
        setCurrentView('myProgress');
    }
    const course = courses.find(c => c.id === courseId);
    if (!course) return renderStudentDashboard();

    document.title = `Tiến độ của tôi: ${course.title}`;
    const { html, chartData } = generateStudentProgressReport(currentUser.id, courseId, false);

    appContainer.innerHTML = `
         <div class="w-full max-w-7xl mx-auto fade-in">
             ${renderHeader(`Tiến độ của tôi`, true)}
             <main class="mt-6">
                 ${html}
             </main>
         </div>
    `;
    setTimeout(() => renderCharts(chartData, 'report-'), 50);
};

// ═══════════════════════════════════════════════════════════════════════════════════
// STUDENT EVENT HANDLERS - QUẢN LÝ CÁC SỰ KIỆN CHO HỌC SINH
// ═══════════════════════════════════════════════════════════════════════════════════

export const handleStudentClickEvents = (e) => {
    const currentUser = getCurrentUser();
    const target = e.target;
    
    if (currentUser?.role === 'student') {
        if (target.closest('.view-course-btn')) { 
            setCurrentCourseId(target.closest('.view-course-btn').dataset.id);
            setCurrentView('course');
            saveSessionToLocalStorage();
            return true;
        }
        if (target.closest('.view-lesson-btn')) {
            setCurrentLessonId(target.closest('.view-lesson-btn').dataset.lessonId);
            setCurrentView('lesson');
            saveSessionToLocalStorage();
            return true;
        }
        if (target.closest('.confirm-submission-btn')) {
            const lessonId = target.closest('.confirm-submission-btn').dataset.lessonId;
            handleQuickSubmission(lessonId);
            return true;
        }
        if (target.closest('.view-my-progress-btn')) {
            setCurrentCourseId(target.closest('.view-my-progress-btn').dataset.courseId);
            setCurrentView('myProgress');
            saveSessionToLocalStorage();
            return true;
        }
        if (target.closest('.view-course-folder-btn')) {
            const courseId = target.closest('.view-course-folder-btn').dataset.courseId;
            handleViewCourseFolderBtn(courseId);
            return true;
        }
        if (target.closest('.view-lesson-folder-btn')) {
            const lessonId = target.closest('.view-lesson-folder-btn').dataset.lessonId;
            handleViewLessonFolder(lessonId);
            return true;
        }
    }
    return false;
};

// ═══════════════════════════════════════════════════════════════════════════════════
// STUDENT SUBMISSION HANDLER - NỘP BÀI VỚI UPLOAD FILE
// ═══════════════════════════════════════════════════════════════════════════════════

export const handleQuickSubmission = (lessonId) => {
    const currentUser = getCurrentUser();
    const courses = getCourses();
    const lessons = getLessons();
    const progress = getProgress();
    
    const lesson = lessons.find(l => l.id === lessonId);
    const course = courses.find(c => c.id === lesson.courseId);
    
    if (!course?.scriptUrl) {
        showToast('Khóa học này chưa được cấu hình GAS Web App URL', 'error');
        return;
    }
    
    // Create submission modal with progress tracking
    const submissionHTML = `
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                <div class="bg-blue-50 p-6 border-b border-blue-100 flex items-center gap-3">
                    <div class="bg-blue-100 p-2 rounded-full">
                        <span style="font-size: 24px;">📤</span>
                    </div>
                    <div>
                        <h3 class="text-lg font-bold text-blue-700">Nộp Bài: ${lesson.title}</h3>
                        <p class="text-xs text-blue-500">Chọn file bài làm để nộp</p>
                    </div>
                </div>
                
                <div class="flex-1 overflow-y-auto p-6 space-y-4">
                    <div id="submission-dropzone" class="border-2 border-dashed border-blue-300 hover:border-blue-500 hover:bg-blue-50 rounded-xl p-8 text-center cursor-pointer transition-all">
                        <div class="flex flex-col items-center gap-2">
                            <div class="p-3 bg-white rounded-full shadow-sm">
                                <span style="font-size: 24px;">➕</span>
                            </div>
                            <p class="text-sm font-medium text-gray-600">Chọn hoặc kéo thả file</p>
                            <p class="text-xs text-gray-400">Hỗ trợ: PDF, DOCX, XLSX, PPT, Images, Videos, v.v.</p>
                        </div>
                        <input type="file" id="submission-file-input" multiple class="hidden" />
                    </div>
                    
                    <div id="submission-files-list" class="space-y-3">
                        <!-- Files will be added here with progress bars -->
                    </div>
                </div>
                
                <div class="p-4 bg-gray-50 border-t border-gray-100 flex gap-3 flex-col sm:flex-row">
                    <button class="flex-1 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-white transition-colors" id="submission-cancel-btn">
                        Hủy
                    </button>
                    <button class="flex-1 py-2.5 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-sm transition-colors flex items-center justify-center gap-2" id="submission-submit-btn" disabled>
                        <span style="font-size: 18px;">💾</span> Nộp Bài
                    </button>
                </div>
            </div>
        </div>
    `;
    
    const modalDiv = document.createElement('div');
    modalDiv.id = 'submission-modal';
    modalDiv.innerHTML = submissionHTML;
    document.body.appendChild(modalDiv);
    
    // Handle file selection
    const fileInput = modalDiv.querySelector('#submission-file-input');
    const dropzone = modalDiv.querySelector('#submission-dropzone');
    const filesList = modalDiv.querySelector('#submission-files-list');
    const submitBtn = modalDiv.querySelector('#submission-submit-btn');
    const cancelBtn = modalDiv.querySelector('#submission-cancel-btn');
    
    let selectedFiles = [];
    
    const addFiles = (newFiles) => {
        const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
        Array.from(newFiles).forEach(file => {
            // Check file size limit
            if (file.size > MAX_FILE_SIZE) {
                showToast(`❌ File "${file.name}" vượt quá 500MB (${(file.size / 1024 / 1024).toFixed(2)} MB)`, 'error');
                return;
            }
            if (!selectedFiles.find(f => f.name === file.name && f.size === file.size)) {
                selectedFiles.push({
                    file: file,
                    name: file.name,
                    size: file.size,
                    progress: 0,
                    status: 'idle'
                });
            }
        });
        renderFilesList();
        submitBtn.disabled = selectedFiles.length === 0;
    };
    
    const renderFilesList = () => {
        filesList.innerHTML = selectedFiles.map((fileObj, idx) => {
            const statusClass = fileObj.status === 'success' ? 'bg-green-50 border-green-200' :
                               fileObj.status === 'error' ? 'bg-red-50 border-red-200' :
                               fileObj.status === 'uploading' ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200';
            
            const statusIcon = fileObj.status === 'success' ? '✓' :
                              fileObj.status === 'error' ? '✗' :
                              fileObj.status === 'uploading' ? '⏳' : '📄';
            
            return `
                <div class="p-3 border rounded-lg ${statusClass} transition-all">
                    <div class="flex items-center justify-between mb-2">
                        <div class="flex items-center gap-2 flex-1 min-w-0">
                            <span style="font-size: 14px;">${statusIcon}</span>
                            <span class="text-sm font-medium text-gray-700 truncate">${fileObj.name}</span>
                            <span class="text-xs text-gray-400 flex-shrink-0">(${(fileObj.size / 1024 / 1024).toFixed(2)} MB)</span>
                        </div>
                        ${fileObj.status !== 'uploading' && fileObj.status !== 'success' ? `
                            <button class="text-red-500 hover:text-red-700 p-1" data-remove-index="${idx}">
                                ✕
                            </button>
                        ` : ''}
                    </div>
                    ${fileObj.status === 'uploading' || fileObj.progress > 0 ? `
                        <div class="w-full bg-gray-300 rounded-full h-2">
                            <div class="bg-blue-600 h-2 rounded-full transition-all" style="width: ${fileObj.progress}%"></div>
                        </div>
                        <div class="text-right mt-1">
                            <span class="text-xs font-bold text-blue-600">${fileObj.progress}%</span>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    };
    
    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('bg-blue-50', 'border-blue-500');
    });
    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('bg-blue-50', 'border-blue-500');
    });
    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('bg-blue-50', 'border-blue-500');
        addFiles(e.dataTransfer.files);
    });
    
    fileInput.addEventListener('change', (e) => {
        addFiles(e.target.files);
    });
    
    filesList.addEventListener('click', (e) => {
        if (e.target.hasAttribute('data-remove-index')) {
            const idx = parseInt(e.target.getAttribute('data-remove-index'));
            if (!isNaN(idx)) {
                selectedFiles.splice(idx, 1);
                renderFilesList();
                submitBtn.disabled = selectedFiles.length === 0;
            }
        }
    });
    
    cancelBtn.addEventListener('click', () => {
        modalDiv.remove();
    });
    
    submitBtn.addEventListener('click', async () => {
        if (selectedFiles.length === 0) return;
        
        submitBtn.disabled = true;
        cancelBtn.disabled = true;
        
        try {
            // Create folder structure
            showToast('Đang cấu trúc thư mục...', 'info');
            const hierarchyRes = await fetch(course.scriptUrl, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'create_folder_structure',
                    className: course.title,
                    homeworkName: 'Bai Tap Ve Nha',
                    studentName: currentUser.name,
                    lessonName: lesson.title
                })
            });
            
            const hierarchyData = await hierarchyRes.json();
            if (hierarchyData.status !== 'success' || !hierarchyData.folderId) {
                throw new Error(hierarchyData.message || 'Lỗi tạo thư mục');
            }
            
            // Upload files with progress tracking
            let uploadedCount = 0;
            for (let fileIdx = 0; fileIdx < selectedFiles.length; fileIdx++) {
                const fileObj = selectedFiles[fileIdx];
                const file = fileObj.file;
                
                try {
                    const urlRes = await fetch(course.scriptUrl, {
                        method: 'POST',
                        body: JSON.stringify({
                            action: 'get_url',
                            filename: file.name,
                            mimeType: file.type || 'application/octet-stream',
                            folderId: hierarchyData.folderId
                        })
                    });
                    
                    const urlData = await urlRes.json();
                    if (urlData.status !== 'success' || !urlData.url) {
                        throw new Error(urlData.message || 'Lỗi lấy upload URL');
                    }
                    
                    // Update status to uploading
                    fileObj.status = 'uploading';
                    fileObj.progress = 0;
                    renderFilesList();
                    
                    // Upload file with XMLHttpRequest to track progress
                    await new Promise((resolve, reject) => {
                        const xhr = new XMLHttpRequest();
                        let uploadCompleted = false;
                        const timeout = setTimeout(() => {
                            if (!uploadCompleted) {
                                xhr.abort();
                                reject(new Error('Timeout tải lên'));
                            }
                        }, 600000); // 10 phút timeout
                        
                        xhr.upload.addEventListener('progress', (event) => {
                            if (event.lengthComputable) {
                                fileObj.progress = Math.round((event.loaded / event.total) * 100);
                                renderFilesList();
                                
                                // Khi progress đạt 100%, coi như upload thành công
                                if (fileObj.progress === 100 && !uploadCompleted) {
                                    uploadCompleted = true;
                                    clearTimeout(timeout);
                                    resolve();
                                }
                            }
                        });
                        
                        xhr.addEventListener('error', () => {
                            if (!uploadCompleted) {
                                uploadCompleted = true;
                                clearTimeout(timeout);
                                reject(new Error('Lỗi kết nối mạng'));
                            }
                        });
                        
                        xhr.addEventListener('abort', () => {
                            if (!uploadCompleted) {
                                uploadCompleted = true;
                                clearTimeout(timeout);
                                reject(new Error('Tải lên bị hủy'));
                            }
                        });
                        
                        xhr.open('PUT', urlData.url, true);
                        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
                        xhr.send(file);
                    });
                    
                    uploadedCount++;
                    fileObj.status = 'success';
                    fileObj.progress = 100;
                    renderFilesList();
                } catch (fileErr) {
                    fileObj.status = 'error';
                    renderFilesList();
                    // Không hiển thị toast lỗi cho từng file, chỉ cập nhật status
                }
            }
            
            // Save to Firebase
            const progressRecord = progress.find(p => p.lessonId === lessonId && p.studentId === currentUser.id);
            if (progressRecord) {
                // Record exists, update it
                await updateDoc(doc(db, 'progress', progressRecord.id), {
                    submittedAt: new Date()
                });
            } else {
                // Record doesn't exist, create new one
                const newProgressId = `${currentUser.id}_${lessonId}_${Date.now()}`;
                await setDoc(doc(db, 'progress', newProgressId), {
                    studentId: currentUser.id,
                    lessonId: lessonId,
                    submittedAt: new Date(),
                    grade: null,
                    grades: { reading: null, listening: null, speaking: null, writing: null },
                    comment: '',
                    attendanceStatus: null
                }, { merge: true });
            }
            
            // Kiểm tra có file nào fail không
            const failedFiles = selectedFiles.filter(f => f.status === 'error');
            const successFiles = selectedFiles.filter(f => f.status === 'success');
            
            if (successFiles.length > 0) {
                showToast(`✅ Nộp bài thành công! (${successFiles.length}/${selectedFiles.length} file)`, 'success');
            }
            
            if (failedFiles.length > 0) {
                showToast(`⚠️ ${failedFiles.length} file tải lên thất bại, nhưng ${successFiles.length} file thành công`, 'warning');
            }
            
            setTimeout(() => {
                modalDiv.remove();
                renderLessonView(lessonId);
            }, 1500);
        } catch (err) {
            showToast(`❌ Lỗi nộp bài: ${err.message}`, 'error');
            submitBtn.disabled = false;
            cancelBtn.disabled = false;
        }
    });
};

// ═══════════════════════════════════════════════════════════════════════════════════
// GET LESSON FOLDER URL FROM GAS
// ═══════════════════════════════════════════════════════════════════════════════════

export const getCourseFolderUrl = async (course) => {
    try {
        if (!course?.scriptUrl) {
            showToast('❌ Khóa học chưa được cấu hình GAS Web App URL', 'error');
            return null;
        }
        
        // Gọi create_course_folder (tạo nếu chưa tồn tại, lấy nếu tồn tại)
        const res = await fetch(course.scriptUrl, {
            method: 'POST',
            body: JSON.stringify({
                action: 'create_course_folder',
                className: course.title
            })
        });
        
        const data = await res.json();
        if (data.status === 'success' && data.folderUrl) {
            return data.folderUrl;
        }
        
        showToast(`❌ Không tìm thấy thư mục khóa học`, 'error');
        return null;
    } catch (err) {
        showToast(`❌ Lỗi kết nối GAS: ${err.message}`, 'error');
        return null;
    }
};

export const handleViewCourseFolderBtn = async (courseId) => {
    const courses = getCourses();
    const course = courses.find(c => c.id === courseId);
    
    if (!course) {
        showToast('❌ Không tìm thấy khóa học', 'error');
        return;
    }
    
    showToast('Đang lấy link thư mục...', 'info');
    const folderUrl = await getCourseFolderUrl(course);
    
    if (folderUrl) {
        window.open(folderUrl, '_blank');
        showToast('✅ Đang mở thư mục lớp học', 'success');
    } else {
        showToast('❌ Không tìm thấy thư mục lớp học', 'error');
    }
};

export const getLessonFolderUrl = async (course, lesson, studentName) => {
    try {
        if (!course?.scriptUrl) {
            showToast('❌ Khóa học chưa được cấu hình GAS Web App URL', 'error');
            return null;
        }
        
        // Gọi API create_folder_structure để lấy lessonUrl
        const hierarchyRes = await fetch(course.scriptUrl, {
            method: 'POST',
            body: JSON.stringify({
                action: 'create_folder_structure',
                className: course.title,
                homeworkName: 'Bai Tap Ve Nha',
                studentName: studentName,
                lessonName: lesson.title
            })
        });
        
        const hierarchyData = await hierarchyRes.json();
        if (hierarchyData.status === 'success' && hierarchyData.lessonUrl) {
            return hierarchyData.lessonUrl;
        } else if (hierarchyData.status === 'success' && hierarchyData.folderId) {
            // Nếu chỉ có folderId, tạo URL từ folderId
            return `https://drive.google.com/drive/folders/${hierarchyData.folderId}`;
        }
        
        showToast(`❌ Không tìm thấy thư mục bài học`, 'error');
        return null;
    } catch (err) {
        showToast(`❌ Lỗi kết nối GAS: ${err.message}`, 'error');
        return null;
    }
};

export const handleViewLessonFolder = async (lessonId) => {
    const currentUser = getCurrentUser();
    const courses = getCourses();
    const lessons = getLessons();
    
    const lesson = lessons.find(l => l.id === lessonId);
    if (!lesson) return;
    
    const course = courses.find(c => c.id === lesson.courseId);
    if (!course?.scriptUrl) {
        showToast('Khóa học này chưa được cấu hình GAS Web App URL', 'error');
        return;
    }
    
    showToast('Đang lấy link thư mục...', 'info');
    const folderUrl = await getLessonFolderUrl(course, lesson, currentUser.name);
    
    if (folderUrl) {
        window.open(folderUrl, '_blank');
        showToast('✅ Đang mở thư mục bài học', 'success');
    } else {
        showToast('❌ Không tìm thấy thư mục bài học', 'error');
    }
};

// ═══════════════════════════════════════════════════════════════════════════════════
// HANDLE CANCEL SUBMISSION
// ═══════════════════════════════════════════════════════════════════════════════════

export const handleCancelSubmission = async (lessonId) => {
    const currentUser = getCurrentUser();
    const courses = getCourses();
    const lessons = getLessons();
    const progress = getProgress();

    const lesson = lessons.find(l => l.id === lessonId);
    const course = courses.find(c => c.id === lesson.courseId);
    const progressRecord = progress.find(p => p.lessonId === lessonId && p.studentId === currentUser.id);

    renderConfirmModal('Xác nhận xóa bài', 'Bạn có chắc chắn muốn xóa bài nộp và folder trên Google Drive không?', 'Đồng ý', 'bg-red-600 hover:bg-red-700', async () => {
        try {
            // Call delete API from GAS script
            if (course?.scriptUrl && course.title && currentUser.name && lesson.title) {
                try {
                    const deleteRes = await fetch(course.scriptUrl, {
                        method: 'POST',
                        body: JSON.stringify({
                            action: 'delete_lesson_folder',
                            className: course.title,
                            homeworkName: 'Bai Tap Ve Nha',
                            studentName: currentUser.name,
                            lessonName: lesson.title
                        })
                    });
                    
                    const deleteData = await deleteRes.json();
                    if (deleteData.status === 'success' && deleteData.deleted) {
                        showToast('✅ Đã xóa folder bài học khỏi Google Drive', 'success');
                    } else if (deleteData.status === 'success' && !deleteData.deleted) {
                        showToast('⚠️ Không tìm thấy folder để xóa', 'warning');
                    }
                } catch (delErr) { 
                    // Error handling silently
                }
            }
            
            // Remove from Firebase
            if (progressRecord) {
                await updateDoc(doc(db, 'progress', progressRecord.id), { 
                    submittedAt: deleteField() 
                });
                delete progressRecord.submittedAt;
            }
            
            showToast('✓ Đã hủy xác nhận nộp bài', 'success');
            closeModal();
            renderLessonView(lessonId);
        } catch (err) {
            showToast('❌ Có lỗi khi hủy nộp bài', 'error');
        }
    });
};