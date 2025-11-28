// navigation.js - Navigation logic and view routing

import {
    getCurrentUser,
    getCurrentView,
    setCurrentView,
    getCurrentCourseId,
    getCurrentLessonId,
    getCurrentStudentIdForProgress,
    getCurrentActiveTab,
    setIsFirstNavigationAfterRestore,
    getIsFirstNavigationAfterRestore,
    setCurrentCourseId,
    setCurrentStudentIdForProgress,
    setOverviewFilterLessonId,
    saveSessionToLocalStorage
} from './shared.js';

import {
    renderLoginScreen
} from './auth.js';

import {
    renderAdminDashboard
} from './admin.js';

import {
    renderTeacherDashboard,
    renderTeacherCourseManagement,
    renderTeacherStudentReportView,
    renderStudentProgressView,
    updateTeacherCourseTabs
} from './teacher.js';

import {
    renderStudentDashboard,
    renderStudentCourseView,
    renderLessonView,
    renderMyProgressView
} from './student.js';

// ═══════════════════════════════════════════════════════════════════════════════════
// NAVIGATION FUNCTIONS - QUẢN LÝ ĐỊNH TUYẾN CÁC VIEW
// ═══════════════════════════════════════════════════════════════════════════════════

export const navigate = () => {
    const currentUser = getCurrentUser();
    const currentView = getCurrentView();
    const isFirstNavigationAfterRestore = getIsFirstNavigationAfterRestore();
    const appContainer = document.getElementById('app');

    console.log('🧭 navigate() called - user:', currentUser?.name, 'role:', currentUser?.role, 'view:', currentView, 'isRestoring:', isFirstNavigationAfterRestore);

    if (!currentUser) {
        renderLoginScreen(appContainer);
        return;
    }

    // ALWAYS save state to localStorage (except for login view)
    // This ensures that the current view is preserved when page is reloaded (F5)
    if (currentView !== 'login' && currentUser) {
        saveSessionToLocalStorage();
        console.log('💾 Session saved via navigate()');
    }

    // Lưu trạng thái khôi phục để các render function biết
    const isRestoring = isFirstNavigationAfterRestore;

    switch (currentUser.role) {
        case 'admin':
            // Admin only has dashboard view, but respect restored state
            if (currentView !== 'dashboard') {
                setCurrentView('dashboard');
            }
            renderAdminDashboard(appContainer);
            break;
        case 'teacher':
            console.log('👨‍🏫 TEACHER navigation - currentView:', currentView);
            if (currentView === 'studentReport') {
                console.log('  → Rendering student report');
                renderTeacherStudentReportView(getCurrentStudentIdForProgress(), getCurrentCourseId(), isRestoring);
            }
            else if (currentView === 'studentProgress') {
                console.log('  → Rendering student progress');
                renderStudentProgressView(getCurrentStudentIdForProgress(), isRestoring);
            }
            else if (currentView === 'course') {
                console.log('  → Rendering course management');
                renderTeacherCourseManagement(getCurrentCourseId(), isRestoring);
            }
            else {
                console.log('  → Rendering dashboard (else case)');
                setCurrentView('dashboard');
                renderTeacherDashboard(appContainer);
            }
            break;
        case 'student':
            if (currentView === 'myProgress') 
                renderMyProgressView(getCurrentCourseId(), isRestoring);
            else if (currentView === 'lesson') 
                renderLessonView(getCurrentLessonId(), isRestoring);
            else if (currentView === 'course') 
                renderStudentCourseView(getCurrentCourseId(), isRestoring);
            else {
                setCurrentView('dashboard');
                renderStudentDashboard();
            }
            break;
    }

    // Sau khi gọi navigate lần đầu tiên từ khôi phục, đặt cờ về false
    if (isFirstNavigationAfterRestore) {
        console.log('🔄 First restore navigation complete - resetting flag');
        setIsFirstNavigationAfterRestore(false);
    }
};

export const updateUI = () => {
    const currentUser = getCurrentUser();
    const currentView = getCurrentView();
    const appContainer = document.getElementById('app');

    if (!currentUser) {
        return;
    }

    // IMPORTANT: Save state to localStorage on every UI update
    // This ensures that if the user presses F5 during a data update, state is preserved
    saveSessionToLocalStorage();

    switch(currentView) {
        case 'dashboard':
            if(currentUser.role === 'admin') renderAdminDashboard(appContainer);
            if(currentUser.role === 'teacher') renderTeacherDashboard(appContainer);
            if(currentUser.role === 'student') renderStudentDashboard();
            break;
        case 'course':
            if(currentUser.role === 'teacher') {
                updateTeacherCourseTabs();
            } else if (currentUser.role === 'student') {
                renderStudentCourseView(getCurrentCourseId(), false);
            }
            break;
        case 'lesson': 
            renderLessonView(getCurrentLessonId(), false); 
            break;
        case 'studentProgress': 
            renderStudentProgressView(getCurrentStudentIdForProgress(), false); 
            break;
        case 'studentReport': 
            renderTeacherStudentReportView(getCurrentStudentIdForProgress(), getCurrentCourseId(), false); 
            break;
        case 'myProgress': 
            renderMyProgressView(getCurrentCourseId(), false); 
            break;
    }
};

// ═══════════════════════════════════════════════════════════════════════════════════
// BACK BUTTON HANDLER - XỬ LÝ NÚT QUAY LẠI
// ═══════════════════════════════════════════════════════════════════════════════════

export const handleBackButton = () => {
    const currentUser = getCurrentUser();
    const currentView = getCurrentView();

    if (currentUser?.role === 'teacher') {
        if (currentView === 'course') {
            setCurrentView('dashboard');
            renderTeacherDashboard();
        } else if (currentView === 'studentProgress') {
            setCurrentView('course');
            renderTeacherCourseManagement(getCurrentCourseId());
        } else if (currentView === 'studentReport') {
            setCurrentView('course');
            renderTeacherCourseManagement(getCurrentCourseId());
        }
    } else if (currentUser?.role === 'student') {
        if (currentView === 'lesson') {
            setCurrentView('course');
            renderStudentCourseView(getCurrentCourseId());
        } else if (currentView === 'course') {
            setCurrentView('dashboard');
            renderStudentDashboard();
        } else if (currentView === 'myProgress') {
            setCurrentView('course');
            renderStudentCourseView(getCurrentCourseId());
        }
    }
};

// ═══════════════════════════════════════════════════════════════════════════════════
// EVENT HANDLER HELPERS - HỖ TRỢ XỬ LÝ SỰ KIỆN
// ═══════════════════════════════════════════════════════════════════════════════════

/**
 * Handle navigation to course management view
 * @param {string} courseId - The ID of the course to manage
 */
export const handleManageCourseClick = (courseId) => {
    setOverviewFilterLessonId('all');
    setCurrentCourseId(courseId);
    setCurrentView('course');
    navigate();
};

/**
 * Handle navigation to student progress view from teacher's perspective
 * @param {string} studentId - The ID of the student
 */
export const handleViewStudentProgressClick = (studentId) => {
    setCurrentStudentIdForProgress(studentId);
    setCurrentView('studentReport');
    navigate();
};

/**
 * Handle navigation to edit student progress view
 * @param {string} studentId - The ID of the student
 */
export const handleEditStudentProgressClick = (studentId) => {
    setCurrentStudentIdForProgress(studentId);
    setCurrentView('studentProgress');
    navigate();
};

// ═══════════════════════════════════════════════════════════════════════════════════
// INIT GLOBAL LISTENERS - KHỞI ĐỘNG CÁC SỰ KIỆN TOÀN CỤC
// ═══════════════════════════════════════════════════════════════════════════════════
/**
 * Initialize global event listeners
 * Handles back button, cancel submission, and cancel modal
 */
export const initGlobalListeners = (callbacks) => {
    document.addEventListener('click', async (e) => {
        const target = e.target;
        
        // BACK BUTTON HANDLER - MUST BE FIRST
        if (target.closest('.back-btn')) {
            handleBackButton();
            return;
        }
        
        // CANCEL SUBMISSION HANDLER
        if (target.closest('.cancel-submission-btn')) {
            const btn = target.closest('.cancel-submission-btn');
            const lessonId = btn.dataset.lessonId;
            await callbacks.handleCancelSubmission(lessonId);
            return;
        }
        
        // CANCEL MODAL HANDLER
        if (target.closest('.cancel-modal-btn')) {
            callbacks.closeModal();
            return;
        }
    });
};

// ═══════════════════════════════════════════════════════════════════════════════════
// INIT ROLE DISPATCHER LISTENERS - KHỞI ĐỘNG CÁC SỰ KIỆN DISPATCHER CHO CÁC VAI TRÒ
// ═══════════════════════════════════════════════════════════════════════════════════
/**
 * Initialize role-specific click handler dispatcher
 * Routes clicks to appropriate role handlers (admin, teacher, student)
 */
export const initRoleDispatcherListeners = (roleHandlers) => {
    document.addEventListener('click', async (e) => {
        const currentUser = getCurrentUser();
        
        // ADMIN CLICK HANDLERS - DELEGATED TO admin.js
        if (currentUser?.role === 'admin') {
            if (await roleHandlers.handleAdminClickEvents(e)) {
                return;
            }
        }
        
        // TEACHER CLICK HANDLERS - DELEGATED TO teacher.js
        if (currentUser?.role === 'teacher') {
            if (await roleHandlers.handleTeacherClickEvents(e)) {
                return;
            }
        }
        
        // STUDENT CLICK HANDLERS - DELEGATED TO student.js
        if (currentUser?.role === 'student') {
            if (roleHandlers.handleStudentClickEvents(e)) {
                roleHandlers.navigate();
            }
        }
    });
};
