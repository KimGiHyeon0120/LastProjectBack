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

// ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

// 1. 알림 생성
router.post('/create', async (req, res) => {
    const { userId, message, relatedProjectId, relatedTaskId } = req.body;

    // 필수 데이터 검증
    if (!userId || !message) {
        return res.status(400).json({ message: '필수 데이터를 입력해주세요.' });
    }

    try {
        // 알림 데이터 생성
        await connection.promise().query(
            `INSERT INTO Notifications (user_idx, message, related_project_id, related_task_id, is_read, created_at)
             VALUES (?, ?, ?, ?, 0, CURRENT_TIMESTAMP)`,
            [userId, message, relatedProjectId || null, relatedTaskId || null]
        );

        res.status(201).json({ message: '알림이 성공적으로 생성되었습니다.' });
    } catch (err) {
        console.error('알림 생성 오류:', err);
        res.status(500).json({ message: '알림 생성 중 오류가 발생했습니다.' });
    }
});




// ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────



// 2. 알림 조회
router.get('/notifications', async (req, res) => {
    const { userId } = req.query;

    // 필수 데이터 검증
    if (!userId) {
        return res.status(400).json({ message: '사용자 ID는 필수입니다.' });
    }

    try {
        // 사용자 알림 데이터 조회
        const [notifications] = await connection.promise().query(
            `SELECT n.notification_id, n.message, n.related_project_id, n.related_task_id, 
                    n.is_read, n.created_at, 
                    t.task_name, p.project_name
             FROM Notifications n
             LEFT JOIN Tasks t ON n.related_task_id = t.task_id
             LEFT JOIN Projects p ON n.related_project_id = p.project_id
             WHERE n.user_idx = ?
             ORDER BY n.created_at DESC`,
            [userId]
        );

        res.status(200).json(notifications);
    } catch (err) {
        console.error('알림 조회 오류:', err);
        res.status(500).json({ message: '알림 조회 중 오류가 발생했습니다.' });
    }
});




// ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────



// 3. 읽지 않은 알림 조회
router.get('/unread', async (req, res) => {
    const { userId } = req.query;

    // 필수 데이터 검증
    if (!userId) {
        return res.status(400).json({ message: '사용자 ID는 필수입니다.' });
    }

    try {
        // 읽지 않은 알림 데이터 조회
        const [unreadNotifications] = await connection.promise().query(
            `SELECT n.notification_id, n.message, n.related_project_id, n.related_task_id, 
                    n.is_read, n.created_at, 
                    t.task_name, p.project_name
             FROM Notifications n
             LEFT JOIN Tasks t ON n.related_task_id = t.task_id
             LEFT JOIN Projects p ON n.related_project_id = p.project_id
             WHERE n.user_idx = ? AND n.is_read = 0
             ORDER BY n.created_at DESC`,
            [userId]
        );

        res.status(200).json(unreadNotifications);
    } catch (err) {
        console.error('읽지 않은 알림 조회 오류:', err);
        res.status(500).json({ message: '읽지 않은 알림 조회 중 오류가 발생했습니다.' });
    }
});




// ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────



// 4. 알림 읽음 상태 업데이트
router.put('/mark-as-read', async (req, res) => {
    const { notificationId } = req.body;

    // 필수 데이터 검증
    if (!notificationId) {
        return res.status(400).json({ message: '알림 ID는 필수입니다.' });
    }

    try {
        // 읽음 상태 업데이트
        await connection.promise().query(
            `UPDATE Notifications SET is_read = 1 WHERE notification_id = ?`,
            [notificationId]
        );

        res.status(200).json({ message: '알림이 읽음 상태로 업데이트되었습니다.' });
    } catch (err) {
        console.error('알림 읽음 상태 업데이트 오류:', err);
        res.status(500).json({ message: '알림 읽음 상태 업데이트 중 오류가 발생했습니다.' });
    }
});

module.exports = router;
