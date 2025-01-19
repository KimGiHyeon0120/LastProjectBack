const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const session = require('express-session');
// 라우터 가져오기
const userRoutes = require('./routes/users');
const projectRoutes = require('./routes/project');
const scriptRoutes = require('./routes/sprint');
const tesksRoutes = require('./routes/tasks');
const mentionsRoutes = require('./routes/mentions');
const commentRoutes = require('./routes/comment');
const notifiRoutes = require('./routes/notification');
require('dotenv').config();
const emailRoutes = require('./routes/verifyEmail.js');
const summaryRoutes = require('./routes/summary');

const app = express();

// CORS 설정
app.use(cors());

// JSON 요청 파싱
app.use(bodyParser.json());
app.use(session({
  secret: process.env.SESSION_SECRET,   // 세션을 암호화하는 비밀 키
  resave: false,              // 세션을 계속해서 저장할지 여부
  saveUninitialized: true,    // 초기화되지 않은 세션도 저장할지 여부
  cookie: { secure: false }   // 개발 환경에서 HTTP(S) 프로토콜에 관계없이 사용할 수 있도록 설정
}));
// 라우터 연결
app.use('/api/users', userRoutes);
app.use('/api/project', projectRoutes);
app.use('/api/sprint', scriptRoutes);
app.use('/api/tasks', tesksRoutes);
app.use('/api/mentions', mentionsRoutes);
app.use('/api/comment', commentRoutes);
app.use('/api/notification', notifiRoutes);
app.use('/api/verifyEmail', emailRoutes);
app.use('/api/summary', summaryRoutes);

// 서버 시작
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://192.168.20.37:${PORT}`);
});