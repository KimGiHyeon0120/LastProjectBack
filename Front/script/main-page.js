document.addEventListener("DOMContentLoaded", function () {
    const buttons = document.querySelectorAll(".tap-button");
    const contentPanels = document.querySelector(".tap-panels");
    let currentIndex = 0; // 현재 활성화된 버튼 인덱스
    let slideInterval; // 슬라이드 타이머

    // 콘텐츠 로드 함수
    async function loadContent(index) {
        // 기존 활성화된 콘텐츠 삭제
        const activePanel = contentPanels.querySelector(".tap-panels-inner.active");
        if (activePanel) {
            activePanel.classList.add("exit"); // 슬라이드 아웃 애니메이션
            setTimeout(() => activePanel.remove(), 500); // 애니메이션 종료 후 삭제
        }

        // 새 콘텐츠 생성 및 추가
        const newPanel = document.createElement("div");
        newPanel.classList.add("tap-panels-inner");
        contentPanels.appendChild(newPanel);

        try {
            const button = buttons[index];
            const target = button.dataset.target;
            const url = `../main/main-sec1-div/tap-panels-${target}.html`;

            const response = await fetch(url);
            if (!response.ok) throw new Error("콘텐츠를 로드할 수 없습니다.");
            const html = await response.text();
            newPanel.innerHTML = html;

            // 새 콘텐츠 활성화
            setTimeout(() => {
                newPanel.classList.add("active");
                animateReset();
                contentPanels.classList.add('animate__animated', 'animate__fadeOutLeftBig',
                     'animate__delay-4.9s');
            }, 50);
        } catch (error) {
            newPanel.innerHTML = `<p>오류: ${error.message}</p>`;
        }

        // 버튼 상태 업데이트
        buttons.forEach((btn) => btn.classList.remove("active"));
        buttons[index].classList.add("active");
    }

    function animateReset() {
        const animate = document.querySelector(".tap-panels");
        animate.addEventListener('animationend', function () {
            animate.classList.remove('animate__animated', 'animate__fadeOutLeftBig')
        })
    }

    // 슬라이드 자동 전환
    function startSlideShow() {
        slideInterval = setInterval(() => {
            currentIndex = (currentIndex + 1) % buttons.length; // 다음 인덱스 계산
            loadContent(currentIndex);
        }, 5000); // 5초 간격
    }

    // 슬라이드 중지
    function stopSlideShow() {
        clearInterval(slideInterval);
    }

    // 초기화
    loadContent(currentIndex = 0);
    startSlideShow();

    // 버튼 클릭 이벤트
    buttons.forEach((button, index) => {
        button.addEventListener("click", function () {
            stopSlideShow(); // 슬라이드 일시 정지
            currentIndex = index; // 현재 인덱스를 클릭된 버튼으로 설정
            loadContent(currentIndex); // 콘텐츠 로드
            setTimeout(startSlideShow, 3000); // 3초 후 슬라이드 재개
        });
    });
});
