const express = require('express');
const axios = require('axios');
const fs = require('fs');
const yaml = require('js-yaml');
require('dotenv').config(); // 환경 변수 설정
const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static('public'));

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'; // API URL
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; // 환경 변수에서 API 키 가져오기

// YAML 파일에서 프롬프트 읽기
let BASE_PROMPT;
try {
    const doc = yaml.load(fs.readFileSync('prompts.yml', 'utf8'));
    BASE_PROMPT = doc.base_prompt; // 프롬프트 가져오기
} catch (e) {
    console.error("YAML 파일 읽기 오류:", e);
    BASE_PROMPT = "기본 프롬프트입니다."; // 오류 발생 시 기본 프롬프트 설정
}

let conversationHistory = []; // 대화 기록 저장 변수

async function callGeminiAPI(userInput) {
    const fullPrompt = `${BASE_PROMPT} ${conversationHistory.join(' ')} ${userInput}`;

    try {
        const response = await axios.post(
            `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, // API URL에 API 키 추가
            {
                contents: [{
                    parts: [{ text: fullPrompt }] // 결합된 프롬프트 사용
                }]
            },
            {
                headers: {
                    'Content-Type': 'application/json' // Content-Type 헤더 추가
                }
            }
        );

        console.log('API 응답:', response.data); // 응답 로그 추가

        // 응답 구조 확인
        if (response.data.candidates && response.data.candidates.length > 0) {
            const content = response.data.candidates[0].content; // content 객체 추출
            console.log('Content:', content); // content 로그 추가

            if (content.parts && content.parts.length > 0) {
                return content.parts.map(part => part.text).join(' '); // 모든 텍스트를 연결하여 반환
            } else {
                return "응답 텍스트를 찾을 수 없습니다.";
            }
        } else {
            return "유효한 응답을 받지 못했습니다.";
        }
    } catch (error) {
        console.error("API 호출 중 오류 발생:", error);
        return "오류가 발생했습니다.";
    }
}

app.post('/chat', async (req, res) => {
    const userInput = req.body.input;
    conversationHistory.push(userInput); // 사용자 입력을 대화 기록에 추가

    const geminiResponse = await callGeminiAPI(userInput);
    conversationHistory.push(geminiResponse); // 제미니의 응답을 대화 기록에 추가

    console.log('서버 응답:', geminiResponse); // 서버 응답 로그 추가

    res.json({ response: geminiResponse });
});

app.listen(port, () => {
    console.log(`서버가 http://localhost:${port}에서 실행 중입니다.`);
});
