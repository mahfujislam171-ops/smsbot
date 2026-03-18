const express = require("express");
const axios = require("axios");
const app = express();

app.use(express.json());

const TOKEN = "8651056162:AAFkb1lRavN9v66ix3_I8gWQqUCvKG5322I";
const API = `https://api.telegram.org/bot${TOKEN}`;

const ADMIN_PASS = "794082";

// ===== DATABASE =====
let db = {
  users: {},
  sessions: {}
};

// ===== KEEP ALIVE =====
app.get("/", (req, res) => {
  res.send("Bot Running...");
});

// ===== SEND MSG =====
async function send(chatId, text, keyboard = null) {
  await axios.post(`${API}/sendMessage`, {
    chat_id: chatId,
    text,
    reply_markup: keyboard
  });
}

// ===== KEYBOARDS =====
const mainMenu = {
  keyboard: [["Admin Login"], ["User Login"]],
  resize_keyboard: true
};

const adminMenu = {
  keyboard: [["User Add"], ["User List"], ["Back"]],
  resize_keyboard: true
};

const userMenu = {
  keyboard: [["📩 Send SMS"], ["💰 Balance"], ["🔙 Back"]],
  resize_keyboard: true
};

// ===== WEBHOOK =====
app.post("/", async (req, res) => {
  const msg = req.body.message;
  if (!msg) return res.sendStatus(200);

  const chatId = msg.chat.id;
  const text = msg.text;

  let session = db.sessions[chatId] || {};

  // ===== START =====
  if (text === "/start") {
    db.sessions[chatId] = {};
    return send(chatId, "Welcome 👇", mainMenu);
  }

  // ===== ADMIN LOGIN =====
  if (text === "Admin Login") {
    db.sessions[chatId] = { step: "admin_pass" };
    return send(chatId, "Enter Admin Password:");
  }

  if (session.step === "admin_pass") {
    if (text === ADMIN_PASS) {
      db.sessions[chatId] = { step: "admin_panel" };
      return send(chatId, "Admin Panel 👇", adminMenu);
    } else {
      return send(chatId, "Wrong Password ❌");
    }
  }

  // ===== USER ADD =====
  if (text === "User Add") {
    db.sessions[chatId] = { step: "add_id" };
    return send(chatId, "Enter User ID:");
  }

  if (session.step === "add_id") {
    db.sessions[chatId] = { step: "add_pass", id: text };
    return send(chatId, "Enter Password:");
  }

  if (session.step === "add_pass") {
    db.users[session.id] = {
      pass: text,
      coin: 0
    };
    db.sessions[chatId] = { step: "admin_panel" };
    return send(chatId, "User Added ✅", adminMenu);
  }

  // ===== USER LIST =====
  if (text === "User List") {
    let list = Object.keys(db.users)
      .map(u => `${u} | Coin: ${db.users[u].coin}`)
      .join("\n");

    if (!list) list = "No users";

    return send(chatId, list + "\n\nType user id:");
  }

  if (db.users[text] && session.step === "admin_panel") {
    db.sessions[chatId] = { step: "manage_user", id: text };

    return send(chatId, "Select:", {
      keyboard: [["Add Coin"], ["Delete User"], ["Back"]],
      resize_keyboard: true
    });
  }

  if (text === "Add Coin" && session.step === "manage_user") {
    db.sessions[chatId].step = "coin_amount";
    return send(chatId, "Enter coin:");
  }

  if (session.step === "coin_amount") {
    db.users[session.id].coin += parseInt(text);
    db.sessions[chatId] = { step: "admin_panel" };
    return send(chatId, "Coin Added ✅", adminMenu);
  }

  if (text === "Delete User" && session.step === "manage_user") {
    delete db.users[session.id];
    db.sessions[chatId] = { step: "admin_panel" };
    return send(chatId, "Deleted ✅", adminMenu);
  }

  // ===== USER LOGIN =====
  if (text === "User Login") {
    db.sessions[chatId] = { step: "login_id" };
    return send(chatId, "Enter User ID:");
  }

  if (session.step === "login_id") {
    db.sessions[chatId] = { step: "login_pass", id: text };
    return send(chatId, "Enter Password:");
  }

  if (session.step === "login_pass") {
    let user = db.users[session.id];

    if (user && user.pass === text) {
      db.sessions[chatId] = { step: "user_panel", user: session.id };
      return send(chatId, "User Panel 👇", userMenu);
    } else {
      return send(chatId, "Login Failed ❌");
    }
  }

  // ===== BALANCE =====
  if (text === "💰 Balance") {
    let u = db.sessions[chatId].user;
    return send(chatId, `Balance: ${db.users[u].coin}`);
  }

  // ===== SEND SMS =====
  if (text === "📩 Send SMS") {
    db.sessions[chatId].step = "sms_number";
    return send(chatId, "Enter Number:");
  }

  if (session.step === "sms_number") {
    db.sessions[chatId].number = text;
    db.sessions[chatId].step = "sms_text";
    return send(chatId, "Enter Message:");
  }

  if (session.step === "sms_text") {
    let u = db.sessions[chatId].user;

    if (db.users[u].coin <= 0) {
      return send(chatId, "No Balance ❌");
    }

    let number = db.sessions[chatId].number;
    let message = text;

    try {
      // ===== REAL API =====
      await axios.get(`https://mahirvai.com/sms.php?key=AM–MRXRPSh2PU&number=${number}&msg=${encodeURIComponent(message)}`);

      db.users[u].coin -= 1;

      return send(chatId, "SMS Sent ✅", userMenu);
    } catch (e) {
      return send(chatId, "SMS Failed ❌");
    }
  }

  // ===== BACK =====
  if (text === "Back" || text === "🔙 Back") {
    db.sessions[chatId] = {};
    return send(chatId, "Main Menu", mainMenu);
  }

  res.sendStatus(200);
});

// ===== SERVER =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Running..."));
