document.addEventListener("DOMContentLoaded", function () {
    const buttons = document.querySelectorAll(".tap-button");
    const contentPanels = document.querySelector(".tap-panels");
    let currentIndex = 0; // 현재 활성화된 버튼 인덱스
    let slideInterval; // 슬라이드 타이머
    let isAnimating = false; // 애니메이션 중인지 여부 확인

    // 콘텐츠 로드 함수
    async function loadContent(index) {
        if (isAnimating) return; // 애니메이션 중이면 실행하지 않음
        isAnimating = true;

        // 기존 활성화된 콘텐츠 삭제
        const activePanel = contentPanels.querySelector(".tap-panels-inner.active");
        if (activePanel) {
            activePanel.classList.add("animate__animated", "animate__fadeOutLeftBig");
            activePanel.addEventListener("animationend", function () {
                activePanel.remove();
                isAnimating = false; // 애니메이션 완료 후 상태 해제
            }, { once: true }); // 한 번만 실행
        }

        // 새 콘텐츠 생성 및 추가
        const newPanel = document.createElement("div");
        newPanel.classList.add("tap-panels-inner", "animate__animated", "animate__fadeInRightBig");
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
            newPanel.addEventListener("animationend", function () {
                newPanel.classList.add("active");
                isAnimating = false; // 애니메이션 완료 후 상태 해제
            }, { once: true });
        } catch (error) {
            newPanel.innerHTML = `<p>오류: ${error.message}</p>`;
        }

        // 버튼 상태 업데이트
        buttons.forEach((btn) => btn.classList.remove("active"));
        buttons[index].classList.add("active");
    }

    // 슬라이드 자동 전환
    function startSlideShow() {
        slideInterval = setInterval(() => {
            currentIndex = (currentIndex + 1) % buttons.length; // 다음 인덱스 계산
            loadContent(currentIndex);
        }, 5200); // 5.2초 간격
    }

    // 슬라이드 중지
    function stopSlideShow() {
        clearInterval(slideInterval);
    }

    // 초기화
    loadContent(currentIndex);
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

    const clockArtSix = `

    ________
   /       /\\
  / ----- (::\\
 /©_______®\\::\\
‖ ‖25-01-21‖ ‖::‖
‖ ‖        ‖ ‖::‖
‖ ‖__18:00_‖ ‖::‖
 \\®  ???  ©/::/
  \\ ----- (::/
   \\_______\\/
`;

    console.clear();
    console.log('Team_6pm_escaper'+clockArtSix);

});



