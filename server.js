const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const cors = require('cors');
const mysql = require('mysql2');

// 라우터 가져오기
const userRoutes = require('./routes/user'); // userRoutes 추가
const projectRoutes = require('./routes/project');
const scriptRoutes = require('./routes/script');
const tesksRoutes = require('./routes/tasks');

const app = express();

// CORS 설정
app.use(cors());

// DB 연결 설정
const connection = mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '1234',
    database: 'project',
});


// JSON 요청 파싱
app.use(bodyParser.json());

// 라우터 연결
app.use('/api/users', userRoutes); // userRoutes 연결
app.use('/api/project', projectRoutes);
app.use('/api/script', scriptRoutes);
app.use('/api/tasks', tesksRoutes);




// 서버 시작
const PORT = process.env.PORT || 3000; // 환경 변수 사용 가능
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});