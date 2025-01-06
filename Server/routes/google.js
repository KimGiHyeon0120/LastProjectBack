const express = require('express');
const axios = require('axios');
const router = express.Router();
require('dotenv').config();

const {
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_LOGIN_REDIRECT_URI,
    GOOGLE_SIGNUP_REDIRECT_URI,
} = process.env;

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';




// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────



// 메인 페이지
router.get('/', (req, res) => {
    res.send(`
        <h1>OAuth</h1>
        <a href="/google/login">Log in</a>
        <a href="/google/signup">Sign up</a>
    `);
});



// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────




// 로그인 요청
router.get('/login', (req, res) => {
    let url = 'https://accounts.google.com/o/oauth2/v2/auth';
    url += `?client_id=${GOOGLE_CLIENT_ID}`;
    url += `&redirect_uri=${GOOGLE_LOGIN_REDIRECT_URI}`;
    url += '&response_type=code';
    url += '&scope=email profile';
    res.redirect(url);
});



// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────




// 회원가입 요청
router.get('/signup', (req, res) => {
    let url = 'https://accounts.google.com/o/oauth2/v2/auth';
    url += `?client_id=${GOOGLE_CLIENT_ID}`;
    url += `&redirect_uri=${GOOGLE_SIGNUP_REDIRECT_URI}`;
    url += '&response_type=code';
    url += '&scope=email profile';
    res.redirect(url);
});


// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────




// 로그인 리디렉션 처리
router.get('/googlelogin/redirect', (req, res) => {
    const { code } = req.query;
    console.log(`Login Code: ${code}`);
    res.send('Login successful');
});



// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────





// 회원가입 리디렉션 처리
router.get('/googlesignup/redirect', async (req, res) => {
    const { code } = req.query;
    console.log(`Signup Code: ${code}`);

    try {
        // Google Token 요청
        const tokenResponse = await axios.post(GOOGLE_TOKEN_URL, {
            code,
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            redirect_uri: GOOGLE_SIGNUP_REDIRECT_URI,
            grant_type: 'authorization_code',
        });

        const accessToken = tokenResponse.data.access_token;

        // Google UserInfo 요청
        const userInfoResponse = await axios.get(GOOGLE_USERINFO_URL, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        res.json(userInfoResponse.data);
    } catch (error) {
        console.error('Error during signup redirect:', error.message);
        res.status(500).send('An error occurred during the signup process');
    }
});

module.exports = router;
