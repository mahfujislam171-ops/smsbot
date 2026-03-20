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

// ===== SEND =====
function send(id, text, keyboard, inline = false) {
  axios.post(`${API}/sendMessage`, {
    chat_id: id,
    text,
    reply_markup: keyboard
      ? inline
        ? { inline_keyboard: keyboard }
        : { keyboard, resize_keyboard: true }
      : undefined,
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

// ===== ADMIN PANEL (INLINE BUTTON ADDED) =====
function adminPanel(id) {
  state[id] = { admin: true, step: null };

  send(id, "✅ Admin Panel 👇", [
    [{ text: "User Add", callback_data: "ua" }, { text: "User List", callback_data: "ul" }],
    [{ text: "User Manage", callback_data: "um" }],
    [{ text: "API Editor", callback_data: "api" }],
    [{ text: "Password Change", callback_data: "pass" }]
  ], true);
}

// ===== USER PANEL =====
function userPanel(id, user) {
  state[id] = { user, step: null };

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
  const cb = req.body.callback_query;

  // ===== INLINE BUTTON HANDLE =====
  if (cb) {
    const id = cb.message.chat.id;
    const data = cb.data;

    if (!state[id]) state[id] = {};

    if (data === "ua") {
      state[id].step = "add_user";
      return send(id, "Username:");
    }

    if (data === "ul") {
      let list = Object.keys(users).map(u => `${u} (${users[u].coin})`).join("\n");
      return send(id, list || "No users");
    }

    if (data === "um") {
      let list = Object.keys(users);
      if (!list.length) return send(id, "No users");

      state[id].step = "select_user";
      return send(id, "Select User:", [...list.map(u => [u]), ["Back"]]);
    }

    if (data === "api") {
      state[id].step = "api_menu";
      return send(id, "API Menu", [
        ["Change API", "Balance Link"],
        ["Back"]
      ]);
    }

    if (data === "pass") {
      state[id].step = "old_pass";
      return send(id, "Old Password:");
    }

    return;
  }

  if (!msg || !msg.text) return;

  const id = msg.chat.id;
  const text = msg.text;

  if (!state[id]) state[id] = {};

  // ===== START =====
  if (text === "/start") return home(id);

  // ===== BACK FIX =====
  if (text === "Back") {
    if (state[id].admin) return adminPanel(id);
    if (state[id].user) return userPanel(id, state[id].user);
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

  // ===== USER ADD =====
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
    return adminPanel(id);
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

    if (state[id].step === "msg") {
      if (u.coin <= 0) return send(id, "❌ No Coin");

      let url = apiLink
        .replace("01XXXXXXXX", state[id].num)
        .replace("XXXX", text);

      try {
        await axios.get(url);
        u.coin--;
        return send(id, "✅ SMS Sent");
      } catch {
        return send(id, "❌ API Error");
      }
    }
  }

});

app.listen(process.env.PORT || 3000);
