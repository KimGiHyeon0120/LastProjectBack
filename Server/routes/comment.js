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
// 댓글 생성
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
        res.status(201).json({ message: '댓글이 성공적으로 생성되었습니다.' });
    } catch (err) {
        console.error('댓글 생성 오류:', err);
        res.status(500).json({ message: '댓글 생성 중 오류가 발생했습니다.' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// 특정 작업(Task)에 대한 댓글 조회
router.get('/task', async (req, res) => {
    const { taskId } = req.query;

    if (!taskId) {
        return res.status(400).json({ message: '작업 ID는 필수입니다.' });
    }

    try {
        const [comments] = await connection.promise().query(
            `SELECT c.comment_id, c.project_id, c.task_id, c.commented_by, c.content, c.created_at, 
                    u.user_name AS commented_by_name
             FROM Comments c
             JOIN Users u ON c.commented_by = u.user_idx
             WHERE c.task_id = ?
             ORDER BY c.created_at DESC`,
            [taskId]
        );
        res.status(200).json(comments);
    } catch (err) {
        console.error('댓글 조회 오류:', err);
        res.status(500).json({ message: '댓글 조회 중 오류가 발생했습니다.' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// 특정 프로젝트(Project)에 대한 댓글 조회
router.get('/project', async (req, res) => {
    const { projectId } = req.query;

    if (!projectId) {
        return res.status(400).json({ message: '프로젝트 ID는 필수입니다.' });
    }

    try {
        const [comments] = await connection.promise().query(
            `SELECT c.comment_id, c.project_id, c.task_id, c.commented_by, c.content, c.created_at, 
                    u.user_name AS commented_by_name
             FROM Comments c
             JOIN Users u ON c.commented_by = u.user_idx
             WHERE c.project_id = ?
             ORDER BY c.created_at DESC`,
            [projectId]
        );
        res.status(200).json(comments);
    } catch (err) {
        console.error('댓글 조회 오류:', err);
        res.status(500).json({ message: '댓글 조회 중 오류가 발생했습니다.' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// 댓글 삭제
router.delete('/delete', async (req, res) => {
    const { commentId } = req.body;

    if (!commentId) {
        return res.status(400).json({ message: '댓글 ID는 필수입니다.' });
    }

    try {
        await connection.promise().query(
            `DELETE FROM Comments WHERE comment_id = ?`,
            [commentId]
        );
        res.status(200).json({ message: '댓글이 성공적으로 삭제되었습니다.' });
    } catch (err) {
        console.error('댓글 삭제 오류:', err);
        res.status(500).json({ message: '댓글 삭제 중 오류가 발생했습니다.' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// 댓글 수정
router.put('/update', async (req, res) => {
    const { commentId, content } = req.body;

    if (!commentId || !content) {
        return res.status(400).json({ message: '댓글 ID와 내용은 필수입니다.' });
    }

    try {
        await connection.promise().query(
            `UPDATE Comments 
             SET content = ?, updated_at = CURRENT_TIMESTAMP
             WHERE comment_id = ?`,
            [content, commentId]
        );
        res.status(200).json({ message: '댓글이 성공적으로 수정되었습니다.' });
    } catch (err) {
        console.error('댓글 수정 오류:', err);
        res.status(500).json({ message: '댓글 수정 중 오류가 발생했습니다.' });
    }
});

module.exports = router;
