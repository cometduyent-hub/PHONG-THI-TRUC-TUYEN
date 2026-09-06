/** Chấm một câu Đúng/Sai gồm 4 ý theo quy tắc KHTN SMART TEST. */
export function scoreTrueFalse(wrongCount:number):number{
  const table=[1,0.5,0.25,0.1,0];
  if(wrongCount<0 || wrongCount>4) throw new Error("wrongCount must be 0..4");
  return table[wrongCount];
}

export function scoreExam(parts:{multipleChoice:number; trueFalse:number; shortAnswer:number; essay:number}):number{
  return parts.multipleChoice+parts.trueFalse+parts.shortAnswer+parts.essay;
}
