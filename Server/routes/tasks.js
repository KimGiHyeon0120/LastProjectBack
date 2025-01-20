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
    const {
        projectId,
        sprintId,
        taskName,
        description,
        assignedTo,
        status = 1,
        priority = '중간',
        dueDate,
        startDate
    } = req.body;

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
            `INSERT INTO Tasks (project_id, sprint_id, task_name, description, assigned_to, Tasks_status_id, priority, due_date, start_date)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                projectId,
                sprintId || null,
                taskName,
                description || null,
                assignedTo || null, // 담당자 추가
                status,
                priority,
                dueDate || null,
                startDate || null
            ]
        );

        // 작업 생성 후 새로 추가된 작업 정보 반환
        const [newTask] = await connection.promise().query(
            `SELECT * FROM Tasks WHERE task_id = ?`,
            [result.insertId]
        );

        res.status(201).json({
            message: '작업(Task)이 성공적으로 생성되었습니다.',
            task: newTask[0]
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
        console.error('프로젝트 ID가 없습니다.');
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
            t.start_date AS startDate, 
            t.assigned_to AS assignedTo, 
            DATE_ADD(t.due_date, INTERVAL 1 DAY) AS dueDate, -- 하루 더하기
            DATE_ADD(t.start_date, INTERVAL 1 DAY) AS startDate, -- 하루 더하기
            COALESCE(u.user_name, '담당자 없음') AS assignedToName,
            COALESCE(u.user_profile_image, '../profile/default-profile.png') AS assignedToImage
        FROM Tasks t
        LEFT JOIN Tasks_status s ON t.Tasks_status_id = s.Tasks_status_id
        LEFT JOIN Users u ON t.assigned_to = u.user_idx
        WHERE t.project_id = ?
        ${sprintId ? 'AND t.sprint_id = ?' : ''}
        ORDER BY t.due_date ASC;
    `;

        const params = sprintId ? [projectId, sprintId] : [projectId];


        const [tasks] = await connection.promise().query(query, params);
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


        res.status(200).json(tasks);
    } catch (err) {
        console.error('작업 조회 오류:', err);
        res.status(500).json({ message: '작업 조회 중 오류가 발생했습니다.' });
    }
});







router.get('/list2', async (req, res) => {
    const { sprintId, projectId } = req.query;


    if (!projectId) {
        console.error('프로젝트 ID가 없습니다.');
        return res.status(400).json({ message: '프로젝트 ID는 필수입니다.' });
    }

    try {
        const query = `
SELECT 
    sp.sprint_name AS sprintName, -- 스프린트 이름
    t.task_id AS taskId, 
    t.task_name AS taskName, 
    t.description, 
    t.Tasks_status_id AS statusId,
    s.Tasks_status_name AS statusName, 
    t.priority, 
    DATE_FORMAT(DATE_ADD(t.due_date, INTERVAL 1 DAY), '%Y년 %m월 %d일') AS dueDate, -- '년 월 일' 형식
    DATE_FORMAT(DATE_ADD(t.start_date, INTERVAL 1 DAY), '%Y년 %m월 %d일') AS startDate, -- '년 월 일' 형식
    
    t.assigned_to AS assignedTo, 
    COALESCE(u.user_name, '담당자 없음') AS assignedToName,
    COALESCE(u.user_profile_image, '../profile/default-profile.png') AS assignedToImage
FROM Tasks t
LEFT JOIN Tasks_status s ON t.Tasks_status_id = s.Tasks_status_id
LEFT JOIN Users u ON t.assigned_to = u.user_idx
LEFT JOIN Sprints sp ON t.sprint_id = sp.sprint_id -- 스프린트 이름 연결
WHERE t.project_id = ?
ORDER BY t.due_date ASC; -- 스프린트 이름별 정렬
`;

        const params = sprintId ? [projectId, sprintId] : [projectId];


        const [tasks] = await connection.promise().query(query, params);


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
    const { taskId, taskName, description, assignedTo, status, priority, dueDate, startDate, changedBy } = req.body;

    if (!taskId || !changedBy) {
        console.error("필수 필드 누락: taskId 또는 changedBy");
        return res.status(400).json({ message: '작업 ID와 변경자 ID는 필수입니다.' });
    }

    try {
        // 기존 작업 데이터 조회
        const [oldTask] = await connection.promise().query(
            `SELECT * FROM Tasks WHERE task_id = ?`,
            [taskId]
        );

        if (oldTask.length === 0) {
            console.error("작업 데이터 없음:", taskId);
            return res.status(404).json({ message: '수정할 작업을 찾을 수 없습니다.' });
        }

        const oldData = oldTask[0];
        const fieldsToUpdate = [];
        const updateValues = [];
        const historyRecords = [];

        // 상태 변경
        if (status !== undefined && parseInt(status) !== parseInt(oldData.Tasks_status_id)) {
            fieldsToUpdate.push("Tasks_status_id = ?");
            updateValues.push(status);

            historyRecords.push({
                changed_field: "Tasks_status_id",
                old_value: oldData.Tasks_status_id || "null",
                new_value: status,
                log_message: `작업 상태가 '${oldData.Tasks_status_id || "없음"}'에서 '${status}'으로 변경되었습니다.`,
                log_type: "상태 변경"
            });
        }

        // 우선순위 변경
        if (priority && priority !== oldData.priority) {
            fieldsToUpdate.push("priority = ?");
            updateValues.push(priority);

            historyRecords.push({
                changed_field: "priority",
                old_value: oldData.priority || "null",
                new_value: priority,
                log_message: `작업 우선순위가 '${oldData.priority || "없음"}'에서 '${priority}'으로 변경되었습니다.`,
                log_type: "우선순위 변경"
            });
        }

        // 작업 이름 변경
        if (taskName && taskName.trim() !== oldData.task_name) {
            fieldsToUpdate.push("task_name = ?");
            updateValues.push(taskName.trim());

            historyRecords.push({
                changed_field: "task_name",
                old_value: oldData.task_name || "null",
                new_value: taskName,
                log_message: `작업 이름이 '${oldData.task_name || "없음"}'에서 '${taskName}'으로 변경되었습니다.`,
                log_type: "작업 이름 변경"
            });
        }

        // 작업 설명 변경
        if (description !== undefined && description.trim() !== oldData.description) {
            fieldsToUpdate.push("description = ?");
            updateValues.push(description.trim());

            historyRecords.push({
                changed_field: "description",
                old_value: oldData.description || "null",
                new_value: description,
                log_message: `작업 설명이 변경되었습니다.`,
                log_type: "작업 설명 변경"
            });
        }

        // 시작 날짜 변경
        if (startDate && startDate !== oldData.start_date?.toISOString().split("T")[0]) {
            fieldsToUpdate.push("start_date = ?");
            updateValues.push(startDate);

            historyRecords.push({
                changed_field: "start_date",
                old_value: oldData.start_date || "null",
                new_value: startDate,
                log_message: `작업 시작 날짜가 '${oldData.start_date}'에서 '${startDate}'으로 변경되었습니다.`,
                log_type: "날짜 변경"
            });
        }

        // 마감 날짜 변경
        if (dueDate && dueDate !== oldData.due_date?.toISOString().split("T")[0]) {
            fieldsToUpdate.push("due_date = ?");
            updateValues.push(dueDate);

            historyRecords.push({
                changed_field: "due_date",
                old_value: oldData.due_date || "null",
                new_value: dueDate,
                log_message: `작업 마감 날짜가 '${oldData.due_date}'에서 '${dueDate}'으로 변경되었습니다.`,
                log_type: "날짜 변경"
            });
        }

        // 담당자 변경
        if (assignedTo !== undefined && assignedTo !== oldData.assigned_to) {
            fieldsToUpdate.push("assigned_to = ?");
            updateValues.push(assignedTo === null ? null : assignedTo); // null 처리

            historyRecords.push({
                changed_field: "assigned_to",
                old_value: oldData.assigned_to || "null",
                new_value: assignedTo || "null", // null 처리
                log_message: `작업 담당자가 '${oldData.assigned_to || "없음"}'에서 '${assignedTo || "없음"}'으로 변경되었습니다.`,
                log_type: "담당자 변경"
            });
        }

        // 업데이트할 데이터가 없을 경우 처리
        if (fieldsToUpdate.length === 0) {
            console.error("업데이트할 데이터 없음");
            return res.status(400).json({ message: "업데이트할 데이터가 없습니다." });
        }

        // 업데이트 쿼리 생성
        fieldsToUpdate.push("last_updated_by = ?");
        updateValues.push(changedBy);
        updateValues.push(taskId);

        const query = `
            UPDATE Tasks
            SET ${fieldsToUpdate.join(", ")}
            WHERE task_id = ?
        `;

        // 업데이트 실행
        await connection.promise().query(query, updateValues);

        // 히스토리 기록
        if (historyRecords.length > 0) {
            const historyQuery = `
                INSERT INTO Task_History (task_id, changed_field, old_value, new_value, changed_by, log_message, log_type)
                VALUES ?
            `;
            const historyValues = historyRecords.map(record => [
                taskId,
                record.changed_field,
                record.old_value,
                record.new_value,
                changedBy,
                record.log_message,
                record.log_type
            ]);

            await connection.promise().query(historyQuery, [historyValues]);
        }

        res.status(200).json({
            message: '작업(Task)이 성공적으로 수정되었습니다.',
            updatedFields: fieldsToUpdate.map(field => field.split(" = ")[0]) // 업데이트된 필드 반환
        });
    } catch (err) {
        console.error('작업 수정 오류:', err);
        res.status(500).json({ message: '작업 수정 중 오류가 발생했습니다.' });
    }
});








// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────





// 작업 상태 변경
router.put('/update_status', async (req, res) => {
    const { taskId, status, changedBy } = req.body;

    if (!taskId || !status || !changedBy) {
        return res.status(400).json({ message: '작업 ID, 상태 ID, 변경자 ID는 필수입니다.' });
    }

    try {
        // 상태 ID와 상태 이름 매핑
        const statusNames = {
            1: '할 일',
            2: '진행 중',
            3: '완료'
        };

        // 기존 작업 데이터 조회 (담당자 포함)
        const [task] = await connection.promise().query(
            `SELECT Tasks_status_id, assigned_to FROM Tasks WHERE task_id = ?`,
            [taskId]
        );

        if (task.length === 0) {
            return res.status(404).json({ message: '작업을 찾을 수 없습니다.' });
        }

        const oldStatus = task[0].Tasks_status_id;
        const assignedTo = task[0].assigned_to;

        // 요청된 상태와 현재 상태가 동일한 경우 처리하지 않음
        if (parseInt(oldStatus) === parseInt(status)) {
            return res.status(200).json({
                message: '상태가 변경되지 않았습니다.',
                assignedTo: assignedTo // 담당자 정보 추가 반환
            });
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

        const oldStatusName = statusNames[oldStatus] || '없음';
        const newStatusName = statusNames[status] || '없음';

        // 변경 이력 기록
        await connection.promise().query(
            `INSERT INTO Task_History (task_id, changed_field, old_value, new_value, changed_by, log_message, log_type)
             VALUES (?, 'Tasks_status_id', ?, ?, ?, ?, ?)`,
            [
                taskId,
                oldStatusName, // 이전 상태 이름
                newStatusName, // 새로운 상태 이름
                changedBy,
                `작업 상태가 '${oldStatusName}'에서 '${newStatusName}'으로 변경되었습니다.`,
                '상태 변경'
            ]
        );

        res.status(200).json({
            message: '작업 상태가 성공적으로 업데이트되고 기록되었습니다.',
            assignedTo: assignedTo // 담당자 정보 추가 반환
        });
    } catch (err) {
        console.error('작업 상태 업데이트 오류:', err);
        res.status(500).json({ message: '작업 상태 업데이트 중 오류가 발생했습니다.' });
    }
});






// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

// 작업 삭제
router.delete('/delete', async (req, res) => {
    const { taskId } = req.body;  // 요청 본문에서 taskId를 받음

    if (!taskId) {
        return res.status(400).json({ message: '작업 ID는 필수입니다.' });
    }

    // MySQL 연결 설정
    const connection = mysql.createConnection({
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: '1234',
        database: 'project',
    });

    try {
        // 1. task_history에서 해당 task_id를 참조하는 모든 레코드 삭제
        await connection.promise().query(
            `DELETE FROM task_history WHERE task_id = ?`,
            [taskId]
        );

        // 2. Tasks 테이블에서 해당 task_id 삭제
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
    } finally {
        connection.end();  // 연결 종료
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

        // 동일한 스프린트로 이동 요청 시 기록을 남기지 않고 종료
        if (parseInt(oldSprintId) === parseInt(newSprintId)) {
            return res.status(200).json({ message: '스프린트가 변경되지 않았습니다.' });
        }

        // 이전 및 새로운 스프린트 이름 조회
        const [sprints] = await connection.promise().query(
            `SELECT sprint_id, sprint_name FROM Sprints WHERE sprint_id IN (?, ?)`,
            [oldSprintId, newSprintId]
        );

        const oldSprint = sprints.find(sprint => sprint.sprint_id === oldSprintId);
        const newSprint = sprints.find(sprint => sprint.sprint_id === newSprintId);

        const oldSprintName = oldSprint ? oldSprint.sprint_name : '없음';
        const newSprintName = newSprint ? newSprint.sprint_name : '없음';

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
            `INSERT INTO Task_History (task_id, changed_field, old_value, new_value, changed_by, log_message, log_type)
             VALUES (?, 'sprint_id', ?, ?, ?, ?, ?)`,
            [
                taskId, // 작업 ID
                oldSprintName, // 이전 스프린트 이름
                newSprintName, // 새로운 스프린트 이름
                changedBy, // 변경한 사용자 ID
                `작업이 스프린트 '${oldSprintName}'에서 '${newSprintName}'으로 이동되었습니다.`, // 로그 메시지
                '스프린트 변경' // 로그 유형
            ]
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
            `SELECT Tasks_status_id AS id, Tasks_status_name AS name FROM Tasks_status ORDER BY Tasks_status_id ASC`
        );
        res.status(200).json(statuses);
    } catch (err) {
        console.error('상태 목록 조회 오류:', err);
        res.status(500).json({ message: '상태 목록 조회 중 오류가 발생했습니다.' });
    }
});


// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────


// 작업 상세 조회
router.get('/:taskId', async (req, res) => {
    const { taskId } = req.params;
    const { userIdx } = req.query;

    try {
        const query = `
        SELECT 
            t.task_id AS taskId,
            t.task_name AS taskName,
            t.description AS description,
            t.start_date AS startDate,
            t.due_date AS dueDate,
            t.Tasks_status_id AS statusId,
            t.assigned_to AS assignedTo,
            DATE_ADD(t.due_date, INTERVAL 1 DAY) AS dueDate, -- 하루 더하기
            DATE_ADD(t.start_date, INTERVAL 1 DAY) AS startDate, -- 하루 더하기
            COALESCE(u.user_name, '담당자 없음') AS assignedToName,
            COALESCE(u.user_profile_image, '../profile/default-profile.png') AS assignedToImage,
            (SELECT pr.project_role_name 
            FROM Project_Members pm
            JOIN Project_Roles pr ON pm.project_role_id = pr.project_role_id
            WHERE pm.project_id = t.project_id AND pm.user_idx = ?) AS userRole,
            COALESCE(s.sprint_name, '기타 작업') AS sprintName -- 스프린트 이름 추가
        FROM Tasks t
        LEFT JOIN Users u ON t.assigned_to = u.user_idx
        LEFT JOIN Sprints s ON t.sprint_id = s.sprint_id -- Sprints 테이블 조인
        WHERE t.task_id = ?;
        `;

        const [task] = await connection.promise().query(query, [userIdx, taskId]);

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

        const previousAssignee = task[0].assigned_to;

        // 새 담당자 이름 조회
        let newAssigneeName = '없음';
        if (assignedTo) {
            const [newAssignee] = await connection.promise().query(
                `SELECT user_name FROM Users WHERE user_idx = ?`,
                [assignedTo]
            );
            newAssigneeName = newAssignee.length > 0 ? newAssignee[0].user_name : '없음';
        }

        // 이전 담당자 이름 조회
        let previousAssigneeName = '없음';
        if (previousAssignee) {
            const [oldAssignee] = await connection.promise().query(
                `SELECT user_name FROM Users WHERE user_idx = ?`,
                [previousAssignee]
            );
            previousAssigneeName = oldAssignee.length > 0 ? oldAssignee[0].user_name : '없음';
        }

        // 작업 담당자 업데이트
        const [updateResult] = await connection.promise().query(
            `UPDATE Tasks SET assigned_to = ?, last_updated_by = ? WHERE task_id = ?`,
            [assignedTo || null, changedBy, taskId]
        );

        if (updateResult.affectedRows === 0) {
            return res.status(400).json({ message: '작업 할당에 실패했습니다.' });
        }

        // 변경 이력 기록
        await connection.promise().query(
            `INSERT INTO Task_History (task_id, changed_field, old_value, new_value, changed_by, log_message, log_type)
             VALUES (?, 'assigned_to', ?, ?, ?, ?, ?)`,
            [
                taskId,
                previousAssigneeName, // 이전 담당자 이름
                newAssigneeName, // 새로운 담당자 이름
                changedBy,
                `작업 담당자가 '${previousAssigneeName}'에서 '${newAssigneeName}'으로 변경되었습니다.`, // 로그 메시지
                '담당자 변경' // 로그 유형
            ]
        );

        res.status(200).json({ message: '작업이 성공적으로 할당되고 기록되었습니다.' });
    } catch (err) {
        console.error('작업 할당 오류:', err);
        res.status(500).json({ message: '작업 할당 중 오류가 발생했습니다.' });
    }
});

// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────


// 작업 기록 추가
router.post('/history/add', async (req, res) => {
    const { taskId, changedBy, changedField, oldValue, newValue, logMessage, logType } = req.body;
    if (!taskId || !changedBy || !changedField || !logMessage || !logType) {
        return res.status(400).json({ message: '필수 필드를 모두 입력해주세요.' });
    }

    try {
        await connection.promise().query(
            `INSERT INTO Task_History (task_id, changed_by, changed_field, old_value, new_value, log_message, log_type) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [taskId, changedBy, changedField, oldValue, newValue, logMessage, logType]
        );
        res.status(201).json({ message: '작업 기록이 성공적으로 추가되었습니다.' });
    } catch (err) {
        console.error('작업 기록 추가 오류:', err);
        res.status(500).json({ message: '작업 기록 추가 중 오류가 발생했습니다.' });
    }
});

// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────


// 작업 기록 조회
router.get('/history/task', async (req, res) => {
    const { taskId } = req.query;
    if (!taskId) {
        return res.status(400).json({ message: '작업 ID는 필수입니다.' });
    }

    try {
        const [history] = await connection.promise().query(
            `SELECT h.history_id, h.task_id, h.changed_by, h.changed_field, h.old_value, h.new_value, 
                    h.log_message, h.log_type, h.changed_at,
                    u.user_name AS changed_by_name
             FROM Task_History h
             JOIN Users u ON h.changed_by = u.user_idx
             WHERE h.task_id = ?
             ORDER BY h.changed_at DESC`,
            [taskId]
        );
        res.status(200).json(history);
    } catch (err) {
        console.error('작업 기록 조회 오류:', err);
        res.status(500).json({ message: '작업 기록 조회 중 오류가 발생했습니다.' });
    }
});





// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

// 멘션과 작업 기록 함께 조회
router.get('/activity/task', async (req, res) => {
    const { taskId } = req.query;

    if (!taskId) {
        return res.status(400).json({ message: '작업 ID는 필수입니다.' });
    }

    try {
        const [activities] = await connection.promise().query(
            `
            SELECT 
                '맨션' AS log_type, 
                m.message AS log_message, 
                m.created_at AS activity_date, 
                u.user_name AS created_by_name
            FROM Mentions m
            JOIN Users u ON m.sent_by = u.user_idx
            WHERE m.task_id = ?

            UNION ALL

            SELECT 
                h.log_type, 
                h.log_message, 
                h.changed_at AS activity_date, 
                u.user_name AS created_by_name
            FROM Task_History h
            JOIN Users u ON h.changed_by = u.user_idx
            WHERE h.task_id = ?

            ORDER BY activity_date DESC
            `,
            [taskId, taskId]
        );

        res.status(200).json(activities);
    } catch (err) {
        console.error('멘션 및 작업 기록 조회 오류:', err);
        res.status(500).json({ message: '멘션 및 작업 기록 조회 중 오류가 발생했습니다.' });
    }
});






// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

router.get('/tasks/search', async (req, res) => {
    const { keyword, projectId, sprints } = req.query;

    if (!projectId) {
        return res.status(400).json({ message: 'projectId는 필수입니다.' });
    }

    try {
        const sprintFilter = sprints ? `AND t.sprint_id IN (${sprints.split(',').map(() => '?').join(',')})` : '';
        const searchKeyword = `%${keyword || ''}%`;

        const query = `
            SELECT 
                t.task_id AS taskId, 
                t.task_name AS taskName, 
                t.description, 
                t.Tasks_status_id AS statusId,
                s.Tasks_status_name AS statusName, 
                t.priority, 
                t.due_date AS dueDate,
                t.start_date AS startDate,
                t.assigned_to AS assignedTo, 
                
                COALESCE(u.user_name, '담당자 없음') AS assignedToName,
                COALESCE(u.user_profile_image, '../profile/default-profile.png') AS assignedToImage
            FROM Tasks t
            LEFT JOIN Tasks_status s ON t.Tasks_status_id = s.Tasks_status_id
            LEFT JOIN Users u ON t.assigned_to = u.user_idx
            WHERE t.project_id = ?
            AND (
                t.task_name LIKE ? OR
                t.description LIKE ? OR
                u.user_name LIKE ?
            )
            ${sprintFilter}
            ORDER BY t.due_date ASC;
        `;

        const params = [projectId, searchKeyword, searchKeyword, searchKeyword];
        if (sprints) {
            params.push(...sprints.split(','));
        }

        const [tasks] = await connection.promise().query(query, params);

        if (tasks.length === 0) {
            return res.status(404).json({ message: '검색 결과가 없습니다.' });
        }

        res.status(200).json(tasks);
    } catch (err) {
        console.error('작업 검색 오류:', err);
        res.status(500).json({ message: '작업 검색 중 오류가 발생했습니다.' });
    }
});




// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────


router.get('/tasks/filter', async (req, res) => {
    const { projectId, sprints } = req.query;

    if (!projectId) {
        return res.status(400).json({ message: 'projectId는 필수입니다.' });
    }

    try {
        const sprintFilter = sprints ? `AND t.sprint_id IN (${sprints.split(',').map(() => '?').join(',')})` : '';

        const query = `
            SELECT 
                t.task_id AS taskId,
                t.task_name AS taskName,
                t.description,
                t.assigned_to AS assignedTo,
                t.Tasks_status_id AS statusId,
                t.priority,
                t.start_date AS startDate,
                t.due_date AS dueDate,
                DATE_ADD(t.start_date, INTERVAL 1 DAY) AS startDate,
                DATE_ADD(t.due_date, INTERVAL 1 DAY) AS dueDate,
                COALESCE(sp.sprint_name, '스프린트 없음') AS sprintName,
                COALESCE(sp.start_date, NULL) AS sprintStartDate,
                COALESCE(sp.end_date, NULL) AS sprintEndDate
            FROM Tasks t
            LEFT JOIN Sprints sp ON t.sprint_id = sp.sprint_id
            WHERE t.project_id = ?
            ${sprintFilter}
            ORDER BY t.due_date ASC;
        `;

        const params = [projectId];
        if (sprints) {
            params.push(...sprints.split(','));
        }

        const [tasks] = await connection.promise().query(query, params);

        if (tasks.length === 0) {
            return res.status(404).json({ message: '검색 결과가 없습니다.' });
        }

        res.status(200).json(tasks);
    } catch (err) {
        console.error('작업 필터링 중 오류 발생:', err);
        res.status(500).json({ message: '작업 필터링 중 오류가 발생했습니다.' });
    }
});





module.exports = router;
