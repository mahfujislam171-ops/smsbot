const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const TOKEN = "8651056162:AAFoTNM6DHlUJv4CLhR8GKF_62FWLASFImk";
const API = `https://api.telegram.org/bot${TOKEN}`;

let state = {};
let users = {};
let lastUpdateId = 0; // duplicate fix

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

// ===== WEBHOOK =====
app.post("/", (req, res) => {
  res.sendStatus(200);

  const update = req.body;

  // 🔥 duplicate block
  if (update.update_id <= lastUpdateId) return;
  lastUpdateId = update.update_id;

  const msg = update.message;
  if (!msg) return;

  const chatId = msg.chat.id;
  const text = msg.text;

  if (!state[chatId]) state[chatId] = {};

  // ===== START =====
  if (text === "/start") {
    reset(chatId);
    return send(chatId, "Welcome 👇", [
      ["Admin Login"],
      ["User Login"]
    ]);
  }

  // ===== BACK =====
  if (text === "Back") {
    reset(chatId);
    return send(chatId, "Welcome 👇", [
      ["Admin Login"],
      ["User Login"]
    ]);
  }

  // ===== ADMIN LOGIN =====
  if (text === "Admin Login") {
    reset(chatId);
    state[chatId] = { mode: "admin", step: "pass" };
    return send(chatId, "🔑 Enter Admin Password:");
  }

  // ===== USER LOGIN =====
  if (text === "User Login") {
    reset(chatId); // 🔥 main fix
    state[chatId] = { mode: "user", step: "id" };
    return send(chatId, "Enter User ID:");
  }

  // ===== ADMIN PASSWORD =====
  if (state[chatId].mode === "admin" && state[chatId].step === "pass") {
    if (text === "794082") {
      state[chatId] = { admin: true };
      return send(chatId, "✅ Admin Panel", [
        ["User Add", "User List"],
        ["Coin Add", "Coin Edit"],
        ["Back"]
      ]);
    } else {
      return send(chatId, "❌ Wrong Password");
    }
  }

  // ===== USER LOGIN FLOW =====
  if (state[chatId].mode === "user" && state[chatId].step === "id") {
    state[chatId].loginUser = text;
    state[chatId].step = "pass";
    return send(chatId, "Enter Password:");
  }

  if (state[chatId].mode === "user" && state[chatId].step === "pass") {
    let u = users[state[chatId].loginUser];

    if (u && u.password === text) {
      state[chatId] = { user: state[chatId].loginUser };
      return send(chatId, "✅ User Panel", [
        ["Send SMS", "Balance"],
        ["Back"]
      ]);
    } else {
      return send(chatId, "❌ Wrong Password");
    }
  }

  // ===== ADMIN PANEL =====
  if (state[chatId].admin) {

    if (text === "User Add") {
      state[chatId] = { admin: true, step: "add_user" };
      return send(chat
