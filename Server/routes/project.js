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



// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────



router.post('/create', async (req, res) => {
    const { projectName, userIdx, isTeamProject } = req.body;

    // 데이터 검증
    if (!projectName || !userIdx || isTeamProject === undefined) {
        return res.status(400).json({ message: '필수 필드를 모두 입력해주세요.' });
    }

    if (isNaN(parseInt(userIdx, 10))) {
        return res.status(400).json({ message: '유효하지 않은 사용자 ID입니다.' });
    }

    try {
        // 트랜잭션 시작
        await connection.promise().query('START TRANSACTION');

        // 프로젝트 생성
        const [projectResult] = await connection.promise().query(
            `INSERT INTO Projects (project_name, user_idx, is_team_project) VALUES (?, ?, ?)`,
            [projectName, parseInt(userIdx, 10), isTeamProject]
        );

        const projectId = projectResult.insertId;

        // 팀 프로젝트인 경우 멤버 추가
        if (isTeamProject) {
            await connection.promise().query(
                `INSERT INTO Project_Members (project_id, user_idx, project_role_id) VALUES (?, ?, ?)`,
                [projectId, parseInt(userIdx, 10), 1]
            );
        }

        // 트랜잭션 커밋
        await connection.promise().query('COMMIT');

        return res.status(201).json({
            message: '프로젝트가 성공적으로 생성되었습니다.',
            projectId: projectId,
        });
    } catch (err) {
        // 트랜잭션 롤백
        await connection.promise().query('ROLLBACK');
        console.error('프로젝트 생성 오류:', err);
        return res.status(500).json({ message: '프로젝트 생성 중 오류가 발생했습니다.' });
    }
});


// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────


// 사용자별 프로젝트 조회 (소유자 + 팀원)
router.get('/list-by-user', async (req, res) => {
    const { userId } = req.query;

    if (!userId) {
        console.error("사용자 ID가 제공되지 않았습니다."); // 디버깅: 사용자 ID 없음
        return res.status(400).json({ message: '사용자 ID는 필수입니다.' });
    }

    try {
        // 소유한 프로젝트 조회
        const [ownedProjects] = await connection.promise().query(
            `SELECT 
                p.project_id,
                p.project_name,
                p.created_at,
                p.is_team_project,
                pr.project_role_name AS role_name, -- 역할 이름
                pm.user_idx AS leader_idx, -- 팀장의 ID
                u.user_name AS leader_name, -- 팀장의 이름
                IFNULL(u.user_profile_image, '../profile/default-profile.png') AS leader_profile -- 기본 이미지 사용
             FROM Projects p
             LEFT JOIN Project_Members pm ON pm.project_id = p.project_id AND pm.project_role_id = 1
             LEFT JOIN Users u ON pm.user_idx = u.user_idx
             LEFT JOIN Project_Roles pr ON pm.project_role_id = pr.project_role_id
             WHERE p.user_idx = ?`,
            [userId]
        );

        // 참여한 프로젝트 조회
        const [participatingProjects] = await connection.promise().query(
            `SELECT 
                p.project_id,
                p.project_name,
                p.created_at,
                p.is_team_project,
                pr.project_role_name AS role_name, -- 역할 이름
                pm_leader.user_idx AS leader_idx, -- 팀장의 ID
                u_leader.user_name AS leader_name, -- 팀장의 이름
                IFNULL(u_leader.user_profile_image, '../profile/default-profile.png') AS leader_profile -- 기본 이미지 사용
             FROM Projects p
             INNER JOIN Project_Members pm_user ON pm_user.project_id = p.project_id AND pm_user.user_idx = ?
             LEFT JOIN Project_Members pm_leader ON pm_leader.project_id = p.project_id AND pm_leader.project_role_id = 1
             LEFT JOIN Users u_leader ON pm_leader.user_idx = u_leader.user_idx
             LEFT JOIN Project_Roles pr ON pm_user.project_role_id = pr.project_role_id`,
            [userId]
        );

        res.status(200).json({
            ownedProjects,
            participatingProjects,
            message: '프로젝트 목록 조회 성공',
        });
    } catch (err) {
        console.error('프로젝트 목록 조회 오류:', err);
        res.status(500).json({ message: '프로젝트 목록 조회 중 오류가 발생했습니다.' });
    }
});






// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────


// 프로젝트 조회 (쿼리 파라미터 사용)
router.get('/view', async (req, res) => {
    const { projectId } = req.query;

    if (!projectId) {
        return res.status(400).json({ message: 'projectId를 제공해주세요.' });
    }

    try {
        const [project] = await connection.promise().query(
            `SELECT * FROM Projects WHERE project_id = ?`,
            [projectId]
        );

        if (project.length === 0) {
            return res.status(404).json({ message: '존재하지 않는 프로젝트입니다.' });
        }

        res.status(200).json(project[0]);
    } catch (err) {
        console.error('프로젝트 조회 오류:', err);
        res.status(500).json({ message: '프로젝트 조회 중 오류가 발생했습니다.' });
    }
});

// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────


// 프로젝트 수정
router.put('/update', async (req, res) => {
    const { projectId } = req.query;
    const { projectName, isTeamProject } = req.body;

    if (!projectId || !projectName || isTeamProject === undefined) {
        return res.status(400).json({ message: '필수 필드를 모두 입력해주세요.' });
    }

    try {
        // 팀원이 있는 경우 개인 프로젝트로 변경 불가
        if (!isTeamProject) {
            const [members] = await connection.promise().query(
                `SELECT COUNT(*) AS memberCount FROM Project_Members WHERE project_id = ?`,
                [projectId]
            );
            if (members[0].memberCount > 1) {
                return res.status(400).json({ message: '팀원이 있는 경우 개인 프로젝트로 변경할 수 없습니다.' });
            }
        }

        // 트랜잭션 시작
        await connection.promise().query('START TRANSACTION');

        // 프로젝트 업데이트
        const [result] = await connection.promise().query(
            `UPDATE Projects SET project_name = ?, is_team_project = ?, updated_at = CURRENT_TIMESTAMP WHERE project_id = ?`,
            [projectName, isTeamProject, projectId]
        );

        if (result.affectedRows === 0) {
            await connection.promise().query('ROLLBACK');
            return res.status(404).json({ message: '수정할 프로젝트를 찾을 수 없습니다.' });
        }

        // 개인 프로젝트로 전환 시 팀원 데이터 삭제
        if (!isTeamProject) {
            await connection.promise().query(
                `DELETE FROM Project_Members WHERE project_id = ? AND project_role_id != 1`,
                [projectId]
            );
        }

        // 트랜잭션 커밋
        await connection.promise().query('COMMIT');

        res.status(200).json({ message: '프로젝트가 성공적으로 수정되었습니다.' });
    } catch (err) {
        console.error('프로젝트 수정 오류:', err);
        await connection.promise().query('ROLLBACK');
        res.status(500).json({ message: '프로젝트 수정 중 오류가 발생했습니다.' });
    }
});




// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────


// 프로젝트 삭제
router.delete('/delete', async (req, res) => {
    const { projectId } = req.query;

    if (!projectId) {
        return res.status(400).json({ message: 'projectId를 제공해주세요.' });
    }

    try {
        // 팀원이 있는 경우 삭제 제한
        const [members] = await connection.promise().query(
            `SELECT COUNT(*) AS memberCount FROM Project_Members WHERE project_id = ?`,
            [projectId]
        );
        if (members[0].memberCount > 1) {
            return res.status(400).json({ message: '팀원이 있는 경우 프로젝트를 삭제할 수 없습니다.' });
        }

        // 트랜잭션 시작
        await connection.promise().query('START TRANSACTION');

        // 관련 데이터 삭제
        await connection.promise().query(`DELETE FROM Tasks WHERE project_id = ?`, [projectId]);
        await connection.promise().query(`DELETE FROM Sprints WHERE project_id = ?`, [projectId]);
        await connection.promise().query(`DELETE FROM Project_Members WHERE project_id = ?`, [projectId]);

        // 프로젝트 삭제
        const [result] = await connection.promise().query(
            `DELETE FROM Projects WHERE project_id = ?`,
            [projectId]
        );

        if (result.affectedRows === 0) {
            await connection.promise().query('ROLLBACK');
            return res.status(404).json({ message: '삭제할 프로젝트를 찾을 수 없습니다.' });
        }

        // 트랜잭션 커밋
        await connection.promise().query('COMMIT');

        res.status(200).json({ message: '프로젝트가 성공적으로 삭제되었습니다.' });
    } catch (err) {
        console.error('프로젝트 삭제 오류:', err);
        await connection.promise().query('ROLLBACK');
        res.status(500).json({ message: '프로젝트 삭제 중 오류가 발생했습니다.' });
    }
});




// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

// 이메일로 프로젝트 팀원 추가
router.post('/add-member', async (req, res) => {
    const { projectId, userEmail, projectRoleId } = req.body;

    if (!projectId || !userEmail || !projectRoleId) {
        return res.status(400).json({ message: '필수 필드를 모두 입력해주세요.' });
    }

    try {
        // 사용자 이메일로 존재 여부 확인
        const [user] = await connection.promise().query(
            `SELECT user_idx FROM Users WHERE user_email = ?`,
            [userEmail]
        );

        if (user.length === 0) {
            return res.status(404).json({ message: '존재하지 않는 사용자 이메일입니다.' });
        }

        const userIdx = user[0].user_idx;

        // 프로젝트 존재 여부 확인
        const [project] = await connection.promise().query(
            `SELECT project_id FROM Projects WHERE project_id = ?`,
            [projectId]
        );

        if (project.length === 0) {
            return res.status(404).json({ message: '존재하지 않는 프로젝트입니다.' });
        }

        // 중복 멤버 확인
        const [existingMember] = await connection.promise().query(
            `SELECT id FROM Project_Members WHERE project_id = ? AND user_idx = ?`,
            [projectId, userIdx]
        );

        if (existingMember.length > 0) {
            return res.status(400).json({ message: '이미 프로젝트에 추가된 사용자입니다.' });
        }

        // 프로젝트 멤버 추가
        await connection.promise().query(
            `INSERT INTO Project_Members (project_id, user_idx, project_role_id) VALUES (?, ?, ?)`,
            [projectId, userIdx, projectRoleId]
        );

        res.status(201).json({ message: '프로젝트 팀원이 성공적으로 추가되었습니다.' });
    } catch (err) {
        console.error('프로젝트 팀원 추가 오류:', err);
        res.status(500).json({ message: '프로젝트 팀원 추가 중 오류가 발생했습니다.' });
    }
});


// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────


// 팀장 넘겨주기
router.put('/transfer-leader', async (req, res) => {
    const { projectId, requesterId, newLeaderIdx } = req.body;

    if (!projectId || !requesterId || !newLeaderIdx) {
        return res.status(400).json({ message: '필수 필드를 모두 입력해주세요.' });
    }

    try {
        // 요청자가 팀장인지 확인
        const [requesterRole] = await connection.promise().query(
            `SELECT project_role_id FROM Project_Members WHERE project_id = ? AND user_idx = ?`,
            [projectId, requesterId]
        );

        if (requesterRole.length === 0 || requesterRole[0].project_role_id !== 1) {
            return res.status(403).json({ message: '팀장이 아니므로 권한이 없습니다.' });
        }

        // 새 팀장이 해당 프로젝트에 속해 있는지 확인
        const [newLeaderMembership] = await connection.promise().query(
            `SELECT id FROM Project_Members WHERE project_id = ? AND user_idx = ?`,
            [projectId, newLeaderIdx]
        );

        if (newLeaderMembership.length === 0) {
            return res.status(404).json({ message: '새 팀장이 해당 프로젝트에 속해 있지 않습니다.' });
        }

        // 트랜잭션 시작
        await connection.promise().query('START TRANSACTION');

        // 기존 팀장을 팀원으로 변경
        await connection.promise().query(
            `UPDATE Project_Members SET project_role_id = 2 WHERE project_id = ? AND user_idx = ?`,
            [projectId, requesterId]
        );

        // 새 팀장을 팀장으로 변경
        await connection.promise().query(
            `UPDATE Project_Members SET project_role_id = 1 WHERE project_id = ? AND user_idx = ?`,
            [projectId, newLeaderIdx]
        );

        // 트랜잭션 커밋
        await connection.promise().query('COMMIT');

        res.status(200).json({ message: '팀장 역할이 성공적으로 넘겨졌습니다.' });
    } catch (err) {
        console.error('팀장 역할 변경 오류:', err);

        // 트랜잭션 롤백
        await connection.promise().query('ROLLBACK');

        res.status(500).json({ message: '팀장 역할 변경 중 오류가 발생했습니다.' });
    }
});





// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

// 팀원 삭제
router.delete('/delete-member', async (req, res) => {
    const { projectId, requesterId, memberId } = req.body;

    if (!projectId || !requesterId || !memberId) {
        return res.status(400).json({ message: '필수 필드를 모두 입력해주세요.' });
    }

    try {
        // 요청자가 팀장인지 확인
        const [requesterRole] = await connection.promise().query(
            `SELECT project_role_id FROM Project_Members WHERE project_id = ? AND user_idx = ?`,
            [projectId, requesterId]
        );

        if (requesterRole.length === 0 || requesterRole[0].project_role_id !== 1) {
            return res.status(403).json({ message: '팀장이 아니므로 권한이 없습니다.' });
        }

        // 팀장의 ID 가져오기
        const [leader] = await connection.promise().query(
            `SELECT user_idx FROM Project_Members WHERE project_id = ? AND project_role_id = 1`,
            [projectId]
        );

        if (leader.length === 0) {
            return res.status(404).json({ message: '팀장을 찾을 수 없습니다.' });
        }

        const leaderId = leader[0].user_idx;

        if (leaderId === memberId) {
            return res.status(400).json({ message: '팀장은 스스로를 삭제할 수 없습니다.' });
        }

        // 삭제할 팀원의 작업을 팀장에게 할당
        await connection.promise().query(
            `UPDATE Tasks SET assigned_to = ? WHERE project_id = ? AND assigned_to = ?`,
            [leaderId, projectId, memberId]
        );

        // 팀원 삭제
        const [deleteResult] = await connection.promise().query(
            `DELETE FROM Project_Members WHERE project_id = ? AND user_idx = ?`,
            [projectId, memberId]
        );

        if (deleteResult.affectedRows === 0) {
            return res.status(404).json({ message: '삭제할 팀원을 찾을 수 없습니다.' });
        }

        res.status(200).json({ message: '프로젝트 팀원이 성공적으로 삭제되었습니다.' });
    } catch (err) {
        console.error('팀원 삭제 오류:', err);
        res.status(500).json({ message: '팀원 삭제 중 오류가 발생했습니다.' });
    }
});


// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────


// 팀장 및 담당자 정보 가져오기
router.get('/role', async (req, res) => {
    const { projectId, userIdx } = req.query;

    if (!projectId || !userIdx) {
        console.error('Missing required parameters: projectId or userIdx');
        return res.status(400).json({ message: '프로젝트 ID와 사용자 ID는 필수입니다.' });
    }

    try {
        // 사용자 역할 및 담당자 정보 조회
        const sqlQuery = `
            SELECT pm.project_role_id, pr.project_role_name, t.assigned_to
            FROM Project_Members pm
            JOIN Project_Roles pr ON pm.project_role_id = pr.project_role_id
            LEFT JOIN Tasks t ON pm.user_idx = t.assigned_to
            WHERE pm.project_id = ? AND pm.user_idx = ?
        `;
        const queryParams = [projectId, userIdx];

        // SQL 실행
        const [result] = await connection.promise().query(sqlQuery, queryParams);

        if (result.length === 0) {
            return res.status(404).json({ message: '해당 프로젝트에 대한 사용자 역할 또는 담당 작업을 찾을 수 없습니다.' });
        }

        res.status(200).json(result[0]); // 팀장 역할 및 담당 작업 반환
    } catch (err) {
        console.error('역할 확인 중 오류 발생:', err.message);
        res.status(500).json({ message: '역할 확인 중 오류가 발생했습니다.', error: err.message });
    }
});



// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────



//팀원 찾기
router.get('/members', async (req, res) => {
    const { projectId } = req.query;

    if (!projectId) {
        return res.status(400).json({ message: '프로젝트 ID가 필요합니다.' });
    }

    try {
        const query = `
            SELECT 
                u.user_idx AS userId,
                u.user_name AS userName,
                COALESCE(u.user_profile_image, '../profile/default-profile.png') AS profileImage,
                pr.project_role_name AS roleName
            FROM Project_Members pm
            JOIN Users u ON pm.user_idx = u.user_idx
            JOIN Project_Roles pr ON pm.project_role_id = pr.project_role_id
            WHERE pm.project_id = ?
            ;
        `;
        const [members] = await connection.promise().query(query, [projectId]);


        res.status(200).json(members);
    } catch (err) {
        console.error('팀원 조회 오류:', err);
        res.status(500).json({ message: '팀원 목록 조회 중 오류가 발생했습니다.' });
    }
});


// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

//팀원 검색
router.get('/members/search', async (req, res) => {
    const { projectId, query } = req.query;


    try {
        const searchQuery = query ? `%${query}%` : '%';
        const sqlQuery = `
            SELECT 
                u.user_idx AS userId,
                u.user_name AS userName,
                u.user_profile_image AS profileImage,
                pr.project_role_name AS roleName
            FROM Project_Members pm
            JOIN Users u ON pm.user_idx = u.user_idx
            JOIN Project_Roles pr ON pm.project_role_id = pr.project_role_id
            WHERE pm.project_id = ?
            AND u.user_name LIKE ?
        `;
        const [members] = await connection.promise().query(sqlQuery, [projectId, searchQuery]);

        res.status(200).json(members);
    } catch (err) {
        console.error('팀원 검색 오류:', err);
        res.status(500).json({ message: '팀원 검색 중 오류가 발생했습니다.' });
    }
});

// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────



// 상세보기
router.get('/details', async (req, res) => {
    const { projectId, userIdx } = req.query;

    if (!projectId || !userIdx) {
        return res.status(400).json({ message: 'projectId와 userIdx가 필요합니다.' });
    }

    try {
        // 프로젝트 정보 가져오기
        const [project] = await connection.promise().query(
            `SELECT project_id, project_name, is_team_project FROM Projects WHERE project_id = ?`,
            [projectId]
        );

        if (project.length === 0) {
            return res.status(404).json({ message: '프로젝트를 찾을 수 없습니다.' });
        }

        // 팀원 정보 가져오기
        const [teamMembers] = await connection.promise().query(
            `SELECT pm.user_idx, u.user_name AS name, u.user_profile_image AS profile_image,
                    CASE pm.project_role_id 
                        WHEN 1 THEN '팀장' 
                        ELSE '팀원' 
                    END AS role
             FROM Project_Members pm
             JOIN Users u ON pm.user_idx = u.user_idx
             WHERE pm.project_id = ?`,
            [projectId]
        );

        // 현재 사용자의 역할 가져오기
        const [currentUserRole] = await connection.promise().query(
            `SELECT project_role_id FROM Project_Members WHERE project_id = ? AND user_idx = ?`,
            [projectId, userIdx]
        );

        // 팀장 정보 가져오기
        const [leaderInfo] = await connection.promise().query(
            `SELECT pm.user_idx, u.user_name AS leader_name, u.user_profile_image AS profile_image
             FROM Project_Members pm
             JOIN Users u ON pm.user_idx = u.user_idx
             WHERE pm.project_id = ? AND pm.project_role_id = 1`,
            [projectId]
        );

        const response = {
            project_id: project[0].project_id,
            project_name: project[0].project_name,
            is_team_project: project[0].is_team_project,
            team_members: teamMembers,
            current_user_role: currentUserRole.length > 0 ? currentUserRole[0].project_role_id : null,
            current_user_is_leader: currentUserRole.length > 0 && currentUserRole[0].project_role_id === 1,
            leader_info: leaderInfo.length > 0 ? leaderInfo[0] : null, // 팀장 정보 추가
        };

        res.status(200).json(response);
    } catch (err) {
        console.error('프로젝트 정보 조회 오류:', err);
        res.status(500).json({ message: '프로젝트 정보를 불러오는 중 오류가 발생했습니다.' });
    }
});






// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

module.exports = router;
