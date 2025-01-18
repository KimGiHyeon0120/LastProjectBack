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

// 1. 팀원별 작업 상태 요약
router.get('/team/tasks', async (req, res) => {
    const query = `
        SELECT 
            u.user_name AS memberName,
            SUM(CASE WHEN t.Tasks_status_id = 3 THEN 1 ELSE 0 END) AS completed,
            SUM(CASE WHEN t.Tasks_status_id = 2 THEN 1 ELSE 0 END) AS inProgress,
            SUM(CASE WHEN t.Tasks_status_id = 1 THEN 1 ELSE 0 END) AS toDo
        FROM Tasks t
        JOIN Users u ON t.assigned_to = u.user_idx
        GROUP BY t.assigned_to;
    `;

    try {
        const [results] = await connection.promise().query(query);
        res.json(results);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch team tasks' });
    }
});

// 2. 전체 프로젝트 진행률
router.get('/summary/team/tasks', async (req, res) => {
    const query = `
        SELECT 
            SUM(CASE WHEN t.Tasks_status_id = 3 THEN 1 ELSE 0 END) AS completed,
            SUM(CASE WHEN t.Tasks_status_id = 2 THEN 1 ELSE 0 END) AS inProgress,
            SUM(CASE WHEN t.Tasks_status_id = 1 THEN 1 ELSE 0 END) AS toDo,
            COUNT(*) AS totalTasks
        FROM Tasks t;
    `;

    try {
        const [results] = await connection.promise().query(query);
        if (results.length > 0) {
            const { completed, inProgress, toDo, totalTasks } = results[0];
            res.json({
                completed: completed,
                inProgress: inProgress,
                toDo: toDo,
                percentages: {
                    completed: ((completed / totalTasks) * 100).toFixed(2),
                    inProgress: ((inProgress / totalTasks) * 100).toFixed(2),
                    toDo: ((toDo / totalTasks) * 100).toFixed(2),
                },
            });
        } else {
            res.json({ completed: 0, inProgress: 0, toDo: 0, percentages: {} });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch task summary' });
    }
});

// 3. 스프린트별 작업량
router.get('/summary/sprints/:sprint_id/team/tasks', async (req, res) => {
    const { sprint_id } = req.params;
    const query = `
        SELECT 
            u.user_name AS memberName,
            COUNT(t.task_id) AS taskCount
        FROM Tasks t
        JOIN Users u ON t.assigned_to = u.user_idx
        WHERE t.sprint_id = ?
        GROUP BY t.assigned_to;
    `;

    try {
        const [results] = await connection.promise().query(query, [sprint_id]);
        res.json(results);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch sprint tasks' });
    }
});

// 4. 마감 임박 프로젝트
router.get('/summary/projects/urgent', async (req, res) => {
    const query = `
        SELECT 
            p.project_name AS projectName,
            p.due_date AS dueDate,
            ROUND(
                (SUM(CASE WHEN t.Tasks_status_id = 3 THEN 1 ELSE 0 END) / COUNT(t.task_id)) * 100, 2
            ) AS progress
        FROM Projects p
        LEFT JOIN Tasks t ON p.project_id = t.project_id
        WHERE p.due_date IS NOT NULL AND p.due_date > NOW()
        GROUP BY p.project_id
        ORDER BY p.due_date ASC;
    `;

    try {
        const [results] = await connection.promise().query(query);
        res.json(results);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch urgent projects' });
    }
});

module.exports = router;
