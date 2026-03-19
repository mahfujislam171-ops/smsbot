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
    reset(id); // 🔥 FIX
    state[id] = { mode: "user", step: "id" };
    return send(id, "Enter User ID:");
  }

  // ===== ADMIN PASS =====
  if (state[id].mode === "admin" && state[id].step === "pass") {
    if (text === adminPass) {
      return adminPanel(id);
    } else {
      return send(id, "❌ Wrong Password");
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

  // ===== ADMIN =====
  if (state[id].admin) {

    if (text === "User Add") {
      state[id].step = "add_user";
      return send(id, "Username:");
    }

    if (text === "User List") {
      let list = Object.keys(users)
        .map(u => `${u} (coin: ${users[u].coin})`)
        .join("\n");
      return send(id, list || "No users");
    }

    if (text === "User Manage") {
      let list = Object.keys(users);
      if (!list.length) return send(id, "No users");

      state[id].step = "select_user";
      return send(id, "Select User:", [...list.map(u => [u]), ["Back"]]);
    }

    if (text === "API EDITOR") {
      state[id].step = "api_menu";
      return send(id, "🔧 API Editor", [
        ["API CHANGE", "API BALANCE"],
        ["Back"]
      ]);
    }

    if (text === "PASSWORD CHANGE") {
      state[id].step = "old_pass";
      return send(id, "Enter current password:");
    }
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

  // ===== USER MANAGE =====
  if (state[id].step === "select_user") {
    state[id].target = text;
    state[id].step = "manage";
    return send(id, `User: ${text}`, [
      ["Edit Coin", "Delete"],
      ["Back"]
    ]);
  }

  if (state[id].step === "manage" && text === "Delete") {
    delete users[state[id].target];
    return send(id, "✅ Deleted");
  }

  if (state[id].step === "manage" && text === "Edit Coin") {
    state[id].step = "edit_coin";
    return send(id, "New coin:");
  }

  if (state[id].step === "edit_coin") {
    users[state[id].target].coin = parseInt(text);
    return send(id, "✅ Updated");
  }

  // ===== API =====
  if (state[id].step === "api_menu") {
    if (text === "API CHANGE") {
      state[id].step = "api_change";
      return send(id,
        `Current API:\n${apiLink}\n\nSend new full link:\nhttps://mahirvai.com/sms.php?key=XXX&number=01XXXXXXXX&msg=XXXX`
      );
    }

    if (text === "API BALANCE") {
      return send(id, "🔗 https://mahirvai.com/Balance.html");
    }
  }

  if (state[id].step === "api_change") {
    apiLink = text;
    return send(id, "✅ API Updated");
  }

  // ===== PASSWORD CHANGE =====
  if (state[id].step === "old_pass") {
    if (text !== adminPass) return send(id, "❌ Wrong");
    state[id].step = "new_pass";
    return send(id, "New password:");
  }

  if (state[id].step === "new_pass") {
    state[id].newPass = text;
    state[id].step = "confirm_pass";
    return send(id, "Confirm password:");
  }

  if (state[id].step === "confirm_pass") {
    if (text !== state[id].newPass) return send(id, "❌ Not match");
    adminPass = text;
    return send(id, "✅ Password Updated");
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

    if (state[id].step === "msg") {
      if (u.coin <= 0) return send(id, "❌ No Coin");

      let url = apiLink
        .replace("01XXXXXXXX", state[id].num)
        .replace("XXXX", text);

      axios.get(url)
        .then(() => {
          u.coin--;
          return send(id, "✅ SMS Sent");
        })
        .catch(() => {
          return send(id, "❌ API call problem, contact here:@MRX404BYTOWHID 👀");
        });
    }
  }

});

app.listen(process.env.PORT || 3000);
