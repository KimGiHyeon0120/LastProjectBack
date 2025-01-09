const express = require('express');
const router = express.Router();
const mysql = require('mysql2');

// DB 연결 설정
const connection = mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '1234',
    database: 'project',
});


// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────


// Task 생성
router.post('/create', async (req, res) => {
    const { projectId, sprintId, taskName, description, assignedTo, status = 1, priority = '중간', dueDate } = req.body;

    if (!projectId || !taskName) {
        return res.status(400).json({ message: '프로젝트 ID와 작업 이름은 필수입니다.' });
    }

    try {
        // assignedTo가 있는 경우 사용자 확인
        if (assignedTo) {
            const [user] = await connection.promise().query(
                `SELECT user_idx FROM Users WHERE user_idx = ?`,
                [assignedTo]
            );

            if (user.length === 0) {
                return res.status(404).json({ message: '존재하지 않는 사용자입니다.' });
            }
        }

        // 작업 생성
        const [result] = await connection.promise().query(
            `INSERT INTO Tasks (project_id, sprint_id, task_name, description, assigned_to, Tasks_status_id, priority, due_date)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [projectId, sprintId || null, taskName, description || null, assignedTo || null, status, priority, dueDate || null]
        );

        res.status(201).json({
            message: '작업(Task)이 성공적으로 생성되었습니다.',
            taskId: result.insertId,
        });
    } catch (err) {
        console.error('작업 생성 오류:', err);
        res.status(500).json({ message: '작업 생성 중 오류가 발생했습니다.' });
    }
});


// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────


// Task 조회 (리스트)
router.get('/list', async (req, res) => {
    const { sprintId, projectId } = req.query;

    if (!projectId) {
        return res.status(400).json({ message: '프로젝트 ID는 필수입니다.' });
    }

    try {
        const query = `
        SELECT 
            t.task_id AS taskId, 
            t.task_name AS taskName, 
            t.description, 
            t.Tasks_status_id AS statusId,
            s.Tasks_status_name AS statusName, 
            t.priority, 
            t.due_date AS dueDate, 
            COALESCE(u.user_name, '담당자 없음') AS assignedTo
        FROM Tasks t
        LEFT JOIN Tasks_status s ON t.Tasks_status_id = s.Tasks_status_id
        LEFT JOIN Users u ON t.assigned_to = u.user_idx
        WHERE t.project_id = ? ${sprintId ? 'AND t.sprint_id = ?' : ''}
        ORDER BY t.priority DESC, t.due_date ASC;
    `;

        const params = sprintId ? [projectId, sprintId] : [projectId];
        const [tasks] = await connection.promise().query(query, params);

        res.status(200).json(tasks);
    } catch (err) {
        console.error('작업 조회 오류:', err);
        res.status(500).json({ message: '작업 조회 중 오류가 발생했습니다.' });
    }
});


// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────


// Task 수정
router.put('/update', async (req, res) => {
    const { taskId, taskName, description, assignedTo, status, priority, dueDate, changedBy } = req.body;

    console.log('Received Data:', req.body);

    if (!taskId || !changedBy) {
        return res.status(400).json({ message: '작업 ID와 변경자 ID는 필수입니다.' });
    }

    try {
        const [oldTask] = await connection.promise().query(
            `SELECT * FROM Tasks WHERE task_id = ?`,
            [taskId]
        );

        if (oldTask.length === 0) {
            return res.status(404).json({ message: '수정할 작업을 찾을 수 없습니다.' });
        }

        const oldData = oldTask[0];
        const fieldsToUpdate = [];
        const updateValues = [];

        if (taskName) {
            fieldsToUpdate.push("task_name = ?");
            updateValues.push(taskName);
        }

        if (description !== undefined) {
            fieldsToUpdate.push("description = ?");
            updateValues.push(description || null);
        }

        if (assignedTo !== undefined) {
            fieldsToUpdate.push("assigned_to = ?");
            updateValues.push(assignedTo || null);
        }

        if (status !== undefined) {
            fieldsToUpdate.push("Tasks_status_id = ?");
            updateValues.push(status);
        }

        if (priority !== undefined) {
            fieldsToUpdate.push("priority = ?");
            updateValues.push(priority);
        }

        if (dueDate !== undefined) {
            fieldsToUpdate.push("due_date = ?");
            updateValues.push(dueDate || null);
        }

        fieldsToUpdate.push("last_updated_by = ?");
        updateValues.push(changedBy);

        updateValues.push(taskId);

        console.log('Fields to Update:', fieldsToUpdate);
        console.log('Update Values:', updateValues);

        if (fieldsToUpdate.length === 1) {
            return res.status(400).json({ message: "업데이트할 데이터가 없습니다." });
        }

        const query = `
            UPDATE Tasks
            SET ${fieldsToUpdate.join(", ")}
            WHERE task_id = ?
        `;
        const [updateResult] = await connection.promise().query(query, updateValues);

        if (updateResult.affectedRows === 0) {
            return res.status(404).json({ message: '작업 업데이트에 실패했습니다.' });
        }

        res.status(200).json({ message: '작업(Task)이 성공적으로 수정되었습니다.' });
    } catch (err) {
        console.error('작업 수정 오류:', err);
        res.status(500).json({ message: '작업 수정 중 오류가 발생했습니다.' });
    }
});



// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────





// 작업상태 변경
router.put('/update_status', async (req, res) => {
    const { taskId, status, changedBy } = req.body;


    // 필수 데이터 검증
    if (!taskId || !status || !changedBy) {
        console.error('필수 데이터 누락:', { taskId, status, changedBy });
        return res.status(400).json({ message: '작업 ID, 상태 ID, 변경자 ID는 필수입니다.' });
    }

    try {
        const [task] = await connection.promise().query(
            `SELECT * FROM Tasks WHERE task_id = ?`,
            [taskId]
        );

        if (task.length === 0) {
            return res.status(404).json({ message: '작업을 찾을 수 없습니다.' });
        }

        // 작업 상태 업데이트
        const [updateResult] = await connection.promise().query(
            `UPDATE Tasks
             SET Tasks_status_id = ?, last_updated_by = ?, updated_at = CURRENT_TIMESTAMP
             WHERE task_id = ?`,
            [status, changedBy, taskId]
        );

        if (updateResult.affectedRows === 0) {
            return res.status(400).json({ message: '작업 상태 업데이트에 실패했습니다.' });
        }

        res.status(200).json({ message: '작업 상태가 성공적으로 업데이트되었습니다.' });
    } catch (err) {
        console.error('작업 상태 업데이트 오류:', err);
        res.status(500).json({ message: '작업 상태 업데이트 중 오류가 발생했습니다.' });
    }
});





// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

// Task 삭제
router.delete('/delete', async (req, res) => {
    const { taskId } = req.body;

    if (!taskId) {
        return res.status(400).json({ message: '작업 ID는 필수입니다.' });
    }

    try {
        const [result] = await connection.promise().query(
            `DELETE FROM Tasks WHERE task_id = ?`,
            [taskId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: '삭제할 작업을 찾을 수 없습니다.' });
        }

        res.status(200).json({ message: '작업(Task)이 성공적으로 삭제되었습니다.' });
    } catch (err) {
        console.error('작업 삭제 오류:', err);
        res.status(500).json({ message: '작업 삭제 중 오류가 발생했습니다.' });
    }
});


// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────


// Task 스프린트 이동
router.put('/move-sprint', async (req, res) => {
    const { taskId, newSprintId, changedBy } = req.body;

    // 필수 데이터 검증
    if (!taskId || !newSprintId || !changedBy) {
        return res.status(400).json({ message: 'taskId, newSprintId, changedBy는 필수입니다.' });
    }

    try {
        // 기존 작업 데이터 조회
        const [taskData] = await connection.promise().query(
            `SELECT sprint_id FROM Tasks WHERE task_id = ?`,
            [taskId]
        );

        if (taskData.length === 0) {
            return res.status(404).json({ message: '작업을 찾을 수 없습니다.' });
        }

        const oldSprintId = taskData[0].sprint_id;

        // 스프린트 변경
        const [updateResult] = await connection.promise().query(
            `UPDATE Tasks SET sprint_id = ?, last_updated_by = ? WHERE task_id = ?`,
            [newSprintId, changedBy, taskId]
        );

        if (updateResult.affectedRows === 0) {
            return res.status(400).json({ message: '스프린트 이동 실패: 작업이 업데이트되지 않았습니다.' });
        }

        // 변경 이력 기록
        await connection.promise().query(
            `INSERT INTO Task_History (task_id, changed_field, old_value, new_value, changed_by)
             VALUES (?, 'sprint_id', ?, ?, ?)`,
            [taskId, oldSprintId, newSprintId, changedBy]
        );

        res.status(200).json({ message: '작업(Task)이 성공적으로 스프린트를 이동했습니다.' });
    } catch (err) {
        console.error('스프린트 이동 오류:', err);
        res.status(500).json({ message: '스프린트 이동 중 오류가 발생했습니다.' });
    }
});



// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────



router.get('/status-list', async (req, res) => {
    try {
        const [statuses] = await connection.promise().query(
            `SELECT Tasks_status_id AS id, Tasks_status_name AS name FROM Tasks_status`
        );
        res.status(200).json(statuses);
    } catch (err) {
        console.error('상태 목록 조회 오류:', err);
        res.status(500).json({ message: '상태 목록 조회 중 오류가 발생했습니다.' });
    }
});


// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

router.get('/:taskId', async (req, res) => {
    const { taskId } = req.params;

    if (!taskId) {
        return res.status(400).json({ message: '작업 ID가 필요합니다.' });
    }

    try {
        const [task] = await connection.promise().query(
            'SELECT * FROM Tasks WHERE task_id = ?',
            [taskId]
        );

        if (task.length === 0) {
            return res.status(404).json({ message: '작업을 찾을 수 없습니다.' });
        }

        res.status(200).json(task[0]);
    } catch (err) {
        console.error('작업 조회 오류:', err);
        res.status(500).json({ message: '작업 조회 중 오류가 발생했습니다.' });
    }
});
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────



// 작업자 할당
router.put('/assign', async (req, res) => {
    const { taskId, assignedTo, changedBy } = req.body;

    if (!taskId || !changedBy) {
        return res.status(400).json({ message: 'taskId와 changedBy는 필수입니다.' });
    }

    try {
        // 기존 작업 데이터 확인
        const [task] = await connection.promise().query(
            `SELECT * FROM Tasks WHERE task_id = ?`,
            [taskId]
        );

        if (task.length === 0) {
            return res.status(404).json({ message: '할당할 작업을 찾을 수 없습니다.' });
        }

        // 작업 담당자 업데이트
        const [result] = await connection.promise().query(
            `UPDATE Tasks SET assigned_to = ?, last_updated_by = ? WHERE task_id = ?`,
            [assignedTo || null, changedBy, taskId]
        );

        if (result.affectedRows === 0) {
            return res.status(400).json({ message: '작업 할당에 실패했습니다.' });
        }

        res.status(200).json({ message: '작업이 성공적으로 할당되었습니다.' });
    } catch (err) {
        console.error('작업 할당 오류:', err);
        res.status(500).json({ message: '작업 할당 중 오류가 발생했습니다.' });
    }
});


// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────





// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────




module.exports = router;
