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

router.post('/profile-setting', async (req, res) => {
    const { userId, userName, userEmail, userProfileImage } = req.body;

    if (!userId || (!userName && !userEmail && !userProfileImage)) {
        return res.status(400).json({ message: '수정할 필드 또는 사용자 ID가 누락되었습니다.' });
    }

    try {
        const [updated] = await User.update(
            {
                user_name: userName,
                user_email: userEmail,
                user_profile_image: userProfileImage,
            },
            {
                where: { user_idx: userId },
                individualHooks: true,
            }
        );

        if (updated === 0) {
            return res.status(404).json({ message: '해당 사용자를 찾을 수 없습니다.' });
        }

        res.status(200).json({ message: '프로필이 성공적으로 수정되었습니다.' });
    } catch (err) {
        console.error('프로필 수정 오류:', err);
        res.status(500).json({ message: '프로필 수정 중 오류가 발생했습니다.' });
    }
});
