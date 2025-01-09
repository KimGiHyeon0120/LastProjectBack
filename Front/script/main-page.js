document.addEventListener("DOMContentLoaded", async function () {
    const buttons = document.querySelectorAll(".tap-button");
    const contentPanels = document.querySelector(".tap-panels");

    // 디폴트 버튼 및 콘텐츠 설정 (첫 번째 버튼 기준)
    const defaultButton = buttons[0]; // 첫 번째 버튼
    const defaultTarget = defaultButton.dataset.target; // 첫 번째 버튼의 data-target 값
    defaultButton.setAttribute("aria-selected", "true"); // 기본 활성화 상태로 설정
    defaultButton.classList.add("active"); // 활성화된 버튼 클래스 추가

    // 디폴트 콘텐츠 로드
    try {
        const defaultUrl = `../main/main-sec1-div/tap-panels-${defaultTarget}.html`; // 디폴트 HTML 파일 경로
        const defaultResponse = await fetch(defaultUrl); // 디폴트 HTML 파일 로드
        if (!defaultResponse.ok) throw new Error("기본 콘텐츠를 로드할 수 없습니다.");
        const defaultHtml = await defaultResponse.text();
        contentPanels.innerHTML = defaultHtml; // 디폴트 콘텐츠 삽입
    } catch (error) {
        contentPanels.innerHTML = `<p>오류: ${error.message}</p>`;
    }

    // 버튼 클릭 이벤트 추가
    buttons.forEach((button) => {
        button.addEventListener("click", async function () {
            // 모든 버튼의 aria-selected 속성 초기화 및 클래스 제거
            buttons.forEach((btn) => {
                btn.setAttribute("aria-selected", "false");
                btn.classList.remove("active");
            });

            // 현재 버튼 활성화
            this.setAttribute("aria-selected", "true");
            this.classList.add("active"); // 활성화된 버튼 클래스 추가

            const target = this.dataset.target; // data-target 값 가져오기
            const url = `../main/main-sec1-div/tap-panels-${target}.html`; // 로드할 HTML 파일 경로

            try {
                const response = await fetch(url); // HTML 파일 로드
                if (!response.ok) throw new Error("콘텐츠를 로드할 수 없습니다.");
                const html = await response.text();
                contentPanels.innerHTML = html; // 로드한 HTML 삽입
            } catch (error) {
                contentPanels.innerHTML = `<p>오류: ${error.message}</p>`;
            }
        });
    });
});
