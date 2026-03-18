const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const TOKEN = "8651056162:AAFoTNM6DHlUJv4CLhR8GKF_62FWLASFImk";
const API = `https://api.telegram.org/bot${TOKEN}`;

// ====== DATA ======
let state = {};
let users = {}; // username -> {password, coin}

// ====== SEND MSG ======
function send(chatId, text, keyboard = null) {
  return axios.post(`${API}/sendMessage`, {
    chat_id: chatId,
    text,
    reply_markup: keyboard
      ? { keyboard, resize_keyboard: true }
      : undefined,
  });
}

// ====== WEBHOOK ======
app.post("/", (req, res) => {
  res.sendStatus(200); // ⚡ FAST reply

  const update = req.body;
  if (!update.message) return;

  const chatId = update.message.chat.id;
  const text = update.message.text;

  if (!state[chatId]) state[chatId] = {};

  // ===== START =====
  if (text === "/start") {
    state[chatId] = {};
    return send(chatId, "Welcome 👇", [
      ["Admin Login"],
      ["User Login"],
    ]);
  }

  // ===== ADMIN LOGIN =====
  if (text === "Admin Login") {
    state[chatId].step = "admin_pass";
    return send(chatId, "🔑 Enter Admin Password:");
  }

  if (state[chatId].step === "admin_pass") {
    if (text === "794082") {
      state[chatId].admin = true;
      state[chatId].step = null;

      return send(chatId, "✅ Admin Panel", [
        ["User Add", "User List"],
        ["Back"],
      ]);
    } else {
      return send(chatId, "❌ Wrong Password");
    }
  }

  // ===== USER ADD =====
  if (text === "User Add" && state[chatId].admin) {
    state[chatId].step = "add_user";
    return send(chatId, "Enter username:");
  }

  if (state[chatId].step === "add_user") {
    state[chatId].newUser = text;
    state[chatId].step = "add_pass";
    return send(chatId, "Enter password:");
  }

  if (state[chatId].step === "add_pass") {
    users[state[chatId].newUser] = {
      password: text,
      coin: 5,
    };
    state[chatId].step = null;

    return send(chatId, "✅ User created", [
      ["User Add", "User List"],
      ["Back"],
    ]);
  }

  // ===== USER LIST =====
  if (text === "User List" && state[chatId].admin) {
    let list = Object.keys(users)
      .map((u) => `${u} (coin: ${users[u].coin})`)
      .join("\n");

    return send(chatId, list || "No users");
  }

  // ===== USER LOGIN =====
  if (text === "User Login") {
    state[chatId].step = "user_id";
    return send(chatId, "Enter User ID:");
  }

  if (state[chatId].step === "user_id") {
    state[chatId].loginUser = text;
    state[chatId].step = "user_pass";
    return send(chatId, "Enter Password:");
  }

  if (state[chatId].step === "user_pass") {
    let u = users[state[chatId].loginUser];

    if (u && u.password === text) {
      state[chatId].user = state[chatId].loginUser;
      state[chatId].step = null;

      return send(chatId, "✅ User Panel", [
        ["Send SMS", "Balance"],
        ["Back"],
      ]);
    } else {
      return send(chatId, "❌ Login Failed");
    }
  }

  // ===== BALANCE =====
  if (text === "Balance" && state[chatId].user) {
    let u = users[state[chatId].user];
    return send(chatId, `💰 Coin: ${u.coin}`);
  }

  // ===== SMS =====
  if (text === "Send SMS" && state[chatId].user) {
    state[chatId].step = "sms_number";
    return send(chatId, "Enter number:");
  }

  if (state[chatId].step === "sms_number") {
    state[chatId].number = text;
    state[chatId].step = "sms_msg";
    return send(chatId, "Enter message:");
  }

  if (state[chatId].step === "sms_msg") {
    let u = users[state[chatId].user];

    if (u.coin <= 0) {
      return send(chatId, "❌ No coin");
    }

    let number = state[chatId].number;
    let msg = text;

    // ===== SMS API =====
    axios.get(
      `https://mahirvai.com/sms.php?key=AM–MRXRPSh2PU&number=${number}&msg=${encodeURIComponent(msg)}`
    );

    u.coin -= 1;
    state[chatId].step = null;

    return send(chatId, "✅ SMS Sent", [
      ["Send SMS", "Balance"],
      ["Back"],
    ]);
  }

  // ===== BACK =====
  if (text === "Back") {
    state[chatId] = {};
    return send(chatId, "Welcome 👇", [
      ["Admin Login"],
      ["User Login"],
    ]);
  }
});

// ===== SERVER =====
app.listen(process.env.PORT || 3000, () =>
  console.log("Server running")
);
