
// HTML 로딩 후 초기화 함수
function loadHTML(url) {
    fetch(url)
        .then(response => response.text())
        .then(html => {
            // 헤더에 HTML 삽입
            document.querySelector('header').innerHTML = html;

            console.log("헤더 로드 완료");

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
        const response = await fetch(`${API_URL}/notification?userId=${userIdxh}&projectId=${projectIdh}`);
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

    // 읽지 않은 알림 개수 계산
    const unreadCount = notifications.filter(notification => notification.is_read_by_assignee === 0).length;

    // 읽지 않은 알림 개수 뱃지 표시
    if (unreadCount > 0) {
        notificationBadge.textContent = unreadCount;
        notificationBadge.style.display = "inline-block";
    } else {
        notificationBadge.style.display = "none";
    }

    // 알림 항목 렌더링
    notifications.forEach(notification => {
        const senderName = notification.sender_name || "알 수 없는 사용자";
        const taskName = notification.task_name || "작업 없음";
        const message = notification.message || "내용 없음";
        const isRead = notification.is_read_by_assignee === 1;

        notificationDropdown.innerHTML += `
            <div class="notification-item ${isRead ? "read" : "unread"}" data-id="${notification.notification_id}">
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

            // 읽음 상태 UI 업데이트
            item.classList.remove("unread");
            item.classList.add("read");

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

                // 읽음 처리 후 알림 목록 다시 로드
                fetchNotifications();
            } catch (error) {
                console.error("알림 읽음 처리 중 오류 발생:", error);

                // 읽음 처리 실패 시 UI 롤백
                item.classList.remove("read");
                item.classList.add("unread");
            }
        });
    });
}