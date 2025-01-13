// HTML 로딩 후 초기화 함수
function loadHTML(url) {
    fetch(url)
        .then(response => response.text())
        .then(html => {
            document.querySelector('header').innerHTML = html;

            // 헤더 로딩 후 사이드바와 메인 영역에 대한 조정
            adjustMainMargin();

            // 사이드바 관련 추가 함수 호출 (필요 시)
            const hamburger = document.querySelector('.hamburger');
            console.log(hamburger);  // 확인: hamburger 요소가 로드되었는지

            if (hamburger) {
                hamburger.addEventListener('click', function () {
                    console.log('Hamburger clicked');  // 확인: 클릭 이벤트가 발생하는지
                    toggleNav();
                });
            }

            loadSidebarState();  // 이전 사이드바 상태 불러오기

            // header.html이 로드된 후 active 링크 강조 처리
            highlightActiveLink();
        })
        .catch(error => console.log(error));
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
document.addEventListener('DOMContentLoaded', function() {
    loadHTML("./header.html");  // header.html 파일 로드
});

