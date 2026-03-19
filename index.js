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

// ===== TIME =====
function getRemaining(ms) {
  let h = Math.floor(ms / (1000 * 60 * 60));
  let m = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  return `${h}h ${m}m`;
}

// ===== WEBHOOK =====
app.post("/", (req, res) => {
  res.sendStatus(200);

  const msg = req.body.message;
  if (!msg) return;

  const chatId = msg.chat.id;
  const text = msg.text;

  if (!text) return;
  if (!state[chatId]) state[chatId] = {};

  // ===== BAN CHECK =====
  if (chatId !== OWNER_ID && banList[chatId]) {
    let remaining = banList[chatId] - Date.now();

    if (remaining > 0) {
      return send(chatId, `⛔ Temporary Ban\n⏳ ${getRemaining(remaining)}`);
    } else {
      delete banList[chatId];
    }
  }

  // ===== START =====
  if (text === "/start" || text === "Back") {
    reset(chatId);
    return send(chatId, "Welcome 👇", [
      ["Admin Login"],
      ["User Login"]
    ]);
  }

  // ===== ADMIN LOGIN =====
  if (text === "Admin Login") {
    state[chatId] = { mode: "admin", step: "pass" };
    return send(chatId, "Enter Admin Password:");
  }

  // ===== ADMIN PASS =====
  if (state[chatId].mode === "admin" && state[chatId].step === "pass") {

    if (text === ADMIN_PASSWORD) {
      state[chatId] = { admin: true };

      return send(chatId, "Admin Panel", [
        ["User Add", "User List"],
        ["User Delete", "Coin Edit"],
        ["API EDITOR", "PASSWORD CHANGE"],
        ["Back"]
      ]);

    } else {
      if (chatId !== OWNER_ID) {
        banList[chatId] = Date.now() + 86400000;
        return send(chatId, "❌ Wrong Password\n⛔ 24h Ban");
      } else {
        return send(chatId, "❌ Wrong Password");
      }
    }
  }

  // ===== USER LOGIN =====
  if (text === "User Login") {
    state[chatId] = { mode: "user", step: "id" };
    return send(chatId, "Enter ID:");
  }

  if (state[chatId].mode === "user" && state[chatId].step === "id") {
    state[chatId].loginUser = text;
    state[chatId].step = "pass";
    return send(chatId, "Enter Password:");
  }

  if (state[chatId].mode === "user" && state[chatId].step === "pass") {
    let u = users[state[chatId].loginUser];

    if (u && u.password === text) {
      state[chatId] = { user: state[chatId].loginUser };

      return send(chatId, "User Panel", [
        ["Send SMS", "Balance"],
        ["Back"]
      ]);
    } else {
      return send(chatId, "Wrong Password");
    }
  }

  // ===== ADMIN =====
  if (state[chatId].admin) {

    // ===== ADD USER =====
    if (text === "User Add") {
      state[chatId].step = "add_user";
      return send(chatId, "Username:");
    }

    if (state[chatId].step === "add_user") {
      state[chatId].tempUser = text;
      state[chatId].step = "add_pass";
      return send(chatId, "Password:");
    }

    if (state[chatId].step === "add_pass") {
      state[chatId].tempPass = text;
      state[chatId].step = "add_coin";
      return send(chatId, "Coin:");
    }

    if (state[chatId].step === "add_coin") {
      users[state[chatId].tempUser] = {
        password: state[chatId].tempPass,
        coin: parseInt(text)
      };

      state[chatId] = { admin: true };

      return send(chatId, "User Created");
    }

    // ===== LIST =====
    if (text === "User List") {
      let list = Object.keys(users).map(u => `${u} (${users[u].coin})`).join("\n");
      return send(chatId, list || "No users");
    }

    // ===== DELETE SELECT =====
    if (text === "User Delete") {
      let keys = Object.keys(users);
      return send(chatId, "Select User:", keys.map(u => [u]));
    }

    if (users[text] && state[chatId].admin) {
      if (state[chatId].last === "delete") {
        delete users[text];
        return send(chatId, "Deleted");
      }

      if (state[chatId].last === "coin") {
        state[chatId].target = text;
        state[chatId].step = "coin_set";
        return send(chatId, "Enter new coin:");
      }
    }

    // ===== SET STATE =====
    if (text === "User Delete") state[chatId].last = "delete";
    if (text === "Coin Edit") {
      state[chatId].last = "coin";
      let keys = Object.keys(users);
      return send(chatId, "Select User:", keys.map(u => [u]));
    }

    if (state[chatId].step === "coin_set") {
      users[state[chatId].target].coin = parseInt(text);
      return send(chatId, "Updated");
    }
  }

  // ===== USER PANEL =====
  if (state[chatId].user) {

    if (text === "Balance") {
      return send(chatId, `${users[state[chatId].user].coin}`);
    }

    if (text === "Send SMS") {
      state[chatId].step = "sms_num";
      return send(chatId, "Number:");
    }
  }

  // ===== SMS =====
  if (state[chatId].step === "sms_num") {
    state[chatId].number = text;
    state[chatId].step = "sms_msg";
    return send(chatId, "Message:");
  }

  if (state[chatId].step === "sms_msg") {
    let u = users[state[chatId].user];
    if (u.coin <= 0) return send(chatId, "No Coin");

    axios.get("https://mahirvai.com/sms.php", {
      params: {
        key: SMS_API_KEY,
        number: state[chatId].number,
        msg: text
      }
    }).then(() => {
      u.coin--;
      send(chatId, "SMS Sent");
    }).catch(() => {
      send(chatId, "Failed");
    });
  }

});

app.listen(process.env.PORT || 3000);
