const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const TOKEN = "8651056162:AAGMY4F0HVZzic89t_MEZ2X7a1dOUfhxJ1g";
const API = `https://api.telegram.org/bot${TOKEN}`;

let users = {};
let state = {};
let adminPass = "794082";

let apiLink = "https://mahirvai.com/sms.php?key=AM-MRXRPSh2PU&number=01XXXXXXXX&msg=XXXX";

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

// ===== PANELS =====
function home(id) {
  state[id] = {};
  return send(id, "স্বাগতম 👇", [
    ["Admin Login"],
    ["User Login"]
  ]);
}

function adminPanel(id) {
  state[id] = { admin: true };
  return send(id, "Admin Panel", [
    ["User Add", "User List"],
    ["User Manage"],
    ["API EDITOR", "PASSWORD CHANGE"],
    ["Back"]
  ]);
}

function userPanel(id, user) {
  state[id] = { user };
  return send(id, "User Panel", [
    ["Send SMS", "Balance"],
    ["Coin Buy"],
    ["Back"]
  ]);
}

// ===== ROOT =====
app.get("/", (req, res) => {
  res.send("Bot Running ✅");
});

// ===== MAIN =====
app.post("/", async (req, res) => {
  res.sendStatus(200);

  const msg = req.body.message;
  if (!msg || !msg.text) return;

  const id = msg.chat.id;
  const text = msg.text.trim();

  if (!state[id]) state[id] = {};

  // ===== BACK (FINAL FIX) =====
  if (text === "Back") {
    if (state[id].admin) return adminPanel(id);
    if (state[id].user) return userPanel(id, state[id].user);
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
    if (text === adminPass) return adminPanel(id);
    return send(id, "❌ Wrong Password");
  }

  // ===== PASSWORD CHANGE =====
  if (text === "PASSWORD CHANGE") {
    state[id] = { admin: true, step: "old" };
    return send(id, "Current Password:");
  }

  if (state[id].step === "old") {
    if (text !== adminPass) return send(id, "❌ Wrong");
    state[id].step = "new1";
    return send(id, "New Password:");
  }

  if (state[id].step === "new1") {
    state[id].temp = text;
    state[id].step = "new2";
    return send(id, "Confirm Password:");
  }

  if (state[id].step === "new2") {
    if (text !== state[id].temp) return send(id, "❌ Not match");
    adminPass = text;
    await send(id, "✅ Password Updated");
    return adminPanel(id);
  }

  // ===== USER ADD =====
  if (text === "User Add") {
    state[id] = { admin: true, step: "add_u" };
    return send(id, "Username:");
  }

  if (state[id].step === "add_u") {
    state[id].u = text;
    state[id].step = "add_p";
    return send(id, "Password:");
  }

  if (state[id].step === "add_p") {
    state[id].p = text;
    state[id].step = "add_c";
    return send(id, "Coin:");
  }

  if (state[id].step === "add_c") {
    users[state[id].u] = {
      password: state[id].p,
      coin: parseInt(text)
    };
    await send(id, "✅ User Created");
    return adminPanel(id);
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
    state[id] = { admin: true, step: "select" };

    return send(id, "Select User:", [
      ...keys.map(u => [u]),
      ["Back"]
    ]);
  }

  if (state[id].step === "select" && users[text]) {
    state[id] = { admin: true, selected: text, step: "action" };

    return send(id, `User: ${text}`, [
      ["Delete", "Edit Coin"],
      ["Back"]
    ]);
  }

  if (state[id].step === "action" && text === "Delete") {
    delete users[state[id].selected];
    await send(id, "✅ Deleted");
    return adminPanel(id);
  }

  if (state[id].step === "action" && text === "Edit Coin") {
    state[id].step = "coin";
    return send(id, "New coin:");
  }

  if (state[id].step === "coin") {
    users[state[id].selected].coin = parseInt(text);
    await send(id, "✅ Updated");
    return adminPanel(id);
  }

  // ===== API =====
  if (text === "API EDITOR") {
    return send(id, "API Panel", [
      ["API CHANGE", "API BALANCE"],
      ["Back"]
    ]);
  }

  if (text === "API CHANGE") {
    state[id] = { admin: true, step: "api" };
    return send(id, `Current API:\n${apiLink}\n\nSend new FULL API link:`);
  }

  if (state[id].step === "api") {
    apiLink = text;
    await send(id, "✅ API Updated");
    return adminPanel(id);
  }

  if (text === "API BALANCE") {
    return send(id, "https://mahirvai.com/Balance.html");
  }

  // ===== USER LOGIN =====
  if (text === "User Login") {
    state[id] = { step: "lu" };
    return send(id, "Username:");
  }

  if (state[id].step === "lu") {
    state[id].lu = text;
    state[id].step = "lp";
    return send(id, "Password:");
  }

  if (state[id].step === "lp") {
    let u = users[state[id].lu];
    if (u && u.password === text) return userPanel(id, state[id].lu);
    return send(id, "❌ Wrong");
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
      state[id].step = "num";
      return send(id, "Enter Number:");
    }
  }

  // ===== SMS =====
  if (state[id].step === "num") {
    state[id].num = text;
    state[id].step = "msg";
    return send(id, "Enter Message:");
  }

  if (state[id].step === "msg") {
    let u = users[state[id].user];
    if (!u || u.coin <= 0) return send(id, "❌ No Coin");

    let url = apiLink
      .replace("01XXXXXXXX", state[id].num)
      .replace("XXXX", encodeURIComponent(text));

    axios.get(url)
      .then(async () => {
        u.coin--;
        await send(id, "✅ SMS Sent");
        return userPanel(id, state[id].user);
      })
      .catch(async () => {
        await send(id, "❌ API Call Problem\nContact: @MRX404BYTOWHID 👀");
      });
  }

});

app.listen(process.env.PORT || 3000);
