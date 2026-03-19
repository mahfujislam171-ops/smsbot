const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const TOKEN = "YOUR_BOT_TOKEN";
const API = `https://api.telegram.org/bot${TOKEN}`;

// ===== CONFIG =====
const OWNER_ID = 6079418217;
let ADMIN_PASSWORD = "794082";
let SMS_API_KEY = "AM–MRXRPSh2PU";

// ===== STORAGE =====
let state = {};
let users = {};
let banList = {};

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
  let h = Math.floor(ms / 3600000);
  let m = Math.floor((ms % 3600000) / 60000);
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

  // ===== BAN =====
  if (chatId !== OWNER_ID && banList[chatId]) {
    let left = banList[chatId] - Date.now();
    if (left > 0) {
      return send(chatId, `⛔ Ban\n⏳ ${getRemaining(left)}`);
    } else {
      delete banList[chatId];
    }
  }

  // ===== START / BACK =====
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

  if (state[chatId].mode === "admin" && state[chatId].step === "pass") {
    if (text === ADMIN_PASSWORD) {
      state[chatId] = { admin: true };

      return send(chatId, "Admin Panel", [
        ["User Add", "User List"],
        ["User Manage"],
        ["API EDITOR", "PASSWORD CHANGE"],
        ["Back"]
      ]);
    } else {
      if (chatId !== OWNER_ID) {
        banList[chatId] = Date.now() + 86400000;
        return send(chatId, "❌ Wrong Password\n⛔ 24h Ban");
      }
      return send(chatId, "Wrong Password");
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
    return send(chatId, "Password:");
  }

  if (state[chatId].mode === "user" && state[chatId].step === "pass") {
    let u = users[state[chatId].loginUser];
    if (u && u.password === text) {
      state[chatId] = { user: state[chatId].loginUser };

      return send(chatId, "User Panel", [
        ["Send SMS", "Balance"],
        ["Back"]
      ]);
    }
    return send(chatId, "Wrong Password");
  }

  // ===== ADMIN PANEL =====
  if (state[chatId].admin) {

    // ===== PASSWORD CHANGE =====
    if (text === "PASSWORD CHANGE") {
      state[chatId] = { admin: true, step: "old_pass" };
      return send(chatId, "Current Password:");
    }

    if (state[chatId].step === "old_pass") {
      if (text !== ADMIN_PASSWORD) return send(chatId, "Wrong");
      state[chatId].step = "new_pass";
      return send(chatId, "New Password:");
    }

    if (state[chatId].step === "new_pass") {
      state[chatId].temp = text;
      state[chatId].step = "confirm_pass";
      return send(chatId, "Confirm Password:");
    }

    if (state[chatId].step === "confirm_pass") {
      if (text !== state[chatId].temp) return send(chatId, "Mismatch");
      ADMIN_PASSWORD = text;
      state[chatId] = { admin: true };
      return send(chatId, "Updated");
    }

    // ===== API EDITOR =====
    if (text === "API EDITOR") {
      return send(chatId, "API Editor", [
        ["API CHANGE", "API BALANCE"],
        ["Back"]
      ]);
    }

    if (text === "API BALANCE") {
      return send(chatId, "https://mahirvai.com/Balance.html");
    }

    if (text === "API CHANGE") {
      state[chatId].step = "api_change";
      return send(chatId,
`Current:
https://mahirvai.com/sms.php?key=${SMS_API_KEY}&number=01XXXXXXXX&msg=XXXX

Send new link`);
    }

    if (state[chatId].step === "api_change") {
      let key = text.match(/key=([^&]+)/);
      if (!key) return send(chatId, "Invalid");
      SMS_API_KEY = key[1];
      state[chatId] = { admin: true };
      return send(chatId, "API Updated");
    }

    // ===== USER ADD =====
    if (text === "User Add") {
      state[chatId] = { admin: true, step: "add_user" };
      return send(chatId, "Username:");
    }

    if (state[chatId].step === "add_user") {
      state[chatId].u = text;
      state[chatId].step = "add_pass";
      return send(chatId, "Password:");
    }

    if (state[chatId].step === "add_pass") {
      state[chatId].p = text;
      state[chatId].step = "add_coin";
      return send(chatId, "Coin:");
    }

    if (state[chatId].step === "add_coin") {
      users[state[chatId].u] = {
        password: state[chatId].p,
        coin: parseInt(text)
      };
      state[chatId] = { admin: true };
      return send(chatId, "User Created");
    }

    // ===== USER LIST =====
    if (text === "User List") {
      let list = Object.keys(users)
        .map(u => `${u} (${users[u].coin})`)
        .join("\n");
      return send(chatId, list || "No users");
    }

    // ===== USER MANAGE =====
    if (text === "User Manage") {
      let keys = Object.keys(users);
      state[chatId] = { admin: true, step: "select_user" };
      return send(chatId, "Select User:", [
        ...keys.map(u => [u]),
        ["Back"]
      ]);
    }

    if (state[chatId].step === "select_user" && users[text]) {
      state[chatId] = {
        admin: true,
        selected: text,
        step: "action"
      };

      return send(chatId, `User: ${text}`, [
        ["Delete", "Edit Coin"],
        ["Back"]
      ]);
    }

    if (state[chatId].step === "action" && text === "Delete") {
      delete users[state[chatId].selected];
      state[chatId] = { admin: true };
      return send(chatId, "Deleted");
    }

    if (state[chatId].step === "action" && text === "Edit Coin") {
      state[chatId].step = "coin_input";
      return send(chatId, "Enter coin:", [["Back"]]);
    }

    if (state[chatId].step === "coin_input") {
      users[state[chatId].selected].coin = parseInt(text);
      state[chatId] = { admin: true };
      return send(chatId, "Updated");
    }
  }

  // ===== USER PANEL =====
  if (state[chatId].user) {

    if (text === "Balance") {
      return send(chatId, `${users[state[chatId].user].coin}`);
    }

    if (text === "Send SMS") {
      state[chatId].step = "num";
      return send(chatId, "Number:");
    }
  }

  // ===== SMS =====
  if (state[chatId].step === "num") {
    state[chatId].number = text;
    state[chatId].step = "msg";
    return send(chatId, "Message:");
  }

  if (state[chatId].step === "msg") {
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
