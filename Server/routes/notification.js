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

// ─────────────────────────────────────────────────────────────────────────────
// 작업 상태 변경 및 알림 생성
router.put('/update_status', async (req, res) => {
    const { taskId, status, changedBy } = req.body;

    if (!taskId || !status || !changedBy) {
        return res.status(400).json({ message: '작업 ID, 상태 ID, 변경자 ID는 필수입니다.' });
    }

    try {
        const [taskData] = await connection.promise().query(
            `SELECT Tasks_status_id, assigned_to, project_id FROM Tasks WHERE task_id = ?`,
            [taskId]
        );

        if (taskData.length === 0) {
            return res.status(404).json({ message: '작업을 찾을 수 없습니다.' });
        }

        const oldStatus = taskData[0].Tasks_status_id;
        const assignedTo = taskData[0].assigned_to;
        const projectId = taskData[0].project_id;

        if (oldStatus !== status) {
            await connection.promise().query(
                `UPDATE Tasks SET Tasks_status_id = ?, last_updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE task_id = ?`,
                [status, changedBy, taskId]
            );

            const notifications = [];
            if (assignedTo) {
                notifications.push([
                    assignedTo,
                    `작업 "${taskId}"의 상태가 변경되었습니다: "${oldStatus}" → "${status}"`,
                    projectId,
                    taskId,
                    0
                ]);
            }

            const [teamLeaders] = await connection.promise().query(
                `SELECT pm.user_idx FROM Project_Members pm
                 JOIN Project_Roles pr ON pm.project_role_id = pr.project_role_id
                 WHERE pm.project_id = ? AND pr.project_role_name = '팀장'`,
                [projectId]
            );

            teamLeaders.forEach(leader => {
                notifications.push([
                    leader.user_idx,
                    `프로젝트 "${projectId}"의 작업 "${taskId}" 상태가 변경되었습니다.`,
                    projectId,
                    taskId,
                    0
                ]);
            });

            if (notifications.length > 0) {
                await connection.promise().query(
                    `INSERT INTO Notifications (user_idx, message, related_project_id, related_task_id, is_read)
                     VALUES ?`,
                    [notifications]
                );
            }
        }

        res.status(200).json({ message: '작업 상태가 성공적으로 업데이트되었습니다.' });
    } catch (err) {
        console.error('작업 상태 변경 오류:', err);
        res.status(500).json({ message: '작업 상태 변경 중 오류가 발생했습니다.' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// 멘션 생성 및 알림
router.post('/mentions/send', async (req, res) => {
    const { taskId, mentionMessage, mentionedUsers, sentBy } = req.body;

    if (!taskId || !mentionMessage || !sentBy) {
        return res.status(400).json({ message: '필수 데이터를 모두 입력해주세요.' });
    }

    try {
        const mentions = mentionedUsers.map(userName => [
            taskId,
            userName,
            sentBy,
            mentionMessage
        ]);

        await connection.promise().query(
            `INSERT INTO Mentions (task_id, mentioned_user, sent_by, message)
             VALUES ?`,
            [mentions]
        );

        const notifications = mentionedUsers.map(userName => [
            userName,
            `@${sentBy}님이 작업 "${taskId}"에 멘션했습니다: ${mentionMessage}`,
            null,
            taskId,
            0
        ]);

        if (notifications.length > 0) {
            await connection.promise().query(
                `INSERT INTO Notifications (user_idx, message, related_project_id, related_task_id, is_read)
                 VALUES ?`,
                [notifications]
            );
        }

        res.status(201).json({ message: '멘션과 알림이 성공적으로 처리되었습니다.' });
    } catch (err) {
        console.error('멘션 생성 오류:', err);
        res.status(500).json({ message: '멘션 생성 중 오류가 발생했습니다.' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────

// 알림 조회 (사용자별)
router.get('/', async (req, res) => {
    const { userId, projectId } = req.query;

    if (!userId || !projectId) {
        return res.status(400).json({ message: '사용자 ID와 프로젝트 ID는 필수입니다.' });
    }

    try {
        // 팀장 여부 확인
        const [teamLeaderCheck] = await connection.promise().query(
            `SELECT pr.project_role_name 
             FROM Project_Members pm
             JOIN Project_Roles pr ON pm.project_role_id = pr.project_role_id
             WHERE pm.user_idx = ? AND pm.project_id = ?`,
            [userId, projectId]
        );

        const isTeamLeader = teamLeaderCheck.some(role => role.project_role_name === '팀장');

        // 알림 데이터 조회
        let query = `
            SELECT n.notification_id, n.message, n.related_project_id, n.related_task_id, 
                   n.is_read_by_assignee, n.read_by_team_leader, n.created_at, 
                   t.task_name, t.sprint_id, p.project_name, 
                   s.sprint_name, u.user_name AS sender_name
            FROM Notifications n
            LEFT JOIN Tasks t ON n.related_task_id = t.task_id
            LEFT JOIN Sprints s ON t.sprint_id = s.sprint_id
            LEFT JOIN Projects p ON n.related_project_id = p.project_id
            LEFT JOIN Users u ON n.sent_by = u.user_idx
        `;

        const queryParams = [];

        if (isTeamLeader) {
            query += `WHERE n.related_project_id = ? ORDER BY n.created_at DESC`;
            queryParams.push(projectId);
        } else {
            query += `WHERE n.related_project_id = ? AND n.user_idx = ? ORDER BY n.created_at DESC`;
            queryParams.push(projectId, userId);
        }

        const [notifications] = await connection.promise().query(query, queryParams);

        if (!notifications.length) {
            return res.status(404).json({ message: '알림이 없습니다.' });
        }

        res.status(200).json({ isTeamLeader, notifications });
    } catch (err) {
        console.error('알림 조회 오류:', err);
        res.status(500).json({ message: '알림 조회 중 오류가 발생했습니다.' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// 읽지 않은 알림 조회
router.get('/unread', async (req, res) => {
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).json({ message: '사용자 ID는 필수입니다.' });
    }

    try {
        const [unreadNotifications] = await connection.promise().query(
            `SELECT n.notification_id, n.message, n.related_project_id, n.related_task_id, 
                    n.is_read, n.created_at, t.task_name, p.project_name
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

// ─────────────────────────────────────────────────────────────────────────────


// 개별 알림 읽음 처리
router.put('/mark-as-read', async (req, res) => {
    const { notificationId, role } = req.body;

    // 역할 유효성 확인
    const validRoles = {
        assignee: 'is_read_by_assignee',
        team_leader: 'read_by_team_leader'
    };

    if (!notificationId || !validRoles[role]) {
        return res.status(400).json({ message: '올바른 알림 ID와 역할 정보가 필요합니다.' });
    }

    const field = validRoles[role];

    try {
        // 알림 읽음 상태 업데이트
        const [result] = await connection.promise().query(
            `UPDATE Notifications
             SET ${field} = 1
             WHERE notification_id = ?`,
            [notificationId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: '알림 ID를 찾을 수 없습니다.' });
        }

        // 업데이트된 알림 반환
        const [updatedNotification] = await connection.promise().query(
            `SELECT * FROM Notifications WHERE notification_id = ?`,
            [notificationId]
        );

        res.status(200).json({
            message: '알림이 읽음 상태로 업데이트되었습니다.',
            notification: updatedNotification[0]
        });
    } catch (err) {
        console.error('알림 읽음 처리 오류:', err);
        res.status(500).json({ message: '알림 읽음 처리 중 오류가 발생했습니다.' });
    }
});

// 모든 알림 읽음 처리
router.put('/mark-all-as-read', async (req, res) => {
    const { userId, projectId, role } = req.body;

    // 역할 유효성 확인
    const validRoles = {
        assignee: 'is_read_by_assignee',
        team_leader: 'read_by_team_leader'
    };

    if (!userId || !projectId || !validRoles[role]) {
        return res.status(400).json({ message: '사용자 ID, 프로젝트 ID, 역할 정보는 필수입니다.' });
    }

    const field = validRoles[role];

    try {
        // 모든 알림 읽음 상태 업데이트
        const [result] = await connection.promise().query(
            `UPDATE Notifications
             SET ${field} = 1
             WHERE related_project_id = ? AND user_idx = ? AND ${field} = 0`,
            [projectId, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: '읽지 않은 알림이 없습니다.' });
        }

        res.status(200).json({ message: '모든 알림이 읽음 상태로 업데이트되었습니다.' });
    } catch (err) {
        console.error('모든 알림 읽음 처리 오류:', err);
        res.status(500).json({ message: '모든 알림 읽음 처리 중 오류가 발생했습니다.' });
    }
});

module.exports = router;
