const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

// รหัสลับตกลงกันเองระหว่างเรากับ Facebook เอาไว้กรอกช่อง "ตรวจสอบยืนยันโทเค็น"
const VERIFY_TOKEN = "MollisOmsSecretToken2026"; 

// รหัส Page Access Token ที่คุณกดคัดลอกมาจากข้อ 2 ในหน้า Facebook 
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN; 

// 1. ด่านแรก: เปิดท่อตรวจสอบ Webhook (สำหรับให้ Facebook ยิงมาเช็กครั้งแรก)
app.get('/webhook', (req, res) => {
    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('--- WEBHOOK_VERIFIED SUCCESS ---');
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    }
});

// 2. ด่านสอง: รับข้อมูลแชทจริง และระบบตอบกลับอัตโนมัติ (Auto-response)
app.post('/webhook', (req, res) => {
    let body = req.body;

    if (body.object === 'page') {
        body.entry.forEach(function(entry) {
            // รับกิจกรรมแชทที่เกิดขึ้น
            let webhook_event = entry.messaging[0];
            console.log("ได้รับข้อความใหม่:", webhook_event);

            // ดึง ID ของคนส่ง (ลูกค้า)
            let sender_psid = webhook_event.sender.id;

            // เช็กว่าเป็นข้อความตัวอักษรธรรมดาหรือไม่
            if (webhook_event.message && webhook_event.message.text) {
                let customer_text = webhook_event.message.text.trim().toLowerCase();
                
                // เรียกใช้ฟังก์ชันวิเคราะห์คำสั่งและตอบกลับอัตโนมัติ
                handleMessage(sender_psid, customer_text);
            }
        });
        res.status(200).send('EVENT_RECEIVED');
    } else {
        res.sendStatus(404);
    }
});

// 🤖 ฟังก์ชันสมองกล: ตรวจจับคำสำคัญและส่งข้อความตอบกลับ
function handleMessage(sender_psid, customer_text) {
    let response_message = "";

    // เงื่อนไขที่ 1: ดักจับคำว่า เมนู / ราคา / สนใจ / กี่บาท
    if (customer_text.includes("เมนู") || customer_text.includes("ราคา") || customer_text.includes("สนใจ") || customer_text.includes("กี่บาท")) {
        response_message = "หรอยแรง! สนใจเมนูไหนเลือกได้เลยน้าา วันนี้ร้าน เติบ มากับลูกตอ มีเมนูเด็ดแนะนำครับ:\n\n" +
                           "1. สะตอผัดกะปิกุ้งสดสด - ฿180\n" +
                           "2. แกงไตปลาทรงเครื่องใต้แท้ - ฿150\n" +
                           "3. คั่วกลิ้งหมูสับเผ็ดจัดจ้าน - ฿120\n\n" +
                           "คุณลูกค้าสามารถพิมพ์ระบุเมนูและจำนวนที่ต้องการสั่งซื้อเข้ามาได้เลยนะคะ เดี๋ยวแอดมินสรุปยอดให้ค่ะ! 🌶️สะตอ";
    } 
    // เงื่อนไขเริ่มต้น: คำทักทายทั่วไป
    else {
        response_message = "สวัสดีค่ะ ยินดีต้อนรับสู่ร้าน เติบ มากับลูกตอ นะคะ 🙏✨ วันนี้รับเมนูอาหารใต้หรอยๆ ไปทานที่บ้านดีคะ? พิมพ์คำว่า 'เมนู' เพื่อดูรายการอาหารและราคาได้เลยน้าา";
    }

    // ส่งข้อความกลับหาลูกค้าผ่าน Facebook Graph API
    callSendAPI(sender_psid, response_message);
}

// 📤 ฟังก์ชันยิงข้อความกลับไปหาเพจ Facebook ของลูกค้า จริงๆ
function callSendAPI(sender_psid, response_text) {
    let request_body = {
        "recipient": { "id": sender_psid },
        "message": { "text": response_text }
    };

    axios({
        method: "POST",
        url: "https://graph.facebook.com/v21.0/me/messages",
        params: { "access_token": PAGE_ACCESS_TOKEN },
        data: request_body
    }).then(() => {
        console.log('ส่งข้อความตอบกลับอัตโนมัติสำเร็จแล้ว!');
    }).catch(err => {
        console.error('เกิดข้อผิดพลาดในการส่งข้อความ:', err.response ? err.response.data : err.message);
    });
}

// เปิด Port รอรับข้อมูล
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`ระบบ OMS หลังบ้านกำลังทำงานที่ Port ${PORT}`));
