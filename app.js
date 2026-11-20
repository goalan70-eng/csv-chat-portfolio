"use strict";

const el = id => document.getElementById(id);
let data, previous, version = 0;

function node(tag, text) {
  const item = document.createElement(tag);
  item.textContent = text;
  return item;
}

function reset(message) {
  data = undefined;
  previous = undefined;
  el("dataset").textContent = message;
  el("suggestions").replaceChildren();
  el("history").replaceChildren();
  el("question").value = "";
  el("question").disabled = true;
  document.querySelector(".primary").disabled = true;
}

function ask(question) {
  if (!data) return;
  const reply = CsvNotebook.answer(data, question, previous);
  const entry = document.createElement("article");
  entry.append(node("h3", question), node("p", reply.message));
  if (reply.ids !== undefined) {
    previous = reply.ids;
    if (previous.length) {
      const box = document.createElement("div");
      box.className = "scroll";
      const table = document.createElement("table");
      table.append(node("caption", "근거 행 · 전체 " + previous.length + "개 중 처음 " + Math.min(previous.length, 5) + "개"));
      const head = table.createTHead().insertRow();
      for (const title of ["자료 행", ...data.headers]) head.append(node("th", title));
      const body = table.createTBody();
      for (const id of previous.slice(0, 5)) {
        const row = body.insertRow();
        for (const value of [id + 1, ...data.records[id]]) row.append(node("td", value));
      }
      box.append(table);
      entry.append(box);
    }
  } else {
    // Do not silently reuse a stale answer after an unsupported question.
    previous = undefined;
  }
  el("history").prepend(entry);
  if (el("history").childElementCount > 5) el("history").lastElementChild.remove();
}

function load(text, label, isExample) {
  data = CsvNotebook.parse(text);
  el("dataset").textContent = label + " · " + data.records.length + "행 · " + data.headers.join(" / ");
  el("question").disabled = false;
  document.querySelector(".primary").disabled = false;
  const queries = ["몇 행이야?", "그중 몇 행이야?"];
  if (isExample) queries.unshift("그림책 찾아줘", "그중 대출횟수(회) 최댓값");
  for (const query of queries) {
    const button = node("button", query);
    button.type = "button";
    button.addEventListener("click", () => ask(query));
    el("suggestions").append(button);
  }
}

function showExample() {
  version++;
  reset("");
  el("file").value = "";
  load(CsvNotebook.example, "가상 예시 · 도서 대출 기록", true);
  ask("그림책 찾아줘");
}

el("file").addEventListener("change", async event => {
  const file = event.target.files[0];
  if (!file) return;
  const request = ++version;
  reset("파일을 읽고 있어요.");
  try {
    if (file.size > CsvNotebook.maxBytes) throw new Error("1 MiB 이하의 CSV를 선택하세요.");
    const buffer = await file.arrayBuffer();
    if (request === version) load(CsvNotebook.decode(buffer), file.name, false);
  } catch (error) {
    if (request === version) reset("자료를 열 수 없어요. " + error.message);
  }
});
document.querySelector("form").addEventListener("submit", event => {
  event.preventDefault();
  const question = el("question");
  if (question.value.trim()) ask(question.value);
  question.value = "";
});
el("example").addEventListener("click", showExample);
showExample();
