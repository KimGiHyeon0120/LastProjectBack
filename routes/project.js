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

    connection.beginTransaction(async (err) => {
        if (err) {
            console.error('트랜잭션 시작 실패:', err);
            return res.status(500).json({ message: '트랜잭션 시작 실패' });
        }

        try {
            // 프로젝트 생성 쿼리
            const insertProjectQuery = `INSERT INTO Projects (project_name, user_idx, is_team_project) VALUES (?, ?, ?)`;
            const [projectResult] = await new Promise((resolve, reject) => {
                connection.query(insertProjectQuery, [projectName, userIdx, isTeamProject], (err, results) => {
                    if (err) reject(err);
                    else resolve([results]);
                });
            });

            const projectId = projectResult.insertId;

            // 팀 프로젝트인 경우 팀장 추가
            if (isTeamProject) {
                const insertMemberQuery = `INSERT INTO Project_Members (project_id, user_idx, project_role_id) VALUES (?, ?, ?)`;
                await new Promise((resolve, reject) => {
                    connection.query(insertMemberQuery, [projectId, userIdx, 1], (err, results) => {
                        if (err) reject(err);
                        else resolve([results]);
                    });
                });
            }

            // 트랜잭션 커밋
            connection.commit((err) => {
                if (err) {
                    throw err;
                }
                res.status(201).json({
                    message: '프로젝트가 성공적으로 생성되었습니다.',
                    projectId: projectId,
                });
            });
        } catch (err) {
            console.error('프로젝트 생성 오류:', err);

            // 트랜잭션 롤백
            connection.rollback(async () => {
                res.status(500).json({ message: '프로젝트 생성 실패', error: err.message });
            });
        }
    });
});



// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────


module.exports = router;
