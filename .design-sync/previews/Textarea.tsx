import { Label, Textarea } from "ustage";

/** Textarea auto-grows with its content (field-sizing-content) — it has no
 *  resize handle, so the height follows what the attendee types. */
export function LabelledField() {
  return (
    <div className="grid w-[360px] max-w-full gap-1.5">
      <Label htmlFor="memo">공연자에게 남길 말</Label>
      <Textarea
        id="memo"
        placeholder="휠체어 접근, 동반 인원 등 미리 알려주실 내용이 있다면 적어주세요."
      />
    </div>
  );
}

export function Filled() {
  return (
    <div className="w-[360px] max-w-full">
      <Textarea defaultValue={"두 명 함께 갑니다.\n한 명은 휠체어를 이용해요.\n입구 쪽 좌석이면 좋겠습니다."} />
    </div>
  );
}

export function States() {
  return (
    <div className="grid w-[360px] max-w-full gap-3">
      <Textarea aria-invalid defaultValue="필수 항목입니다" />
      <Textarea disabled placeholder="예매 마감 후에는 수정할 수 없습니다" />
    </div>
  );
}
