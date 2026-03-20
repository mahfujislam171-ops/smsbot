const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const TOKEN = "YOUR_BOT_TOKEN";
const API = `https://api.telegram.org/bot${TOKEN}`;

// ===== DATA =====
let state = {};
let users = {};
let apiLink = "https://mahirvai.com/sms.php?key=XXX&number=01XXXXXXXX&msg=XXXX";
let adminPass = "794082";

// 🔥 MAIN FIX
let lastUpdate = 0;

// ===== SEND =====
function send(id, text, keyboard) {
  axios.post(`${API}/sendMessage`, {
    chat_id: id,
    text,
    reply_markup: keyboard ? { keyboard, resize_keyboard: true } : undefined,
  }).catch(() => {});
}

// ===== HOME =====
function home(id) {
  state[id] = {};
  send(id, "স্বাগতম 👇", [
    ["Admin Login"],
    ["User Login"]
  ]);
}

// ===== ADMIN PANEL =====
function adminPanel(id) {
  state[id] = { admin: true, step: null };

  send(id, "✅ Admin Panel 👇", [
    ["User Add", "User List"],
    ["User Manage"],
    ["API Editor", "Password Change"],
    ["Back"]
  ]);
}

// ===== USER PANEL =====
function userPanel(id, user) {
  state[id] = { user, step: null };

  send(id, "✅ User Panel", [
    ["Send SMS", "Balance"],
    ["Back"]
  ]);
}

// ===== WEBHOOK =====
app.post("/", async (req, res) => {
  res.sendStatus(200);

  const update = req.body;

  // 🔥 DUPLICATE UPDATE BLOCK
  if (update.update_id <= lastUpdate) return;
  lastUpdate = update.update_id;

  const msg = update.message;
  if (!msg || !msg.text) return;

  const id = msg.chat.id;
  const text = msg.text;

  if (!state[id]) state[id] = {};

  // ===== START =====
  if (text === "/start") return home(id);

  // ===== BACK FIX =====
  if (text === "Back") {
    state[id].step = null;

    if (state[id].admin) return adminPanel(id);
    if (state[id].user) return userPanel(id, state[id].user);

    return home(id);
  }

  // ===== ADMIN LOGIN =====
  if (text === "Admin Login") {
    state[id] = { mode: "admin", step: "pass" };
    return send(id, "Enter Admin Password:");
  }

  if (state[id].mode === "admin" && state[id].step === "pass") {
    if (text === adminPass) return adminPanel(id);
    return send(id, "❌ Wrong Password");
  }

  // ===== USER LOGIN =====
  if (text === "User Login") {
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

  // ===== ADMIN =====
  if (state[id].admin) {

    if (text === "User Add") {
      state[id].step = "add_user";
      return send(id, "Username:");
    }

    if (text === "User List") {
      let list = Object.keys(users).map(u => `${u} (${users[u].coin})`).join("\n");
      return send(id, list || "No users");
    }

    if (text === "User Manage") {
      let list = Object.keys(users);
      if (!list.length) return send(id, "No users");

      state[id].step = "select_user";
      return send(id, "Select User:", [...list.map(u => [u]), ["Back"]]);
    }

    if (text === "API Editor") {
      state[id].step = "api_menu";
      return send(id, "API Menu", [
        ["Change API", "Balance Link"],
        ["Back"]
      ]);
    }

    if (text === "Password Change") {
      state[id].step = "old_pass";
      return send(id, "Old Password:");
    }
  }

  // ===== USER ADD FIX =====
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

    state[id].step = null;
    return send(id, "✅ User Added");
  }

  // ===== API FIX =====
  if (state[id].step === "api_menu") {

    if (text === "Change API") {
      state[id].step = "api_set";
      return send(id, "Send full API link:");
    }

    if (text === "Balance Link") {
      return send(id, "https://mahirvai.com/Balance.html");
    }

    return;
  }

  if (state[id].step === "api_set") {

    if (!text.includes("http"))
      return send(id, "❌ Invalid Link");

    apiLink = text;
    state[id].step = null;
    return send(id, "✅ API Updated");
  }

  // ===== USER =====
  if (state[id].user) {

    let u = users[state[id].user];

    if (text === "Balance")
      return send(id, `💰 ${u.coin}`);

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

      if (u.coin <= 0)
        return send(id, "❌ No Coin");

      let url = apiLink
        .replace("01XXXXXXXX", state[id].num)
        .replace("XXXX", text);

      try {
        await axios.get(url);
        u.coin--;

        state[id].step = null;
        return send(id, "✅ SMS Sent");

      } catch {
        return send(id, "❌ API Error");
      }
    }
  }

});

app.listen(process.env.PORT || 3000);
