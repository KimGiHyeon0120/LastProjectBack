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
// 업무 진행상태 데이터 API
router.get('/api/tasks', async (req, res) => {
    const query = `
        SELECT 
            t.task_name AS Task명,
            u.user_name AS 담당자명,
            ts.Tasks_status_name AS 상태
        FROM 
            Tasks t
        JOIN 
            Projects p ON t.project_id = p.project_id
        LEFT JOIN 
            Users u ON t.assigned_to = u.user_idx
        JOIN 
            Tasks_status ts ON t.Tasks_status_id = ts.Tasks_status_id
        WHERE 
            t.assigned_to IS NOT NULL;
    `;

    try {
        const [tasks] = await connection.execute(query); 
        res.json(tasks);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error fetching tasks' });
    }
});


module.exports = router;