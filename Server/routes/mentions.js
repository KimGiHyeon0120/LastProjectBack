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
router.post('/send', async (req, res) => {
    const { taskId, mentionMessage, mentionedUsers, sentBy } = req.body;

    if (!taskId || !mentionMessage || !sentBy) {
        return res.status(400).json({ message: '필수 데이터를 모두 입력해주세요.' });
    }

    try {
        // 작업의 담당자 및 프로젝트 역할 조회
        const [taskData] = await connection.promise().query(
            `SELECT t.assigned_to AS task_owner, p.project_id
             FROM Tasks t
             JOIN Projects p ON t.project_id = p.project_id
             WHERE t.task_id = ?`,
            [taskId]
        );

        if (taskData.length === 0) {
            return res.status(404).json({ message: '작업을 찾을 수 없습니다.' });
        }

        const taskOwner = taskData[0].task_owner; // 작업 담당자
        const projectId = taskData[0].project_id; // 프로젝트 ID
        const notificationRecipients = new Set();

        // 멘션된 사용자 처리
        if (mentionedUsers && mentionedUsers.length > 0) {
            const [mentionedMemberIds] = await connection.promise().query(
                `SELECT user_idx FROM Users WHERE user_name IN (?)`,
                [mentionedUsers]
            );

            // 멘션된 사용자 추가
            mentionedMemberIds.forEach(member => notificationRecipients.add(member.user_idx));
        }

        // 작업 담당자 추가
        if (taskOwner) {
            notificationRecipients.add(taskOwner);
        }

        // 팀장 역할 추가
        const [teamLeaders] = await connection.promise().query(
            `SELECT pm.user_idx
             FROM Project_Members pm
             JOIN Project_Roles pr ON pm.project_role_id = pr.project_role_id
             WHERE pm.project_id = ? AND pr.project_role_name = '팀장'`,
            [projectId]
        );

        if (teamLeaders.length > 0) {
            teamLeaders.forEach(leader => notificationRecipients.add(leader.user_idx));
        }

        // 멘션 데이터 저장
        const mentions = Array.from(notificationRecipients).map(userId => [
            taskId,
            userId,
            sentBy,
            mentionMessage
        ]);
        await connection.promise().query(
            `INSERT INTO Mentions (task_id, mentioned_user, sent_by, message)
             VALUES ?`,
            [mentions]
        );

        // 알림 생성
        const notifications = Array.from(notificationRecipients).map(userId => [
            userId,
            `@${sentBy}님이 작업에 멘션했습니다: ${mentionMessage}`,
            null, // 프로젝트 ID
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
        console.error('멘션 및 메시지 처리 오류:', err);
        res.status(500).json({ message: '멘션 및 메시지 처리 중 오류가 발생했습니다.' });
    }
});



// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────


// 멘션 조회
router.get('/user', async (req, res) => {
    const { userId, taskId} = req.query;
    try {
        const [mentions] = await connection.promise().query(
            `SELECT m.mention_id, m.message, m.created_at, 
                    t.task_name, u.user_name AS sent_by_name
             FROM Mentions m
             LEFT JOIN Tasks t ON m.task_id = t.task_id
             JOIN Users u ON m.sent_by = u.user_idx
             WHERE m.mentioned_user = ? AND m.task_id = ?
             ORDER BY m.created_at DESC`,
            [userId, taskId]
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
