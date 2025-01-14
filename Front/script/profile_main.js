 
const API_URL = "http://192.168.20.37:3000/api";
const userId = sessionStorage.getItem("userIdx");

 function goToEditProfile() {
    // profile-edit.html로 이동
    window.location.href = '../project/password-verify.html';
}
 
 
 // 페이지 로드 시 사용자 정보를 가져오는 함수
 $(document).ready(function () {
    $.ajax({
        url: `${API_URL}/project/profile-user`, // 서버에서 사용자 정보를 가져오는 API
        method: "GET",
        data: {userId},
        success: function (data) {
            // 성공적으로 데이터를 가져왔을 때 HTML에 반영
            $('#profile-name').text(data.name);
            $('#profile-email').text(data.email);
            $('#profile-picture').attr('src', data.profileImage || '../profile/default-profile.png');
        },
        error: function (error) {
            // 오류 발생 시 처리
            console.error('프로필 로드 오류:', error);
            alert('프로필 정보를 불러오는 중 오류가 발생했습니다.');
        }
    });
});