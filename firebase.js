// firebase.js - Firebase initialization and real-time listeners
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, writeBatch, setDoc, serverTimestamp, deleteField, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// ═══════════════════════════════════════════════════════════════════════════════════
// FIREBASE INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════════════
let db, auth;
const firebaseConfig = {
    apiKey: "AIzaSyD7FL9Alrsci7uvi3UnCSYmsbyICxtDWR4",
    authDomain: "elearningenglishproject-4809b.firebaseapp.com",
    projectId: "elearningenglishproject-4809b",
    storageBucket: "elearningenglishproject-4809b.firebasestorage.app",
    messagingSenderId: "43710996622",
    appId: "1:43710996622:web:2f3e8d07424c0d0d5fa9df",
    measurementId: "G-VM1MSE4DM3"
};

try {
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
} catch (e) {
    console.error("❌ Firebase initialization error:", e);
    document.getElementById('loading-overlay').innerHTML = '<p class="text-red-500">Lỗi kết nối Firebase. Vui lòng kiểm tra cấu hình.</p>';
}

// ═══════════════════════════════════════════════════════════════════════════════════
// EXPORT Firebase instances and functions for use in main app
// ═══════════════════════════════════════════════════════════════════════════════════
export {
    db,
    auth,
    collection,
    onSnapshot,
    addDoc,
    doc,
    updateDoc,
    deleteDoc,
    writeBatch,
    setDoc,
    serverTimestamp,
    deleteField,
    getDoc
};

// ═══════════════════════════════════════════════════════════════════════════════════
// FIREBASE REAL-TIME LISTENERS SETUP
// ═══════════════════════════════════════════════════════════════════════════════════
export async function setupFirebaseListeners(callbacks) {
    if (!db || !auth) {
        console.error('❌ Firebase not initialized - db or auth is missing');
        return;
    }

    let initialLoadComplete = false;
    let allListenersSetUp = false;

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const collectionsToWatch = ['users', 'courses', 'lessons', 'homeworks', 'progress', 'enrollments'];
            const initialLoads = new Set();
            const collectionData = {};

            // Timeout fallback: nếu sau 5s chưa load hết, vẫn render login screen
            const loadTimeout = setTimeout(() => {
                if (!initialLoadComplete && allListenersSetUp) {
                    initialLoadComplete = true;
                    
                    setTimeout(() => {
                        const loadingOverlay = document.getElementById('loading-overlay');
                        if (loadingOverlay) {
                            loadingOverlay.style.opacity = '0';
                            loadingOverlay.style.pointerEvents = 'none';
                            setTimeout(() => {
                                loadingOverlay.style.display = 'none';
                            }, 300);
                        }
                        callbacks.navigate();
                    }, 300);
                }
            }, 5000);

            collectionsToWatch.forEach(colName => {
                onSnapshot(collection(db, colName), (snapshot) => {
                    allListenersSetUp = true;
                    const dataArray = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    collectionData[colName] = dataArray;
                    
                    // Call the callback to update data in the main app
                    callbacks.updateCollectionData(colName, dataArray);

                    if (!initialLoadComplete) {
                        initialLoads.add(colName);
                        
                        // Kiểm tra tất cả collections đã load chưa
                        if (initialLoads.size === collectionsToWatch.length) {
                            initialLoadComplete = true;
                            clearTimeout(loadTimeout);
                            
                            // Khôi phục currentUser từ localStorage (nếu có)
                            const savedUserId = localStorage.getItem('currentUserId');
                            if (savedUserId && collectionData['users']) {
                                const foundUser = collectionData['users'].find(u => u.id === savedUserId);
                                if (foundUser) {
                                    callbacks.restoreSession(foundUser);
                                } else {
                                    callbacks.clearSession();
                                }
                            }
                            
                            // Ẩn loading overlay và hiển thị app
                            setTimeout(() => {
                                const loadingOverlay = document.getElementById('loading-overlay');
                                if (loadingOverlay) {
                                    loadingOverlay.style.opacity = '0';
                                    loadingOverlay.style.pointerEvents = 'none';
                                    setTimeout(() => {
                                        loadingOverlay.style.display = 'none';
                                    }, 300);
                                }
                                // Navigate sẽ hiển thị login screen nếu không có user
                                callbacks.navigate();
                            }, 300);
                        }
                    } else {
                        // After initial load, if 'users' collection changes, update currentUser
                        if (colName === 'users' && callbacks.getCurrentUser()) {
                            const currentUserId = callbacks.getCurrentUser().id;
                            const refreshedUser = dataArray.find(u => u.id === currentUserId);
                            if (refreshedUser) {
                                callbacks.updateCurrentUser(refreshedUser);
                            } else {
                                callbacks.handleUserDeleted();
                                return;
                            }
                        }
                        callbacks.updateUI();
                    }
                }, (error) => {
                    console.error(`Lỗi khi lắng nghe collection ${colName}:`, error);
                    clearTimeout(loadTimeout);
                    document.getElementById('loading-overlay').innerHTML = `<div class="text-center p-4">
                        <p class="text-red-500 font-semibold">❌ Lỗi quyền truy cập!</p>
                        <p class="text-slate-600 mt-2 text-sm">Vui lòng kiểm tra lại <strong>Quy tắc Bảo mật (Security Rules)</strong> trong Firebase.</p>
                    </div>`;
                });
            });
        } else {
            try {
                await signInAnonymously(auth);
            } catch (error) {
                console.error("Lỗi đăng nhập ẩn danh:", error);
                callbacks.showToast('Không thể kết nối đến máy chủ xác thực.', 'error');
            }
        }
    });
}
