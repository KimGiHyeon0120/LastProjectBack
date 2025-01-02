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

    // MySQL 트랜잭션 시작
    connection.beginTransaction(async (err) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: '트랜잭션 시작 실패' });
        }

        try {
            // 중복 체크
            const checkQuery = `SELECT COUNT(*) AS count FROM Users WHERE user_id = ? OR user_email = ?`;
            const [checkResults] = await new Promise((resolve, reject) => {
                connection.query(checkQuery, [userId, userEmail], (err, results) => {
                    if (err) reject(err);
                    else resolve(results);
                });
            });

            if (checkResults.count > 0) {
                throw new Error('아이디 또는 이메일이 이미 사용 중입니다.');
            }

            // 비밀번호 암호화
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(userPassword, saltRounds);

            // 사용자 등록
            const insertQuery = `INSERT INTO Users (user_id, user_name, user_email, user_password, role_id) VALUES (?, ?, ?, ?, ?)`;
            await new Promise((resolve, reject) => {
                connection.query(insertQuery, [userId, userName, userEmail, hashedPassword, 2], (err, results) => {
                    if (err) reject(err);
                    else resolve(results);
                });
            });

            // 트랜잭션 커밋
            connection.commit((err) => {
                if (err) {
                    throw err;
                }
                res.status(201).json({ message: '회원가입 성공' });
            });
        } catch (err) {
            console.error(err);

            // 트랜잭션 롤백
            connection.rollback(() => {
                res.status(500).json({ message: '회원가입 실패', error: err.message });
            });
        }
    });
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


// 아이디 찾기
app.post('/auth/find-id', (req, res) => {
    const { userEmail } = req.body;

    console.log("Received email:", userEmail); // 전달된 userEmail 확인

    if (!userEmail) {
        return res.status(400).json({ message: '이메일을 입력해주세요.' });
    }

    const query = `SELECT user_id FROM Users WHERE user_email = ?`;
    connection.query(query, [userEmail], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: '아이디 찾기 실패' });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: '등록된 사용자가 없습니다.' });
        }

        res.status(200).json({ userId: results[0].user_id });
    });
});




// ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

// 비밀번호 찾기
app.post('/auth/reset-password/request', (req, res) => {
    const { userEmail } = req.body;

    if (!userEmail) {
        return res.status(400).json({ message: '이메일을 입력해주세요.' });
    }

    const query = `SELECT user_id FROM Users WHERE user_email = ?`;
    connection.query(query, [userEmail], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: '비밀번호 재설정 요청 실패' });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: '등록된 사용자가 없습니다.' });
        }

        // 비밀번호 재설정 링크 생성
        const resetLink = `http://localhost:3000/auth/reset-password?email=${userEmail}`;
        res.status(200).json({ resetLink });
    });
});





// ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────




// 비밀번호 변경
app.post('/auth/reset-password', async (req, res) => {
    const { userEmail, newPassword } = req.body;

    if (!userEmail || !newPassword) {
        return res.status(400).json({ message: '이메일과 새 비밀번호를 입력해주세요.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10); // 비밀번호 암호화

        const query = `UPDATE Users SET user_password = ? WHERE user_email = ?`;
        connection.query(query, [hashedPassword, userEmail], (err, results) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: '비밀번호 재설정 실패' });
            }

            if (results.affectedRows === 0) {
                return res.status(404).json({ message: '등록된 사용자가 없습니다.' });
            }

            res.status(200).json({ message: '비밀번호가 성공적으로 변경되었습니다.' });
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: '서버 오류 발생' });
    }
});




// ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────



//node의 기본 포트는 3000, vue, react는 기본포트 3000
app.listen(3000, function () {
    console.log('노드시작')
})