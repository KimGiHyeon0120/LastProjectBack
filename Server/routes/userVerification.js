const express = require('express');
const nodemailer = require('nodemailer');
const mysql = require('mysql2/promise');
const router = express.Router();

const db = mysql.createPool({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '1234',
    database: 'project',
});

// 이메일 인증 코드 발송 요청 처리 (아이디 찾기)
router.post('/request-email-verification', async (req, res) => {
  const { email } = req.body;

  try {
    // 이메일 존재 여부 확인
    const [rows] = await db.query('SELECT * FROM users WHERE user_email = ?', [email]);
    if (rows.length === 0) {
      return res.status(404).json({ error: '해당 이메일이 존재하지 않습니다.' });
    }

    // 인증 코드 생성 (6자리 숫자)
    const verificationCode = Math.floor(100000 + Math.random() * 900000); 

    // 인증 코드 유효 시간 설정 (5분)
    const expirationTime = new Date();
    expirationTime.setMinutes(expirationTime.getMinutes() + 5);

    // 인증 코드와 만료 시간을 데이터베이스에 저장
    await db.query('UPDATE users SET verification_code = ?, verification_code_expiration = ? WHERE user_email = ?', 
    [verificationCode, expirationTime, email]);

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
      subject: '아이디 찾기 인증 코드',
      text: `아이디 찾기 인증 코드: ${verificationCode}. 5분 이내에 입력해주세요.`
    });

    res.json({ message: '인증 이메일이 발송되었습니다.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 인증 번호 확인 후 아이디 반환 (아이디 찾기)
router.post('/verify-id-code', async (req, res) => {
  const { email, verificationCode } = req.body;

  try {
    // 이메일과 인증 코드 확인 (만료되지 않은 코드만 확인)
    const [rows] = await db.query(
      'SELECT user_id FROM users WHERE user_email = ? AND verification_code = ? AND verification_code_expiration > NOW()', 
      [email, verificationCode]
    );


    if (rows.length === 0) {
      return res.status(400).json({ error: '유효하지 않거나 만료된 인증 코드입니다.' });
    }
    // 인증이 완료된 후 유저 아이디 반환
    const userId = rows[0].user_id;

    res.json({ message: `아이디 찾기 성공! 유저 아이디는: ${userId}입니다.` });
  } catch (err) {
    console.error("서버 오류:", err);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});


module.exports = router;
