const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const cors = require('cors');
const mysql = require('mysql2');

// 라우터 가져오기
const userRoutes = require('./routes/user');
const projectRoutes = require('./routes/project');
const scriptRoutes = require('./routes/script');
const tesksRoutes = require('./routes/tasks');
const mentionsRoutes = require('./routes/mentions');
const commentRoutes = require('./routes/comment');
const notifiRoutes = require('./routes/notification');
const googleRouter = require('./routes/google');

const app = express();

// CORS 설정
app.use(cors());

// JSON 요청 파싱
app.use(bodyParser.json());

// 라우터 연결
app.use('/api/users', userRoutes);
app.use('/api/project', projectRoutes);
app.use('/api/script', scriptRoutes);
app.use('/api/tasks', tesksRoutes);
app.use('/api/mentions', mentionsRoutes);
app.use('/api/comment', commentRoutes);
app.use('/api/notification', notifiRoutes);
app.use('/api/google', googleRouter);

// 서버 시작
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});