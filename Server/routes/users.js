const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const axios = require('axios');

// DB 연결 (server.js의 connection 객체 활용)
const mysql = require('mysql2');
const connection = mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '1234',
    database: 'project',
});


require('dotenv').config({ path: './routes/.env' }); // 정확한 경로로 수정

const {
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_LOGIN_REDIRECT_URI,
    GOOGLE_SIGNUP_REDIRECT_URI,
} = process.env;

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';


// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────


// 일반 회원가입
router.post('/register', async (req, res) => {
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
router.post('/login', (req, res) => {
    const { userId, userPassword } = req.body;

    // 암호화된 비밀번호를 가져오기 위해 사용자를 조회
    const query = `SELECT user_idx,user_id, user_name, user_email, user_password FROM Users WHERE user_id = ?`;
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
router.post('/find-id', (req, res) => {
    const { userEmail } = req.body;
    if (!userEmail) {
        return res.status(400).json({ message: '이메일을 입력해주세요.' });
    }

    const query = `SELECT user_id FROM Users WHERE user_email = ?`;
    connection.query(query, [userEmail], (err, results) => {
        if (err) {
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



// 비밀번호 변경
router.post('/reset-password', async (req, res) => {
    const { userId, newPassword } = req.body;
    console.log(userId, newPassword);  // 요청 받은 값 확인

    if (!userId || !newPassword) {
        return res.status(400).json({ success: false, message: '아이디와 새 비밀번호를 입력해주세요.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10); // 비밀번호 암호화

        const query = `UPDATE Users SET user_password = ? WHERE user_id = ?`;
        connection.query(query, [hashedPassword, userId], (err, results) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ success: false, message: '비밀번호 재설정 실패' });
            }

            if (results.affectedRows === 0) {
                return res.status(404).json({ success: false, message: '등록된 사용자가 없습니다.' });
            }

            res.status(200).json({ success: true, message: '비밀번호가 성공적으로 변경되었습니다.' });
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: '서버 오류 발생' });
    }
});


// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

// idx찾기
router.get('/get-idx', async (req, res) => {
    const { userId } = req.query;
    if (!userId) {
        return res.status(400).json({ message: 'userId는 필수입니다.' });
    }

    try {
        const [result] = await connection.promise().query(
            'SELECT user_idx FROM Users WHERE user_id = ?',
            [userId]
        );

        if (result.length === 0) {
            return res.status(404).json({ message: '해당 user_id를 찾을 수 없습니다.' });
        }

        res.status(200).json({ user_idx: result[0].user_idx });
    } catch (err) {
        console.error('user_idx 조회 오류:', err);
        res.status(500).json({ message: 'user_idx 조회 중 오류가 발생했습니다.' });
    }
});

// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────




//프로필 설정
router.post('/profile-setting', async (req, res) => {
    const { userId, userName, userEmail, userProfileImage } = req.body;

    if (!userId || (!userName && !userEmail && !userProfileImage)) {
        return res.status(400).json({ message: '수정할 필드 또는 사용자 ID가 누락되었습니다.' });
    }

    try {
        const [updated] = await User.update(
            {
                user_name: userName,
                user_email: userEmail,
                user_profile_image: userProfileImage,
            },
            {
                where: { user_idx: userId },
                individualHooks: true,
            }
        );

        if (updated === 0) {
            return res.status(404).json({ message: '해당 사용자를 찾을 수 없습니다.' });
        }

        res.status(200).json({ message: '프로필이 성공적으로 수정되었습니다.' });
    } catch (err) {
        console.error('프로필 수정 오류:', err);
        res.status(500).json({ message: '프로필 수정 중 오류가 발생했습니다.' });
    }
});






















// 구글 추가


// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────



// 메인 페이지
router.get('/', (req, res) => {
    res.send(`
        <h1>OAuth</h1>
        <a href="/google/login">Log in</a>
        <a href="/google/signup">Sign up</a>
    `);
});



// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────




// 로그인 요청
router.get('/login/google', (req, res) => {
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${GOOGLE_LOGIN_REDIRECT_URI}&response_type=code&scope=email profile`;
    res.json({ redirectUrl: url }); // Google 인증 URL 반환
});



// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────




// 회원가입 요청
router.get('/signup', (req, res) => {
    console.log('Google Signup Request Initiated');
    let url = 'https://accounts.google.com/o/oauth2/v2/auth';
    url += `?client_id=${GOOGLE_CLIENT_ID}`;
    console.log(`Client ID: ${GOOGLE_CLIENT_ID}`); // 디버깅
    url += `&redirect_uri=${GOOGLE_SIGNUP_REDIRECT_URI}`;
    console.log(`Redirect URI: ${GOOGLE_SIGNUP_REDIRECT_URI}`); // 디버깅
    url += '&response_type=code';
    url += '&scope=email profile';
    console.log(`Generated Google Auth URL: ${url}`); // 디버깅
    res.redirect(url);
});


// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────




// 로그인 리디렉션 처리
router.get('/googlelogin/redirect', async (req, res) => {
    const { code } = req.query;

    if (!code) {
        return res.status(400).send('Authorization code not provided');
    }

    try {
        // Access Token 요청
        const tokenResponse = await axios.post(GOOGLE_TOKEN_URL, {
            code,
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            redirect_uri: GOOGLE_LOGIN_REDIRECT_URI,
            grant_type: 'authorization_code',
        });

        const accessToken = tokenResponse.data.access_token;

        // Google 사용자 정보 요청
        const userInfoResponse = await axios.get(GOOGLE_USERINFO_URL, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        const { name, email, picture } = userInfoResponse.data;

        // DB에서 사용자 정보 확인 및 저장
        const checkQuery = 'SELECT * FROM Users WHERE user_email = ?';
        connection.query(checkQuery, [email], (checkErr, checkResults) => {
            if (checkErr) {
                console.error('Database error:', checkErr.message);
                return res.status(500).send('Database error occurred');
            }

            if (checkResults.length > 0) {
                // 기존 사용자 → 지정된 페이지로 이동
                return res.redirect('http://127.0.0.1:5500/Front/project/projectList.html');
            } else {
                // 새 사용자 등록 후 이동
                const insertQuery = `
                    INSERT INTO Users (user_name, user_email, user_profile_image, user_is_active, role_id)
                    VALUES (?, ?, ?, 1, 2)
                `;
                connection.query(insertQuery, [name, email, picture], (insertErr) => {
                    if (insertErr) {
                        console.error(insertErr);
                        return res.status(500).send('Database error occurred while registering user');
                    }
                    // 새 사용자도 지정된 페이지로 이동
                    return res.redirect('http://127.0.0.1:5500/Front/project/projectList.html');
                });
            }
        });
    } catch (error) {
        console.error('Error during Google login process:', error.message);
        res.status(500).send('An error occurred during the login process');
    }
});




// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────





// 회원가입 리디렉션 처리
router.get('/googlesignup/redirect', async (req, res) => {
    const { code } = req.query;
    console.log(`Google Signup Redirect Hit`);
    console.log(`Received Authorization Code: ${code}`); // 디버깅
    if (!code) {
        console.error('Authorization code not provided!');
        return res.status(400).send('No authorization code provided');
    }

    try {
        console.log('Requesting Access Token from Google...');
        const tokenResponse = await axios.post(GOOGLE_TOKEN_URL, {
            code,
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            redirect_uri: GOOGLE_SIGNUP_REDIRECT_URI,
            grant_type: 'authorization_code',
        });

        console.log('Received Access Token:', tokenResponse.data.access_token); // 디버깅
        const accessToken = tokenResponse.data.access_token;

        console.log('Requesting User Info from Google...');
        const userInfoResponse = await axios.get(GOOGLE_USERINFO_URL, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        console.log('Received User Info:', userInfoResponse.data); // 디버깅
        res.json(userInfoResponse.data);
    } catch (error) {
        console.error('Error during signup redirect:', error.message); // 디버깅
        res.status(500).send('An error occurred during the signup process');
    }
});




// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────


module.exports = router;
