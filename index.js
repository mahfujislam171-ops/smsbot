const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

// ===== CONFIG =====
const TOKEN = "8651056162:AAFkb1lRavN9v66ix3_I8gWQqUCvKG5322I";
const URL = `https://api.telegram.org/bot${TOKEN}`;
const ADMIN_PASS = "794082";

// ===== DATA =====
let users = {};
let banned = {};
let logs = [];
let step = {};
let session = {};

// ===== SEND MSG =====
async function send(chatId, text, keyboard = []) {
  await axios.post(`${URL}/sendMessage`, {
    chat_id: chatId,
    text: text,
    reply_markup: {
      keyboard: keyboard,
      resize_keyboard: true
    }
  });
}

// ===== START =====
async function startMenu(chatId) {
  step[chatId] = "start";
  return send(chatId, "Choose option:", [
    ["👑 Admin Login"],
    ["👤 User Login"]
  ]);
}

// ===== ADMIN PANEL =====
async function adminPanel(chatId) {
  step[chatId] = "admin";
  return send(chatId, "Admin Panel:", [
    ["➕ Add User", "📋 User List"],
    ["🔙 Back"]
  ]);
}

// ===== USER PANEL =====
async function userPanel(chatId) {
  let u = session[chatId].username;
  step[chatId] = "user";
  return send(chatId, `User Panel\nBalance: ${users[u].coin}`, [
    ["📩 Send SMS"],
    ["👤 Account", "💰 Balance"],
    ["🔙 Back"]
  ]);
}

// ===== WEBHOOK =====
app.post("/", async (req, res) => {
  const msg = req.body.message;
  if (!msg) return res.send();

  const chatId = msg.chat.id;
  const text = msg.text;

  // ===== START =====
  if (text === "/start") {
    return startMenu(chatId);
  }

  // ===== MAIN =====
  if (text === "👑 Admin Login") {
    step[chatId] = "admin_pass";
    return send(chatId, "Enter Admin Password:", [["🔙 Back"]]);
  }

  if (text === "👤 User Login") {
    step[chatId] = "user_name";
    return send(chatId, "Enter Username:", [["🔙 Back"]]);
  }

  // ===== BACK =====
  if (text === "🔙 Back") {
    return startMenu(chatId);
  }

  // ===== ADMIN LOGIN =====
  if (step[chatId] === "admin_pass") {
    if (text === ADMIN_PASS) {
      return adminPanel(chatId);
    } else {
      return send(chatId, "Wrong Password ❌");
    }
  }

  // ===== ADMIN PANEL =====
  if (step[chatId] === "admin") {
    if (text === "➕ Add User") {
      step[chatId] = "add_user";
      return send(chatId, "Send: username password", [["🔙 Back"]]);
    }

    if (text === "📋 User List") {
      let list = Object.keys(users).join("\n") || "No users";
      return send(chatId, list, [["🔙 Back"]]);
    }
  }

  // ===== ADD USER =====
  if (step[chatId] === "add_user") {
    let [u, p] = text.split(" ");
    users[u] = { password: p, coin: 10 };
    return adminPanel(chatId);
  }

  // ===== USER LOGIN =====
  if (step[chatId] === "user_name") {
    session[chatId] = { username: text };
    step[chatId] = "user_pass";
    return send(chatId, "Enter Password:", [["🔙 Back"]]);
  }

  if (step[chatId] === "user_pass") {
    let u = session[chatId].username;

    if (!users[u] || users[u].password !== text) {
      return send(chatId, "Login Failed ❌");
    }

    if (banned[u]) {
      return send(chatId, "Banned 🚫");
    }

    return userPanel(chatId);
  }

  // ===== USER PANEL =====
  if (step[chatId] === "user") {
    if (text === "📩 Send SMS") {
      step[chatId] = "number";
      return send(chatId, "Enter Number:", [["🔙 Back"]]);
    }

    if (text === "💰 Balance") {
      let u = session[chatId].username;
      return send(chatId, `Balance: ${users[u].coin}`);
    }

    if (text === "👤 Account") {
      let u = session[chatId].username;
      return send(chatId, `User: ${u}\nCoin: ${users[u].coin}`);
    }
  }

  // ===== SMS FLOW =====
  if (step[chatId] === "number") {
    session[chatId].number = text;
    step[chatId] = "sms";
    return send(chatId, "Enter Message:", [["🔙 Back"]]);
  }

  if (step[chatId] === "sms") {
    let u = session[chatId].username;

    if (users[u].coin <= 0) {
      return send(chatId, "No Balance ❌");
    }

    // ===== SMS API =====
    await axios.get(`https://your-sms-api.com/send?number=${session[chatId].number}&msg=${text}`);

    users[u].coin--;

    logs.push(`${u} → ${session[chatId].number} → ${text}`);

    return userPanel(chatId);
  }

  res.send();
});

// ===== SERVER =====
app.get("/", (req, res) => {
  res.send("Running...");
});

app.listen(process.env.PORT || 3000);
