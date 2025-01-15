const API_URL = "http://localhost:3000/api";


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

function settingProfile() {
    const fileInput = document.getElementById('profile-image-input');
    const userName = document.getElementById('user-name');
    const userIdx = sessionStorage.getItem("userIdx");


    $.ajax({
        url: `${API_URL}/users/profile-setting`,
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            user_idx: userIdx,
            user_profile_image: fileInput.value,
            user_name: userName.value
        }),
        success: (response) => {
            console.log(response);
            if(response.message === '프로필이 성공적으로 수정되었습니다.') {
                alert('변경사항이 저장 되었습니다.');
                window.location.href = '../project/profile-main.html'
            } else {
                alert('변경에 실패했습니다.')
                userName.value = '';
                fileInput.value = '../profile/default-profile.png';
                userName.focus();
            }
        }
    })
}
