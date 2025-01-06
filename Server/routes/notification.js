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




// 알림 생성
router.post('/create', async (req, res) => {
    const { userId, message, relatedProjectId, relatedTaskId } = req.body;

    if (!userId || !message) {
        return res.status(400).json({ message: '필수 필드를 모두 입력해주세요.' });
    }

    try {
        await connection.promise().query(
            `INSERT INTO Notifications (user_id, message, related_project_id, related_task_id)
             VALUES (?, ?, ?, ?)`,
            [userId, message, relatedProjectId || null, relatedTaskId || null]
        );
        res.status(201).json({ message: '알림이 생성되었습니다.' });
    } catch (err) {
        console.error('알림 생성 오류:', err);
        res.status(500).json({ message: '알림 생성 중 오류가 발생했습니다.' });
    }
});


// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────


// 읽지 않은 알림 조회
router.get('/unread', async (req, res) => {
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).json({ message: '사용자 ID는 필수입니다.' });
    }

    try {
        const [notifications] = await connection.promise().query(
            `SELECT * FROM Notifications WHERE user_id = ? AND is_read = 0 ORDER BY created_at DESC`,
            [userId]
        );
        res.status(200).json(notifications);
    } catch (err) {
        console.error('읽지 않은 알림 조회 오류:', err);
        res.status(500).json({ message: '읽지 않은 알림 조회 중 오류가 발생했습니다.' });
    }
});


// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────



module.exports = router;
