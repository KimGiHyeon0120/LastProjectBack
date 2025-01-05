const express = require('express');
const router = express.Router();
const mysql = require('mysql2');

// DB 연결
const connection = mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '1234',
    database: 'project',
});




// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────


// 멘션 생성
router.post('/create', async (req, res) => {
    const { taskId, mentionedUser, sentBy, message } = req.body;

    if (!taskId || !mentionedUser || !sentBy || !message) {
        return res.status(400).json({ message: '필수 필드를 모두 입력해주세요.' });
    }

    try {
        await connection.promise().query(
            `INSERT INTO Mentions (task_id, mentioned_user, sent_by, message)
             VALUES (?, ?, ?, ?)`,
            [taskId, mentionedUser, sentBy, message]
        );
        res.status(201).json({ message: '멘션이 성공적으로 생성되었습니다.' });
    } catch (err) {
        console.error('멘션 생성 오류:', err);
        res.status(500).json({ message: '멘션 생성 중 오류가 발생했습니다.' });
    }
});

// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────


// 멘션 조회
router.get('/user', async (req, res) => {
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).json({ message: '사용자 ID는 필수입니다.' });
    }

    try {
        const [mentions] = await connection.promise().query(
            `SELECT * FROM Mentions WHERE mentioned_user = ? ORDER BY created_at DESC`,
            [userId]
        );
        res.status(200).json(mentions);
    } catch (err) {
        console.error('멘션 조회 오류:', err);
        res.status(500).json({ message: '멘션 조회 중 오류가 발생했습니다.' });
    }
});

// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────


// 멘션 읽음 처리
router.put('/mark-as-read', async (req, res) => {
    const { mentionId } = req.body;

    if (!mentionId) {
        return res.status(400).json({ message: '멘션 ID는 필수입니다.' });
    }

    try {
        await connection.promise().query(
            `UPDATE Mentions SET is_read = 1 WHERE mention_id = ?`,
            [mentionId]
        );
        res.status(200).json({ message: '멘션이 읽음으로 처리되었습니다.' });
    } catch (err) {
        console.error('멘션 읽음 처리 오류:', err);
        res.status(500).json({ message: '멘션 읽음 처리 중 오류가 발생했습니다.' });
    }
});

// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────


module.exports = router;
