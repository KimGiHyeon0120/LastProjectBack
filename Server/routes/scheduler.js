const schedule = require('node-schedule');
const fetch = require('node-fetch');

// 매일 자정 실행
function startDailyNotificationJob() {
    schedule.scheduleJob('0 0 * * *', async () => {
        try {
            console.log('스케줄링 작업 실행: 마감 1일 전 알림 생성');

            const response = await fetch('http://192.168.20.37:3000/api/notification/daily-notification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sentBy: 1 }) // 시스템 관리자 ID
            });

            if (!response.ok) {
                throw new Error(`알림 생성 실패: ${response.statusText}`);
            }

            const result = await response.json();
            console.log('마감 1일 전 알림 생성 결과:', result);
        } catch (err) {
            console.error('스케줄링 작업 오류:', err);
        }
    });
}

module.exports = { startDailyNotificationJob };
