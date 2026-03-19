const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const TOKEN = "8651056162:AAFTBhrkoNg5Mpg-cIYj-zSmf6S5LBISgZM";
const API = `https://api.telegram.org/bot${TOKEN}`;

// ===== CONFIG =====
const OWNER_ID = 6079418217;
let ADMIN_PASSWORD = "794082";
let SMS_API_KEY = "AM–MRXRPSh2PU";

// ===== STORAGE =====
let state = {};
let users = {};
let banList = {};

// ===== ROOT =====
app.get("/", (req, res) => {
  res.send("Bot Running ✅");
});

// ===== SEND =====
function send(chatId, text, keyboard) {
  axios.post(`${API}/sendMessage`, {
    chat_id: chatId,
    text,
    reply_markup: keyboard
      ? { keyboard, resize_keyboard: true }
      : undefined,
  }).catch(() => {});
}

// ===== RESET =====
function reset(chatId) {
  state[chatId] = {};
}

// ===== TIME FORMAT =====
function getRemaining(ms) {
  let h = Math.floor(ms / (1000 * 60 * 60));
  let m = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  return `${h}h ${m}m`;
}

// ===== WEBHOOK =====
app.post("/", (req, res) => {
  res.sendStatus(200);

  const update = req.body;
  if (!update.message) return;

  const msg = update.message;
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!text) return;

  if (!state[chatId]) state[chatId] = {};

  // ===== BAN CHECK =====
  if (chatId !== OWNER_ID && banList[chatId]) {
    let remaining = banList[chatId] - Date.now();

    if (remaining > 0) {
      return send(chatId, `⛔ Temporary Ban\n⏳ Time Left: ${getRemaining(remaining)}`);
    } else {
      delete banList[chatId];
    }
  }

  // ===== START =====
  if (text === "/start") {
    reset(chatId);
    return send(chatId, "মাহফুজের কাস্টম এসএমএস এ আপনাকে স্বাগতম 👇", [
      ["Admin Login"],
      ["User Login"]
    ]);
  }

  // ===== BACK =====
  if (text === "Back") {
    reset(chatId);
    return send(chatId, "মাহফুজের কাস্টম এসএমএস এ আপনাকে স্বাগতম 👇", [
      ["Admin Login"],
      ["User Login"]
    ]);
  }

  // ===== ADMIN LOGIN =====
  if (text === "Admin Login") {
    state[chatId] = { mode: "admin", step: "pass" };
    return send(chatId, "🔑 Enter Admin Password:");
  }

  // ===== USER LOGIN =====
  if (text === "User Login") {
    state[chatId] = { mode: "user", step: "id" };
    return send(chatId, "Enter User ID:");
  }

  // ===== ADMIN PASSWORD =====
  if (state[chatId].mode === "admin" && state[chatId].step === "pass") {

    if (text === ADMIN_PASSWORD) {
      state[chatId] = { admin: true };

      return send(chatId, "✅ Admin Panel", [
        ["User Add", "User List"],
        ["User Delete", "Coin Edit"],
        ["API EDITOR", "PASSWORD CHANGE"],
        ["Back"]
      ]);

    } else {
      if (chatId !== OWNER_ID) {
        banList[chatId] = Date.now() + (24 * 60 * 60 * 1000);
      }
      return send(chatId, "❌ Wrong Password\n⛔ You are banned for 24 hours");
    }
  }

  // ===== USER LOGIN =====
  if (state[chatId].mode === "user" && state[chatId].step === "id") {
    state[chatId].loginUser = text;
    state[chatId].step = "pass";
    return send(chatId, "Enter Password:");
  }

  if (state[chatId].mode === "user" && state[chatId].step === "pass") {
    let u = users[state[chatId].loginUser];

    if (u && u.password === text) {
      state[chatId] = { user: state[chatId].loginUser };

      return send(chatId, "✅ User Panel", [
        ["Send SMS", "Balance"],
        ["Coin Buy"],
        ["Back"]
      ]);
    } else {
      return send(chatId, "❌ Wrong Password");
    }
  }

  // ===== ADMIN PANEL =====
  if (state[chatId].admin) {

    // ===== USER ADD =====
    if (text === "User Add") {
      state[chatId].step = "add_user";
      return send(chatId, "Enter username:");
    }

    if (state[chatId].step === "add_user") {
      state[chatId].tempUser = text;
      state[chatId].step = "add_pass";
      return send(chatId, "Enter password:");
    }

    if (state[chatId].step === "add_pass") {
      state[chatId].tempPass = text;
      state[chatId].step = "add_coin";
      return send(chatId, "Enter coin amount:");
    }

    if (state[chatId].step === "add_coin") {
      users[state[chatId].tempUser] = {
        password: state[chatId].tempPass,
        coin: parseInt(text)
      };

      state[chatId] = { admin: true };

      return send(chatId, "✅ User Created", [
        ["User Add", "User List"],
        ["User Delete", "Coin Edit"],
        ["API EDITOR", "PASSWORD CHANGE"],
        ["Back"]
      ]);
    }

    // ===== USER LIST =====
    if (text === "User List") {
      let list = Object.keys(users)
        .map(u => `${u} (coin: ${users[u].coin})`)
        .join("\n");
      return send(chatId, list || "No users");
    }

    // ===== DELETE =====
    if (text === "User Delete") {
      state[chatId].step = "delete_user";
      return send(chatId, "Enter username:");
    }

    if (state[chatId].step === "delete_user") {
      if (users[text]) {
        delete users[text];
        state[chatId] = { admin: true };
        return send(chatId, "✅ Deleted");
      } else {
        return send(chatId, "❌ Not found");
      }
    }

    // ===== COIN EDIT =====
    if (text === "Coin Edit") {
      state[chatId].step = "coin_user";
      return send(chatId, "Enter username:");
    }

    if (state[chatId].step === "coin_user") {
      state[chatId].target = text;
      state[chatId].step = "coin_amount";
      return send(chatId, "Enter coin:");
    }

    if (state[chatId].step === "coin_amount") {
      let u = users[state[chatId].target];
      if (!u) return send(chatId, "❌ User not found");

      u.coin = parseInt(text);
      state[chatId] = { admin: true };

      return send(chatId, "✅ Updated");
    }
  }

  // ===== USER PANEL =====
  if (state[chatId].user) {

    if (text === "Balance") {
      return send(chatId, `💰 ${users[state[chatId].user].coin}`);
    }

    if (text === "Send SMS") {
      state[chatId].step = "sms_number";
      return send(chatId, "Enter Number:");
    }
  }

  // ===== SMS =====
  if (state[chatId].step === "sms_number") {
    state[chatId].number = text;
    state[chatId].step = "sms_msg";
    return send(chatId, "Enter Message:");
  }

  if (state[chatId].step === "sms_msg") {
    let u = users[state[chatId].user];
    if (u.coin <= 0) return send(chatId, "❌ No Coin");

    axios.get("https://mahirvai.com/sms.php", {
      params: {
        key: SMS_API_KEY,
        number: state[chatId].number,
        msg: text
      }
    }).then(() => {
      u.coin--;
      state[chatId] = { user: state[chatId].user };
      send(chatId, "✅ SMS Sent");
    }).catch(() => {
      send(chatId, "❌ Failed");
    });
  }

});

app.listen(process.env.PORT || 3000);
