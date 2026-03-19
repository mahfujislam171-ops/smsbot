const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const TOKEN = "8651056162:AAGMY4F0HVZzic89t_MEZ2X7a1dOUfhxJ1g";
const API = `https://api.telegram.org/bot${TOKEN}`;

// ===== DATA =====
let state = {};
let users = {};
let apiLink = "https://mahirvai.com/sms.php?key=AM–MRXRPSh2PU&number=01XXXXXXXX&msg=XXXX";
let adminPass = "794082";

// ===== BAN ADD =====
let ban = {};
const OWNER_ID = 6079418217;

// ===== SEND =====
function send(id, text, keyboard) {
  axios.post(`${API}/sendMessage`, {
    chat_id: id,
    text,
    reply_markup: keyboard ? { keyboard, resize_keyboard: true } : undefined,
  }).catch(() => {});
}

// ===== RESET =====
function reset(id) {
  state[id] = {};
}

// ===== HOME =====
function home(id) {
  reset(id);
  send(id, "স্বাগতম 👇", [
    ["Admin Login"],
    ["User Login"]
  ]);
}

// ===== ADMIN PANEL =====
function adminPanel(id) {
  state[id] = { admin: true };
  send(id, "✅ Admin Panel", [
    ["User Add", "User List"],
    ["User Manage"],
    ["API EDITOR", "PASSWORD CHANGE"],
    ["Back"]
  ]);
}

// ===== USER PANEL =====
function userPanel(id, user) {
  state[id] = { user };
  send(id, "✅ User Panel", [
    ["Send SMS", "Balance"],
    ["Back"]
  ]);
}

// ===== ROOT =====
app.get("/", (req, res) => {
  res.send("Bot Running ✅");
});

// ===== WEBHOOK =====
app.post("/", (req, res) => {
  res.sendStatus(200);

  const msg = req.body.message;
  if (!msg || !msg.text) return;

  const id = msg.chat.id;
  const text = msg.text;

  if (!state[id]) state[id] = {};

  // ===== START =====
  if (text === "/start") return home(id);

  // ===== BACK FIX =====
  if (text === "Back") {
    if (state[id].step) {
      if (state[id].admin) return adminPanel(id);
      if (state[id].user) return userPanel(id, state[id].user);
    }
    return home(id);
  }

  // ===== ADMIN LOGIN =====
  if (text === "Admin Login") {
    reset(id);
    state[id] = { mode: "admin", step: "pass" };
    return send(id, "🔑 Enter Admin Password:");
  }

  // ===== USER LOGIN =====
  if (text === "User Login") {
    reset(id);
    state[id] = { mode: "user", step: "id" };
    return send(id, "Enter User ID:");
  }

  // ===== BAN CHECK =====
  if (ban[id] && id !== OWNER_ID) {
    let left = Math.floor((ban[id] - Date.now()) / 1000);

    if (left > 0) {
      let h = Math.floor(left / 3600);
      let m = Math.floor((left % 3600) / 60);
      let s = left % 60;

      return send(id, `⛔ Temporary Ban\n⏳ ${h}h ${m}m ${s}s left`);
    } else {
      delete ban[id];
    }
  }

  // ===== ADMIN PASS =====
  if (state[id].mode === "admin" && state[id].step === "pass") {
    if (text === adminPass) {
      return adminPanel(id);
    } else {
      if (id !== OWNER_ID) {
        ban[id] = Date.now() + (24 * 60 * 60 * 1000);
      }
      return send(id, "❌ Wrong Password\n🚫 You are banned for 24 hours");
    }
  }

  // ===== USER LOGIN FLOW =====
  if (state[id].mode === "user" && state[id].step === "id") {
    state[id].loginUser = text;
    state[id].step = "pass";
    return send(id, "Enter Password:");
  }

  if (state[id].mode === "user" && state[id].step === "pass") {
    let u = users[state[id].loginUser];

    if (u && u.password === text) {
      return userPanel(id, state[id].loginUser);
    } else {
      return send(id, "❌ Wrong Password");
    }
  }

  // ===== USER =====
  if (state[id].user) {

    let u = users[state[id].user];

    if (text === "Balance") {
      return send(id, `💰 ${u.coin}`);
    }

    if (text === "Send SMS") {
      state[id].step = "num";
      return send(id, "Number:");
    }

    if (state[id].step === "num") {
      state[id].num = text;
      state[id].step = "msg";
      return send(id, "Message:");
    }

    // ===== SMS FIXED =====
    if (state[id].step === "msg") {
      if (u.coin <= 0) return send(id, "❌ No Coin");

      let url = apiLink
        .replace("01XXXXXXXX", state[id].num)
        .replace("XXXX", text);

      axios.get(url)
        .then((res) => {
          let data = res.data.toString().toLowerCase();

          if (data.includes("success") || data.includes("sent") || data.includes("ok")) {
            u.coin--;
            return send(id, "✅ SMS Sent");
          } else {
            return send(id, "❌ API call problem, contact here:@MRX404BYTOWHID 👀");
          }
        })
        .catch(() => {
          return send(id, "❌ API call problem, contact here:@MRX404BYTOWHID 👀");
        });
    }
  }

});

app.listen(process.env.PORT || 3000);
