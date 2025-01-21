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
            u.user_profile_image as memberProfile,
            u.user_name AS memberName, -- 팀원 이름
             u.user_profile_image as memberProfile,
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


// 전체 스프린트 작업량
router.get('/alltasks/all', async (req, res) => {
    const projectId = req.query.projectId; // 프로젝트 ID를 쿼리 파라미터로 받음

    const query = `
        SELECT
            u.user_profile_image as memberProfile,
            u.user_name AS memberName,
            u.user_profile_image as memberProfile,
            COUNT(t.task_id) AS taskCount
        FROM Tasks t
        JOIN Users u ON t.assigned_to = u.user_idx
        WHERE t.project_id = ?
        GROUP BY t.assigned_to;
    `;

    try {
        if (!projectId) {
            console.error("프로젝트 ID가 전달되지 않았습니다.");
            return res.status(400).json({ error: "프로젝트 ID가 누락되었습니다." });
        }

        const [results] = await connection.promise().query(query, [projectId]);

        if (results.length === 0) {
            console.warn("프로젝트에 할당된 작업이 없습니다.");
            return res.json([]); // 빈 배열 반환
        }

        res.json(results);
    } catch (error) {
        console.error("SQL 실행 오류:", error);
        res.status(500).json({ error: "Failed to fetch all sprint tasks" });
    }
});


// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────




// 4. 마감 임박 프로젝트
router.get('/tasks/urgent', async (req, res) => {
    const { projectId } = req.query; // 요청에서 projectId를 받아옴
    const query = `
SELECT
    t.task_id AS taskId,
    t.task_name AS taskName,
    t.due_date AS dueDate,
    CASE
        WHEN t.due_date = CURDATE() OR t.due_date = DATE_ADD(CURDATE(), INTERVAL 1 DAY) THEN '긴급' -- 오늘 또는 내일 마감
        WHEN DATEDIFF(t.due_date, CURDATE()) <= 3 THEN '높음' -- 3일 이내 마감
        WHEN DATEDIFF(t.due_date, CURDATE()) <= 5 THEN '중간' -- 5일 이내 마감
        ELSE '낮음' -- 그 외
    END AS calculatedPriority,
    COALESCE(u.user_name, '담당자 없음') AS assignedTo,
    u.user_profile_image AS userProfile,
    COALESCE(s.sprint_name, '스프린트 없음') AS sprintName -- 스프린트 이름 추가
FROM Tasks t
LEFT JOIN Users u ON t.assigned_to = u.user_idx
LEFT JOIN Sprints s ON t.sprint_id = s.sprint_id -- Tasks 테이블과 Sprints 테이블을 JOIN하여 스프린트 이름을 가져옴
WHERE t.project_id = ? -- 특정 프로젝트 ID
  AND t.due_date <= DATE_ADD(CURDATE(), INTERVAL 5 DAY) -- 5일 이내 마감 작업
ORDER BY t.due_date ASC;
    `;

    try {
        const [results] = await connection.promise().query(query, [projectId]);
        res.json(results);
    } catch (error) {
        console.error("Error fetching urgent tasks:", error);
        res.status(500).json({ error: "Failed to fetch urgent tasks" });
    }
});


// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────



// 5. 내 작업 리스트


// 내 작업 필터링
router.get('/tasks/mytasks', async (req, res) => {
    const { userId, projectId, sprintIds } = req.query; // 사용자 ID, 프로젝트 ID, 스프린트 IDs

    if (!userId || !projectId) {
        return res.status(400).json({ error: "사용자 ID와 프로젝트 ID가 필요합니다." });
    }

    try {
        let query = `
        SELECT
            t.task_name AS taskName, -- 작업 이름
            ts.Tasks_status_name AS taskStatus, -- 작업 상태
            t.sprint_id,
            s.sprint_name,
            CASE
                WHEN t.due_date = CURDATE() OR t.due_date = DATE_ADD(CURDATE(), INTERVAL 1 DAY) THEN '긴급'
                WHEN DATEDIFF(t.due_date, CURDATE()) <= 3 THEN '높음'
                WHEN DATEDIFF(t.due_date, CURDATE()) <= 5 THEN '중간'
                ELSE '낮음'
            END AS priority, -- 우선순위
            DATE_FORMAT(t.due_date, '%Y년 %m월 %d일') AS dueDate, -- 마감일
            s.sprint_name AS sprintName, -- 스프린트 이름
            DATE_FORMAT(t.start_date, '%Y년 %m월 %d일') AS startDate -- 시작일
        FROM Tasks t
        LEFT JOIN Tasks_status ts ON t.Tasks_status_id = ts.Tasks_status_id
        LEFT JOIN Sprints s ON t.sprint_id = s.sprint_id
        WHERE t.assigned_to = ? AND t.project_id = ?`;

        let params = [userId, projectId];

        // sprintIds가 전달되면 해당 스프린트들로 필터링
        if (sprintIds) {
            // sprintIds가 배열로 제공되면 쿼리 파라미터를 처리
            const sprintIdsArray = sprintIds.split(',').map(id => parseInt(id, 10));
            if (sprintIdsArray.length === 0 || sprintIdsArray.some(isNaN)) {
                return res.status(400).json({ error: "잘못된 스프린트 ID가 포함되어 있습니다." });
            }

            query += " AND s.sprint_id IN (?)";
            params.push(sprintIdsArray);
        }

        query += " ORDER BY s.sprint_id, t.due_date ASC"; // 스프린트별로 정렬

        // 데이터베이스에서 필터링된 작업 조회
        const [tasks] = await connection.promise().query(query, params);

        // 결과 반환
        res.json(tasks);
    } catch (error) {
        console.error("Error fetching user tasks:", error);
        res.status(500).json({ error: "작업을 가져오는 중 오류가 발생했습니다." });
    }
});








// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

module.exports = router;
