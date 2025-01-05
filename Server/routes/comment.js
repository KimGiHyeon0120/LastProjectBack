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


// 코멘트 생성
router.post('/create', async (req, res) => {
    const { projectId, taskId, commentedBy, content } = req.body;

    if (!commentedBy || !content || (!projectId && !taskId)) {
        return res.status(400).json({ message: '필수 필드를 모두 입력해주세요.' });
    }

    try {
        await connection.promise().query(
            `INSERT INTO Comments (project_id, task_id, commented_by, content)
             VALUES (?, ?, ?, ?)`,
            [projectId || null, taskId || null, commentedBy, content]
        );
        res.status(201).json({ message: '코멘트가 성공적으로 생성되었습니다.' });
    } catch (err) {
        console.error('코멘트 생성 오류:', err);
        res.status(500).json({ message: '코멘트 생성 중 오류가 발생했습니다.' });
    }
});

// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────


// 코멘트 조회
router.get('/task', async (req, res) => {
    const { taskId } = req.query;

    if (!taskId) {
        return res.status(400).json({ message: '작업 ID는 필수입니다.' });
    }

    try {
        const [comments] = await connection.promise().query(
            `SELECT * FROM Comments WHERE task_id = ? ORDER BY created_at DESC`,
            [taskId]
        );
        res.status(200).json(comments);
    } catch (err) {
        console.error('코멘트 조회 오류:', err);
        res.status(500).json({ message: '코멘트 조회 중 오류가 발생했습니다.' });
    }
});

// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────



module.exports = router;

