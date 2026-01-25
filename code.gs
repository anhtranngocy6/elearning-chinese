/**
 * BACKEND: Google Apps Script (V9 - Return Lesson URL)
 * Cập nhật: Trả về thêm "lessonUrl" để hiển thị nút đỏ truy cập nhanh bài học.
 */

function doPost(e) {
  if (!e || !e.postData || !e.postData.contents) {
    return createJSONOutput({ status: 'error', message: 'No data received' });
  }

  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action || 'get_url'; 

    var ROOT_FOLDER_ID = "1X8BpeMHCNO2D9rE3EEGf9IC5VcfG0EKx"; 

    // --- CASE 0: TẠO FOLDER KHÓA HỌC ---
    if (action === 'create_course_folder') {
       try {
         var className = data.className;
         var root = DriveApp.getFolderById(ROOT_FOLDER_ID);
         var existingFolders = root.getFoldersByName(className);
         var classFolder = null;
         while (existingFolders.hasNext()) {
           var folder = existingFolders.next();
           if (!folder.isTrashed()) {
             classFolder = folder;
             break;
           }
         }
         if (!classFolder) {
           classFolder = root.createFolder(className);
         }
         return createJSONOutput({ 
           status: 'success', 
           folderId: classFolder.getId(),
           folderUrl: classFolder.getUrl()
         });
       } catch (err) {
         return createJSONOutput({ status: 'error', message: 'Lỗi tạo/lấy folder: ' + err });
       }
    }

    // --- CASE 1: TẠO CẤU TRÚC ---
    if (action === 'create_folder_structure') {
       var className = data.className;
       var homeworkName = data.homeworkName;
       var studentName = data.studentName;
       var lessonName = data.lessonName;

       var result = createLessonFolderStructure(ROOT_FOLDER_ID, className, homeworkName, studentName, lessonName);
       return createJSONOutput(result);
    }

    // --- CASE 2: XÓA THƯ MỤC BÀI HỌC ---
    if (action === 'delete_lesson_folder') {
       var className = data.className;
       var homeworkName = data.homeworkName;
       var studentName = data.studentName;
       var lessonName = data.lessonName;

       var root = DriveApp.getFolderById(ROOT_FOLDER_ID);
       
       var classFolders = root.getFoldersByName(className);
       if (!classFolders.hasNext()) return createJSONOutput({ status: 'error', message: 'Không tìm thấy Lớp' });
       var classFolder = classFolders.next();

       var homeworkFolders = classFolder.getFoldersByName(homeworkName);
       if (!homeworkFolders.hasNext()) return createJSONOutput({ status: 'error', message: 'Không tìm thấy Bài Tập' });
       var homeworkFolder = homeworkFolders.next();

       var studentFolders = homeworkFolder.getFoldersByName(studentName);
       if (!studentFolders.hasNext()) return createJSONOutput({ status: 'error', message: 'Không tìm thấy Học Sinh' });
       var studentFolder = studentFolders.next();

       var lessonFolders = studentFolder.getFoldersByName(lessonName);
       var deletedCount = 0;
       while (lessonFolders.hasNext()) {
         var folder = lessonFolders.next();
         if (folder.getName().normalize() === lessonName.normalize()) {
           folder.setTrashed(true);
           deletedCount++;
         }
       }

       if (deletedCount > 0) return createJSONOutput({ status: 'success', deleted: true, message: 'Đã xóa folder: ' + lessonName });
       else return createJSONOutput({ status: 'success', deleted: false, message: 'Không tìm thấy folder để xóa.' });
    }

    // --- CASE 3: LẤY LINK UPLOAD ---
    if (action === 'get_url') {
        var fileName = data.filename;
        var mimeType = data.mimeType;
        var targetFolderId = data.folderId || ROOT_FOLDER_ID;

        var url = "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable";
        var metadata = { name: fileName, mimeType: mimeType, parents: [targetFolderId] };
        var params = {
          method: "post",
          contentType: "application/json",
          headers: { "Authorization": "Bearer " + ScriptApp.getOAuthToken() },
          payload: JSON.stringify(metadata),
          muteHttpExceptions: true
        };
        var response = UrlFetchApp.fetch(url, params);
        if (response.getResponseCode() === 200) {
          return createJSONOutput({ status: "success", url: response.getAllHeaders()["Location"] });
        } else {
          return createJSONOutput({ status: 'error', message: response.getContentText() });
        }
    }
    
    return createJSONOutput({ status: 'error', message: 'Unknown action' });

  } catch (error) {
    return createJSONOutput({ status: 'error', message: error.toString() });
  }
}

function createLessonFolderStructure(ROOT_FOLDER_ID, className, homeworkName, studentName, lessonName) {
  var root = DriveApp.getFolderById(ROOT_FOLDER_ID);
  var classFolder = getOrCreateFolder(root, className);
  var homeworkFolder = getOrCreateFolder(classFolder, homeworkName);
  var studentFolder = getOrCreateFolder(homeworkFolder, studentName);

  // Chỉ lấy folder bài học đầu tiên chưa bị trashed nếu đã tồn tại
  var existingLessons = studentFolder.getFoldersByName(lessonName);
  while (existingLessons.hasNext()) {
    var lessonFolder = existingLessons.next();
    if (!lessonFolder.isTrashed()) {
      return {
        status: 'success',
        folderId: lessonFolder.getId(),
        classUrl: classFolder.getUrl(),
        lessonUrl: lessonFolder.getUrl(),
        existed: true
      };
    }
  }
  // Nếu chưa có folder hợp lệ thì tạo mới
  var lessonFolder = studentFolder.createFolder(lessonName);
  return {
    status: 'success',
    folderId: lessonFolder.getId(),
    classUrl: classFolder.getUrl(),
    lessonUrl: lessonFolder.getUrl(),
    existed: false
  };
}

function getOrCreateFolder(parent, name) {
  var folders = parent.getFoldersByName(name);
  if (folders.hasNext()) return folders.next();
  else return parent.createFolder(name);
}

function createJSONOutput(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function authTrigger() { DriveApp.getRootFolder().createFolder("check").setTrashed(true); }