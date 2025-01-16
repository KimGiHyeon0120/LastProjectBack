const API_URL = "http://localhost:3000/api";
const userIdx = sessionStorage.getItem("userIdx");

 function goToEditProfile() {
    // 비밀번호 확인으로 넘어감
    window.location.href = '../project/password-verify.html';
}
 
 // 페이지 로드 시 사용자 정보를 가져오는 함수
 function loadUserProfile() {
    const userIdx = sessionStorage.getItem("userIdx");
    console.log("User ID:", userIdx);

    if (!userIdx) {
        alert("로그인 정보가 유효하지 않습니다. 다시 로그인해주세요.");
        window.location.href = "../Login/login.html";
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
                document.getElementById('profile-name').value = user_name || '';
                document.getElementById('profile-picture').src = user_profile_image || '../profile/default-profile.png';
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

// 페이지 로드 시 프로필 데이터를 가져옴
document.addEventListener('DOMContentLoaded', loadUserProfile);