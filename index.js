const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const TOKEN = "8651056162:AAGMY4F0HVZzic89t_MEZ2X7a1dOUfhxJ1g";
const API = `https://api.telegram.org/bot${TOKEN}`;

let users = {};
let state = {};
let adminPass = "794082";
let apiKey = "AM-MRXRPSh2PU";
const OWNER = 6079418217;

// ===== ROOT =====
app.get("/", (req, res) => {
  res.send("Bot Running ✅");
});

// ===== SEND =====
function send(id, text, keyboard) {
  return axios.post(`${API}/sendMessage`, {
    chat_id: id,
    text,
    reply_markup: keyboard
      ? { keyboard, resize_keyboard: true }
      : undefined,
  }).catch(() => {});
}

// ===== RESET =====
function home(id) {
  state[id] = {};
  return send(id, "Welcome 👇", [
    ["Admin Login"],
    ["User Login"]
  ]);
}

// ===== MAIN =====
app.post("/", async (req, res) => {
  res.sendStatus(200);

  const msg = req.body.message;
  if (!msg || !msg.text) return;

  const id = msg.chat.id;
  const text = msg.text.trim();

  if (!state[id]) state[id] = {};

  // ===== BACK =====
  if (text.toLowerCase() === "back") {
    if (state[id].admin) {
      state[id] = { admin: true };
      return send(id, "Admin Panel", [
        ["User Add", "User List"],
        ["User Manage"],
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

    return home(id);
  }

  // ===== START =====
  if (text === "/start") return home(id);

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
        ["User Manage"],
        ["API EDITOR", "PASSWORD CHANGE"],
        ["Back"]
      ]);
    } else {
      return send(id, "Wrong Password");
    }
  }

  // ===== PASSWORD CHANGE =====
  if (text === "PASSWORD CHANGE") {
    state[id] = { admin: true, step: "old_pass" };
    return send(id, "Current Password:");
  }

  if (state[id].step === "old_pass") {
    if (text !== adminPass) return send(id, "Wrong");
    state[id].step = "new_pass1";
    return send(id, "New Password:");
  }

  if (state[id].step === "new_pass1") {
    state[id].temp = text;
    state[id].step = "new_pass2";
    return send(id, "Confirm Password:");
  }

  if (state[id].step === "new_pass2") {
    if (text !== state[id].temp) return send(id, "Not match");
    adminPass = text;
    state[id] = { admin: true };
    return send(id, "Updated");
  }

  // ===== USER ADD =====
  if (text === "User Add") {
    state[id] = { admin: true, step: "add_user" };
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
    return send(id, "User Created");
  }

  // ===== USER LIST =====
  if (text === "User List") {
    let list = Object.keys(users)
      .map(u => `${u} (${users[u].coin})`)
      .join("\n");
    return send(id, list || "No users");
  }

  // ===== USER MANAGE =====
  if (text === "User Manage") {
    let keys = Object.keys(users);
    state[id] = { admin: true, step: "select_user" };

    return send(id, "Select User:", [
      ...keys.map(u => [u]),
      ["Back"]
    ]);
  }

  // ===== SELECT USER =====
  if (state[id].step === "select_user" && users[text]) {
    state[id] = {
      admin: true,
      selected: text,
      step: "action"
    };

    return send(id, `User: ${text}`, [
      ["Delete", "Edit Coin"],
      ["Back"]
    ]);
  }

  // ===== DELETE =====
  if (state[id].step === "action" && text === "Delete") {
    delete users[state[id].selected];
    state[id] = { admin: true };
    return send(id, "Deleted");
  }

  // ===== COIN EDIT =====
  if (state[id].step === "action" && text === "Edit Coin") {
    state[id].step = "coin";
    return send(id, "New coin:");
  }

  if (state[id].step === "coin") {
    users[state[id].selected].coin = parseInt(text);
    state[id] = { admin: true };
    return send(id, "Updated");
  }

  // ===== API EDITOR =====
  if (text === "API EDITOR") {
    return send(id, "API Panel", [
      ["API CHANGE", "API BALANCE"],
      ["Back"]
    ]);
  }

  if (text === "API CHANGE") {
    state[id] = { admin: true, step: "api" };
    return send(id, `Current Key: ${apiKey}\nSend new key:`);
  }

  if (state[id].step === "api") {
    apiKey = text;
    state[id] = { admin: true };
    return send(id, "API Updated");
  }

  if (text === "API BALANCE") {
    return send(id, "https://mahirvai.com/Balance.html");
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
    }
    return send(id, "Wrong");
  }

  // ===== USER PANEL =====
  if (state[id].user) {

    if (text === "Balance") {
      return send(id, `${users[state[id].user].coin}`);
    }

    if (text === "Coin Buy") {
      return send(id, "https://t.me/MRX404BYTOWHID");
    }

    if (text === "Send SMS") {
      state[id].step = "num";
      return send(id, "Number:");
    }
  }

  // ===== SMS =====
  if (state[id].step === "num") {
    state[id].num = text;
    state[id].step = "msg";
    return send(id, "Message:");
  }

  if (state[id].step === "msg") {
    let u = users[state[id].user];
    if (!u || u.coin <= 0) return send(id, "No coin");

    let url = `https://mahirvai.com/sms.php?key=${apiKey}&number=${state[id].num}&msg=${encodeURIComponent(text)}`;

    axios.get(url)
      .then(() => {
        u.coin--;
        state[id] = { user: state[id].user };
        send(id, "Sent");
      })
      .catch(() => {
        send(id, "Failed");
      });
  }

});

app.listen(process.env.PORT || 3000);
