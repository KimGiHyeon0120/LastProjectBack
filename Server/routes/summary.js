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


// 1. 팀원별 작업 상태 요약
router.get('/team/tasks', (req, res) => {
    const { projectId } = req.query;

    if (!projectId) {
        return res.status(400).json({ error: 'projectId is required' });
    }

    const query = `
        SELECT 
            u.user_idx AS userIdx, -- 사용자 ID 추가
            u.user_name AS memberName,
            SUM(CASE WHEN t.Tasks_status_id = 3 THEN 1 ELSE 0 END) AS completed,
            SUM(CASE WHEN t.Tasks_status_id = 2 THEN 1 ELSE 0 END) AS inProgress,
            SUM(CASE WHEN t.Tasks_status_id = 1 THEN 1 ELSE 0 END) AS toDo
        FROM Tasks t
        JOIN Users u ON t.assigned_to = u.user_idx
        WHERE t.project_id = ?
        GROUP BY t.assigned_to;
    `;

    connection.query(query, [projectId], (error, results) => {
        if (error) {
            console.error(error);
            return res.status(500).json({ error: 'Failed to fetch team tasks' });
        }
        res.json(results);
    });
});





// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────





// 2. 전체 프로젝트 진행률
router.get('/all/tasks', async (req, res) => {
    const { projectId } = req.query;

    if (!projectId) {
        return res.status(400).json({ error: "projectId is required" });
    }

    const query = `
        SELECT 
            Tasks_status_id,
            COUNT(*) AS count
        FROM Tasks
        WHERE project_id = ?
        GROUP BY Tasks_status_id;
    `;

    try {
        const [results] = await connection.promise().query(query, [projectId]);

        // 상태별 작업 개수 초기화
        let completed = 0;
        let inProgress = 0;
        let toDo = 0;

        // 상태별 데이터를 results에서 추출
        results.forEach((row) => {
            if (row.Tasks_status_id === 3) completed = row.count;
            if (row.Tasks_status_id === 2) inProgress = row.count;
            if (row.Tasks_status_id === 1) toDo = row.count;
        });

        // 응답 데이터 구성
        res.json({
            completed,
            inProgress,
            toDo,
            totalTasks: completed + inProgress + toDo,
        });
    } catch (error) {
        console.error("Error executing query:", error);
        res.status(500).json({ error: "Failed to fetch task summary" });
    }
});






// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────


// 프로젝트별 스프린트 목록 가져오기
router.get('/projects/:project_id/sprints', async (req, res) => {
    const { project_id } = req.params; // 프로젝트 ID

    const query = `
        SELECT 
            sprint_id AS sprintId,
            sprint_name AS sprintName
        FROM Sprints
        WHERE project_id = ?; -- 특정 프로젝트에 속한 스프린트만 선택
    `;

    try {
        const [results] = await connection.promise().query(query, [project_id]);
        res.json(results);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch sprints for the project' });
    }
});




// 3. 스프린트별 작업량
router.get('/sprints/:sprint_id/team/tasks', async (req, res) => {
    const { sprint_id } = req.params;

    const query = `
        SELECT 
            u.user_name AS memberName, -- 팀원 이름
            COUNT(t.task_id) AS taskCount -- 팀원의 작업량
        FROM Tasks t
        JOIN Users u ON t.assigned_to = u.user_idx
        WHERE t.sprint_id = ? -- 특정 스프린트 ID
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




// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────




// 4. 마감 임박 프로젝트
router.get('/projects/urgent', async (req, res) => {
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
