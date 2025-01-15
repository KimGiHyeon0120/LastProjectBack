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

// 사용자 프로필 데이터를 서버에서 가져와 폼 초기화
function loadUserProfile() {
    const userIdx = sessionStorage.getItem("userIdx");
    console.log("User ID:", userIdx);

    if (!userIdx) {
        alert("로그인 정보가 유효하지 않습니다. 다시 로그인해주세요.");
        window.location.href = "../users/login.html";
        return;
    }

    $.ajax({
        url: `${API_URL}/users/profile/${userIdx}`,
        type: 'GET',
        success: (response) => {
            console.log("Profile Data:", response);

            if (response.message === '프로필 로드 성공') {
                const { user_name, user_profile_image } = response.data;

                // 입력 필드와 미리보기 초기화
                document.getElementById('user-name').value = user_name || '';
                document.getElementById('profile-preview-img').src = user_profile_image || '../profile/default-profile.png';
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

// 사용자 프로필 수정 요청
function settingProfile() {
    const fileInput = document.getElementById('profile-image-input');
    const userName = document.getElementById('user-name');
    const userIdx = sessionStorage.getItem("userIdx");
    console.log("User ID for update:", userIdx);

    if (!userIdx) {
        alert("로그인 정보가 유효하지 않습니다. 다시 로그인해주세요.");
        window.location.href = "../users/login.html";
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
        formData.append('user_profile_image', fileInput.files[0]);
    }

    $.ajax({
        url: `${API_URL}/users/profile-setting`,
        type: 'POST',
        processData: false,
        contentType: false, // FormData를 보낼 때는 contentType을 false로 설정
        data: formData,
        success: (response) => {
            console.log("Profile Update Response:", response);

            if (response.message === '프로필이 성공적으로 수정되었습니다.') {
                alert('변경사항이 저장되었습니다.');

                // 프로필 이미지 미리보기 업데이트
                if (response.user_profile_image) {
                    document.getElementById('profile-preview-img').src = response.user_profile_image;
                }

                window.location.href = '../users/profile-main.html';
            } else {
                alert('프로필 수정에 실패했습니다.');
                userName.value = '';
                fileInput.value = '';
                userName.focus();
            }
        },
        error: (error) => {
            console.error("Error updating profile:", error);
            alert('서버 통신 오류로 프로필을 수정할 수 없습니다.');
        }
    });
}

// 페이지 로드 시 프로필 데이터를 가져옴
document.addEventListener('DOMContentLoaded', loadUserProfile);
