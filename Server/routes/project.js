const express = require('express');
const router = express.Router();

const mysql = require('mysql2');
const connection = mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '1234',
    database: 'project',
});

connection.connect((err) => {
    if (err) {
        console.error('Database connection failed:', err.stack);
    } else {
        console.log('Connected to database for Projects');
    }
});


// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────



// 프로젝트 생성
router.post('/create', async (req, res) => {
    const { projectName, userIdx, isTeamProject } = req.body;

    if (!projectName || !userIdx || isTeamProject === undefined) {
        return res.status(400).json({ message: '필수 필드를 모두 입력해주세요.' });
    }

    try {
        // 트랜잭션 시작
        await connection.promise().query('START TRANSACTION');

        // 프로젝트 생성
        const [projectResult] = await connection.promise().query(
            `INSERT INTO Projects (project_name, user_idx, is_team_project) VALUES (?, ?, ?)`,
            [projectName, userIdx, isTeamProject]
        );

        const projectId = projectResult.insertId;

        // 팀 프로젝트인 경우 멤버 추가
        if (isTeamProject) {
            await connection.promise().query(
                `INSERT INTO Project_Members (project_id, user_idx, project_role_id) VALUES (?, ?, ?)`,
                [projectId, userIdx, 1]
            );
        }

        // 트랜잭션 커밋
        await connection.promise().query('COMMIT');

        return res.status(201).json({
            message: '프로젝트가 성공적으로 생성되었습니다.',
            projectId: projectId,
        });
    } catch (err) {
        // 트랜잭션 롤백
        await connection.promise().query('ROLLBACK');
        console.error('프로젝트 생성 오류:', err);
        return res.status(500).json({ message: '프로젝트 생성 중 오류가 발생했습니다.' });
    }
});


// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────


// 사용자별 프로젝트 조회 (소유자 + 팀원)
router.get('/list-by-user', async (req, res) => {
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).json({ message: '사용자 ID는 필수입니다.' });
    }

    try {
        const [projects] = await connection.promise().query(
            `
            SELECT DISTINCT 
                p.project_id AS projectId,
                p.project_name AS projectName,
                p.is_team_project AS isTeamProject,
                p.created_at AS createdAt
            FROM Projects p
            INNER JOIN Project_Members pm ON p.project_id = pm.project_id
            WHERE p.user_idx = ? OR pm.user_idx = ?
            ORDER BY p.created_at DESC
            `,
            [userId, userId]
        );

        if (projects.length === 0) {
            return res.status(404).json({ message: '사용자가 참여한 프로젝트가 없습니다.' });
        }

        res.status(200).json(projects);
    } catch (err) {
        console.error('사용자별 프로젝트 목록 조회 오류:', err);
        res.status(500).json({ message: '사용자별 프로젝트 목록 조회 중 오류가 발생했습니다.' });
    }
});



// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────


// 프로젝트 조회 (쿼리 파라미터 사용)
router.get('/view', async (req, res) => {
    const { projectId } = req.query;

    if (!projectId) {
        return res.status(400).json({ message: 'projectId를 제공해주세요.' });
    }

    try {
        const [project] = await connection.promise().query(
            `SELECT * FROM Projects WHERE project_id = ?`,
            [projectId]
        );

        if (project.length === 0) {
            return res.status(404).json({ message: '존재하지 않는 프로젝트입니다.' });
        }

        res.status(200).json(project[0]);
    } catch (err) {
        console.error('프로젝트 조회 오류:', err);
        res.status(500).json({ message: '프로젝트 조회 중 오류가 발생했습니다.' });
    }
});

// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────


// 프로젝트 수정
router.put('/update', async (req, res) => {
    const { projectId } = req.query;
    const { projectName, isTeamProject } = req.body;

    if (!projectId || !projectName || isTeamProject === undefined) {
        return res.status(400).json({ message: '필수 필드를 모두 입력해주세요.' });
    }

    try {
        // 트랜잭션 시작
        await connection.promise().query('START TRANSACTION');

        // 프로젝트 업데이트
        const [result] = await connection.promise().query(
            `UPDATE Projects SET project_name = ?, is_team_project = ?, updated_at = CURRENT_TIMESTAMP WHERE project_id = ?`,
            [projectName, isTeamProject, projectId]
        );

        if (result.affectedRows === 0) {
            await connection.promise().query('ROLLBACK');
            return res.status(404).json({ message: '수정할 프로젝트를 찾을 수 없습니다.' });
        }

        // 개인 프로젝트로 전환 시 팀원 데이터 삭제
        if (!isTeamProject) {
            // 팀장의 ID 가져오기
            const [leader] = await connection.promise().query(
                `SELECT user_idx FROM Project_Members WHERE project_id = ? AND project_role_id = 1`,
                [projectId]
            );

            if (leader.length === 0) {
                await connection.promise().query('ROLLBACK');
                return res.status(404).json({ message: '팀장을 찾을 수 없습니다.' });
            }

            const leaderId = leader[0].user_idx;

            // 팀원들의 작업을 팀장에게 할당
            await connection.promise().query(
                `UPDATE Tasks SET assigned_to = ? WHERE project_id = ? AND assigned_to IS NOT NULL`,
                [leaderId, projectId]
            );

            // 팀원 데이터 삭제
            await connection.promise().query(
                `DELETE FROM Project_Members WHERE project_id = ? AND project_role_id != 1`,
                [projectId]
            );
        }

        // 트랜잭션 커밋
        await connection.promise().query('COMMIT');

        res.status(200).json({ message: '프로젝트가 성공적으로 수정되었습니다.' });
    } catch (err) {
        console.error('프로젝트 수정 오류:', err);
        await connection.promise().query('ROLLBACK');
        res.status(500).json({ message: '프로젝트 수정 중 오류가 발생했습니다.' });
    }
});



// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────


// 프로젝트 삭제
router.delete('/delete', async (req, res) => {
    const { projectId } = req.query;

    if (!projectId) {
        return res.status(400).json({ message: 'projectId를 제공해주세요.' });
    }

    try {
        // 트랜잭션 시작
        await connection.promise().query('START TRANSACTION');

        // 관련 데이터 삭제
        await connection.promise().query(`DELETE FROM Tasks WHERE project_id = ?`, [projectId]);
        await connection.promise().query(`DELETE FROM Sprints WHERE project_id = ?`, [projectId]);
        await connection.promise().query(`DELETE FROM Project_Members WHERE project_id = ?`, [projectId]);

        // 프로젝트 삭제
        const [result] = await connection.promise().query(
            `DELETE FROM Projects WHERE project_id = ?`,
            [projectId]
        );

        if (result.affectedRows === 0) {
            await connection.promise().query('ROLLBACK');
            return res.status(404).json({ message: '삭제할 프로젝트를 찾을 수 없습니다.' });
        }

        // 트랜잭션 커밋
        await connection.promise().query('COMMIT');

        res.status(200).json({ message: '프로젝트가 성공적으로 삭제되었습니다.' });
    } catch (err) {
        console.error('프로젝트 삭제 오류:', err);
        await connection.promise().query('ROLLBACK');
        res.status(500).json({ message: '프로젝트 삭제 중 오류가 발생했습니다.' });
    }
});


// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

// 이메일로 프로젝트 팀원 추가
router.post('/add-member', async (req, res) => {
    const { projectId, userEmail, projectRoleId } = req.body;

    if (!projectId || !userEmail || !projectRoleId) {
        return res.status(400).json({ message: '필수 필드를 모두 입력해주세요.' });
    }

    try {
        // 사용자 이메일로 존재 여부 확인
        const [user] = await connection.promise().query(
            `SELECT user_idx FROM Users WHERE user_email = ?`,
            [userEmail]
        );

        if (user.length === 0) {
            return res.status(404).json({ message: '존재하지 않는 사용자 이메일입니다.' });
        }

        const userIdx = user[0].user_idx;

        // 프로젝트 존재 여부 확인
        const [project] = await connection.promise().query(
            `SELECT project_id FROM Projects WHERE project_id = ?`,
            [projectId]
        );

        if (project.length === 0) {
            return res.status(404).json({ message: '존재하지 않는 프로젝트입니다.' });
        }

        // 중복 멤버 확인
        const [existingMember] = await connection.promise().query(
            `SELECT id FROM Project_Members WHERE project_id = ? AND user_idx = ?`,
            [projectId, userIdx]
        );

        if (existingMember.length > 0) {
            return res.status(400).json({ message: '이미 프로젝트에 추가된 사용자입니다.' });
        }

        // 프로젝트 멤버 추가
        await connection.promise().query(
            `INSERT INTO Project_Members (project_id, user_idx, project_role_id) VALUES (?, ?, ?)`,
            [projectId, userIdx, projectRoleId]
        );

        res.status(201).json({ message: '프로젝트 팀원이 성공적으로 추가되었습니다.' });
    } catch (err) {
        console.error('프로젝트 팀원 추가 오류:', err);
        res.status(500).json({ message: '프로젝트 팀원 추가 중 오류가 발생했습니다.' });
    }
});


// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────


// 팀장 넘겨주기
router.put('/transfer-leader', async (req, res) => {
    const { projectId, requesterEmail, newLeaderEmail } = req.body;

    if (!projectId || !requesterEmail || !newLeaderEmail) {
        return res.status(400).json({ message: '필수 필드를 모두 입력해주세요.' });
    }

    try {
        // 요청자(현재 사용자)의 ID 확인
        const [requester] = await connection.promise().query(
            `SELECT user_idx FROM Users WHERE user_email = ?`,
            [requesterEmail]
        );

        if (requester.length === 0) {
            return res.status(404).json({ message: '존재하지 않는 요청자 이메일입니다.' });
        }

        const requesterId = requester[0].user_idx;

        // 요청자가 팀장인지 확인
        const [requesterRole] = await connection.promise().query(
            `SELECT project_role_id FROM Project_Members WHERE project_id = ? AND user_idx = ?`,
            [projectId, requesterId]
        );

        if (requesterRole.length === 0 || requesterRole[0].project_role_id !== 1) {
            return res.status(403).json({ message: '팀장이 아니므로 권한이 없습니다.' });
        }

        // 새 팀장의 사용자 ID 확인
        const [newLeader] = await connection.promise().query(
            `SELECT user_idx FROM Users WHERE user_email = ?`,
            [newLeaderEmail]
        );

        if (newLeader.length === 0) {
            return res.status(404).json({ message: '존재하지 않는 새 팀장 이메일입니다.' });
        }

        const newLeaderId = newLeader[0].user_idx;

        // 새 팀장이 해당 프로젝트에 속해 있는지 확인
        const [newLeaderMembership] = await connection.promise().query(
            `SELECT id FROM Project_Members WHERE project_id = ? AND user_idx = ?`,
            [projectId, newLeaderId]
        );

        if (newLeaderMembership.length === 0) {
            return res.status(404).json({ message: '새 팀장이 해당 프로젝트에 속해 있지 않습니다.' });
        }

        // 트랜잭션 시작
        await connection.promise().query('START TRANSACTION');

        // 기존 팀장을 팀원으로 변경
        await connection.promise().query(
            `UPDATE Project_Members SET project_role_id = 2 WHERE project_id = ? AND user_idx = ?`,
            [projectId, requesterId]
        );

        // 새 팀장을 팀장으로 변경
        await connection.promise().query(
            `UPDATE Project_Members SET project_role_id = 1 WHERE project_id = ? AND user_idx = ?`,
            [projectId, newLeaderId]
        );

        // 트랜잭션 커밋
        await connection.promise().query('COMMIT');

        res.status(200).json({ message: '팀장 역할이 성공적으로 넘겨졌습니다.' });
    } catch (err) {
        console.error('팀장 역할 변경 오류:', err);

        // 트랜잭션 롤백
        await connection.promise().query('ROLLBACK');

        res.status(500).json({ message: '팀장 역할 변경 중 오류가 발생했습니다.' });
    }
});


// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

// 팀원 삭제
router.delete('/delete-member', async (req, res) => {
    const { projectId, requesterEmail, memberEmail } = req.body;

    if (!projectId || !requesterEmail || !memberEmail) {
        return res.status(400).json({ message: '필수 필드를 모두 입력해주세요.' });
    }

    try {
        // 요청자 ID 확인 및 권한 체크는 기존 코드 재사용
        // ...

        // 삭제할 팀원의 ID 확인
        const [member] = await connection.promise().query(
            `SELECT user_idx FROM Users WHERE user_email = ?`,
            [memberEmail]
        );
        const memberId = member[0].user_idx;

        // 팀장의 ID 가져오기
        const [leader] = await connection.promise().query(
            `SELECT user_idx FROM Project_Members WHERE project_id = ? AND project_role_id = 1`,
            [projectId]
        );
        const leaderId = leader[0].user_idx;

        // 삭제할 팀원의 작업을 팀장에게 할당
        await connection.promise().query(
            `UPDATE Tasks SET assigned_to = ? WHERE project_id = ? AND assigned_to = ?`,
            [leaderId, projectId, memberId]
        );

        // 팀원 삭제
        await connection.promise().query(
            `DELETE FROM Project_Members WHERE project_id = ? AND user_idx = ?`,
            [projectId, memberId]
        );

        res.status(200).json({ message: '프로젝트 팀원이 성공적으로 삭제되었습니다.' });
    } catch (err) {
        console.error('팀원 삭제 오류:', err);
        res.status(500).json({ message: '팀원 삭제 중 오류가 발생했습니다.' });
    }
});



// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
















module.exports = router;
