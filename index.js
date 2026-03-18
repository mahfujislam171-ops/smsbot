const express = require("express");
const app = express();
const axios = require("axios");

const TOKEN = "8640081601:AAF3pNFGoIJlozFnVZChBbz250WVdbmcgAA";
const URL = `https://api.telegram.org/bot${TOKEN}`;

app.use(express.json());

// ====== DATA ======
let adminPass = "794082";
let users = {};
let banned = {};
let logs = [];

// ====== USER STATE ======
let step = {};

app.post("/", async (req, res) => {
  const msg = req.body.message;
  if (!msg) return res.send();

  const chatId = msg.chat.id;
  const text = msg.text;

  // START
  if (text == "/start") {
    step[chatId] = "menu";
    return send(chatId, "1️⃣ Admin\n2️⃣ User");
  }

  // ===== ADMIN =====
  if (text == "1" || text == "Admin") {
    step[chatId] = "admin_pass";
    return send(chatId, "Enter Admin Password:");
  }

  if (step[chatId] == "admin_pass") {
    if (text == adminPass) {
      step[chatId] = "admin_panel";
      return send(chatId, "Admin Panel:\n1 Add User\n2 Delete User\n3 Ban User\n4 Logs");
    } else {
      return send(chatId, "Wrong Password ❌");
    }
  }

  // ADMIN PANEL
  if (step[chatId] == "admin_panel") {
    if (text == "1") {
      step[chatId] = "add_user";
      return send(chatId, "Send: username,password");
    }
    if (text == "2") {
      step[chatId] = "del_user";
      return send(chatId, "Send username:");
    }
    if (text == "3") {
      step[chatId] = "ban_user";
      return send(chatId, "Send username:");
    }
    if (text == "4") {
      let logText = logs.join("\n") || "No logs";
      return send(chatId, logText);
    }
  }

  if (step[chatId] == "add_user") {
    let [u, p] = text.split(",");
    users[u] = p;
    return send(chatId, "User Added ✅");
  }

  if (step[chatId] == "del_user") {
    delete users[text];
    return send(chatId, "User Deleted ❌");
  }

  if (step[chatId] == "ban_user") {
    banned[text] = true;
    return send(chatId, "User Banned 🚫");
  }

  // ===== USER =====
  if (text == "2" || text == "User") {
    step[chatId] = "user_login";
    return send(chatId, "Send: username,password");
  }

  if (step[chatId] == "user_login") {
    let [u, p] = text.split(",");

    if (banned[u]) return send(chatId, "You are banned ❌");

    if (users[u] == p) {
      step[chatId] = "send_number";
      return send(chatId, "Login Success ✅\nSend Number:");
    } else {
      return send(chatId, "Wrong Login ❌");
    }
  }

  // SMS SEND
  if (step[chatId] == "send_number") {
    logs.push(`User sent to: ${text}`);

    step[chatId] = "again";
    return send(chatId, "SMS Sent ✅\nSend again? (yes/no)");
  }

  if (step[chatId] == "again") {
    if (text.toLowerCase() == "yes") {
      step[chatId] = "send_number";
      return send(chatId, "Send Number:");
    } else {
      return send(chatId, "Done ✅");
    }
  }

  res.send();
});

// SEND FUNCTION
async function send(chatId, text) {
  await axios.post(`${URL}/sendMessage`, {
    chat_id: chatId,
    text: text
  });
}

app.listen(10000);
