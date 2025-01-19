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



// 스크립트 생성
router.post('/create', async (req, res) => {
    const { projectId, sprintName, startDate, endDate } = req.body;

    // 입력값 검증
    if (!projectId || !sprintName) {
        return res.status(400).json({ message: '필수 필드를 모두 입력해주세요.' });
    }


    try {
        // 스크립트 생성
        const [result] = await connection.promise().query(
            `INSERT INTO Sprints (project_id, sprint_name) VALUES (?, ?)`,
            [projectId, sprintName]
        );

        res.status(201).json({
            message: '스크립트가 성공적으로 생성되었습니다.',
            sprintId: result.insertId,
        });
    } catch (err) {
        console.error('스크립트 생성 오류:', err);
        res.status(500).json({ message: '스크립트 생성 중 오류가 발생했습니다.' });
    }
});




// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────



// 스크립트 조회
router.get('/list', async (req, res) => {
    const { projectId } = req.query;

    if (!projectId) {
        return res.status(400).json({ message: 'projectId를 제공해주세요.' });
    }

    try {
        const [sprints] = await connection.promise().query(
            `SELECT sprint_id AS sprintId, sprint_name AS sprintName, start_date AS startDate, end_date AS endDate
             FROM Sprints WHERE project_id = ? ORDER BY created_at DESC`,
            [projectId]
        );

        res.status(200).json(sprints);
    } catch (err) {
        console.error('스크립트 조회 오류:', err);
        res.status(500).json({ message: '스크립트 조회 중 오류가 발생했습니다.' });
    }
});



// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────



// 스크립트 수정
router.put('/update', async (req, res) => {
    const { sprintId, sprintName, startDate, endDate } = req.body;

    if (!sprintId || !sprintName) {
        return res.status(400).json({ message: '필수 필드를 모두 입력해주세요.' });
    }

    try {
        const [result] = await connection.promise().query(
            `UPDATE Sprints SET sprint_name = ?, start_date = ?, end_date = ?, updated_at = CURRENT_TIMESTAMP WHERE sprint_id = ?`,
            [sprintName, startDate, endDate, sprintId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: '수정할 스크립트를 찾을 수 없습니다.' });
        }

        res.status(200).json({ message: '스크립트가 성공적으로 수정되었습니다.' });
    } catch (err) {
        console.error('스크립트 수정 오류:', err);
        res.status(500).json({ message: '스크립트 수정 중 오류가 발생했습니다.' });
    }
});


// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────




// 스크립트 삭제
router.delete('/delete', async (req, res) => {
    const { sprintId, projectId } = req.body;

    if (!sprintId || !projectId) {
        return res.status(400).json({ message: 'sprintId와 projectId는 필수입니다.' });
    }

    try {
        // 1. Unassigned Sprint 확인 또는 생성
        const [unassignedSprint] = await connection.promise().query(
            `SELECT sprint_id FROM Sprints WHERE project_id = ? AND sprint_name = '임시저장'`,
            [projectId]
        );

        let unassignedSprintId;
        if (unassignedSprint.length === 0) {
            const [result] = await connection.promise().query(
                `INSERT INTO Sprints (project_id, sprint_name) VALUES (?, '임시저장')`,
                [projectId]
            );
            unassignedSprintId = result.insertId;
        } else {
            unassignedSprintId = unassignedSprint[0].sprint_id;
        }

        // 2. Tasks 이동
        const [taskUpdateResult] = await connection.promise().query(
            `UPDATE Tasks SET sprint_id = ? WHERE sprint_id = ?`,
            [unassignedSprintId, sprintId]
        );


        // 3. Sprint 삭제
        const [deleteResult] = await connection.promise().query(
            `DELETE FROM Sprints WHERE sprint_id = ?`,
            [sprintId]
        );

        if (deleteResult.affectedRows === 0) {
            return res.status(404).json({ message: '삭제할 스프린트를 찾을 수 없습니다.' });
        }

        res.status(200).json({
            message: '스프린트가 성공적으로 삭제되었으며 관련 작업은 "임시저장"으로 이동되었습니다.',
        });
    } catch (err) {
        console.error('스프린트 삭제 오류:', err);
        res.status(500).json({ message: '스프린트 삭제 중 오류가 발생했습니다.' });
    }
});


// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────


// 프로젝트 ID로 스프린트와 태스크 조회
router.get('/list-with-tasks', async (req, res) => {
    const { projectId } = req.query;

    if (!projectId) {
        return res.status(400).json({ message: 'projectId를 제공해주세요.' });
    }

    try {
        const [sprints] = await connection.promise().query(
            `SELECT sprint_id AS sprintId, sprint_name AS sprintName, start_date AS startDate, end_date AS endDate
             FROM Sprints WHERE project_id = ? ORDER BY created_at DESC`,
            [projectId]
        );

        for (const sprint of sprints) {
            const [tasks] = await connection.promise().query(
                `SELECT 
    t.task_id AS taskId, 
    t.task_name AS taskName, 
    t.description, 
    t.Tasks_status_id AS statusId, 
    t.priority, 
    t.due_date AS dueDate, 
    t.start_date AS startDate, 
    t.assigned_to AS assignedTo, 
    COALESCE(u.user_name, '담당자 없음') AS assignedToName, -- 담당자 이름 추가
    COALESCE(u.user_profile_image, '../profile/default-profile.png') AS assignedToImage -- 담당자 이미지 추가
FROM Tasks t
LEFT JOIN Users u ON t.assigned_to = u.user_idx -- Users 테이블과 연결
WHERE t.sprint_id = ?;`,
                [sprint.sprintId]
            );

            // 우선순위 자동 설정
            const now = new Date();
            tasks.forEach(task => {
                if (task.dueDate) {
                    const dueDate = new Date(task.dueDate);
                    const daysLeft = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24)); // 날짜 차이 계산

                    if (daysLeft <= 1) {
                        task.priority = '긴급';
                    } else if (daysLeft <= 3) {
                        task.priority = '높음';
                    } else if (daysLeft <= 5) {
                        task.priority = '중간';
                    } else if (daysLeft <= 7) {
                        task.priority = '낮음';
                    } else {
                        task.priority = '낮음';
                    }
                }
            });

            sprint.tasks = tasks; // 스프린트에 태스크 추가
        }

        res.status(200).json(sprints);
    } catch (err) {
        console.error('스프린트와 태스크 조회 오류:', err);
        res.status(500).json({ message: '스프린트와 태스크 조회 중 오류가 발생했습니다.' });
    }
});



// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────


router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await connection.promise().query(
            `SELECT sprint_name AS sprintName, start_date AS startDate, end_date AS endDate
             FROM Sprints WHERE sprint_id = ?`, [id]
        );

        if (result.length === 0) {
            return res.status(404).json({ message: "스프린트를 찾을 수 없습니다." });
        }

        res.status(200).json(result[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "스프린트 데이터 조회 중 오류가 발생했습니다." });
    }
});

// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────







module.exports = router;
