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


// ────────────────────────────────────────────────────────────────────────────────
// ────────────────────────────────────────────────────────────────────────────────


// 프로젝트 생성
router.post('/create', async (req, res) => {
    const { projectName, userIdx, isTeamProject } = req.body;

    // 입력값 검증
    if (!projectName || !userIdx || isTeamProject === undefined) {
        return res.status(400).json({ message: '필수 필드를 모두 입력해주세요.' });
    }

    try {
        // 프로젝트 생성 쿼리
        const [result] = await connection.promise().query(
            `INSERT INTO Projects (project_name, user_idx, is_team_project) VALUES (?, ?, ?)`,
            [projectName, userIdx, isTeamProject]
        );

        const projectId = result.insertId;

        // 팀 프로젝트인 경우 프로젝트 멤버 추가
        if (isTeamProject) {
            await connection.promise().query(
                `INSERT INTO Project_Members (project_id, user_idx, project_role_id) VALUES (?, ?, ?)`,
                [projectId, userIdx, 1] // 1: 팀장 역할
            );
        }

        res.status(201).json({
            message: '프로젝트가 성공적으로 생성되었습니다.',
            projectId: projectId,
        });
    } catch (err) {
        console.error('프로젝트 생성 오류:', err);
        res.status(500).json({ message: '프로젝트 생성 중 오류가 발생했습니다.' });
    }
});




// ────────────────────────────────────────────────────────────────────────────────
// ────────────────────────────────────────────────────────────────────────────────



module.exports = router;
