const API_URL = "http://192.168.20.37:3000/api";


// 파일 선택창을 열기 위한 함수
function changeImage() {
    const fileInput = document.getElementById('profile-image-input');
    fileInput.click(); // 숨겨진 파일 입력 필드 클릭
}

// 파일이 선택되었을 때 미리보기 업데이트 함수
function updateProfilePreview() {
    const fileInput = document.getElementById('profile-image-input');
    const previewImg = document.getElementById('profile-preview-img');

    // 파일이 선택되었는지 확인
    if (fileInput.files && fileInput.files[0]) {
        const reader = new FileReader();

        // 파일 로드 후 이미지 미리보기 업데이트
        reader.onload = function (e) {
            previewImg.src = e.target.result; // 미리보기 이미지 src 변경
        };

        reader.readAsDataURL(fileInput.files[0]); // 선택된 파일을 읽음
    }
}
