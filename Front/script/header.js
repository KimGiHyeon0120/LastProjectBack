
// HTML 로딩 후 초기화 함수
function loadHTML(url) {
    fetch(url)
        .then(response => response.text())
        .then(html => {
            // 헤더에 HTML 삽입
            document.querySelector('header').innerHTML = html;


            // 헤더 로드 후 이벤트 핸들러 초기화
            initializeNotificationHandlers();

            // 사이드바 관련 로직 초기화
            adjustMainMargin();
            loadSidebarState();
            highlightActiveLink();

            // 햄버거 메뉴 이벤트 등록
            const hamburger = document.querySelector('.hamburger');
            if (hamburger) {
                hamburger.addEventListener('click', () => {
                    toggleNav();
                });
            }
        })
        .catch(error => console.error("HTML 로드 실패:", error));
}

let isSidebarToggled = false;

function adjustMainMargin() {
    const mainContent = document.querySelector('.main');
    const sidebar = document.getElementById("mySidebar");

    if (mainContent && sidebar) {
        if (sidebar.classList.contains('expanded')) {

            mainContent.style.setProperty('margin-left', '200px', 'important');
        } else {

            mainContent.style.setProperty('margin-left', '60px', 'important');
        }
    }
}

function toggleNav() {
    const sidebar = document.getElementById("mySidebar");

    // 사이드바가 열려있지 않으면 토글
    if (!isSidebarToggled) {


        // 사이드바 상태를 토글
        sidebar.classList.toggle('expanded');

        // 사이드바 상태 저장
        if (sidebar.classList.contains('expanded')) {
            localStorage.setItem('sidebarState', 'expanded');
        } else {
            localStorage.setItem('sidebarState', 'collapsed');
        }

        isSidebarToggled = true;  // 사이드바 상태 변경 후 플래그 설정

        // DOM 업데이트 후 스타일 적용
        setTimeout(() => {
            adjustMainMargin();
            isSidebarToggled = false;  // 사이드바 상태 토글 후 플래그 초기화
        }, 10);  // 약간의 시간 차이를 두어 스타일이 적용될 시간을 줌
    }
}



// 페이지 로드 시 이전에 저장된 사이드바 상태를 불러오기
function loadSidebarState() {
    const sidebarState = localStorage.getItem('sidebarState');
    const sidebar = document.getElementById("mySidebar");

    if (sidebarState === 'expanded') {
        sidebar.classList.add('expanded');
    } else {
        sidebar.classList.remove('expanded');
    }

    adjustMainMargin();
}

function highlightActiveLink() {
    const sidebarLinks = document.querySelectorAll('#mySidebar a');
    const currentPath = window.location.pathname.split('/').pop();  // 현재 페이지 URL에서 파일명만 추출

    sidebarLinks.forEach(link => {
        // 링크의 href 속성에서 파일명 추출
        const linkPath = link.getAttribute('href').split('/').pop();

        // 현재 페이지와 링크가 일치하면 active 클래스를 추가
        if (currentPath === linkPath) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}


// 문서 로딩 후 HTML 로드
document.addEventListener('DOMContentLoaded', function () {
    loadHTML("./header.html");  // header.html 파일 로드
    loadUserProfile();
    // 페이지 로드 시 "알림이 없습니다." 기본 문구를 표시
    const notificationDropdown = document.getElementById("notificationDropdown");
    if (notificationDropdown) {
        notificationDropdown.innerHTML = `<p class="no-notifications">알림이 없습니다.</p>`;
    }

    // 알림 데이터 초기화
    fetchNotifications();
});











// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────


// 알림 핸들러 초기화
function initializeNotificationHandlers() {
    const notificationIcon = document.getElementById("notificationIcon");
    const notificationDropdown = document.getElementById("notificationDropdown");
    const notificationBadge = document.getElementById("notificationBadge");

    if (!notificationIcon || !notificationDropdown || !notificationBadge) {
        console.error("알림 관련 요소를 찾을 수 없습니다.");
        return;
    }

    // 알림 데이터 초기화 (페이지 로드 시 실행)
    fetchNotifications();

    // 알림 아이콘 클릭 시 드롭다운 토글 및 알림 데이터 로드
    notificationIcon.addEventListener("click", () => {
        notificationDropdown.classList.toggle("hidden");
        if (!notificationDropdown.classList.contains("hidden")) {
            fetchNotifications();
        }
    });
}

// 알림 데이터 로드
async function fetchNotifications() {
    if (!userIdxh || !projectIdh) {
        console.error("User ID 또는 Project ID가 설정되지 않았습니다.");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/notification?userId=${userIdx}&projectId=${projectId}`);
        const data = await response.json();

        // 알림 데이터 렌더링
        const { notifications } = data;
        renderNotifications(notifications);
    } catch (err) {
        console.error("알림 데이터를 가져오는 중 오류 발생:", err);
    }
}

// 알림 렌더링
function renderNotifications(notifications) {
    const notificationDropdown = document.getElementById("notificationDropdown");
    const notificationBadge = document.getElementById("notificationBadge");

    if (!notificationDropdown || !notificationBadge) {
        console.error("알림 관련 요소를 찾을 수 없습니다.");
        return;
    }

    // 기존 내용 삭제
    notificationDropdown.innerHTML = "";

    // 알림이 없는 경우 처리
    if (!notifications || notifications.length === 0) {
        notificationDropdown.innerHTML = `<p class="no-notifications">알림이 없습니다.</p>`;
        notificationBadge.style.display = "none";
        return;
    }

    // 읽지 않은 알림만 필터링
    const unreadNotifications = notifications.filter(notification => notification.is_read_by_assignee === 0);

    // 읽지 않은 알림이 없는 경우 처리
    if (unreadNotifications.length === 0) {
        notificationDropdown.innerHTML = `<p class="no-notifications">알림이 없습니다.</p>`;
        notificationBadge.style.display = "none";
        return;
    }

    // 읽지 않은 알림 개수 뱃지 표시
    notificationBadge.textContent = unreadNotifications.length > 0 ? unreadNotifications.length : "";
    notificationBadge.style.display = unreadNotifications.length > 0 ? "inline-block" : "none";

    // 읽지 않은 알림 렌더링
    unreadNotifications.forEach(notification => {
        const senderName = notification.sender_name || "알 수 없는 사용자";
        const taskName = notification.task_name || "작업 없음";
        const message = notification.message || "내용 없음";

        notificationDropdown.innerHTML += `
            <div class="notification-item unread" data-id="${notification.notification_id}">
                <p><strong>${senderName}</strong> - <span>${taskName}</span></p>
                <p class="notification-message">${message}</p>
            </div>
        `;
    });

    // 알림 항목 클릭 이벤트 추가
    addNotificationItemClickEvent();
}

// 알림 항목 클릭 이벤트 추가
function addNotificationItemClickEvent() {
    const notificationItems = document.querySelectorAll(".notification-item");

    notificationItems.forEach(item => {
        item.addEventListener("click", async () => {
            const notificationId = item.getAttribute("data-id");
            const role = "assignee"; // 담당자 역할

            if (!notificationId) {
                console.error("알림 ID를 찾을 수 없습니다.");
                return;
            }

            try {
                // 읽음 상태 업데이트 API 요청
                const response = await fetch(`${API_URL}/notification/mark-as-read`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ notificationId, role }),
                });

                if (!response.ok) {
                    throw new Error(`요청 실패: ${response.statusText}`);
                }

                // UI에서 읽은 알림 제거
                item.remove();

                // 읽지 않은 알림 개수 업데이트
                const unreadCount = document.querySelectorAll(".notification-item.unread").length;
                const notificationBadge = document.getElementById("notificationBadge");

                if (unreadCount > 0) {
                    notificationBadge.textContent = unreadCount;
                    notificationBadge.style.display = "inline-block";
                } else {
                    notificationBadge.style.display = "none";
                    notificationDropdown.innerHTML = `<p class="no-notifications">알림이 없습니다.</p>`;
                }
            } catch (error) {
                console.error("알림 읽음 처리 중 오류 발생:", error);
            }
        });
    });
}









// 프로필 드롭다운 토글
function togglePopup() {
    const popup = document.getElementById('header-profile-popup');
    if (popup) {
        popup.style.display = popup.style.display === 'block' ? 'none' : 'block';
    } else {
        console.error('Header profile popup element not found!');
    }
}


// 팝업 외부를 클릭하면 닫히도록 설정
document.addEventListener('click', function (event) {
    const popup = document.getElementById('header-profile-popup');
    const profileIcon = document.getElementById('profile-icon');
    if (popup && !popup.contains(event.target) && !profileIcon.contains(event.target)) {
        popup.style.display = 'none';
    }
});















// 프로필 수정 팝업 열기
function openProfilePopup() {
    const popup = document.getElementById('profile-popup-container');
    const passwordSection = document.getElementById('profile-popup-password-section');
    const profileSection = document.getElementById('profile-popup-profile-section');
    const saveButton = document.getElementById('profile-popup-save-button');

    if (!popup) {
        console.error('Profile popup container not found!');
        return;
    }
    if (!passwordSection) {
        console.error('Password section not found!');
        return;
    }
    if (!profileSection) {
        console.error('Profile section not found!');
        return;
    }

    // 팝업 표시
    popup.style.display = 'flex';

    // 비밀번호 확인 섹션 표시
    passwordSection.style.display = 'block';
    profileSection.classList.add('hidden'); // 프로필 섹션 숨기기
    saveButton.disabled = true; // 저장 버튼 비활성화

    // 이름과 프로필 이미지 필드 비활성화
    const nameField = document.getElementById('profile-popup-user-name');
    const profileImageInput = document.getElementById('profile-popup-profile-image-input');
    if (nameField) nameField.disabled = true;
    if (profileImageInput) profileImageInput.disabled = true;

    // 비밀번호 입력 필드 초기화
    const passwordInput = document.getElementById('password-input');
    const errorMessage = document.getElementById('profile-popup-error-message');
    if (passwordInput) {
        passwordInput.value = ''; // 입력 값 초기화
    } else {
        console.error('Password input field not found!');
    }
    if (errorMessage) {
        errorMessage.classList.add('hidden'); // 에러 메시지 숨기기
    } else {
        console.error('Error message element not found!');
    }

    // 사용자 프로필 데이터 로드
    loadUserProfile();

}


// 프로필 수정 팝업 닫기
function closeProfilePopup() {
    const popup = document.getElementById('profile-popup-container');
    if (popup) {
        popup.style.display = 'none'; // 팝업 숨기기
    } else {
        console.error('Profile popup container not found!');
    }
}













// 프로필 이미지 선택창 열기
function changeProfileImage() {
    const fileInput = document.getElementById('profile-popup-profile-image-input');
    fileInput.click(); // 숨겨진 파일 입력 필드 클릭
}

// 선택된 파일로 프로필 이미지 미리보기 업데이트
function updateProfilePreview() {
    const fileInput = document.getElementById('profile-popup-profile-image-input');
    const previewImg = document.getElementById('profile-popup-profile-preview-img');

    if (fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];

        // 파일 형식 검증
        if (!file.type.startsWith('image/')) {
            alert('이미지 파일만 선택 가능합니다.');
            fileInput.value = ''; // 잘못된 파일 초기화
            return;
        }

        const reader = new FileReader();
        reader.onload = function (e) {
            previewImg.src = e.target.result; // 이미지 미리보기 업데이트
        };

        reader.readAsDataURL(file);
    }
}











// 사용자 프로필 데이터를 서버에서 가져와 폼 초기화
function loadUserProfile() {
    const userIdx = sessionStorage.getItem("userIdx");

    if (!userIdx) {
        alert("로그인 정보가 유효하지 않습니다. 다시 로그인해주세요.");
        window.location.href = "../users/login.html";
        return;
    }

    $.ajax({
        url: `${API_URL}/users/profile/${userIdx}`,
        type: 'GET',
        success: (response) => {

            if (response.message === '프로필 로드 성공') {
                // 데이터에서 이름과 프로필 이미지 확인
                const user_name = response.data.user_name || '이름 없음';
                const user_profile_image = response.data.user_profile_image || '../profile/default-profile.png';

                // 입력 필드와 미리보기 초기화
                const nameField = document.getElementById('profile-popup-user-name');
                const previewImg = document.getElementById('profile-popup-profile-preview-img');

                if (nameField) {
                    nameField.value = user_name;
                } else {
                    console.error('Name field element not found!');
                }

                if (previewImg) {
                    previewImg.src = user_profile_image;
                } else {
                    console.error('Profile image element not found!');
                }

            } else {
                alert('프로필 데이터를 불러오는데 실패했습니다.');
            }
        },
        error: (error) => {
            console.error("Error loading profile:", error);
            alert('서버 통신 오류로 프로필을 불러올 수 없습니다.');
        }
    });
}


function saveProfilePopup() {
    const fileInput = document.getElementById('profile-popup-profile-image-input');
    const userName = document.getElementById('profile-popup-user-name');
    const userIdx = sessionStorage.getItem("userIdx");


    if (!userIdx) {
        alert("로그인 정보가 유효하지 않습니다. 다시 로그인해주세요.");
        window.location.href = "../users/login.html";
        return;
    }

    if (!userName) {
        console.error("User name input field not found!");
        alert("사용자 이름 필드를 찾을 수 없습니다.");
        return;
    }

    if (!fileInput) {
        console.error("File input field not found!");
        alert("프로필 이미지 업로드 필드를 찾을 수 없습니다.");
        return;
    }

    if (!userName.value.trim()) {
        alert("사용자 이름을 입력해주세요.");
        userName.focus();
        return;
    }

    const formData = new FormData();
    formData.append('user_idx', userIdx);
    formData.append('user_name', userName.value);

    // 파일이 선택된 경우에만 업로드
    if (fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];

        // 파일 형식 확인
        if (!file.type.startsWith('image/')) {
            alert('이미지 파일만 업로드할 수 있습니다.');
            return;
        }

        formData.append('user_profile_image', file);
    }

    // 서버로 데이터 전송
    $.ajax({
        url: `${API_URL}/users/profile-setting`,
        type: 'POST',
        processData: false,
        contentType: false,
        data: formData,
        success: (response) => {

            if (response.message === '프로필이 성공적으로 수정되었습니다.') {
                alert('변경사항이 저장되었습니다.');

                // 프로필 이미지 미리보기 업데이트
                if (response.data?.user_profile_image) {
                    const previewImg = document.getElementById('profile-popup-profile-preview-img');
                    if (previewImg) {
                        previewImg.src = response.data.user_profile_image;
                    }
                }

                // 페이지 리디렉션 또는 팝업 닫기
                window.location.href = '../users/profile-main.html';
            } else {
                alert(response.message || '프로필 수정에 실패했습니다.');
            }
        },
        error: (error) => {
            console.error("Error updating profile:", error);
            alert('서버 통신 오류로 프로필을 수정할 수 없습니다.');
        }
    });
}




function checkingPassword() {
    const userPassword = document.getElementById('password-input'); // 비밀번호 입력 필드 가져오기
    const errorMessage = document.getElementById('profile-popup-error-message');

    if (!userIdx) {
        alert("로그인 정보가 유효하지 않습니다. 다시 로그인해주세요.");
        window.location.href = "../users/login.html";
        return;
    }

    // AJAX 요청 보내기
    $.ajax({
        url: `${API_URL}/users/password-verify`, // 서버에서 비밀번호 확인 API
        method: "POST",
        contentType: 'application/json',
        data: JSON.stringify({
            user_idx: userIdx, // 사용자 ID
            user_password: userPassword.value // 입력된 비밀번호
        }),
        success: function (response) {
            if (response.message === '비밀번호 확인 완료.') {
                // 저장 버튼 활성화
                const saveButton = document.getElementById('profile-popup-save-button');
                if (saveButton) {
                    saveButton.disabled = false;
                }

                // 이름과 프로필 이미지 필드 활성화
                const nameField = document.getElementById('profile-popup-user-name');
                const profileImageInput = document.getElementById('profile-popup-profile-image-input');
                if (nameField) nameField.disabled = false;
                if (profileImageInput) profileImageInput.disabled = false;

                // 프로필 섹션 표시
                const profileSection = document.getElementById('profile-popup-profile-section');
                if (profileSection) {
                    profileSection.classList.remove('hidden'); // 프로필 섹션 표시
                }

                // 비밀번호 확인 섹션 숨기기
                const passwordSection = document.getElementById('profile-popup-password-section');
                if (passwordSection) {
                    passwordSection.style.display = 'none';
                }

                alert('비밀번호 확인이 완료되었습니다.');
            } else if (response.message === '비밀번호가 잘못되었습니다.') {
                // 에러 메시지 표시 및 입력 필드 초기화
                errorMessage.classList.remove('hidden');
                userPassword.value = ''; // 입력값 초기화
                userPassword.focus(); // 입력 필드에 포커스
            }
        },
        error: function (error) {
            console.log('오류: ', error);
            alert('서버와 통신 중 오류가 발생했습니다.');
        }
    });
}


