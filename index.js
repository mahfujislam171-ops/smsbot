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

// ===== BAN =====
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
  state[id] = { admin: true, step: null };
  send(id, "✅ Admin Panel", [
    ["User Add", "User List"],
    ["User Manage"],
    ["API EDITOR", "PASSWORD CHANGE"],
    ["Back"]
  ]);
}

// ===== USER PANEL =====
function userPanel(id, user) {
  state[id] = { user: user, step: null };
  send(id, "✅ User Panel", [
    ["Send SMS", "Balance"],
    ["Back"]
  ]);
}

// ===== SERVER =====
app.get("/", (req, res) => {
  res.send("Bot Running ✅");
});

// ===== WEBHOOK =====
app.post("/", async (req, res) => {
  res.sendStatus(200);

  const msg = req.body.message;
  if (!msg || !msg.text) return;

  const id = msg.chat.id;
  const text = msg.text;

  if (!state[id]) state[id] = {};

  // ===== START =====
  if (text === "/start") return home(id);

  // ===== BACK =====
  if (text === "Back") {
    if (state[id].step) {
      state[id].step = null;
      if (state[id].admin) return adminPanel(id);
      if (state[id].user) return userPanel(id, state[id].user);
    }
    return home(id);
  }

  // ===== ADMIN LOGIN =====
  if (text === "Admin Login") {
    reset(id);
    state[id] = { mode: "admin", step: "pass" };
    return send(id, "Enter Admin Password:");
  }

  if (state[id].mode === "admin" && state[id].step === "pass") {
    if (text === adminPass) return adminPanel(id);
    return send(id, "❌ Wrong Password");
  }

  // ===== USER LOGIN =====
  if (text === "User Login") {
    reset(id);
    state[id] = { mode: "user", step: "id" };
    return send(id, "Enter ID:");
  }

  if (state[id].mode === "user" && state[id].step === "id") {
    state[id].loginUser = text;
    state[id].step = "pass";
    return send(id, "Enter Password:");
  }

  if (state[id].mode === "user" && state[id].step === "pass") {
    let u = users[state[id].loginUser];
    if (u && u.password === text) return userPanel(id, state[id].loginUser);
    return send(id, "❌ Wrong Password");
  }

  // ===== USER =====
  if (state[id].user) {

    let u = users[state[id].user];

    if (text === "Balance") return send(id, `💰 ${u.coin}`);

    if (text === "Send SMS") {
      state[id].step = "num";
      return send(id, "Number:");
    }

    if (state[id].step === "num") {
      state[id].num = text;
      state[id].step = "msg";
      return send(id, "Message:");
    }

    // 🔥 FINAL FIX HERE
    if (state[id].step === "msg") {

      if (u.coin <= 0) return send(id, "❌ No Coin");

      let url = apiLink
        .replace("01XXXXXXXX", state[id].num)
        .replace("XXXX", text);

      try {
        let r = await axios.get(url);

        let data = (r.data + "").toLowerCase();

        // 👉 SUCCESS DETECT IMPROVED
        if (
          data.includes("success") ||
          data.includes("sent") ||
          data.includes("ok") ||
          data.includes("sms") ||
          data.length > 2 // fallback
        ) {
          u.coin--; // 🔥 COIN CUT FIX
          return send(id, "✅ SMS Sent");
        } else {
          return send(id, "❌ API Problem");
        }

      } catch (e) {
        return send(id, "❌ API Error");
      }
    }
  }

});

app.listen(process.env.PORT || 3000);
