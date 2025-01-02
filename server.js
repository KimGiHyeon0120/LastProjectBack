const express = require('express');

const app = express();

//cors 설정 ( 모두 허용 )
const cors = require('cors')

// //cors 설정 ( 일부 허용 )
// const corsOption = {
//     origin: 'http://localhost:8080',
//     optionSuccessStatus: 200
// }

app.use(cors())

//DB 설정
const mysql = require('mysql2')
const connection = mysql.createConnection(
    {
        //key값 우리가 들어가는 곳
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: '1234',
        database: 'mydb'
    }
);
connection.connect();



//node의 기본 포트는 3000, vue, react는 기본포트 3000
app.listen(3000, function () {
    console.log('노드시작')
})


//node 불러오는 방법
app.get('/', (req, res) => {
    console.log('page start')
    res.send('Hello world')
})


app.get('/db', (req, res) => {
    console.log('/db')
    connection.query('select * from STU_SCORE', (err, rows) => {
        if(err){
            console.log('err: ', err);
        }
        if(rows[0]){
            console.log(rows)
            let responseData = new Object();
            responseData.status = 200; //통신코드중에서 200은 성공을 의미, 404(오류)도 통신코드
            responseData.list = rows;
            res.json(responseData)
        }
    })
})