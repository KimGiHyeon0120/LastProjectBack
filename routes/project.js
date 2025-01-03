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


// 프로젝트 리스트 조회
router.get('/list', async (req, res) => {
    try {
        const [projects] = await connection.promise().query(
            `SELECT * FROM Projects ORDER BY created_at DESC`
        );
        res.status(200).json(projects);
    } catch (err) {
        console.error('프로젝트 목록 조회 오류:', err);
        res.status(500).json({ message: '프로젝트 목록 조회 중 오류가 발생했습니다.' });
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


// 프로젝트 수정 (쿼리 파라미터 사용)
router.put('/update', async (req, res) => {
    const { projectId } = req.query;
    const { projectName, isTeamProject } = req.body;

    if (!projectId || !projectName || isTeamProject === undefined) {
        return res.status(400).json({ message: '필수 필드를 모두 입력해주세요.' });
    }

    try {
        const [result] = await connection.promise().query(
            `UPDATE Projects SET project_name = ?, is_team_project = ?, updated_at = CURRENT_TIMESTAMP WHERE project_id = ?`,
            [projectName, isTeamProject, projectId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: '수정할 프로젝트를 찾을 수 없습니다.' });
        }

        res.status(200).json({ message: '프로젝트가 성공적으로 수정되었습니다.' });
    } catch (err) {
        console.error('프로젝트 수정 오류:', err);
        res.status(500).json({ message: '프로젝트 수정 중 오류가 발생했습니다.' });
    }
});

// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────


// 프로젝트 삭제 (쿼리 파라미터 사용)
router.delete('/delete', async (req, res) => {
    const { projectId } = req.query;

    if (!projectId) {
        return res.status(400).json({ message: 'projectId를 제공해주세요.' });
    }

    try {
        const [result] = await connection.promise().query(
            `DELETE FROM Projects WHERE project_id = ?`,
            [projectId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: '삭제할 프로젝트를 찾을 수 없습니다.' });
        }

        res.status(200).json({ message: '프로젝트가 성공적으로 삭제되었습니다.' });
    } catch (err) {
        console.error('프로젝트 삭제 오류:', err);
        res.status(500).json({ message: '프로젝트 삭제 중 오류가 발생했습니다.' });
    }
});

// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────


module.exports = router;
