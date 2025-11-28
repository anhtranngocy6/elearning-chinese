// App Initialization & Orchestration
// ═══════════════════════════════════════════════════════════════════════════════════
// This is the main entry point that initializes the entire application
// - Imports all modules
// - Initializes all event listeners
// - Sets up Firebase real-time listeners
// - Starts the app
// ═══════════════════════════════════════════════════════════════════════════════════
// ⚠️ KÍCH HOẠT HARD RELOAD KHI CẬP NHẬT CODE:
//    Mac: Cmd+Shift+R hoặc Cmd+Option+E rồi nhấn R
//    Windows: Ctrl+Shift+R hoặc Ctrl+F5
//    Lý do: Browser cache các file .js theo URL cũ
// ═══════════════════════════════════════════════════════════════════════════════════

// Import Firebase and Auth modules
// ═══════════════════════════════════════════════════════════════════════════════════
// IMPORTS - CLEAN & MINIMAL
// ═══════════════════════════════════════════════════════════════════════════════════
import { setupFirebaseListeners, updateDoc, doc, db } from './firebase.js';
import { initAuthListeners } from './auth.js';
import { initAdminListeners, handleAdminClickEvents } from './admin.js';
import { initTeacherListeners, handleTeacherClickEvents } from './teacher.js';
import { handleStudentClickEvents, handleCancelSubmission } from './student.js';
import { navigate, updateUI, initGlobalListeners, initRoleDispatcherListeners } from './navigation.js';
import {
    setUsers,
    setCourses,
    setLessons,
    setHomeworks,
    setProgress,
    setEnrollments,
    setCurrentUser,
    clearCurrentUser,
    clearAllSessionState,
    setCurrentView,
    setCurrentCourseId,
    setCurrentLessonId,
    setCurrentStudentIdForProgress,
    setCurrentActiveTab,
    setIsFirstNavigationAfterRestore,
    getCurrentUser,
    getUsers,
    showModal,
    closeModal,
    showToast
} from './shared.js';

// ═══════════════════════════════════════════════════════════════════════════════════
// 🎯 INITIALIZE ALL EVENT LISTENERS (ALL MOVED TO MODULES)
// ═══════════════════════════════════════════════════════════════════════════════════
// Khu Vực 8 (Click listeners):
//   - auth.js: initAuthListeners() - login, logout, edit account
//   - navigation.js: initGlobalListeners() - back button, cancel submission, cancel modal
//   - navigation.js: initRoleDispatcherListeners() - admin/teacher/student clicks
//   - admin.js: handleAdminClickEvents() - admin-specific clicks
//   - teacher.js: handleTeacherClickEvents() - teacher-specific clicks
//   - student.js: handleStudentClickEvents() - student-specific clicks
//
// Khu Vực 9 (Input/Change listeners):
//   - admin.js: initAdminListeners() - teacher/student search, course select
//   - teacher.js: initTeacherListeners() - score input, filter change
// ═══════════════════════════════════════════════════════════════════════════════════

// Auth listeners
initAuthListeners({
    getUsers,
    setCurrentUser,
    clearCurrentUser,
    clearAllSessionState,
    navigate,
    showToast,
    getCurrentUser,
    showModal,
    updateDoc,
    doc,
    db,
    closeModal
});

// Global listeners
initGlobalListeners({
    handleCancelSubmission,
    closeModal
});

// Role-specific click dispatcher
initRoleDispatcherListeners({
    handleAdminClickEvents,
    handleTeacherClickEvents,
    handleStudentClickEvents,
    navigate
});

// Admin listeners (search, select)
initAdminListeners();

// Teacher listeners (score input, filters)
initTeacherListeners();

// ═══════════════════════════════════════════════════════════════════════════════════
// 🚀 FIREBASE INITIALIZATION & SESSION MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════════
setupFirebaseListeners({
    updateCollectionData: (colName, dataArray) => {
        if (colName === 'users') setUsers(dataArray);
        else if (colName === 'courses') setCourses(dataArray);
        else if (colName === 'lessons') setLessons(dataArray);
        else if (colName === 'homeworks') setHomeworks(dataArray);
        else if (colName === 'progress') setProgress(dataArray);
        else if (colName === 'enrollments') setEnrollments(dataArray);
    },
    restoreSession: (foundUser) => {
        setCurrentUser(foundUser);
        
        // Khôi phục trạng thái view từ localStorage
        const savedView = localStorage.getItem('currentView');
        const savedCourseId = localStorage.getItem('currentCourseId');
        const savedLessonId = localStorage.getItem('currentLessonId');
        const savedStudentId = localStorage.getItem('currentStudentIdForProgress');
        const savedActiveTab = localStorage.getItem('currentActiveTab');
        
        // Chỉ khôi phục nếu có giá trị hợp lệ
        if (savedView && savedView !== 'login' && savedView !== '') {
            setCurrentView(savedView);
            if (savedCourseId && savedCourseId !== '') setCurrentCourseId(savedCourseId);
            if (savedLessonId && savedLessonId !== '') setCurrentLessonId(savedLessonId);
            if (savedStudentId && savedStudentId !== '') setCurrentStudentIdForProgress(savedStudentId);
            // Set activeTab - use saved value if exists, otherwise default to 'overview'
            setCurrentActiveTab(savedActiveTab && savedActiveTab !== '' ? savedActiveTab : 'overview');
            
            // Đặt cờ để navigate() biết đây là lần khôi phục đầu tiên
            setIsFirstNavigationAfterRestore(true);
        } else {
            // Nếu không có saved view, mặc định là dashboard
            setCurrentView('dashboard');
            setCurrentActiveTab('overview');
            // Still set flag to indicate this is a restore attempt (even if no saved state)
            setIsFirstNavigationAfterRestore(true);
        }
    },
    clearSession: () => {
        clearAllSessionState();
        clearCurrentUser();
    },
    navigate: () => navigate(),
    updateUI: () => updateUI(),
    getCurrentUser: () => getCurrentUser(),
    updateCurrentUser: (refreshedUser) => { setCurrentUser(refreshedUser); },
    handleUserDeleted: () => {
        clearAllSessionState();
        clearCurrentUser();
        setCurrentView('login');
        navigate();
        showToast('Tài khoản của bạn đã bị xoá', 'error');
    },
    showToast: (msg, type) => showToast(msg, type)
});
