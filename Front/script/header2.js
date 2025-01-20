function loadHeader() {
    fetch('./header2.html') // header2.html의 경로
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to load header. Status: ${response.status}`);
            }
            return response.text();
        })
        .then(html => {
            document.querySelector('header').outerHTML = html; // 현재 페이지의 <header>를 대체
        })
        .catch(error => {
            console.error("Error loading header:", error);
        });
}

// DOM 로드 완료 후 호출
document.addEventListener('DOMContentLoaded', loadHeader);