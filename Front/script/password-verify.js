const API_URL = "http://localhost:3000/api";
const userIdx = sessionStorage.getItem("userIdx");

function checkingPassword() {
    const userPassword = document.getElementById('password-input'); // 비밀번호 입력 필드 가져오기

    if (!userPassword.value) {
        alert('비밀번호를 입력해주세요.');
        userPassword.focus();
        return;
    }

    // AJAX 요청 보내기
    $.ajax({
        url: `${API_URL}/users/password-verify`, // 서버에서 비밀번호 확인 API
        method: "POST",
        contentType: 'application/json',
        data: JSON.stringify({
            user_idx: userIdx, // 사용자 ID
            user_password: userPassword.value // 입력된 비밀번호
        }),
        success: function (response) {
            console.log('응답: ', response);
            if (response.message === '비밀번호 확인 완료.') {
                alert('비밀번호 인증이 완료되었습니다.');
                window.location.href = '../project/setting_profile.html'; // 다음 페이지로 이동
            } else if (response.message === '비밀번호가 잘못되었습니다.') {
                alert('비밀번호가 일치하지 않습니다.');
                userPassword.value = ''; // 입력값 초기화
                userPassword.focus(); // 입력 필드에 포커스
            }
        },
        error: function (error) {
            console.log('오류: ', error);
            alert('서버와 통신 중 오류가 발생했습니다.');
        }
    });
}

// 이전 화면으로 돌아가기
function goBack() {
    window.history.back();
}