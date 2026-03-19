const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const TOKEN = "8651056162:AAGMY4F0HVZzic89t_MEZ2X7a1dOUfhxJ1g";
const API = `https://api.telegram.org/bot${TOKEN}`;

let state = {};
let users = {};
let adminPass = "794082";
let apiLink = "https://mahirvai.com/sms.php?key=AM-MRXRPSh2PU&number={number}&msg={msg}";
let ban = {};
const OWNER_ID = 6079418217; // তোমার ID

// ===== ROOT =====
app.get("/", (req, res) => {
  res.send("Bot Running ✅");
});

// ===== SEND =====
function send(id, text, keyboard) {
  axios.post(`${API}/sendMessage`, {
    chat_id: id,
    text,
    reply_markup: keyboard
      ? { keyboard, resize_keyboard: true }
      : undefined,
  }).catch(() => {});
}

// ===== RESET =====
function reset(id) {
  state[id] = {};
}

// ===== TIME LEFT =====
function timeLeft(t) {
  let s = Math.floor((t - Date.now()) / 1000);
  let h = Math.floor(s / 3600);
  let m = Math.floor((s % 3600) / 60);
  return `${h}h ${m}m`;
}

// ===== WEBHOOK =====
app.post("/", (req, res) => {
  res.sendStatus(200);

  const msg = req.body.message;
  if (!msg || !msg.text) return;

  const id = msg.chat.id;
  const text = msg.text;

  if (!state[id]) state[id] = {};

  // ===== BAN =====
  if (ban[id] && ban[id] > Date.now() && id !== OWNER_ID) {
    return send(id, `⛔ Banned\nTime left: ${timeLeft(ban[id])}`);
  }

  // ===== BACK (GLOBAL FIX) =====
  if (text.toLowerCase() === "back") {
    if (state[id].admin) {
      state[id] = { admin: true };
      return send(id, "Admin Panel", [
        ["User Add", "User List"],
        ["User Delete", "Coin Edit"],
        ["API EDITOR", "PASSWORD CHANGE"],
        ["Back"]
      ]);
    }

    if (state[id].user) {
      state[id] = { user: state[id].user };
      return send(id, "User Panel", [
        ["Send SMS", "Balance"],
        ["Coin Buy"],
        ["Back"]
      ]);
    }

    reset(id);
    return send(id, "Welcome 👇", [
      ["Admin Login"],
      ["User Login"]
    ]);
  }

  // ===== START =====
  if (text === "/start") {
    reset(id);
    return send(id, "Welcome 👇", [
      ["Admin Login"],
      ["User Login"]
    ]);
  }

  // ===== ADMIN LOGIN =====
  if (text === "Admin Login") {
    state[id] = { step: "admin_pass" };
    return send(id, "Enter Admin Password:");
  }

  if (state[id].step === "admin_pass") {
    if (text === adminPass) {
      state[id] = { admin: true };
      return send(id, "Admin Panel", [
        ["User Add", "User List"],
        ["User Delete", "Coin Edit"],
        ["API EDITOR", "PASSWORD CHANGE"],
        ["Back"]
      ]);
    } else {
      ban[id] = Date.now() + 86400000;
      return send(id, "❌ Wrong Password\n⛔ 24h Ban");
    }
  }

  // ===== PASSWORD CHANGE =====
  if (text === "PASSWORD CHANGE") {
    state[id].step = "old_pass";
    return send(id, "Enter current password:");
  }

  if (state[id].step === "old_pass") {
    if (text !== adminPass) return send(id, "Wrong!");
    state[id].step = "new1";
    return send(id, "New password:");
  }

  if (state[id].step === "new1") {
    state[id].temp = text;
    state[id].step = "new2";
    return send(id, "Confirm password:");
  }

  if (state[id].step === "new2") {
    if (text !== state[id].temp) return send(id, "Not match!");
    adminPass = text;
    state[id] = { admin: true };
    return send(id, "✅ Password Updated");
  }

  // ===== USER ADD =====
  if (text === "User Add") {
    state[id].step = "add_user";
    return send(id, "Username:");
  }

  if (state[id].step === "add_user") {
    state[id].u = text;
    state[id].step = "add_pass";
    return send(id, "Password:");
  }

  if (state[id].step === "add_pass") {
    state[id].p = text;
    state[id].step = "add_coin";
    return send(id, "Coin:");
  }

  if (state[id].step === "add_coin") {
    users[state[id].u] = {
      password: state[id].p,
      coin: parseInt(text)
    };
    state[id] = { admin: true };
    return send(id, "✅ User Created");
  }

  // ===== USER LIST =====
  if (text === "User List") {
    let list = Object.keys(users)
      .map(u => `${u} (${users[u].coin})`)
      .join("\n");
    return send(id, list || "No users");
  }

  // ===== USER DELETE / SELECT =====
  if (text === "User Delete") {
    let keys = Object.keys(users).map(u => [u]);
    return send(id, "Select User:", [...keys, ["Back"]]);
  }

  // ===== COIN EDIT SELECT =====
  if (text === "Coin Edit") {
    let keys = Object.keys(users).map(u => [u]);
    return send(id, "Select User:", [...keys, ["Back"]]);
  }

  // ===== USER SELECT ACTION =====
  if (state[id].admin && users[text]) {
    state[id].selected = text;
    return send(id, `Selected: ${text}`, [
      ["Delete", "Edit Coin"],
      ["Back"]
    ]);
  }

  if (text === "Delete") {
    delete users[state[id].selected];
    state[id] = { admin: true };
    return send(id, "✅ Deleted");
  }

  if (text === "Edit Coin") {
    state[id].step = "coin_new";
    return send(id, "Enter new coin:");
  }

  if (state[id].step === "coin_new") {
    users[state[id].selected].coin = parseInt(text);
    state[id] = { admin: true };
    return send(id, "✅ Updated");
  }

  // ===== API EDITOR =====
  if (text === "API EDITOR") {
    return send(id, "API Panel", [
      ["API CHANGE", "API BALANCE"],
      ["Back"]
    ]);
  }

  if (text === "API CHANGE") {
    state[id].step = "api_new";
    return send(id, `Current:\n${apiLink}\n\nSend new API link:`);
  }

  if (state[id].step === "api_new") {
    apiLink = text;
    state[id] = { admin: true };
    return send(id, "✅ API Updated");
  }

  if (text === "API BALANCE") {
    return send(id, "🔗 https://mahirvai.com/Balance.html");
  }

  // ===== USER LOGIN =====
  if (text === "User Login") {
    state[id] = { step: "login_user" };
    return send(id, "Username:");
  }

  if (state[id].step === "login_user") {
    state[id].lu = text;
    state[id].step = "login_pass";
    return send(id, "Password:");
  }

  if (state[id].step === "login_pass") {
    let u = users[state[id].lu];
    if (u && u.password === text) {
      state[id] = { user: state[id].lu };
      return send(id, "User Panel", [
        ["Send SMS", "Balance"],
        ["Coin Buy"],
        ["Back"]
      ]);
    } else {
      return send(id, "Wrong!");
    }
  }

  // ===== USER PANEL =====
  if (state[id].user) {

    if (text === "Balance") {
      return send(id, `💰 ${users[state[id].user].coin}`);
    }

    if (text === "Coin Buy") {
      return send(id, "https://t.me/MRX404BYTOWHID");
    }

    if (text === "Send SMS") {
      state[id].step = "sms_num";
      return send(id, "Enter Number:");
    }
  }

  // ===== SMS =====
  if (state[id].step === "sms_num") {
    state[id].num = text;
    state[id].step = "sms_msg";
    return send(id, "Enter Message:");
  }

  if (state[id].step === "sms_msg") {
    let u = users[state[id].user];
    if (!u || u.coin <= 0) return send(id, "❌ No Coin");

    let url = apiLink
      .replace("{number}", state[id].num)
      .replace("{msg}", encodeURIComponent(text));

    axios.get(url)
      .then(() => {
        u.coin--;
        state[id] = { user: state[id].user };
        send(id, "✅ SMS Sent");
      })
      .catch(() => {
        send(id, "❌ Failed");
      });
  }

});

app.listen(process.env.PORT || 3000);
