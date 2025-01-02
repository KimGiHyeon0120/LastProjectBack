const express = require('express');
const bodyParser = require('body-parser'); // body-parser 추가
const bcrypt = require('bcrypt');
const app = express();
//cors 설정 ( 모두 허용 )
const cors = require('cors')

// //cors 설정 ( 일부 허용 )
// const corsOption = {
//     origin: 'http://localhost:8080',
//     optionSuccessStatus: 200
// }

app.use(cors())

//DB 설정
const mysql = require('mysql2')
const connection = mysql.createConnection(
    {
        //key값 우리가 들어가는 곳
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: '1234',
        database: 'project'
    }
);
connection.connect();

// JSON 요청 파싱 설정
app.use(bodyParser.json()); // body-parser 사용
// 또는 app.use(express.json()); // express 내장 JSON 파싱 사용






// ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────


// 일반 회원가입
app.post('/auth/register', async (req, res) => {
    const { userId, userName, userEmail, userPassword } = req.body;

    if (!userId || !userName || !userEmail || !userPassword) {
        return res.status(400).json({ message: '모든 필드를 입력해주세요.' });
    }

    try {
        // 비밀번호 암호화
        const saltRounds = 10; // 암호화 강도 (높을수록 보안성 증가)
        const hashedPassword = await bcrypt.hash(userPassword, saltRounds);

        // 데이터베이스에 저장
        const query = `INSERT INTO Users (user_id, user_name, user_email, user_password, role_id) VALUES (?, ?, ?, ?, ?)`;
        connection.query(query, [userId, userName, userEmail, hashedPassword, 2], (err, results) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: '회원가입 실패' });
            }
            res.status(201).json({ message: '회원가입 성공' });
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: '서버 오류 발생' });
    }
});


// ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────


// 일반 로그인
app.post('/auth/login', (req, res) => {
    const { userId, userPassword } = req.body;

    // 암호화된 비밀번호를 가져오기 위해 사용자를 조회
    const query = `SELECT user_id, user_name, user_email, user_password FROM Users WHERE user_id = ?`;
    connection.query(query, [userId], async (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: '로그인 실패' });
        }
        if (results.length === 0) {
            return res.status(401).json({ message: '아이디 또는 비밀번호가 잘못되었습니다.' });
        }

        const { user_password: hashedPassword, ...userData } = results[0];

        // 평문 비밀번호와 암호화된 비밀번호 비교
        const isMatch = await bcrypt.compare(userPassword, hashedPassword);
        if (!isMatch) {
            return res.status(401).json({ message: '아이디 또는 비밀번호가 잘못되었습니다.' });
        }

        // 비밀번호가 일치하는 경우
        res.status(200).json({ message: '로그인 성공', user: userData });
    });
});



// ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────


// 비밀번호 변경
app.get('/auth/profile/:userId', (req, res) => {
    const userId = req.params.userId;
    const query = `SELECT user_id, user_name, user_email, user_profile_image FROM Users WHERE user_id = ?`;
    connection.query(query, [userId], (err, results) => {
        if (err) {
            console.error(err);
            res.status(500).json({ message: '프로필 조회 실패' });
        } else if (results.length === 0) {
            res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
        } else {
            res.status(200).json(results[0]);
        }
    });
});




// ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────



//node의 기본 포트는 3000, vue, react는 기본포트 3000
app.listen(3000, function () {
    console.log('노드시작')
})