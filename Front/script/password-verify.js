const API_URL = "http://localhost:3000/api";
const userIdx = sessionStorage.getItem("userIdx");

function checkingPassword() {
    const userPassword = document.getElementById('password-input');
    console.log(userPassword);

    $.ajax({
        url: `${API_URL}/users/password-verify`, // 서버에서 사용자 정보를 가져오는 API
        method: "POST",
        contentType: 'application/json',
        data: JSON.stringify({
            user_Idx: userIdx,
            user_password: userPassword.value
        }),
        success: function (response) {
            // 성공적으로 데이터를 가져왔을 때 HTML에 반영
            console.log(response);
            if(response.message === '비밀번호 확인 완료.') {
                alert('비밀번호 인증이 완료 되었습니다.');
                window.location.href = '../project/setting_profile.html'
            }
            if(response.message === '비밀번호가 잘못 되었습니다.') {
                userPassword.value = '';
                userPassword.focus();
                alert('비밀번호가 일치하지 않습니다.');
            }

        },
        error: function (error) {
            // 오류 발생 시 처리
            console.log('오류 : ', error);
            alert('서버 통신 오류.');
        }
    });
}

// 이전 화면으로 돌아가기
function goBack() {
    window.history.back();
}