"use strict";

const CsvNotebook = (() => {
  const maxBytes = 1024 * 1024;
  const example = "분류,서명,대출횟수(회)\n그림책,작은 우산,18\n산문,오후의 수첩,9\n그림책,달빛 정원,26\n동시,여름 편지,12\n그림책,초록 창문,26";

  function decode(buffer) {
    for (const encoding of ["utf-8", "euc-kr"]) {
      try { return new TextDecoder(encoding, { fatal: true }).decode(buffer); }
      catch { /* Try the next supported encoding. */ }
    }
    throw new Error("UTF-8 또는 CP949로 저장한 CSV를 선택하세요.");
  }

  function parse(text) {
    text = text.replace(/^\uFEFF/, "");
    if (text.includes("\0")) throw new Error("텍스트 CSV를 선택하세요.");
    const records = [];
    let row = [], field = "", quoted = false, closed = false;
    function finishField() {
      if (row.length >= 64) throw new Error("최대 64열까지 열 수 있어요.");
      row.push(field);
      field = "";
      closed = false;
    }
    function finishRow() {
      finishField();
      if (records.length >= 5001) throw new Error("최대 5,000개 자료 행까지 열 수 있어요.");
      records.push(row);
      row = [];
    }
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (quoted) {
        if (ch !== '"') field += ch;
        else if (text[i + 1] === '"') { field += '"'; i++; }
        else { quoted = false; closed = true; }
      } else if (ch === ",") finishField();
      else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        finishRow();
      } else if (ch === '"' && !field && !closed) quoted = true;
      else if (ch === '"' || closed) throw new Error("따옴표 위치를 확인하세요.");
      else field += ch;
      if (field.length > 2048) throw new Error("셀 한 개의 최대 길이는 2,048자예요.");
    }
    if (quoted) throw new Error("닫히지 않은 따옴표가 있어요.");
    if (field || closed || row.length) finishRow();
    const headers = (records.shift() || []).map(s => s.trim());
    if (!headers.length || headers.some(h => !h || h.length > 80) || new Set(headers).size !== headers.length)
      throw new Error("첫 행에 비어 있지 않은 서로 다른 열 이름(최대 80자)이 필요해요.");
    if (!records.length) throw new Error("첫 행 아래에 자료 행이 필요해요.");
    if (records.some(r => r.length !== headers.length)) throw new Error("열 개수가 다른 행이 있어요.");
    return { headers, records };
  }

  function answer(data, question, previous) {
    const match = /^(그중\s+)?(.+?)\s*[?？]?$/.exec(question.trim());
    const help = { message: "‘검색어 찾아줘’, ‘몇 행이야’, ‘열 이름 최댓값’ 중 하나로 질문해 주세요." };
    if (!match) return help;
    const [, subset, body] = match;
    if (subset && previous == null) return { message: "먼저 검색해서 기준이 될 행을 선택해 주세요." };
    const ids = subset ? previous : data.records.map((_, i) => i);
    if (/^(몇\s*행이야|행\s*개수)$/.test(body)) return { message: "총 " + ids.length + "행이에요.", ids };
    const search = /^(.+?)\s+찾아줘$/.exec(body);
    if (search) {
      const term = search[1].trim().toLocaleLowerCase();
      const found = ids.filter(i => data.records[i].some(v => v.toLocaleLowerCase().includes(term)));
      return { message: "‘" + search[1] + "’이 들어 있는 행은 " + found.length + "개예요.", ids: found };
    }
    const max = /^(.+?)\s+최댓값$/.exec(body);
    if (!max) return help;
    const col = data.headers.indexOf(max[1].trim());
    if (col < 0) return { message: "열 이름을 확인하세요. 현재 열은 " + data.headers.join(", ") + "예요." };
    if (!ids.length) return { message: "비교할 행이 없어요.", ids: [] };
    let highest, ties = [];
    for (const i of ids) {
      const raw = data.records[i][col].trim();
      if (!/^[+-]?(?:\d+|\d{1,3}(?:,\d{3})+)$/.test(raw))
        return { message: "비교 범위에 빈칸이나 정수 이외의 값이 있어요. 이 열의 최댓값을 확정할 수 없어요." };
      const value = BigInt(raw.replace(/,/g, ""));
      if (highest === undefined || value > highest) { highest = value; ties = [i]; }
      else if (value === highest) ties.push(i);
    }
    return { message: max[1] + " 최댓값은 " + highest + "이고, 해당하는 행은 " + ties.length + "개예요.", ids: ties };
  }

  return { maxBytes, example, decode, parse, answer };
})();
if (typeof module !== "undefined") module.exports = CsvNotebook;
