const test = require("node:test");
const assert = require("node:assert/strict");
const { parse, answer, decode, example } = require("./csv.js");
const sample = parse(example);

test("첫 질문의 결과 안에서 동률을 모두 찾는다", () => {
  const first = answer(sample, "그림책 찾아줘");
  assert.deepEqual(first.ids, [0, 2, 4]);
  assert.deepEqual(answer(sample, "그중 대출횟수(회) 최댓값?", first.ids).ids, [2, 4]);
  assert.equal(answer(sample, "그중 몇 행이야?", []).ids.length, 0);
  assert.equal(answer(sample, "그중 몇 행이야?").ids, undefined);
  assert.equal(answer(sample, "몇 행이야?", [0]).ids.length, 5);
});
test("따옴표 안의 줄바꿈과 쉼표를 보존한다", () => {
  const data = parse('\uFEFF이름,값\r\n"a,\n""b""","1,200"\r\nc,42\r\n');
  assert.equal(data.records[0][0], 'a,\n"b"');
  assert.deepEqual(answer(data, "값 최댓값").ids, [0]);
});
test("불명확한 입력에서 결과를 만들지 않는다", () => {
  for (const text of ["a,a\n1,2", "a,b\n1", 'a\n"x', "a\nx\0", "a\n" + "x".repeat(2049)])
    assert.throws(() => parse(text));
  assert.equal(answer(parse("값\n3\n \n4"), "값 최댓값").ids, undefined);
  assert.equal(answer(sample, "없는열 최댓값").ids, undefined);
  assert.equal(answer(sample, "추천해줘").ids, undefined);
});
test("자바스크립트 정수 정밀도를 넘는 원본 값도 정확히 비교한다", () => {
  const data = parse("수\n9007199254740993\n9007199254740992");
  assert.deepEqual(answer(data, "수 최댓값").ids, [0]);
});
test("한글 UTF-8과 CP949, 두 가지 파일을 읽는다", () => {
  assert.equal(decode(Buffer.from("한글")), "한글");
  assert.equal(decode(Buffer.from([0xc7, 0xd1, 0xb1, 0xdb])), "한글");
});
