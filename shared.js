// filepath: /Users/anhtran/My Drive/2_Tiếng Trung/Web/shared.js
// SHARED UTILITY FUNCTIONS - HÀM DÙNG CHUNG CHO TẤT CẢ VAI TRÒ

// ═══════════════════════════════════════════════════════════════════════════════════
// STATE MANAGEMENT - CÁC BIẾN TRẠNG THÁI TOÀN CỤC
// ═══════════════════════════════════════════════════════════════════════════════════
let users = [];
let courses = [];
let lessons = [];
let homeworks = [];
let progress = [];
let enrollments = [];

let currentUser = null;
let currentView = 'login';
let currentCourseId = null;
let currentLessonId = null;
let currentStudentIdForProgress = null;
let overviewFilterLessonId = 'all';
let currentActiveTab = 'overview';
let isFirstNavigationAfterRestore = false;

// ═══════════════════════════════════════════════════════════════════════════════════
// SESSION PERSISTENCE - LƯU TRỮ PHIÊN LÀNG VIỆC
// ═══════════════════════════════════════════════════════════════════════════════════

/**
 * Auto-save current state to localStorage whenever any state changes
 * Called automatically by all state setter functions
 * Ensures state is always in sync with localStorage
 */
const autoSaveState = () => {
    // Only save if we have a valid view (not login) and courseId/lessonId if needed
    if (currentView && currentView !== 'login') {
        localStorage.setItem('currentView', currentView);
        
        // Only save IDs if they exist (don't save empty/null values)
        if (currentCourseId) {
            localStorage.setItem('currentCourseId', currentCourseId);
        } else {
            localStorage.removeItem('currentCourseId');
        }
        
        if (currentLessonId) {
            localStorage.setItem('currentLessonId', currentLessonId);
        } else {
            localStorage.removeItem('currentLessonId');
        }
        
        if (currentStudentIdForProgress) {
            localStorage.setItem('currentStudentIdForProgress', currentStudentIdForProgress);
        } else {
            localStorage.removeItem('currentStudentIdForProgress');
        }
        
        // Always save tab
        localStorage.setItem('currentActiveTab', currentActiveTab || 'overview');
        
        console.log('💾 AUTO-SAVED state:', {
            view: currentView,
            courseId: currentCourseId || '(none)',
            lessonId: currentLessonId || '(none)',
            tab: currentActiveTab || 'overview'
        });
    }
};

/**
 * Save current session state to localStorage
 * Called whenever navigation or UI updates happen to ensure F5 reload preserves state
 */
export const saveSessionToLocalStorage = () => {
    autoSaveState();
};

/**
 * Clear all session state from memory and localStorage
 * Called on logout to prevent data leakage between different users
 */
export const clearAllSessionState = () => {
    // Clear memory state
    currentView = 'login';
    currentCourseId = null;
    currentLessonId = null;
    currentStudentIdForProgress = null;
    overviewFilterLessonId = 'all';
    currentActiveTab = 'overview';
    isFirstNavigationAfterRestore = false;
    
    // Clear localStorage
    localStorage.removeItem('currentUserId');
    localStorage.removeItem('currentView');
    localStorage.removeItem('currentCourseId');
    localStorage.removeItem('currentLessonId');
    localStorage.removeItem('currentStudentIdForProgress');
    localStorage.removeItem('currentActiveTab');
    
    console.log('🧹 All session state cleared');
};

// ═══════════════════════════════════════════════════════════════════════════════════
// UI UTILITIES - HÀM TIỆN ÍCH GIAO DIỆN
// ═══════════════════════════════════════════════════════════════════════════════════

export const showToast = (message, type = 'info') => {
    const container = document.getElementById('toast-container');
    const icons = { success: 'fa-check-circle', error: 'fa-times-circle', info: 'fa-info-circle' };
    const colors = { success: 'bg-green-500', error: 'bg-red-500', info: 'bg-blue-500' };
    const toast = document.createElement('div');
    toast.className = `flex items-center p-4 rounded-lg text-white shadow-2xl animate-toast-in ${colors[type]}`;
    toast.innerHTML = `<i class="fas ${icons[type]} mr-3"></i> <p>${message}</p>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.replace('animate-toast-in', 'animate-toast-out');
        toast.addEventListener('animationend', () => toast.remove());
    }, 3000);
};

export const showModal = (content) => {
    const modalContainer = document.getElementById('modal-container');
    modalContainer.innerHTML = '';
    if (typeof content === 'string') {
        modalContainer.innerHTML = content;
    } else if (content instanceof HTMLElement) {
        modalContainer.appendChild(content);
    }
    modalContainer.classList.remove('hidden');
    modalContainer.classList.add('flex');
};

export const closeModal = () => {
    const modalContainer = document.getElementById('modal-container');
    modalContainer.classList.add('hidden');
    modalContainer.innerHTML = '';
};

// ═══════════════════════════════════════════════════════════════════════════════════
// STRING & TEXT UTILITIES - HÀM XỬ LÝ CHUỖI VÀ VĂN BẢN
// ═══════════════════════════════════════════════════════════════════════════════════

export const generateUsername = (fullName, role) => {
    const cleanName = fullName.replace(/^(GV\.|HS\.)\s*/, '');
    const nameParts = cleanName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().split(' ');
    if (nameParts.length === 0 || nameParts[0] === "") return "";
    if (nameParts.length === 1) return `${role === 'teacher' ? 'gv' : 'hs'}.${nameParts[0]}`;
    const lastName = nameParts[nameParts.length - 1];
    const initials = nameParts.slice(0, -1).map(part => part[0]).join('');
    let baseUsername = `${lastName}${initials}`;
    let username = `${role === 'teacher' ? 'gv' : 'hs'}.${baseUsername}`;
    let counter = 1;
    while (users.some(u => u.username === username)) {
        username = `${role === 'teacher' ? 'gv' : 'hs'}.${baseUsername}${counter}`;
        counter++;
    }
    return username;
};

export const getUserInitials = (name) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
};

export const getYoutubeEmbedUrl = (url) => {
    if (!url) return null;
    let videoId = null;
    try {
        const urlObj = new URL(url);
        if (urlObj.hostname === 'youtu.be') videoId = urlObj.pathname.slice(1);
        else if (urlObj.hostname.includes('youtube.com')) videoId = urlObj.searchParams.get('v');
    } catch (error) { return null; }
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
};

// ═══════════════════════════════════════════════════════════════════════════════════
// SKILL & SCORE UTILITIES - HÀM XỬ LÝ KỸ NĂNG VÀ ĐIỂM SỐ
// ═══════════════════════════════════════════════════════════════════════════════════

export const calculateAverageScore = () => {
    const scores = [];
    const readingInput = document.getElementById('edit-reading-score');
    const listeningInput = document.getElementById('edit-listening-score');
    const speakingInput = document.getElementById('edit-speaking-score');
    const writingInput = document.getElementById('edit-writing-score');

    // Chỉ tính kỹ năng có input field (không bị ẩn)
    if (readingInput && readingInput.offsetParent !== null && readingInput.value) scores.push(parseFloat(readingInput.value));
    if (listeningInput && listeningInput.offsetParent !== null && listeningInput.value) scores.push(parseFloat(listeningInput.value));
    if (speakingInput && speakingInput.offsetParent !== null && speakingInput.value) scores.push(parseFloat(speakingInput.value));
    if (writingInput && writingInput.offsetParent !== null && writingInput.value) scores.push(parseFloat(writingInput.value));
    
    const averageDisplay = document.getElementById('average-score-display');
    if (!averageDisplay) return;

    const validScores = scores.filter(s => !isNaN(s));

    if (validScores.length > 0) {
        const average = validScores.reduce((a, b) => a + b, 0) / validScores.length;
        averageDisplay.textContent = average.toFixed(1);
    } else {
        averageDisplay.textContent = '--';
    }
};

export const getSkillColorClass = (score) => {
    if (score === '--' || score === null || score === undefined) {
        return 'bg-slate-200 text-slate-700';
    }
    const numScore = parseFloat(score);
    if (numScore < 5) {
        return 'bg-red-100 text-red-700';
    } else if (numScore >= 5 && numScore < 8) {
        return 'bg-yellow-100 text-yellow-700';
    } else {
        return 'bg-green-100 text-green-700';
    }
};

// ═══════════════════════════════════════════════════════════════════════════════════
// CHART RENDERING - HÀM RENDER BIỂU ĐỒ
// ═══════════════════════════════════════════════════════════════════════════════════

export const renderCharts = (chartData, prefix = '') => {
    if (window.myCharts) { 
        Object.values(window.myCharts).forEach(chart => chart.destroy()); 
    }
    window.myCharts = {};
    const doughnutPieOptions = { 
        responsive: true, 
        maintainAspectRatio: false, 
        plugins: { 
            legend: { 
                display: true, 
                position: 'bottom',
                labels: {
                    boxWidth: 12
                }
            } 
        } 
    };

    const ctxSub = document.getElementById(`${prefix}submissionChart`);
    if (ctxSub) {
        window.myCharts.submission = new Chart(ctxSub, { type: 'doughnut', data: chartData.submission, options: doughnutPieOptions });
    }

    const ctxGrade = document.getElementById(`${prefix}gradingChart`);
    if (ctxGrade) {
        window.myCharts.grading = new Chart(ctxGrade, { type: 'doughnut', data: chartData.grading, options: doughnutPieOptions });
    }

    const ctxAtt = document.getElementById(`${prefix}attendanceChart`);
    if(ctxAtt && chartData.attendance) {
        window.myCharts.attendance = new Chart(ctxAtt, { 
            type: 'pie', 
            data: chartData.attendance, 
            options: doughnutPieOptions
        });
    }
    
    const ctxSkills = document.getElementById(`${prefix}skillsChart`);
    if(ctxSkills && chartData.skills) {
        window.myCharts.skills = new Chart(ctxSkills, {
            type: 'radar',
            data: chartData.skills,
            options: { 
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: true, position: 'bottom' } },
                scales: { 
                    r: { 
                        angleLines: { display: false },
                        suggestedMin: 0,
                        suggestedMax: 10,
                        ticks: { stepSize: 2 } 
                    } 
                } 
            }
        });
    }
};

// ═══════════════════════════════════════════════════════════════════════════════════
// COMMON RENDER FUNCTIONS - HÀM RENDER CHUNG
// ═══════════════════════════════════════════════════════════════════════════════════

export const renderHeader = (title, showBackButton = false) => {
    return `
         <header class="w-full bg-white p-4 rounded-xl shadow-lg flex justify-between items-center sticky top-0 z-40 h-20">
             <div class="flex items-center min-w-0">
                 ${showBackButton ? '<button class="back-btn mr-4 text-slate-500 hover:text-blue-600 transition-colors"><i class="fas fa-arrow-left fa-lg"></i></button>' : ''}
                 <h1 class="text-xl md:text-2xl font-bold text-slate-800 truncate">${title}</h1>
             </div>
             <div class="flex items-center space-x-4">
                 <div class="hidden md:flex items-center space-x-2">
                    <div class="h-10 w-10 bg-blue-100 text-blue-600 font-bold rounded-full flex items-center justify-center">${getUserInitials(currentUser.name)}</div>
                    <div class="text-right">
                        <p class="font-semibold text-sm text-slate-700">${currentUser.name}</p>
                        <p class="text-xs text-slate-500 capitalize">${currentUser.role}</p>
                    </div>
                 </div>
                 <button id="edit-account-btn" class="bg-blue-500 text-white font-semibold px-3 py-2 rounded-lg hover:bg-blue-600 transition-colors" title="Chỉnh sửa tài khoản">
                     <i class="fas fa-cog"></i>
                 </button>
                 <button id="logout-btn" class="bg-red-500 text-white font-semibold px-3 py-2 rounded-lg hover:bg-red-600 transition-colors">
                     <i class="fas fa-sign-out-alt"></i>
                 </button>
             </div>
         </header>`;
};

export const renderConfirmModal = (title, message, confirmText, confirmClass, onConfirm) => {
    const confirmModal = document.createElement('div');
    confirmModal.className = "bg-white w-full max-w-sm rounded-xl shadow-lg p-6 fade-in";
    confirmModal.innerHTML = `
         <h2 class="text-xl font-bold mb-2 text-slate-800">${title}</h2>
         <p class="text-slate-600 mb-6">${message}</p>
         <div class="flex justify-end space-x-3 pt-2">
             <button class="cancel-modal-btn px-4 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300">Huỷ</button>
             <button class="confirm-action px-4 py-2 text-white rounded-lg ${confirmClass}">${confirmText}</button>
         </div>
    `;
    
    showModal(confirmModal);

    confirmModal.querySelector('.confirm-action').addEventListener('click', () => { onConfirm(); closeModal(); }, { once: true });
    confirmModal.querySelector('.cancel-modal-btn').addEventListener('click', closeModal, { once: true });
};

// ═══════════════════════════════════════════════════════════════════════════════════
// STATE GETTERS & SETTERS - QUẢN LÝ TRẠNG THÁI
// ═══════════════════════════════════════════════════════════════════════════════════

export const getState = () => ({
    users,
    courses,
    lessons,
    homeworks,
    progress,
    enrollments,
    currentUser,
    currentView,
    currentCourseId,
    currentLessonId,
    currentStudentIdForProgress,
    overviewFilterLessonId,
    currentActiveTab,
    isFirstNavigationAfterRestore
});

export const setState = (newState) => {
    if (newState.users) users = newState.users;
    if (newState.courses) courses = newState.courses;
    if (newState.lessons) lessons = newState.lessons;
    if (newState.homeworks) homeworks = newState.homeworks;
    if (newState.progress) progress = newState.progress;
    if (newState.enrollments) enrollments = newState.enrollments;
    if (newState.currentUser !== undefined) currentUser = newState.currentUser;
    if (newState.currentView) currentView = newState.currentView;
    if (newState.currentCourseId !== undefined) currentCourseId = newState.currentCourseId;
    if (newState.currentLessonId !== undefined) currentLessonId = newState.currentLessonId;
    if (newState.currentStudentIdForProgress !== undefined) currentStudentIdForProgress = newState.currentStudentIdForProgress;
    if (newState.overviewFilterLessonId) overviewFilterLessonId = newState.overviewFilterLessonId;
    if (newState.currentActiveTab) currentActiveTab = newState.currentActiveTab;
    if (newState.isFirstNavigationAfterRestore !== undefined) isFirstNavigationAfterRestore = newState.isFirstNavigationAfterRestore;
};

export const getCurrentUser = () => currentUser;
export const setCurrentUser = (user) => { 
    currentUser = user; 
};
export const clearCurrentUser = () => { 
    currentUser = null; 
};

export const getCurrentView = () => currentView;
export const setCurrentView = (view) => { 
    currentView = view;
    autoSaveState();
};

export const getCurrentCourseId = () => currentCourseId;
export const setCurrentCourseId = (id) => { 
    currentCourseId = id;
    autoSaveState();
};

export const getCurrentLessonId = () => currentLessonId;
export const setCurrentLessonId = (id) => { 
    currentLessonId = id;
    autoSaveState();
};

export const getCurrentStudentIdForProgress = () => currentStudentIdForProgress;
export const setCurrentStudentIdForProgress = (id) => { 
    currentStudentIdForProgress = id;
    autoSaveState();
};

export const getOverviewFilterLessonId = () => overviewFilterLessonId;
export const setOverviewFilterLessonId = (id) => { overviewFilterLessonId = id; };

export const getCurrentActiveTab = () => currentActiveTab;
export const setCurrentActiveTab = (tab) => { 
    currentActiveTab = tab;
    autoSaveState();
};

export const getIsFirstNavigationAfterRestore = () => isFirstNavigationAfterRestore;
export const setIsFirstNavigationAfterRestore = (value) => { isFirstNavigationAfterRestore = value; };

// ═══════════════════════════════════════════════════════════════════════════════════
// COLLECTION DATA MANAGEMENT - QUẢN LÝ DỮ LIỆU CÁC COLLECTION
// ═══════════════════════════════════════════════════════════════════════════════════

export const getUsers = () => users;
export const setUsers = (data) => { users = data; };

export const getCourses = () => courses;
export const setCourses = (data) => { courses = data; };

export const getLessons = () => lessons;
export const setLessons = (data) => { lessons = data; };

export const getHomeworks = () => homeworks;
export const setHomeworks = (data) => { homeworks = data; };

export const getProgress = () => progress;
export const setProgress = (data) => { progress = data; };

export const getEnrollments = () => enrollments;
export const setEnrollments = (data) => { enrollments = data; };
