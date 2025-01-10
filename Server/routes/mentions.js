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
        // 작업의 담당자 조회
        const [task] = await connection.promise().query(
            `SELECT assigned_to FROM Tasks WHERE task_id = ?`,
            [taskId]
        );

        if (task.length === 0) {
            return res.status(404).json({ message: '작업을 찾을 수 없습니다.' });
        }

        const taskOwner = task[0].assigned_to; // 작업 담당자 ID
        const notificationUsers = new Set(); // 알림 받을 사용자 ID (중복 방지)

        // 작업 담당자 추가
        if (taskOwner) {
            notificationUsers.add(taskOwner);
        }

        // 맨션된 사용자 추가
        notificationUsers.add(mentionedUser);

        // 멘션 생성
        const [mentionResult] = await connection.promise().query(
            `INSERT INTO Mentions (task_id, mentioned_user, sent_by, message)
             VALUES (?, ?, ?, ?)`,
            [taskId, mentionedUser, sentBy, message]
        );

        // 알림 메시지 생성
        const notificationMessage = `@${sentBy}님이 작업에 멘션했습니다: ${message}`;

        // 알림 생성 (중복되지 않게)
        const notifications = Array.from(notificationUsers).map(userId => [
            userId,
            notificationMessage,
            null, // 프로젝트 ID는 없으므로 null
            taskId,
            0 // 읽지 않은 상태
        ]);

        await connection.promise().query(
            `INSERT INTO Notifications (user_idx, message, related_project_id, related_task_id, is_read)
             VALUES ?`,
            [notifications]
        );

        res.status(201).json({ message: '멘션과 알림이 성공적으로 처리되었습니다.' });
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

// 멘션 읽음 상태 업데이트
router.put('/mark-as-read', async (req, res) => {
    const { mentionId, notificationId } = req.body;

    if (!mentionId && !notificationId) {
        return res.status(400).json({ message: '멘션 ID나 알림 ID가 필요합니다.' });
    }

    try {
        if (mentionId) {
            await connection.promise().query(
                `UPDATE Mentions SET is_read = 1 WHERE mention_id = ?`,
                [mentionId]
            );
        }

        if (notificationId) {
            await connection.promise().query(
                `UPDATE Notifications SET is_read = 1 WHERE notification_id = ?`,
                [notificationId]
            );
        }

        res.status(200).json({ message: '읽음 상태가 업데이트되었습니다.' });
    } catch (err) {
        console.error('읽음 상태 업데이트 오류:', err);
        res.status(500).json({ message: '읽음 상태 업데이트 중 오류가 발생했습니다.' });
    }
});


// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────







// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────


module.exports = router;
