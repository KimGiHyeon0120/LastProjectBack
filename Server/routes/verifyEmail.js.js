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
// 이메일 전송 설정
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});





// 팀 초대
router.post("/invite", async (req, res) => {
  const { project_id, invitee_email, inviter_id } = req.body; // 클라이언트에서 전달

  if (!inviter_id || !project_id || !invitee_email) {
    return res.status(400).json({ error: "필수 데이터가 누락되었습니다." });
  }

  try {
    // 초대 정보를 데이터베이스에 저장
    const [result] = await db.query(
      `INSERT INTO Team_Invitations (project_id, inviter_id, invitee_email, status)
           VALUES (?, ?, ?, 'Pending')`,
      [project_id, inviter_id, invitee_email]
    );

    // 초대하는 사람과 초대받은 사람의 이름 조회
    const [[inviter]] = await db.query(
      `SELECT user_name FROM Users WHERE user_idx = ?`,
      [inviter_id]
    );

    const [[invitee]] = await db.query(
      `SELECT user_name, user_idx FROM Users WHERE user_email = ?`,
      [invitee_email]
    );

    // 프로젝트 이름 조회
    const [[project]] = await db.query(
      `SELECT project_name FROM Projects WHERE project_id = ?`,
      [project_id]
    );

    if (!inviter || !project) {
      return res.status(404).json({ error: "초대 데이터가 올바르지 않습니다." });
    }

    // 초대 이메일 링크 생성
    const inviteLink = `http://192.168.20.37:5500/Front/project/project-invite-accept.html?invitation_id=${result.insertId}&inviter_id=${invitee.user_idx}`;

    // 이메일 전송
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: invitee_email,
      subject: "팀 초대",
      html: `<p>${inviter.user_name}님이 프로젝트에 초대했습니다.</p>
                 <p>초대받은 사람: ${invitee ? invitee.user_name : "사용자"}님</p>
                 <p>프로젝트 이름: ${project.project_name}</p>
                 <a href="${inviteLink}">초대 수락</a>`,
    });

    res.status(200).json({ message: "초대 이메일이 전송되었습니다." });
  } catch (err) {
    console.error("초대 처리 중 오류:", err);
    res.status(500).json({ error: "초대 전송에 실패했습니다." });
  }
});








// 초대 수락
router.post('/invite/accept/:invitation_id', async (req, res) => {
  const invitationId = req.params.invitation_id; // URL에서 초대 ID 가져오기

  try {
    // 초대 정보 확인
    const [invitation] = await db.query(
      `SELECT project_id, invitee_email 
       FROM Team_Invitations 
       WHERE invitation_id = ? AND status = 'Pending'`,
      [invitationId]
    );

    if (invitation.length === 0) {
      return res.status(404).json({ error: '유효하지 않거나 이미 처리된 초대입니다.' });
    }

    const { project_id, invitee_email } = invitation[0];

    // 초대받은 사용자의 user_idx 확인
    const [invitee] = await db.query(
      `SELECT user_idx 
       FROM Users 
       WHERE user_email = ?`,
      [invitee_email]
    );

    if (invitee.length === 0) {
      return res.status(404).json({ error: '초대받은 사용자가 존재하지 않습니다.' });
    }

    const user_idx = invitee[0].user_idx;

    // 초대 상태 업데이트 (Accepted)
    await db.query(
      `UPDATE Team_Invitations 
       SET status = 'Accepted', updated_at = NOW() 
       WHERE invitation_id = ?`,
      [invitationId]
    );

    // 프로젝트에 사용자 추가
    await db.query(
      `INSERT INTO Project_Members (project_id, user_idx, project_role_id) 
       VALUES (?, ?, ?)`,
      [project_id, user_idx, 2] // role_id: 2 (팀원)
    );

    res.json({
      message: '초대가 수락되었습니다. 프로젝트에 참여하게 되었습니다.',
      project_id,
      user_idx,
    });
  } catch (err) {
    console.error('초대 수락 처리 중 오류:', err);
    res.status(500).json({ error: '초대 수락 처리 중 오류가 발생했습니다.' });
  }
});










// 초대 거절
router.post('/invite/decline/:invitation_id', async (req, res) => {
  const invitationId = req.params.invitation_id; // URL에서 초대 ID 가져오기

  try {
    // 초대 정보 확인
    const [invitation] = await db.query(
      `SELECT * 
       FROM Team_Invitations 
       WHERE invitation_id = ?`,
      [invitationId]
    );

    if (invitation.length === 0) {
      return res.status(404).json({ error: '초대 정보가 없거나 유효하지 않은 초대입니다.' });
    }

    // 초대 상태 업데이트 (Declined)
    await db.query(
      `UPDATE Team_Invitations 
       SET status = 'Declined', updated_at = NOW() 
       WHERE invitation_id = ?`,
      [invitationId]
    );

    res.json({ message: '초대가 거절되었습니다.' });
  } catch (err) {
    console.error('초대 거절 처리 중 오류:', err);
    res.status(500).json({ error: '초대 거절에 실패했습니다.' });
  }
});












// 아이디 인증 요청 처리 (아이디 존재 여부 확인)
router.post('/verify-user-id', async (req, res) => {
  const { userId } = req.body;

  try {
    // 아이디 존재 여부 확인
    const [rows] = await db.query('SELECT * FROM users WHERE user_id = ?', [userId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: '등록된 아이디가 없습니다. 다시 확인 후 입력 바랍니다.' });
    }

    // 아이디가 존재하는 경우 성공 응답
    res.json({ message: '아이디 인증 성공' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});
// 이메일 인증 코드 발송 요청 처리 (아이디 찾기)
router.post('/verify-user-id-email', async (req, res) => {
  const { email } = req.body;

  try {
    // 이메일 존재 여부 확인
    const [rows] = await db.query('SELECT * FROM users WHERE user_email = ?', [email]);
    if (rows.length === 0) {
      return res.status(400).json({ error: '해당 이메일이 존재하지 않습니다.' });  // 400으로 변경
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
      from: process.env.EMAIL_USER,
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

    res.json({ userId });
  } catch (err) {

    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;
