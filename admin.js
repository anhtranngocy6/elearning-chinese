// admin.js - Admin dashboard and management functions

import { renderHeader, showToast, showModal, closeModal, renderConfirmModal, generateUsername, saveSessionToLocalStorage } from './shared.js';
import {
    getUsers, setUsers, getCourses, setCourses, getLessons, setLessons,
    getProgress, setProgress, getEnrollments, setEnrollments,
    getCurrentUser, setCurrentUser, setCurrentView, setCurrentCourseId
} from './shared.js';
import { updateDoc, doc, deleteDoc, writeBatch, addDoc, collection, serverTimestamp, db } from './firebase.js';

// Global flag để chỉ gắn listener 1 lần duy nhất
let adminListenersInitialized = false;

// ═══════════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTION - Render Course Overview Card
// ═══════════════════════════════════════════════════════════════════════════════════

const renderCourseOverviewCard = (course, teacher, lessons, enrollments, progress, users, courses) => {
    const courseLessons = lessons.filter(l => l.courseId === course.id);
    const studentCount = enrollments.filter(e => e.courseId === course.id).length;
    const lessonCount = courseLessons.length;

    // Tính toán thống kê của giáo viên
    const teacherCourses = courses.filter(tc => tc.createdBy === course.createdBy);
    const teacherTotalStudents = new Set(
        enrollments
            .filter(e => teacherCourses.some(tc => tc.id === e.courseId))
            .map(e => e.studentId)
    ).size;
    const teacherTotalLessons = lessons.filter(l => teacherCourses.some(tc => tc.id === l.courseId)).length;

    // Tính tiến độ trung bình
    const courseProgress = progress.filter(p =>
        courseLessons.some(l => l.id === p.lessonId)
    );
    const submitted = courseProgress.filter(p => p.submittedAt).length;
    const graded = courseProgress.filter(p => p.submittedAt && p.grade != null).length;
    const avgProgress = courseProgress.length > 0 ? Math.round((submitted / courseProgress.length) * 100) : 0;

    // Xác định tình trạng lớp
    let statusClass = 'from-blue-50 to-blue-100 border-blue-300';
    let statusIcon = 'fa-star';
    let statusText = 'Bình thường';
    let statusColor = 'text-blue-600';

    if (studentCount === 0) {
        statusClass = 'from-slate-50 to-slate-100 border-slate-300';
        statusIcon = 'fa-inbox';
        statusText = 'Chưa có HS';
        statusColor = 'text-slate-500';
    } else if (avgProgress >= 80) {
        statusClass = 'from-green-50 to-green-100 border-green-300';
        statusIcon = 'fa-check-circle';
        statusText = 'Xuất sắc';
        statusColor = 'text-green-600';
    } else if (avgProgress >= 50) {
        statusClass = 'from-amber-50 to-amber-100 border-amber-300';
        statusIcon = 'fa-hourglass-half';
        statusText = 'Đang tiến hành';
        statusColor = 'text-amber-600';
    }

    return `
    <div class="bg-gradient-to-br ${statusClass} rounded-lg border-2 hover:shadow-lg hover:scale-[1.02] transition-all p-4 relative group" data-id="${course.id}">
        <div class="flex justify-between items-start mb-3">
            <div class="flex-grow view-course-detail-btn cursor-pointer" data-id="${course.id}">
                <div class="flex items-center space-x-2 mb-1">
                    <h3 class="font-bold text-base text-slate-800">${course.title}</h3>
                    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${statusColor} bg-white/60">
                        <i class="fas ${statusIcon} mr-0.5"></i>${statusText}
                    </span>
                </div>
                <p class="text-xs text-slate-600"><i class="fas fa-chalkboard-teacher mr-1"></i>GV: <strong>${teacher?.displayName || teacher?.name || 'N/A'}</strong></p>
            </div>
            <div class="flex items-center space-x-2">
                <div class="text-right">
                    <div class="text-xl font-bold text-slate-800">${avgProgress}%</div>
                    <div class="text-xs text-slate-500">Tiến độ</div>
                </div>
                <button class="delete-course-btn text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition-colors opacity-0 group-hover:opacity-100" data-id="${course.id}" title="Xóa khóa học" onclick="event.stopPropagation(); event.preventDefault();">
                    <i class="fas fa-trash-alt text-sm"></i>
                </button>
            </div>
        </div>
        
        <div class="mb-3">
            <div class="w-full bg-white/50 rounded-full h-2">
                <div class="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all" style="width: ${avgProgress}%"></div>
            </div>
        </div>
        
        <div class="grid grid-cols-4 gap-2 mb-2">
            <div class="bg-white/70 p-2 rounded text-center">
                <div class="text-xs text-slate-500 mb-0.5">HS</div>
                <div class="text-base font-bold text-slate-800">${studentCount}</div>
            </div>
            <div class="bg-white/70 p-2 rounded text-center">
                <div class="text-xs text-slate-500 mb-0.5">Bài</div>
                <div class="text-base font-bold text-slate-800">${lessonCount}</div>
            </div>
            <div class="bg-white/70 p-2 rounded text-center">
                <div class="text-xs text-slate-500 mb-0.5">Nộp</div>
                <div class="text-base font-bold text-green-600">${submitted}</div>
            </div>
            <div class="bg-white/70 p-2 rounded text-center">
                <div class="text-xs text-slate-500 mb-0.5">Chấm</div>
                <div class="text-base font-bold text-blue-600">${graded}</div>
            </div>
        </div>
        
        <div class="border-t border-white/50 pt-2">
            <div class="text-xs text-slate-600 mb-1 flex items-center">
                <i class="fas fa-medal text-amber-500 mr-1"></i><strong>Năng lực GV</strong>
            </div>
            <div class="grid grid-cols-3 gap-1.5 text-xs">
                <div class="bg-white/50 p-1.5 rounded text-center">
                    <div class="font-bold text-slate-800">${teacherCourses.length}</div>
                    <div class="text-slate-600">Khóa</div>
                </div>
                <div class="bg-white/50 p-1.5 rounded text-center">
                    <div class="font-bold text-slate-800">${teacherTotalStudents}</div>
                    <div class="text-slate-600">HS</div>
                </div>
                <div class="bg-white/50 p-1.5 rounded text-center">
                    <div class="font-bold text-slate-800">${teacherTotalLessons}</div>
                    <div class="text-slate-600">Bài</div>
                </div>
            </div>
        </div>
    </div>`;
};

// ═══════════════════════════════════════════════════════════════════════════════════
// ADMIN RENDER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════════

export const renderAdminDashboard = (appContainerEl = document.getElementById('app')) => {
    document.title = "Admin Dashboard | SmartEdu x AT";
    // KHÔNG reset flag - giữ nguyên để listener chỉ gắn 1 lần
    const users = getUsers();
    const courses = getCourses();
    const lessons = getLessons();
    const enrollments = getEnrollments();
    const progress = getProgress();

    const teachers = users.filter(u => u.role === 'teacher');
    const students = users.filter(u => u.role === 'student');

    // Set background image
    appContainerEl.style.backgroundImage = 'url("tet_background.png")';
    appContainerEl.style.backgroundSize = 'cover';
    appContainerEl.style.backgroundPosition = 'center';
    appContainerEl.style.backgroundRepeat = 'no-repeat';
    appContainerEl.style.backgroundAttachment = 'fixed';

    appContainerEl.innerHTML = `
         <div class="w-full max-w-7xl mx-auto fade-in">
             ${renderHeader('Admin Dashboard')}
             <main class="mt-6">
                 <!-- Stats Cards -->
                 <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                     <div class="bg-white p-6 rounded-xl shadow-lg flex items-center space-x-4"><div class="bg-blue-100 text-blue-600 p-4 rounded-full"><i class="fas fa-chalkboard-teacher fa-xl"></i></div><div><p class="text-slate-500 text-sm">Giáo viên</p><p class="text-2xl font-bold">${teachers.length}</p></div></div>
                     <div class="bg-white p-6 rounded-xl shadow-lg flex items-center space-x-4"><div class="bg-green-100 text-green-600 p-4 rounded-full"><i class="fas fa-user-graduate fa-xl"></i></div><div><p class="text-slate-500 text-sm">Học sinh</p><p class="text-2xl font-bold">${students.length}</p></div></div>
                     <div class="bg-white p-6 rounded-xl shadow-lg flex items-center space-x-4"><div class="bg-purple-100 text-purple-600 p-4 rounded-full"><i class="fas fa-book-open fa-xl"></i></div><div><p class="text-slate-500 text-sm">Khoá học</p><p class="text-2xl font-bold">${courses.length}</p></div></div>
                      <div class="bg-white p-6 rounded-xl shadow-lg flex items-center space-x-4"><div class="bg-yellow-100 text-yellow-600 p-4 rounded-full"><i class="fas fa-tasks fa-xl"></i></div><div><p class="text-slate-500 text-sm">Lượt Ghi danh</p><p class="text-2xl font-bold">${enrollments.length}</p></div></div>
                 </div>

                 <!-- Tabs Navigation -->
                 <div class="flex space-x-1 mb-6 border-b border-slate-300 bg-white rounded-t-xl px-6 pt-4 overflow-x-auto">
                     <button class="admin-tab-btn tab-active px-6 py-3 font-semibold text-blue-600 border-b-2 border-blue-600 hover:text-blue-700 transition-colors whitespace-nowrap" data-tab="management">
                         <i class="fas fa-users mr-2"></i>Quản lý
                     </button>
                     <button class="admin-tab-btn px-6 py-3 font-semibold text-slate-600 border-b-2 border-transparent hover:text-slate-800 transition-colors whitespace-nowrap" data-tab="overview">
                         <i class="fas fa-chart-bar mr-2"></i>Tổng quan Khóa
                     </button>
                 </div>

                 <!-- Tab Content -->
                 <div id="admin-tabs-content">
                     <!-- TAB: QUẢN LÝ -->
                     <div id="admin-tab-management" class="admin-tab-content hidden">
                         <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                     <!-- QUẢN LÝ GIÁO VIÊN -->
                     <div class="bg-white rounded-xl shadow-lg overflow-hidden">
                         <div class="bg-gradient-to-r from-blue-600 to-blue-500 p-6 text-white">
                             <h2 class="text-2xl font-bold flex items-center"><i class="fas fa-chalkboard-teacher mr-3"></i>Quản lý Giáo viên</h2>
                             <p class="text-blue-100 mt-1 text-sm">Tổng: <strong>${teachers.length}</strong> giáo viên</p>
                         </div>
                         <div class="p-6">
                             <div class="bg-blue-50 p-4 rounded-lg mb-4 border border-blue-200">
                                 <h3 class="font-semibold text-slate-700 mb-3 flex items-center"><i class="fas fa-plus-circle text-blue-600 mr-2"></i>Thêm giáo viên mới</h3>
                                 <div class="space-y-3">
                                     <input type="text" id="new-teacher-name" placeholder="Họ và tên giáo viên" class="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                     <input type="password" id="new-teacher-password" placeholder="Mật khẩu ban đầu" class="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                     <button id="add-teacher-btn" class="w-full bg-blue-600 text-white font-semibold p-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"><i class="fas fa-plus mr-2"></i>Thêm Giáo viên</button>
                                 </div>
                             </div>

                             <div class="border-t pt-4">
                                 <div class="mb-4">
                                     <h3 class="font-semibold text-slate-700 mb-3 flex items-center"><i class="fas fa-list mr-2 text-slate-500"></i>Danh sách giáo viên (${teachers.length})</h3>
                                     <div class="relative mb-3 bg-white">
                                         <i class="fas fa-search absolute left-3 top-3 text-slate-400 pointer-events-none"></i>
                                         <input type="text" id="teacher-search" placeholder="🔍 Tìm kiếm giáo viên theo tên hoặc username..." class="w-full pl-10 pr-4 py-2.5 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium transition-all shadow-sm hover:border-slate-400">
                                     </div>
                                 </div>
                                 <div class="space-y-2 max-h-96 overflow-y-auto pr-2" id="teacher-list">
                                     ${teachers.length > 0 ? teachers.map(t => `
                                         <div class="p-4 bg-gradient-to-r from-slate-50 to-blue-50 rounded-lg border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all teacher-item" data-name="${t.name.toLowerCase()}" data-username="${t.username.toLowerCase()}">
                                             <div class="flex justify-between items-start">
                                                 <div class="flex-grow">
                                                     <p class="font-semibold text-slate-800"><i class="fas fa-chalkboard-teacher text-blue-600 mr-1"></i>${t.displayName || t.name}</p>
                                                     <p class="text-xs text-slate-500 font-mono bg-slate-100 inline-block px-2 py-1 rounded mt-1">@${t.username}</p>
                                                 </div>
                                                 <div class="flex space-x-2">
                                                     <button class="view-user-info-btn text-blue-500 hover:text-blue-700 hover:bg-blue-50 p-2 rounded-lg transition-colors" data-id="${t.id}" data-role="teacher" title="Xem thông tin">
                                                         <i class="fas fa-eye"></i>
                                                     </button>
                                                     <button class="delete-user-btn text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors" data-id="${t.id}" title="Xóa giáo viên">
                                                         <i class="fas fa-trash-alt"></i>
                                                     </button>
                                                 </div>
                                             </div>
                                         </div>
                                     `).join('') : '<p class="text-center py-8 text-slate-400"><i class="fas fa-inbox fa-2x mb-2"></i><br>Chưa có giáo viên.</p>'}
                                 </div>
                             </div>
                         </div>
                     </div>

                     <!-- QUẢN LÝ HỌC SINH -->
                     <div class="bg-white rounded-xl shadow-lg overflow-hidden">
                         <div class="bg-gradient-to-r from-green-600 to-green-500 p-6 text-white">
                             <h2 class="text-2xl font-bold flex items-center"><i class="fas fa-user-graduate mr-3"></i>Quản lý Học sinh</h2>
                             <p class="text-green-100 mt-1 text-sm">Tổng: <strong>${students.length}</strong> học sinh</p>
                         </div>
                         <div class="p-6">
                             <div class="bg-green-50 p-4 rounded-lg mb-4 border border-green-200">
                                 <h3 class="font-semibold text-slate-700 mb-3 flex items-center"><i class="fas fa-plus-circle text-green-600 mr-2"></i>Thêm học sinh mới</h3>
                                 <div class="space-y-3">
                                     <input type="text" id="new-student-name" placeholder="Họ và tên học sinh" class="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent">
                                     <input type="password" id="new-student-password" placeholder="Mật khẩu ban đầu" class="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent">
                                     <select id="admin-teacher-select" class="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent">
                                         <option value="">-- Chọn giáo viên --</option>
                                         ${teachers.map(t => `<option value="${t.id}">${t.displayName || t.name}</option>`).join('')}
                                     </select>
                                     <select id="admin-course-select" class="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed" disabled>
                                         <option value="">-- Chọn khoá học --</option>
                                     </select>
                                     <button id="add-student-btn" class="w-full bg-green-600 text-white font-semibold p-3 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"><i class="fas fa-plus mr-2"></i>Thêm & Ghi danh</button>
                                 </div>
                             </div>

                             <div class="border-t pt-4">
                                 <div class="mb-4">
                                     <h3 class="font-semibold text-slate-700 mb-3 flex items-center"><i class="fas fa-list mr-2 text-slate-500"></i>Danh sách học sinh (${students.length})</h3>
                                     <div class="relative mb-3 bg-white">
                                         <i class="fas fa-search absolute left-3 top-3 text-slate-400 pointer-events-none"></i>
                                         <input type="text" id="student-search" placeholder="🔍 Tìm kiếm học sinh theo tên hoặc username..." class="w-full pl-10 pr-4 py-2.5 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm font-medium transition-all shadow-sm hover:border-slate-400">
                                     </div>
                                 </div>
                                 <div class="space-y-2 max-h-96 overflow-y-auto pr-2" id="student-list">
                                     ${students.length > 0 ? students.map(s => `
                                         <div class="p-4 bg-gradient-to-r from-slate-50 to-green-50 rounded-lg border border-slate-200 hover:border-green-300 hover:shadow-md transition-all student-item" data-name="${s.name.toLowerCase()}" data-username="${s.username.toLowerCase()}">
                                             <div class="flex justify-between items-start">
                                                 <div class="flex-grow">
                                                     <p class="font-semibold text-slate-800"><i class="fas fa-user-graduate text-green-600 mr-1"></i>${s.displayName || s.name}</p>
                                                     <p class="text-xs text-slate-500 font-mono bg-slate-100 inline-block px-2 py-1 rounded mt-1">@${s.username}</p>
                                                 </div>
                                                 <div class="flex space-x-2">
                                                     <button class="view-user-info-btn text-blue-500 hover:text-blue-700 hover:bg-blue-50 p-2 rounded-lg transition-colors" data-id="${s.id}" data-role="student" title="Xem thông tin">
                                                         <i class="fas fa-eye"></i>
                                                     </button>
                                                     <button class="edit-student-btn text-amber-500 hover:text-amber-700 hover:bg-amber-50 p-2 rounded-lg transition-colors" data-id="${s.id}" title="Chỉnh sửa ghi danh">
                                                         <i class="fas fa-user-edit"></i>
                                                     </button>
                                                     <button class="delete-user-btn text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors" data-id="${s.id}" title="Xóa học sinh">
                                                         <i class="fas fa-trash-alt"></i>
                                                     </button>
                                                 </div>
                                             </div>
                                         </div>
                                     `).join('') : '<p class="text-center py-8 text-slate-400"><i class="fas fa-inbox fa-2x mb-2"></i><br>Chưa có học sinh.</p>'}
                                 </div>
                             </div>
                         </div>
                     </div>
                         </div>
                     </div>

                     <!-- TAB: TỔNG QUAN KHÓA HỌC -->
                     <div id="admin-tab-overview" class="admin-tab-content hidden">
                         <div class="bg-white rounded-xl shadow-lg overflow-hidden">
                             <div class="bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 p-4 text-white">
                                 <h2 class="text-xl font-bold flex items-center"><i class="fas fa-chart-line mr-2"></i>Tổng quan Khóa học</h2>
                                 <p class="text-blue-100 mt-1 text-sm">Thống kê hiệu suất và tiến độ học tập</p>
                             </div>
                             <div class="p-4">
                                 ${courses.length > 0 ? `
                                 <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[700px] overflow-y-auto pr-2">
                                     ${courses.map(c => renderCourseOverviewCard(c, users.find(u => u.id === c.createdBy), lessons, enrollments, progress, users, courses)).join('')}
                                 </div>
                                 ` : '<p class="text-center py-12 text-slate-400"><i class="fas fa-inbox fa-2x mb-2"></i><br>Chưa có khóa học nào.</p>'}
                             </div>
                         </div>
                     </div>
                 </div>
                     </div>
                 </div>
             </main>
         </div>`;

    // Tab switching functionality
    setTimeout(() => {
        const tabBtns = document.querySelectorAll('.admin-tab-btn');

        // Get saved tab from localStorage, default to 'management'
        const savedTab = localStorage.getItem('adminCurrentTab') || 'management';

        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabName = btn.dataset.tab;

                // Hide all tabs
                document.querySelectorAll('.admin-tab-content').forEach(tab => {
                    tab.classList.add('hidden');
                });

                // Remove active state from all buttons
                tabBtns.forEach(b => {
                    b.classList.remove('tab-active', 'text-blue-600', 'border-b-blue-600');
                    b.classList.add('text-slate-600', 'border-b-transparent');
                });

                // Show selected tab
                const selectedTab = document.getElementById(`admin-tab-${tabName}`);
                if (selectedTab) {
                    selectedTab.classList.remove('hidden');
                }

                // Add active state to clicked button
                btn.classList.add('tab-active', 'text-blue-600', 'border-b-blue-600');
                btn.classList.remove('text-slate-600', 'border-b-transparent');

                // Save session state
                saveSessionToLocalStorage();
            });

            // Activate saved tab on load
            if (btn.dataset.tab === savedTab) {
                btn.click();
            }
        });

        // Initialize admin listeners
        initAdminListeners();
    }, 100);

    // Save session state when dashboard is rendered
    saveSessionToLocalStorage();
};

export const renderEditStudentModal = (studentId) => {
    const users = getUsers();
    const courses = getCourses();
    const enrollments = getEnrollments();

    const student = users.find(u => u.id === studentId);
    if (!student) return;
    const studentEnrollments = enrollments.filter(e => e.studentId === studentId).map(e => e.courseId);
    const modalContent = `<div class="bg-white w-full max-w-lg rounded-xl shadow-lg p-6 fade-in" id="edit-student-modal"><h2 class="text-2xl font-bold mb-4">Chỉnh sửa ghi danh cho ${student.name}</h2><p class="text-slate-600 mb-6">Chọn các khoá học mà học sinh này sẽ tham gia.</p><div class="space-y-3 max-h-60 overflow-y-auto pr-2">${courses.map(course => { const isEnrolled = studentEnrollments.includes(course.id); const teacher = users.find(u => u.id === course.createdBy); return `<label class="flex items-center p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100"><input type="checkbox" class="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" data-course-id="${course.id}" ${isEnrolled ? 'checked' : ''}><div class="ml-4">                            <span class="font-medium text-slate-800">${course.title}</span><p class="text-sm text-slate-500">GV: ${teacher?.displayName || teacher?.name}</p></div></label>`; }).join('')}</div><div class="mt-6 flex justify-end space-x-3"><button class="cancel-modal-btn px-4 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300">Huỷ</button><button id="save-enrollment-btn" data-student-id="${studentId}" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Lưu thay đổi</button></div></div>`;
    return modalContent;
};

export const renderDeleteCourseConfirmModal = (courseId, courseName) => {
    const enrollments = getEnrollments();
    const progress = getProgress();
    const lessons = getLessons();

    const courseEnrollments = enrollments.filter(e => e.courseId === courseId);
    const courseLessons = lessons.filter(l => l.courseId === courseId);
    const courseProgress = progress.filter(p => courseLessons.some(l => l.id === p.lessonId));

    const modalContent = `
    <div class="bg-white w-full max-w-md rounded-xl shadow-lg p-8 fade-in">
        <div class="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
            <div class="flex items-start">
                <i class="fas fa-exclamation-triangle text-red-600 text-xl mt-1 mr-3 flex-shrink-0"></i>
                <div>
                    <h2 class="text-lg font-bold text-red-800 mb-2">⚠️ Xác nhận Xóa Khóa học</h2>
                    <p class="text-red-700 font-semibold">${courseName}</p>
                </div>
            </div>
        </div>

        <div class="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
            <p class="text-yellow-800 mb-2 font-semibold">⚠️ Dữ liệu sẽ bị xóa:</p>
            <ul class="text-yellow-700 space-y-1 ml-4">
                <li>✗ Khóa học và ${courseLessons.length} bài học</li>
                <li>✗ Ghi danh của ${courseEnrollments.length} học sinh</li>
                <li>✗ Tiến độ học tập (${courseProgress.length} bản ghi)</li>
                <li>✗ Điểm số và bình luận của giáo viên</li>
            </ul>
            <p class="text-yellow-800 font-semibold mt-3">Hành động này không thể hoàn tác!</p>
        </div>

        <div class="space-y-3 mb-6">
            <label for="admin-password-course-confirm" class="block text-sm font-semibold text-slate-700">Nhập mật khẩu Admin để xác nhận:</label>
            <input type="password" id="admin-password-course-confirm" class="w-full p-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent" placeholder="••••••••">
        </div>

        <div id="delete-course-error" class="text-red-500 text-center mb-4 text-sm font-medium hidden bg-red-50 p-3 rounded-lg"></div>

        <div class="flex justify-end space-x-3">
            <button class="cancel-modal-btn px-4 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 font-semibold transition-colors">Huỷ</button>
            <button id="confirm-delete-course-btn" data-course-id="${courseId}" class="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold transition-colors flex items-center gap-2">
                <i class="fas fa-trash-alt"></i>Xóa vĩnh viễn
            </button>
        </div>
    </div>
    `;
    return modalContent;
};

export const renderPasswordConfirmModal = (userId, userName) => {
    const users = getUsers();
    const enrollments = getEnrollments();
    const progress = getProgress();

    const user = users.find(u => u.id === userId);
    const isStudent = user?.role === 'student';
    const enrolledCourses = isStudent ? enrollments.filter(e => e.studentId === userId).length : 0;
    const studentProgress = isStudent ? progress.filter(p => p.studentId === userId).length : 0;

    const modalContent = `
    <div class="bg-white w-full max-w-md rounded-xl shadow-lg p-8 fade-in">
        <div class="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
            <div class="flex items-start">
                <i class="fas fa-exclamation-triangle text-red-600 text-xl mt-1 mr-3 flex-shrink-0"></i>
                <div>
                    <h2 class="text-lg font-bold text-red-800 mb-2">⚠️ Xác nhận Xóa người dùng</h2>
                    <p class="text-red-700 font-semibold">${userName}</p>
                </div>
            </div>
        </div>

        ${isStudent ? `
        <div class="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
            <p class="text-yellow-800 mb-2 font-semibold">⚠️ Dữ liệu sẽ bị xóa:</p>
            <ul class="text-yellow-700 space-y-1 ml-4">
                <li>✗ Ghi danh (${enrolledCourses} khóa học)</li>
                <li>✗ Tiến độ học tập (${studentProgress} bản ghi)</li>
                <li>✗ Điểm số và bình luận của giáo viên</li>
            </ul>
            <p class="text-yellow-800 font-semibold mt-3">Hành động này không thể hoàn tác!</p>
        </div>
        ` : `
        <div class="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm">
            <p class="text-blue-800">Xóa giáo viên này sẽ không ảnh hưởng đến các khóa học và học sinh hiện tại.</p>
        </div>
        `}

        <div class="space-y-3 mb-6">
            <label for="admin-password-confirm" class="block text-sm font-semibold text-slate-700">Nhập mật khẩu Admin để xác nhận:</label>
            <input type="password" id="admin-password-confirm" class="w-full p-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent" placeholder="••••••••">
        </div>

        <div id="delete-error" class="text-red-500 text-center mb-4 text-sm font-medium hidden bg-red-50 p-3 rounded-lg"></div>

        <div class="flex justify-end space-x-3">
            <button class="cancel-modal-btn px-4 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 font-semibold transition-colors">Huỷ</button>
            <button id="confirm-delete-btn" data-user-id="${userId}" class="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold transition-colors flex items-center gap-2">
                <i class="fas fa-trash-alt"></i>Xóa vĩnh viễn
            </button>
        </div>
    </div>
    `;
    return modalContent;
};

export const renderViewUserInfoModal = (userId, userRole) => {
    const users = getUsers();
    const courses = getCourses();
    const lessons = getLessons();
    const enrollments = getEnrollments();
    const progress = getProgress();

    const user = users.find(u => u.id === userId);
    if (!user) {
        showToast('Không tìm thấy người dùng', 'error');
        return;
    }

    let contentHtml = '';

    if (userRole === 'teacher') {
        const teacherCourses = courses.filter(c => c.createdBy === userId);
        const totalLessons = teacherCourses.reduce((sum, course) => {
            const courseLessons = lessons.filter(l => l.courseId === course.id);
            return sum + courseLessons.length;
        }, 0);
        const enrolledStudents = new Set(
            enrollments
                .filter(e => teacherCourses.some(c => c.id === e.courseId))
                .map(e => e.studentId)
        ).size;

        contentHtml = `
            <div class="bg-white w-full max-w-lg rounded-xl shadow-lg p-6 fade-in">
                <div class="flex justify-between items-center mb-4 pb-3 border-b">
                    <h2 class="text-xl font-bold text-slate-800"><i class="fas fa-chalkboard-teacher text-blue-600 mr-2"></i>${user.displayName || user.name}</h2>
                    <button class="cancel-modal-btn text-slate-400 hover:text-slate-800 text-2xl font-light">&times;</button>
                </div>
                
                <div class="space-y-3 mb-4">
                    <p class="text-sm"><span class="font-medium text-slate-700">Username:</span> <span class="text-slate-600">@${user.username}</span></p>
                    <p class="text-sm"><span class="font-medium text-slate-700">ID:</span> <span class="text-slate-600 font-mono text-xs">${user.id}</span></p>
                </div>

                <div class="grid grid-cols-2 gap-3 mb-4">
                    <div class="bg-blue-50 p-3 rounded-lg border border-blue-200">
                        <p class="text-slate-600 text-xs font-medium">📚 Khóa học</p>
                        <p class="text-lg font-bold text-blue-600">${teacherCourses.length}</p>
                    </div>
                    <div class="bg-green-50 p-3 rounded-lg border border-green-200">
                        <p class="text-slate-600 text-xs font-medium">📝 Bài học</p>
                        <p class="text-lg font-bold text-green-600">${totalLessons}</p>
                    </div>
                    <div class="bg-purple-50 p-3 rounded-lg border border-purple-200">
                        <p class="text-slate-600 text-xs font-medium">👥 Học sinh</p>
                        <p class="text-lg font-bold text-purple-600">${enrolledStudents}</p>
                    </div>
                    <div class="bg-amber-50 p-3 rounded-lg border border-amber-200">
                        <p class="text-slate-600 text-xs font-medium">📊 Ghi danh</p>
                        <p class="text-lg font-bold text-amber-600">${enrollments.filter(e => teacherCourses.some(c => c.id === e.courseId)).length}</p>
                    </div>
                </div>

                ${teacherCourses.length > 0 ? `
                <div class="border-t pt-3">
                    <p class="text-xs font-semibold text-slate-700 mb-2">Khóa học:</p>
                    <div class="space-y-2 max-h-32 overflow-y-auto">
                        ${teacherCourses.map(course => {
            const courseEnrollments = enrollments.filter(e => e.courseId === course.id);
            return `
                                <div class="text-xs p-2 bg-slate-50 rounded border border-slate-200">
                                    <p class="font-medium text-slate-800">${course.title}</p>
                                    <p class="text-slate-500">${courseEnrollments.length}HS • ${lessons.filter(l => l.courseId === course.id).length}bài</p>
                                </div>
                            `;
        }).join('')}
                    </div>
                </div>
                ` : ''}

                <div class="flex justify-between mt-4 pt-3 border-t">
                    <button class="reset-password-btn px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium text-sm transition-colors" data-user-id="${user.id}">🔑 Reset MK</button>
                    <button class="cancel-modal-btn px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors">Đóng</button>
                </div>
            </div>
        `;
    } else if (userRole === 'student') {
        const studentEnrollments = enrollments.filter(e => e.studentId === userId);
        const enrolledCourses = studentEnrollments.map(e => courses.find(c => c.id === e.courseId)).filter(c => c);
        const studentProgress = progress.filter(p => p.studentId === userId);
        const submitted = studentProgress.filter(p => p.submittedAt).length;
        const graded = studentProgress.filter(p => p.submittedAt && p.grade != null).length;
        const totalLessons = lessons.filter(l => enrolledCourses.some(c => c.id === l.courseId)).length;
        const progressPercentage = totalLessons > 0 ? Math.round((submitted / totalLessons) * 100) : 0;

        contentHtml = `
            <div class="bg-white w-full max-w-lg rounded-xl shadow-lg p-6 fade-in">
                <div class="flex justify-between items-center mb-4 pb-3 border-b">
                    <h2 class="text-xl font-bold text-slate-800"><i class="fas fa-user-graduate text-green-600 mr-2"></i>${user.displayName || user.name}</h2>
                    <button class="cancel-modal-btn text-slate-400 hover:text-slate-800 text-2xl font-light">&times;</button>
                </div>
                
                <div class="space-y-3 mb-4">
                    <p class="text-sm"><span class="font-medium text-slate-700">Username:</span> <span class="text-slate-600">@${user.username}</span></p>
                    <p class="text-sm"><span class="font-medium text-slate-700">ID:</span> <span class="text-slate-600 font-mono text-xs">${user.id}</span></p>
                </div>

                <div class="grid grid-cols-2 gap-3 mb-4">
                    <div class="bg-blue-50 p-3 rounded-lg border border-blue-200">
                        <p class="text-slate-600 text-xs font-medium">📚 Khóa học</p>
                        <p class="text-lg font-bold text-blue-600">${enrolledCourses.length}</p>
                    </div>
                    <div class="bg-green-50 p-3 rounded-lg border border-green-200">
                        <p class="text-slate-600 text-xs font-medium">📤 Nộp bài</p>
                        <p class="text-lg font-bold text-green-600">${submitted}</p>
                    </div>
                    <div class="bg-purple-50 p-3 rounded-lg border border-purple-200">
                        <p class="text-slate-600 text-xs font-medium">✅ Được chấm</p>
                        <p class="text-lg font-bold text-purple-600">${graded}</p>
                    </div>
                    <div class="bg-amber-50 p-3 rounded-lg border border-amber-200">
                        <p class="text-slate-600 text-xs font-medium">📊 Tiến độ</p>
                        <p class="text-lg font-bold text-amber-600">${progressPercentage}%</p>
                    </div>
                </div>

                ${enrolledCourses.length > 0 ? `
                <div class="border-t pt-3">
                    <p class="text-xs font-semibold text-slate-700 mb-2">Khóa học:</p>
                    <div class="space-y-2 max-h-32 overflow-y-auto">
                        ${enrolledCourses.map(course => {
            const teacher = users.find(u => u.id === course.createdBy);
            const courseLessons = lessons.filter(l => l.courseId === course.id);
            const courseProgress = progress.filter(p => p.studentId === userId && courseLessons.some(l => l.id === p.lessonId));
            const completed = courseProgress.filter(p => p.submittedAt).length;
            return `
                                <div class="text-xs p-2 bg-slate-50 rounded border border-slate-200">
                                    <p class="font-medium text-slate-800">${course.title}</p>
                                    <p class="text-slate-500">GV: ${teacher?.name || 'N/A'} • ${completed}/${courseLessons.length} bài</p>
                                </div>
                            `;
        }).join('')}
                    </div>
                </div>
                ` : ''}

                <div class="flex justify-between mt-4 pt-3 border-t">
                    <button class="reset-password-btn px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium text-sm transition-colors" data-user-id="${user.id}">🔑 Reset MK</button>
                    <button class="cancel-modal-btn px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm transition-colors">Đóng</button>
                </div>
            </div>
        `;
    }

    showModal(contentHtml);
};

// ═══════════════════════════════════════════════════════════════════════════════════
// ADMIN EVENT HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════════

export const handleAdminClickEvents = async (e) => {
    const target = e.target;
    const users = getUsers();
    const courses = getCourses();
    const lessons = getLessons();
    const enrollments = getEnrollments();
    const progress = getProgress();
    const currentUser = getCurrentUser();

    // Check if this click belongs to admin handlers
    if (target.closest('#add-teacher-btn')) {
        const name = document.getElementById('new-teacher-name').value;
        const password = document.getElementById('new-teacher-password').value;
        if (name && password) {
            const username = generateUsername(name, 'teacher');
            const displayName = `GV. ${name}`;
            renderConfirmModal(
                'Xác nhận Thêm Giáo viên',
                `Bạn có chắc chắn muốn thêm giáo viên này?<br><br><strong>Tên:</strong> ${name}<br><strong>Username:</strong> @${username}<br><strong>Mật khẩu:</strong> ${password}`,
                'Xác nhận',
                'bg-blue-600 hover:bg-blue-700',
                async () => {
                    try {
                        const newTeacher = { name, displayName, username, password, role: 'teacher', createdAt: serverTimestamp() };
                        await addDoc(collection(db, 'users'), newTeacher);
                        document.getElementById('new-teacher-name').value = '';
                        document.getElementById('new-teacher-password').value = '';
                        closeModal();
                        showToast(`✅ Thêm giáo viên ${name} thành công! Username: ${username}`, 'success');
                        // Cập nhật dữ liệu local mà không refresh toàn bộ dashboard
                        const updatedUsers = getUsers();
                        const teacherList = document.getElementById('teacher-list');
                        if (teacherList) {
                            const noResultMsg = teacherList.querySelector('.no-result-teacher');
                            if (noResultMsg) noResultMsg.remove();
                            // Thêm giáo viên mới vào đầu danh sách
                            const newTeacherHtml = `
                                <div class="p-4 bg-gradient-to-r from-slate-50 to-blue-50 rounded-lg border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all teacher-item" data-name="${name.toLowerCase()}" data-username="${username.toLowerCase()}">
                                    <div class="flex justify-between items-start">
                                        <div class="flex-grow">
                                            <p class="font-semibold text-slate-800"><i class="fas fa-chalkboard-teacher text-blue-600 mr-1"></i>${displayName}</p>
                                            <p class="text-xs text-slate-500 font-mono bg-slate-100 inline-block px-2 py-1 rounded mt-1">@${username}</p>
                                        </div>
                                        <div class="flex space-x-2">
                                            <button class="view-user-info-btn text-blue-500 hover:text-blue-700 hover:bg-blue-50 p-2 rounded-lg transition-colors" data-id="${updatedUsers[updatedUsers.length - 1]?.id}" data-role="teacher" title="Xem thông tin">
                                                <i class="fas fa-eye"></i>
                                            </button>
                                            <button class="delete-user-btn text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors" data-id="${updatedUsers[updatedUsers.length - 1]?.id}" title="Xóa giáo viên">
                                                <i class="fas fa-trash-alt"></i>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            `;
                            teacherList.insertAdjacentHTML('afterbegin', newTeacherHtml);
                        }
                    } catch (error) {
                        showToast('Có lỗi khi thêm giáo viên', 'error');
                    }
                }
            );
        } else {
            showToast('Vui lòng điền đủ tên và mật khẩu', 'error');
        }
        return true;
    }

    if (target.closest('#add-student-btn')) {
        const name = document.getElementById('new-student-name').value;
        const password = document.getElementById('new-student-password').value;
        const teacherId = document.getElementById('admin-teacher-select').value;
        const courseId = document.getElementById('admin-course-select').value;
        if (name && password && teacherId && courseId) {
            const username = generateUsername(name, 'student');
            const displayName = `HS. ${name}`;
            const course = courses.find(c => c.id === courseId);
            const teacher = users.find(u => u.id === teacherId);
            renderConfirmModal(
                'Xác nhận Thêm Học sinh',
                `Bạn có chắc chắn muốn thêm học sinh này?<br><br><strong>Tên:</strong> ${name}<br><strong>Username:</strong> @${username}<br><strong>Mật khẩu:</strong> ${password}<br><strong>Giáo viên:</strong> ${teacher?.name}<br><strong>Khóa học:</strong> ${course?.title}`,
                'Xác nhận',
                'bg-green-600 hover:bg-green-700',
                async () => {
                    try {
                        const userRef = await addDoc(collection(db, 'users'), { name, displayName, username, password, role: 'student', createdAt: serverTimestamp() });
                        await addDoc(collection(db, 'enrollments'), { studentId: userRef.id, courseId });
                        document.getElementById('new-student-name').value = '';
                        document.getElementById('new-student-password').value = '';
                        document.getElementById('admin-teacher-select').value = '';
                        document.getElementById('admin-course-select').value = '';
                        document.getElementById('admin-course-select').disabled = true;
                        closeModal();
                        showToast(`✅ Thêm học sinh ${name} thành công! Username: ${username}`, 'success');
                        // Cập nhật dữ liệu local mà không refresh toàn bộ dashboard
                        const studentList = document.getElementById('student-list');
                        if (studentList) {
                            const noResultMsg = studentList.querySelector('.no-result-student');
                            if (noResultMsg) noResultMsg.remove();
                            // Thêm học sinh mới vào đầu danh sách
                            const newStudentHtml = `
                                <div class="p-4 bg-gradient-to-r from-slate-50 to-green-50 rounded-lg border border-slate-200 hover:border-green-300 hover:shadow-md transition-all student-item" data-name="${name.toLowerCase()}" data-username="${username.toLowerCase()}">
                                    <div class="flex justify-between items-start">
                                        <div class="flex-grow">
                                            <p class="font-semibold text-slate-800"><i class="fas fa-user-graduate text-green-600 mr-1"></i>${displayName}</p>
                                            <p class="text-xs text-slate-500 font-mono bg-slate-100 inline-block px-2 py-1 rounded mt-1">@${username}</p>
                                        </div>
                                        <div class="flex space-x-2">
                                            <button class="view-user-info-btn text-blue-500 hover:text-blue-700 hover:bg-blue-50 p-2 rounded-lg transition-colors" data-id="${userRef.id}" data-role="student" title="Xem thông tin">
                                                <i class="fas fa-eye"></i>
                                            </button>
                                            <button class="edit-student-btn text-amber-500 hover:text-amber-700 hover:bg-amber-50 p-2 rounded-lg transition-colors" data-id="${userRef.id}" title="Chỉnh sửa ghi danh">
                                                <i class="fas fa-user-edit"></i>
                                            </button>
                                            <button class="delete-user-btn text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors" data-id="${userRef.id}" title="Xóa học sinh">
                                                <i class="fas fa-trash-alt"></i>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            `;
                            studentList.insertAdjacentHTML('afterbegin', newStudentHtml);
                        }
                    } catch (error) {
                        showToast('Có lỗi khi thêm học sinh', 'error');
                    }
                }
            );
        } else {
            showToast('Vui lòng điền đủ thông tin (tên, mật khẩu, giáo viên, khoá học)', 'error');
        }
        return true;
    }

    if (target.closest('.view-user-info-btn')) {
        const userId = target.closest('.view-user-info-btn').dataset.id;
        const userRole = target.closest('.view-user-info-btn').dataset.role;
        renderViewUserInfoModal(userId, userRole);
        return true;
    }

    if (target.closest('.delete-user-btn')) {
        const userId = target.closest('.delete-user-btn').dataset.id;
        const userToDelete = users.find(u => u.id === userId);
        if (userToDelete) {
            showModal(renderPasswordConfirmModal(userId, userToDelete.name));
        }
        return true;
    }

    if (target.closest('#confirm-delete-btn')) {
        e.stopImmediatePropagation();
        const userId = target.closest('#confirm-delete-btn').dataset.userId;
        const password = document.getElementById('admin-password-confirm').value;
        if (password === currentUser.password) {
            try {
                const batch = writeBatch(db);
                const userToDelete = users.find(u => u.id === userId);
                if (userToDelete.role === 'student') {
                    enrollments.filter(e => e.studentId === userId).forEach(e => batch.delete(doc(db, "enrollments", e.id)));
                    progress.filter(p => p.studentId === userId).forEach(p => batch.delete(doc(db, "progress", p.id)));
                }
                batch.delete(doc(db, "users", userId));
                await batch.commit();

                closeModal();
                showToast('✅ Xóa người dùng thành công!', 'success');

                // Refresh dashboard
                setTimeout(() => {
                    renderAdminDashboard();
                }, 500);
            } catch (error) {
                showToast('❌ Có lỗi khi xóa người dùng', 'error');
            }
        } else {
            document.getElementById('delete-error').textContent = 'Mật khẩu không chính xác!';
            document.getElementById('delete-error').classList.remove('hidden');
        }
        return true;
    }

    if (target.closest('.edit-student-btn')) {
        showModal(renderEditStudentModal(target.closest('.edit-student-btn').dataset.id));
        return true;
    }

    if (target.closest('#save-enrollment-btn')) {
        const studentId = target.closest('#save-enrollment-btn').dataset.studentId;
        try {
            const batch = writeBatch(db);
            enrollments.filter(e => e.studentId === studentId).forEach(e => batch.delete(doc(db, "enrollments", e.id)));
            document.querySelectorAll('#edit-student-modal input[type="checkbox"]:checked').forEach(box => {
                const newEnrollmentRef = doc(collection(db, "enrollments"));
                batch.set(newEnrollmentRef, { studentId: studentId, courseId: box.dataset.courseId });
            });
            await batch.commit();
            closeModal();
            showToast('✅ Cập nhật ghi danh thành công!', 'success');
        } catch (error) {
            showToast('❌ Có lỗi khi cập nhật ghi danh', 'error');
        }
        return true;
    }

    if (target.closest('.reset-password-btn')) {
        const userId = target.closest('.reset-password-btn').dataset.userId;
        const userToReset = users.find(u => u.id === userId);
        if (userToReset) {
            renderConfirmModal(
                'Xác nhận Reset Mật khẩu',
                `Bạn có chắc chắn muốn reset mật khẩu của <strong>${userToReset.name}</strong>?<br><br>Mật khẩu sẽ được đặt lại thành: <span class="font-mono font-bold text-orange-600">123456</span>`,
                'Reset',
                'bg-orange-600 hover:bg-orange-700',
                async () => {
                    try {
                        await updateDoc(doc(db, 'users', userId), { password: '123456' });
                        const userIndex = users.findIndex(u => u.id === userId);
                        if (userIndex !== -1) {
                            users[userIndex].password = '123456';
                        }
                        closeModal();
                        showToast(`✅ Reset mật khẩu thành công! Mật khẩu mới: 123456`, 'success');
                    } catch (error) {
                        showToast('❌ Có lỗi xảy ra khi reset mật khẩu!', 'error');
                    }
                }
            );
        }
        return true;
    }

    if (target.closest('.delete-course-btn')) {
        const courseId = target.closest('.delete-course-btn').dataset.id;
        const course = courses.find(c => c.id === courseId);
        if (course) {
            showModal(renderDeleteCourseConfirmModal(courseId, course.title));
        }
        return true;
    }

    if (target.closest('#confirm-delete-course-btn')) {
        e.stopImmediatePropagation();
        const courseId = target.closest('#confirm-delete-course-btn').dataset.courseId;
        const password = document.getElementById('admin-password-course-confirm').value;
        if (password === currentUser.password) {
            try {
                const batch = writeBatch(db);
                const courseLessons = lessons.filter(l => l.courseId === courseId);
                const courseEnrollments = enrollments.filter(e => e.courseId === courseId);
                const courseProgress = progress.filter(p => courseLessons.some(l => l.id === p.lessonId));

                // Xóa tất cả progress của khóa học
                courseProgress.forEach(p => batch.delete(doc(db, "progress", p.id)));

                // Xóa tất cả ghi danh của khóa học
                courseEnrollments.forEach(e => batch.delete(doc(db, "enrollments", e.id)));

                // Xóa tất cả bài học của khóa học
                courseLessons.forEach(l => batch.delete(doc(db, "lessons", l.id)));

                // Xóa khóa học
                batch.delete(doc(db, "courses", courseId));

                await batch.commit();

                closeModal();
                showToast('✅ Xóa khóa học thành công!', 'success');

                // Refresh dashboard
                setTimeout(() => {
                    renderAdminDashboard();
                }, 500);
            } catch (error) {
                showToast('❌ Có lỗi khi xóa khóa học: ' + error.message, 'error');
            }
        } else {
            document.getElementById('delete-course-error').textContent = 'Mật khẩu không chính xác!';
            document.getElementById('delete-course-error').classList.remove('hidden');
        }
        return true;
    }

    return false;
};

// ═══════════════════════════════════════════════════════════════════════════════════
// ADMIN INPUT & CHANGE EVENT LISTENERS
// ═══════════════════════════════════════════════════════════════════════════════════

export const initAdminListeners = () => {
    // Chỉ gắn listener 1 lần duy nhất
    if (adminListenersInitialized) {
        return;
    }

    adminListenersInitialized = true;

    // Main click handler - gắn 1 lần duy nhất
    document.body.addEventListener('click', async (e) => {
        await handleAdminClickEvents(e);
    }, true);

    // Teacher search listener
    document.body.addEventListener('input', (e) => {
        if (e.target.id === 'teacher-search') {
            const searchTerm = e.target.value.toLowerCase();
            const teacherItems = document.querySelectorAll('.teacher-item');
            let visibleCount = 0;
            teacherItems.forEach(item => {
                const name = item.dataset.name || '';
                const username = item.dataset.username || '';
                const matches = name.includes(searchTerm) || username.includes(searchTerm);
                item.style.display = matches ? 'block' : 'none';
                if (matches) visibleCount++;
            });
            const teacherList = document.getElementById('teacher-list');
            if (teacherList && visibleCount === 0) {
                let noResultMsg = teacherList.querySelector('.no-result-teacher');
                if (!noResultMsg) {
                    noResultMsg = document.createElement('p');
                    noResultMsg.className = 'no-result-teacher text-center py-8 text-slate-400';
                    noResultMsg.innerHTML = '<i class="fas fa-search fa-2x mb-2"></i><br>Không tìm thấy giáo viên nào.';
                    teacherList.appendChild(noResultMsg);
                }
            } else {
                const noResultMsg = teacherList.querySelector('.no-result-teacher');
                if (noResultMsg) noResultMsg.remove();
            }
        }
    });

    // Student search listener
    document.body.addEventListener('input', (e) => {
        if (e.target.id === 'student-search') {
            const searchTerm = e.target.value.toLowerCase();
            const studentItems = document.querySelectorAll('.student-item');
            let visibleCount = 0;
            studentItems.forEach(item => {
                const name = item.dataset.name || '';
                const username = item.dataset.username || '';
                const matches = name.includes(searchTerm) || username.includes(searchTerm);
                item.style.display = matches ? 'block' : 'none';
                if (matches) visibleCount++;
            });
            const studentList = document.getElementById('student-list');
            if (studentList && visibleCount === 0) {
                let noResultMsg = studentList.querySelector('.no-result-student');
                if (!noResultMsg) {
                    noResultMsg = document.createElement('p');
                    noResultMsg.className = 'no-result-student text-center py-8 text-slate-400';
                    noResultMsg.innerHTML = '<i class="fas fa-search fa-2x mb-2"></i><br>Không tìm thấy học sinh nào.';
                    studentList.appendChild(noResultMsg);
                }
            } else {
                const noResultMsg = studentList.querySelector('.no-result-student');
                if (noResultMsg) noResultMsg.remove();
            }
        }
    });

    // Admin teacher select change listener
    document.body.addEventListener('change', async (e) => {
        const target = e.target;
        if (target.id === 'admin-teacher-select') {
            const teacherId = target.value;
            const courseSelect = document.getElementById('admin-course-select');
            courseSelect.innerHTML = '<option value="">-- Chọn khoá học --</option>';
            if (teacherId) {
                const { getCourses } = await import('./shared.js');
                const teacherCourses = getCourses().filter(c => c.createdBy === teacherId);
                courseSelect.innerHTML += teacherCourses.map(c => `<option value="${c.id}">${c.title}</option>`).join('');
                courseSelect.disabled = teacherCourses.length === 0;
            } else {
                courseSelect.disabled = true;
            }
        }
    });
};
