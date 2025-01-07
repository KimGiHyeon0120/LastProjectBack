// dotenv 패키지를 사용하여 환경 변수 로드
require('dotenv').config();

const express = require('express');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const mysql = require('mysql2/promise');

const app = express();
app.use(express.json());

const db = mysql.createPool({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '1234',
    database: 'project',
});

// JWT 비밀키
const JWT_SECRET = process.env.JWT_SECRET; // .env 파일에서 JWT_SECRET 로드
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '1h'; // 기본값 설정

// 이메일 인증 요청 처리
app.post('/request-email-verification', async (req, res) => {
  const { email } = req.body;

  try {
    // 데이터베이스에서 이메일 확인
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(404).json({ error: '해당 이메일이 존재하지 않습니다.' });
    }

    // JWT 생성
    const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: JWT_EXPIRATION });
    const verificationLink = `http://localhost:3000/verify-email?token=${token}`;

    // 이메일 발송
    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    await transporter.sendMail({
      from: 'no-reply@example.com',
      to: email,
      subject: '이메일 인증 요청',
      text: `아래 링크를 클릭하여 이메일 인증을 완료하세요: ${verificationLink}`
    });

    res.json({ message: '인증 이메일이 발송되었습니다.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 이메일 인증 처리
app.get('/verify-email', async (req, res) => {
  const { token } = req.query;

  try {
    // JWT 검증
    const decoded = jwt.verify(token, JWT_SECRET);
    const email = decoded.email;

    // 이메일 인증 상태 업데이트
    await db.query('UPDATE users SET is_verified = 1 WHERE email = ?', [email]);

    res.send('이메일 인증이 완료되었습니다.');
  } catch (err) {
    console.error(err);
    res.status(400).send('유효하지 않거나 만료된 인증 링크입니다.');
  }
});

// 서버 시작
app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});
