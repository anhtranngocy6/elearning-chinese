// auth.js - Authentication and account management
// ═══════════════════════════════════════════════════════════════════════════════════
// LOGIN VIEW RENDERING
// ═══════════════════════════════════════════════════════════════════════════════════
export const renderLoginScreen = (appContainer) => {
    document.title = "Đăng nhập | SmartEdu x AT";

    // Apply background immediately to appContainer for instant loading
    appContainer.style.backgroundImage = 'url("background.jpg")';
    appContainer.style.backgroundSize = 'cover';
    appContainer.style.backgroundPosition = '70% center';
    appContainer.style.backgroundAttachment = 'fixed';
    appContainer.style.position = 'relative';

    appContainer.innerHTML = `
    <div class="fixed inset-0 w-screen h-screen overflow-y-auto overflow-x-hidden">
        
        <div class="relative min-h-full w-full flex flex-col justify-center pb-4 pt-44 lg:pt-60">

            <div class="absolute inset-0 bg-white/30 lg:bg-transparent z-0 pointer-events-none"></div>

            <div class="relative z-10 w-full flex flex-col items-center lg:items-start lg:pl-16 xl:pl-24">
                
                <div class="w-full max-w-xs sm:max-w-sm xl:max-w-md px-4 sm:px-0 bg-white/90 lg:bg-white/70 backdrop-blur-xl p-6 lg:p-8 rounded-2xl shadow-2xl fade-in" id="login-box">
                    <div class="text-center mb-6 lg:mb-8">
                        <i class="fas fa-graduation-cap text-4xl lg:text-5xl" style="color: #A9768A;"></i>
                        <h1 class="text-2xl lg:text-3xl xl:text-4xl font-bold text-slate-800 mt-2">SmartEdu x AT</h1>
                        <p class="text-sm text-slate-500">Trí Thức - Sáng Tạo - Dẫn Dắt</p>
                    </div>
                    
                    <div id="login-error" class="text-red-500 text-center mb-4 hidden text-sm"></div>
                    
                    <div class="space-y-4">
                        <div>
                            <label for="username-input" class="block text-sm font-medium text-slate-600 mb-1">Tên đăng nhập:</label>
                            <input type="text" id="username-input" class="w-full p-3 text-base bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition-shadow" placeholder="ví dụ: hs.annv">
                        </div>
                        <div>
                            <label for="password-input" class="block text-sm font-medium text-slate-600 mb-1">Mật khẩu:</label>
                            <input type="password" id="password-input" class="w-full p-3 text-base bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition-shadow" placeholder="******">
                        </div>
                        <button id="login-btn" class="w-full text-white font-semibold p-3 text-base rounded-lg transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5" style="background-color: #A9768A;" onmouseover="this.style.backgroundColor='#8B5A6F'" onmouseout="this.style.backgroundColor='#A9768A'">Đăng nhập</button>
                    </div>
                </div>
            </div>
        </div>
    </div>`;
};

// ═══════════════════════════════════════════════════════════════════════════════════
// LOGIN HANDLER
// ═══════════════════════════════════════════════════════════════════════════════════
export const handleLogin = (users, callbacks) => {
    console.log('🔑 handleLogin called with users:', users);
    const username = document.getElementById('username-input')?.value || '';
    const password = document.getElementById('password-input')?.value || '';

    console.log(`📝 Attempting login with username: ${username}`);

    // Validation - require both username and password
    if (!username.trim() || !password.trim()) {
        const loginError = document.getElementById('login-error');
        if (loginError) {
            loginError.textContent = 'Vui lòng nhập tên đăng nhập và mật khẩu.';
            loginError.classList.remove('hidden');
        }
        console.warn('⚠️ Login validation failed - missing username or password');
        return;
    }

    console.log(`🔍 Searching for user: ${username}`);
    const userToLogin = users.find(u => u.username === username && u.password === password);

    if (userToLogin) {
        localStorage.setItem('currentUserId', userToLogin.id);
        // Add debugging
        console.log('✅ Login successful:', userToLogin.name);
        callbacks.setCurrentUser(userToLogin);
        callbacks.navigate();
        callbacks.showToast(`Chào mừng, ${userToLogin.name}!`, 'success');
    } else {
        const loginError = document.getElementById('login-error');
        if (loginError) {
            loginError.textContent = 'Tên đăng nhập hoặc mật khẩu không chính xác.';
            loginError.classList.remove('hidden');
        }
        console.warn('❌ Login failed - user not found');
        console.log('Users in database:', users.map(u => ({ id: u.id, username: u.username, name: u.name, role: u.role })));
    }
};

// ═══════════════════════════════════════════════════════════════════════════════════
// LOGOUT HANDLER
// ═══════════════════════════════════════════════════════════════════════════════════
export const handleLogout = (callbacks) => {
    console.log('🚪 handleLogout called');

    // Clear all session state from memory and localStorage
    callbacks.clearAllSessionState();

    // Clear current user from memory
    callbacks.clearCurrentUser();

    // Redirect to login page
    callbacks.navigate();

    // Show success message
    callbacks.showToast('Đã đăng xuất!', 'success');

    console.log('✅ Logout completed, all state cleared');
};

// ═══════════════════════════════════════════════════════════════════════════════════
// EDIT ACCOUNT MODAL
// ═══════════════════════════════════════════════════════════════════════════════════
export const renderEditAccountModal = (currentUser, showModal) => {
    const modalContent = `
        <div class="bg-white w-full max-w-md rounded-xl shadow-lg p-8 fade-in">
            <div class="mb-6 pb-4 border-b">
                <h2 class="text-2xl font-bold text-slate-800"><i class="fas fa-user-cog text-blue-600 mr-2"></i>Chỉnh sửa Tài khoản</h2>
            </div>
            <div class="space-y-6">
                <div class="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h3 class="font-semibold text-slate-700 mb-3 flex items-center"><i class="fas fa-info-circle text-blue-600 mr-2"></i>Thông tin cá nhân</h3>
                    <div class="space-y-2 text-sm">
                        <p><span class="font-medium text-slate-600">Họ tên:</span> <span class="text-slate-800">${currentUser.name}</span></p>
                        <p><span class="font-medium text-slate-600">Username:</span> <span class="font-mono text-slate-800">@${currentUser.username}</span></p>
                        <p><span class="font-medium text-slate-600">Vai trò:</span> <span class="capitalize text-slate-800">${currentUser.role === 'student' ? 'Học sinh' : currentUser.role === 'teacher' ? 'Giáo viên' : 'Quản trị viên'}</span></p>
                    </div>
                </div>
                <div class="space-y-3">
                    <h3 class="font-semibold text-slate-700 flex items-center"><i class="fas fa-lock text-amber-600 mr-2"></i>Đổi mật khẩu</h3>
                    <div>
                        <label for="current-password" class="block text-sm font-medium text-slate-600 mb-1">Mật khẩu hiện tại:</label>
                        <input type="password" id="current-password" class="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="••••••••">
                    </div>
                    <div>
                        <label for="new-password" class="block text-sm font-medium text-slate-600 mb-1">Mật khẩu mới:</label>
                        <input type="password" id="new-password" class="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="••••••••">
                    </div>
                    <div>
                        <label for="confirm-password" class="block text-sm font-medium text-slate-600 mb-1">Xác nhận mật khẩu:</label>
                        <input type="password" id="confirm-password" class="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="••••••••">
                    </div>
                    <div id="password-error" class="text-red-500 text-sm hidden bg-red-50 p-2.5 rounded-lg"></div>
                </div>
            </div>
            <div class="flex justify-end space-x-3 mt-8 pt-4 border-t">
                <button class="cancel-modal-btn px-4 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 font-medium transition-colors">Huỷ</button>
                <button id="save-account-btn" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors flex items-center gap-2"><i class="fas fa-check-circle"></i>Lưu thay đổi</button>
            </div>
        </div>
    `;
    showModal(modalContent);
};


// ═══════════════════════════════════════════════════════════════════════════════════
// SAVE ACCOUNT CHANGES
// ═══════════════════════════════════════════════════════════════════════════════════
export const handleSaveAccountChanges = async (currentUser, updateDoc, doc, db, callbacks) => {
    const currentPassword = document.getElementById('current-password')?.value || '';
    const newPassword = document.getElementById('new-password')?.value || '';
    const confirmPassword = document.getElementById('confirm-password')?.value || '';
    const passwordError = document.getElementById('password-error');

    // Validation
    if (!currentPassword) {
        passwordError.textContent = 'Vui lòng nhập mật khẩu hiện tại!';
        passwordError.classList.remove('hidden');
        return;
    }
    if (!newPassword) {
        passwordError.textContent = 'Vui lòng nhập mật khẩu mới!';
        passwordError.classList.remove('hidden');
        return;
    }
    if (newPassword !== confirmPassword) {
        passwordError.textContent = 'Mật khẩu mới và xác nhận không trùng khớp!';
        passwordError.classList.remove('hidden');
        return;
    }
    if (currentPassword === newPassword) {
        passwordError.textContent = 'Mật khẩu mới phải khác mật khẩu cũ!';
        passwordError.classList.remove('hidden');
        return;
    }
    if (currentPassword !== currentUser.password) {
        passwordError.textContent = 'Mật khẩu hiện tại không chính xác!';
        passwordError.classList.remove('hidden');
        return;
    }

    // Update password in Firestore
    try {
        await updateDoc(doc(db, 'users', currentUser.id), { password: newPassword });
        // Update the current user's password
        const updatedUser = { ...currentUser, password: newPassword };
        callbacks.setCurrentUser(updatedUser);
        callbacks.closeModal();
        callbacks.showToast('✅ Đổi mật khẩu thành công!', 'success');
    } catch (error) {
        console.error('Error updating password:', error);
        passwordError.textContent = 'Có lỗi xảy ra. Vui lòng thử lại!';
        passwordError.classList.remove('hidden');
    }
};

// ═══════════════════════════════════════════════════════════════════════════════════
// INIT AUTH LISTENERS - KHỞI ĐỘNG CÁC SỰ KIỆN AUTHENTICATION
// ═══════════════════════════════════════════════════════════════════════════════════
/**
 * Initialize authentication-related event listeners
 * Handles login, logout, edit account, and save account changes
 */
export const initAuthListeners = (callbacks) => {
    // Log to confirm listeners are initialized
    console.log('🔐 Initializing authentication listeners...');

    document.addEventListener('click', async (e) => {
        const target = e.target;

        // LOGIN HANDLER
        if (target.closest('#login-btn')) {
            console.log('🔑 Login button clicked');
            try {
                handleLogin(callbacks.getUsers(), {
                    setCurrentUser: callbacks.setCurrentUser,
                    navigate: callbacks.navigate,
                    showToast: callbacks.showToast
                });
            } catch (error) {
                console.error('❌ Login error:', error);
                const loginError = document.getElementById('login-error');
                if (loginError) {
                    loginError.textContent = 'Có lỗi xảy ra. Vui lòng thử lại!';
                    loginError.classList.remove('hidden');
                }
            }
        }

        // EDIT ACCOUNT HANDLER
        if (target.closest('#edit-account-btn')) {
            console.log('✏️ Edit account button clicked');
            renderEditAccountModal(callbacks.getCurrentUser(), callbacks.showModal);
        }

        // LOGOUT HANDLER
        if (target.closest('#logout-btn')) {
            console.log('🚪 Logout button clicked');
            handleLogout({
                clearAllSessionState: callbacks.clearAllSessionState,
                clearCurrentUser: callbacks.clearCurrentUser,
                navigate: callbacks.navigate,
                showToast: callbacks.showToast
            });
        }

        // SAVE ACCOUNT CHANGES HANDLER
        if (target.closest('#save-account-btn')) {
            console.log('💾 Save account button clicked');
            await handleSaveAccountChanges(
                callbacks.getCurrentUser(),
                callbacks.updateDoc,
                callbacks.doc,
                callbacks.db,
                {
                    closeModal: callbacks.closeModal,
                    showToast: callbacks.showToast
                }
            );
        }
    });
};
