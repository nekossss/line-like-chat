// 下記URLは、前ステップで作成したGASのWebアプリURLを貼り付けてください。
// 例: const API_URL = "https://script.google.com/macros/s/XXXXXX/exec";
const API_URL = "https://script.google.com/macros/s/AKfycbz-OLW51xdHmpN5bzcZha0xryPkFQmj9MFg3U1jt0Tciu1sCBF91_xMVRbF9G2lNgWU/exec"; 

document.addEventListener("DOMContentLoaded", () => {
  loadMessage("1");

  const sendBtn = document.getElementById("send-btn");
  const userInput = document.getElementById("user-input");

  sendBtn.addEventListener("click", () => {
    const text = userInput.value.trim();
    if (text) {
      addMessage(text, false);
      userInput.value = "";
    }
  });
});

async function loadMessage(currentId, choiceIndex) {
  let url = `${API_URL}?currentId=${currentId}`;
  if (choiceIndex !== undefined) {
    url += `&choiceIndex=${choiceIndex}`;
  }

  const res = await fetch(url);
  const data = await res.json();

  if (data.error) {
    addMessage("エラーが発生しました: " + data.error, true);
    return;
  }

  const isSystemMessage = data.speaker && data.speaker.trim() !== "";

  if (data.speaker && data.speaker.trim() !== "") {
    addSpeakerName(data.speaker);
  }

  addMessage(data.message, isSystemMessage);

  clearChoices();
  if (data.choices && data.choices.length > 0) {
    showChoices(data.currentId, data.choices);
  }
}

function addMessage(text, isSystem) {
  const chatMessages = document.getElementById("chat-messages");
  const msgDiv = document.createElement("div");
  msgDiv.classList.add("message");

  msgDiv.classList.add(isSystem ? "system-message" : "user-message");
  msgDiv.innerText = text;
  chatMessages.appendChild(msgDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addSpeakerName(name) {
  const chatMessages = document.getElementById("chat-messages");
  const speakerDiv = document.createElement("div");
  speakerDiv.classList.add("speaker-name");
  speakerDiv.innerText = name;
  chatMessages.appendChild(speakerDiv);
}

function showChoices(currentId, choices) {
  const chatMessages = document.getElementById("chat-messages");
  const choicesDiv = document.createElement("div");
  choicesDiv.classList.add("choices");

  choices.forEach((choice, index) => {
    const btn = document.createElement("button");
    btn.classList.add("choice-btn");
    btn.innerText = choice;
    btn.addEventListener("click", () => {
      addMessage(choice, false);
      choicesDiv.remove();
      loadMessage(currentId, index);
    });
    choicesDiv.appendChild(btn);
  });

  chatMessages.appendChild(choicesDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function clearChoices() {
  const chatMessages = document.getElementById("chat-messages");
  const existingChoices = chatMessages.querySelectorAll(".choices");
  existingChoices.forEach(c => c.remove());
}
