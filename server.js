const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");
const { GoogleGenerativeAI } = require("@google/generative-ai");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const knowledgeFolder = path.join(__dirname, "knowledge");

function loadKnowledge() {

    let knowledge = "";

    if (!fs.existsSync(knowledgeFolder)) {
        console.log("Không tìm thấy thư mục knowledge");
        return "";
    }

    const files = fs.readdirSync(knowledgeFolder);

    files.forEach(file => {

        if (file.endsWith(".json")) {

            const content = fs.readFileSync(
                path.join(knowledgeFolder, file),
                "utf8"
            );

            knowledge += `

========== ${file} ==========

${content}

`;

        }

    });

    return knowledge;

}

const KNOWLEDGE = loadKnowledge();

app.post("/chat", async (req, res) => {

    try {

        const userMessage = req.body.message;

        if (!userMessage) {

            return res.json({
                answer: "Bạn vui lòng nhập câu hỏi nhé 😊"
            });

        }

        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash"
        });

        const prompt = `
Bạn là trợ lý AI chính thức của VanlangTrip.

Nhiệm vụ:

- Luôn trả lời bằng tiếng Việt.
- Văn phong thân thiện.
- Giống nhân viên tư vấn du lịch.
- Trả lời ngắn gọn nhưng đầy đủ.
- Luôn xưng "VanlangTrip" và gọi người hỏi là "bạn".
- Không tự bịa thông tin.
- Chỉ sử dụng dữ liệu được cung cấp.
- Nếu dữ liệu không có thì trả lời:

"Xin lỗi bạn, hiện VanlangTrip chưa có thông tin chính xác về vấn đề này. Bạn có thể để lại câu hỏi hoặc liên hệ đội ngũ tư vấn để được hỗ trợ nhanh nhất."

Nếu khách hỏi:

- Xin chào
- Hello
- Hi
- Chào

thì hãy trả lời:

"Xin chào 👋

Mình là trợ lý AI của VanlangTrip.

Mình có thể hỗ trợ bạn:

• Giới thiệu tour
• Tư vấn điểm đến
• Giới thiệu sản phẩm OCOP
• Gợi ý lịch trình
• Thông tin doanh nghiệp
• Các câu hỏi thường gặp

Bạn muốn khám phá điều gì hôm nay?"

Nếu khách cảm ơn thì đáp:

"VanlangTrip rất vui khi được hỗ trợ bạn ❤️
Chúc bạn có một chuyến đi thật nhiều trải nghiệm."

=======================

ĐÂY LÀ CƠ SỞ DỮ LIỆU

${KNOWLEDGE}

=======================

CÂU HỎI

${userMessage}

Hãy trả lời thật tự nhiên.
`;

        const result = await model.generateContent(prompt);

        const answer = result.response.text();

        res.json({
            answer
        });

    } catch (error) {

        console.error("Gemini Error:");

        console.error(error);

        res.status(500).json({

            answer:
                "Xin lỗi, hệ thống AI của VanlangTrip đang tạm thời bận. Bạn vui lòng thử lại sau vài phút."

        });

    }

});

app.get("/", (req, res) => {

    res.send("VanlangTrip Chatbot API is running.");

});
app.get("/widget", (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<title>VanLangTrip AI</title>
<style>
body{
    margin:0;
    font-family:Arial,sans-serif;
}
.container{
    padding:15px;
}
#messages{
    height:420px;
    overflow-y:auto;
    border:1px solid #ddd;
    padding:10px;
    border-radius:10px;
    margin-bottom:10px;
}
input{
    width:75%;
    padding:10px;
}
button{
    padding:10px 15px;
}
</style>
</head>
<body>

<div class="container">
<h3>🌿 VanLangTrip AI</h3>

<div id="messages">
Xin chào 👋 Mình là trợ lý AI của VanLangTrip.
</div>

<input id="message" placeholder="Bạn cần giúp gì?">
<button onclick="send()">Gửi</button>
</div>

<script>
async function send(){

const input=document.getElementById("message");
const messages=document.getElementById("messages");

if(!input.value.trim()) return;

messages.innerHTML += "<br><b>Bạn:</b> "+input.value;

const response = await fetch("/chat",{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
message:input.value
})
});

const data = await response.json();

messages.innerHTML += "<br><b>VanLangTrip:</b> "+data.answer;

messages.scrollTop = messages.scrollHeight;

input.value="";

}
</script>

</body>
</html>
`);
});
const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, () => {

    console.log("===================================");
    console.log("VanlangTrip Chatbot Started");
    console.log(`Server: http://localhost:${PORT}`);
    console.log("Knowledge Loaded Successfully");
    console.log("===================================");

});

server.on("close", () => {

    console.log("Server đã dừng.");

});

process.on("uncaughtException", err => {

    console.error("Uncaught Exception");

    console.error(err);

});

process.on("unhandledRejection", err => {

    console.error("Unhandled Promise");

    console.error(err);

});

process.on("SIGINT", () => {

    console.log("\nĐang tắt Server...");

    server.close(() => {

        console.log("Server đã đóng.");

        process.exit(0);

    });

});