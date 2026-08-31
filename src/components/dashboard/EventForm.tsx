"use client";

import { useTransition, useState, useRef, useEffect, useMemo } from "react";
import { useForm, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ImageIcon, Loader2, X } from "lucide-react";

import { eventSchema, type EventFormValues } from "@/lib/validations/event";
import { createEvent, updateEvent } from "@/app/actions/event";
import { createClient } from "@/lib/supabase/client";
import { resizeImage } from "@/lib/image";
import { posterStoragePath } from "@/lib/poster";
import { formatKST } from "@/lib/date";
import { useUnsavedWarning } from "@/hooks/useUnsavedWarning";
import { useFormDraft } from "@/hooks/useFormDraft";
import { eventDraftKey } from "@/lib/form-draft";
import { CustomFieldEditor } from "./CustomFieldEditor";
import { KakaoAddressSearch } from "./KakaoAddressSearch";
import { RichTextField } from "./RichTextField";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { DateTimePicker } from "@/components/ui/date-time-picker";

/**
 * RHF 에러 트리에서 첫 메시지를 찾는다. custom_fields처럼 중첩된 에러는
 * 최상위에 message가 없어서 얕게 훑으면 "입력값을 확인해 주세요."로 뭉개진다.
 */
function firstErrorMessage(node: unknown): string | undefined {
  if (!node || typeof node !== "object") return undefined;
  const message = (node as { message?: unknown }).message;
  if (typeof message === "string" && message) return message;
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    if (key === "ref") continue; // DOM 노드로 내려가지 않는다
    const found = firstErrorMessage(value);
    if (found) return found;
  }
  return undefined;
}

/** 포스터 파일 삭제 (best-effort — 실패하면 고아 파일만 남는다) */
async function removeStoredPoster(path: string) {
  try {
    await createClient().storage.from("posters").remove([path]);
  } catch (err) {
    console.error("[poster cleanup]", err);
  }
}

interface EventFormProps {
  mode: "create" | "edit";
  eventId?: string;
  defaultValues?: Partial<EventFormValues>;
  userId: string;
  /** 유효(미취소) 예매 건수 — 수정 모드에서 주의 배너 표시용 */
  activeBookingCount?: number;
}

export function EventForm({
  mode,
  eventId,
  defaultValues,
  userId,
  activeBookingCount = 0,
}: EventFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [posterPreview, setPosterPreview] = useState<string | null>(
    defaultValues?.poster_url ?? null
  );
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /** DB에 저장돼 있는 포스터 URL — 이 파일은 저장이 끝난 뒤 서버가 정리한다 */
  const savedPosterUrl = useRef<string | null>(defaultValues?.poster_url || null);
  /** 이번 화면에서 올렸지만 아직 저장되지 않은 파일 경로 — 저장 없이 떠나면 지운다 */
  const pendingPathsRef = useRef<string[]>([]);
  const submittedRef = useRef(false);

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: "",
      description: "",
      booking_notice: "",
      cancel_policy: "",
      poster_url: "",
      event_date: "",
      event_end_date: undefined,
      venue: "",
      venue_address: undefined,
      venue_lat: undefined,
      venue_lng: undefined,
      price: 0,
      bank_info: "",
      contact: "",
      capacity: undefined,
      booking_start: undefined,
      booking_end: undefined,
      custom_fields: [],
      ...defaultValues,
    },
  });

  const description = watch("description");
  const bookingNotice = watch("booking_notice");
  const cancelPolicy = watch("cancel_policy");
  const watchPrice = watch("price") ?? 0;
  const customFields = watch("custom_fields") ?? [];

  // 현장 예매 가격 — 비우면(null) 온라인 가격과 동일. 체크박스가 그 의미를 명시한다.
  const [sameOnsitePrice, setSameOnsitePrice] = useState(
    (defaultValues?.onsite_price ?? null) == null
  );
  const watchOnsitePrice = watch("onsite_price");
  /**
   * 계좌 입력란을 보여줄 조건 — **eventSchema의 계좌 필수 조건과 반드시 같아야 한다.**
   * 온라인이 무료여도 현장에서 돈을 받으면 입금 안내가 나가므로 계좌가 필요하다.
   * (조건이 어긋나면 "계좌를 입력하라"는 오류가 뜨는데 입력란이 화면에 없는
   *  저장 불가 상태가 된다 — 실제로 있었던 버그다.)
   */
  const needsBankInfo =
    watchPrice > 0 || (!sameOnsitePrice && (watchOnsitePrice ?? 0) > 0);

  // 새로고침·탭 닫기로 작성 내용이 사라지는 것을 막는다(앱 내부 이동은 '취소' 버튼에서 확인).
  useUnsavedWarning(isDirty && !isPending);

  /**
   * 작성 중 내용 자동 저장 — **생성 모드에서만**.
   * 수정 모드는 DB가 원본이라, 오래된 로컬 초안을 되살리면 남의 수정을 되돌린다.
   * poster_url은 저장하지 않는다 — 저장 없이 떠나면 업로드 파일을 지우므로
   * 복구해도 죽은 URL이 된다(위 정리 로직 참고).
   */
  const draftValues = watch();
  const draftPayload = useMemo(() => {
    const { poster_url: _poster, ...rest } = draftValues;
    void _poster;
    return rest;
  }, [draftValues]);

  const { restored: savedDraft, clear: clearDraft } = useFormDraft({
    storageKey: eventDraftKey(userId),
    values: draftPayload,
    enabled: mode === "create" && isDirty && !isPending,
  });
  const [draftDismissed, setDraftDismissed] = useState(false);
  const showDraftBanner =
    mode === "create" && savedDraft !== null && !draftDismissed;

  function restoreDraft() {
    if (!savedDraft) return;
    // 포스터는 초안에 없으므로 비운 상태로 되살린다
    reset({ ...savedDraft.values, poster_url: "" } as EventFormValues);
    setPosterPreview(null);
    setSameOnsitePrice(
      ((savedDraft.values as Partial<EventFormValues>).onsite_price ?? null) ==
        null
    );
    setDraftDismissed(true);
    toast.success("작성하던 내용을 불러왔습니다.");
  }

  // 저장하지 않고 화면을 떠나면 이번에 올린 포스터는 아무도 참조하지 않는다 — 정리한다.
  useEffect(() => {
    const pending = pendingPathsRef;
    const submitted = submittedRef;
    return () => {
      if (submitted.current) return; // 저장됐으면 서버가 관리한다
      for (const path of pending.current) void removeStoredPoster(path);
      pending.current = [];
    };
  }, []);

  async function handlePosterChange(e: React.ChangeEvent<HTMLInputElement>) {
    // await 이후에는 e.currentTarget이 비므로 미리 잡아둔다.
    // 성공/실패 모두 value를 비워야 같은 파일을 다시 골랐을 때 change가 다시 발생한다.
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("이미지 파일만 업로드할 수 있습니다.");
      input.value = "";
      return;
    }
    // 원본 20MB 초과는 차단 (리사이징 전 안전망)
    if (file.size > 20 * 1024 * 1024) {
      toast.error("파일 크기는 20MB 이하여야 합니다.");
      input.value = "";
      return;
    }

    setUploading(true);
    try {
      // 최대 1200×1800px, JPEG 85% 품질로 리사이징
      let uploadBlob: Blob;
      try {
        uploadBlob = await resizeImage(file);
      } catch (err) {
        console.error("[poster resize]", err);
        toast.error("이미지 처리에 실패했습니다. 다른 이미지를 사용해 주세요.");
        return;
      }

      const supabase = createClient();
      const path = `${userId}/${Date.now()}.jpg`;

      const { data, error } = await supabase.storage
        .from("posters")
        .upload(path, uploadBlob, { contentType: "image/jpeg", cacheControl: "3600", upsert: false });

      if (error) {
        console.error("[poster upload]", error);
        toast.error("포스터 업로드에 실패했습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }

      const { data: urlData } = supabase.storage
        .from("posters")
        .getPublicUrl(data.path);

      // 방금 올린 파일로 교체하기 전 값이 '저장 전 업로드'였다면 참조가 사라지므로 지운다
      const replaced = getValues("poster_url");
      const replacedPath =
        replaced && replaced !== savedPosterUrl.current
          ? posterStoragePath(replaced)
          : null;

      pendingPathsRef.current.push(data.path);
      setValue("poster_url", urlData.publicUrl, { shouldDirty: true });
      setPosterPreview(urlData.publicUrl);

      if (replacedPath) {
        pendingPathsRef.current = pendingPathsRef.current.filter(
          (p) => p !== replacedPath
        );
        void removeStoredPoster(replacedPath);
      }
    } catch (err) {
      // 네트워크 단절 등 위 분기에서 잡지 못한 예외 — 업로드 UI가 영구히 로딩에 머물지 않게 한다
      console.error("[poster upload]", err);
      toast.error("포스터 업로드에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setUploading(false);
      input.value = "";
    }
  }

  function removePoster() {
    const current = getValues("poster_url");
    setValue("poster_url", "", { shouldDirty: true });
    setPosterPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";

    // 저장 전에 올린 파일만 즉시 지운다. 이미 저장된 포스터는 저장이 끝난 뒤 서버가
    // 지운다 — 여기서 지우면 수정을 취소했을 때 남아 있는 스테이지의 포스터가 사라진다.
    if (current && current !== savedPosterUrl.current) {
      const path = posterStoragePath(current);
      if (path) {
        pendingPathsRef.current = pendingPathsRef.current.filter(
          (p) => p !== path
        );
        void removeStoredPoster(path);
      }
    }
  }

  // 에러 표시가 없는 필드에서 validation이 걸려도 제출이 조용히 무시되지 않도록
  const onInvalid = (errs: FieldErrors<EventFormValues>) => {
    toast.error(firstErrorMessage(errs) ?? "입력값을 확인해 주세요.");
  };

  const onSubmit = (values: EventFormValues) => {
    startTransition(async () => {
      try {
        const result =
          mode === "create"
            ? await createEvent(values)
            : await updateEvent(eventId!, values);

        if (result.error) {
          toast.error(result.error);
          return;
        }

        // 저장됐으므로 이번에 올린 파일은 스테이지가 참조한다 — 이탈 정리 대상에서 뺀다
        submittedRef.current = true;
        clearDraft();

        toast.success(
          mode === "create" ? "스테이지가 생성되었습니다." : "스테이지가 수정되었습니다."
        );

        if (mode === "create") {
          router.push(`/dashboard/events/${result.id}`);
        } else {
          router.push(`/dashboard/events/${eventId}`);
          router.refresh();
        }
      } catch (err) {
        // 서버 액션 자체가 실패하는 경우(네트워크 단절, 배포 직후 액션 불일치 등).
        // 잡지 않으면 예외가 에러 경계까지 올라가 입력한 내용이 전부 사라진다.
        console.error("[EventForm submit]", err);
        toast.error(
          "저장에 실패했습니다. 입력한 내용은 그대로 있으니 잠시 후 다시 시도해 주세요."
        );
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-8">
      {showDraftBanner && savedDraft && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-4xl border border-primary/30 bg-primary/5 px-4 py-3.5">
          <div className="min-w-0 space-y-0.5">
            <p className="text-[13px] font-semibold">작성하던 스테이지가 있어요.</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {formatKST(savedDraft.savedAt, "M월 d일 HH:mm")}에 이 브라우저에 저장된
              내용입니다. 포스터 이미지는 저장되지 않아 다시 올려야 해요.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button type="button" size="sm" onClick={restoreDraft}>
              이어서 작성
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                clearDraft();
                setDraftDismissed(true);
              }}
            >
              삭제하고 새로 쓰기
            </Button>
          </div>
        </div>
      )}
      {mode === "edit" && activeBookingCount > 0 && (
        <div className="rounded-md border border-amber-300/60 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-800 dark:border-amber-700/50 dark:bg-amber-950/30 dark:text-amber-300">
          이미 예매 {activeBookingCount}건이 있는 스테이지예요. 일시·장소·가격을
          바꾸면 기존 예매자가 안내받은 내용과 달라지니 변경 시 참석자에게 직접
          알려주세요. 유료/무료 전환과 예매 좌석보다 적은 정원은 저장되지
          않습니다.
        </div>
      )}
      {/* 기본 정보 */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          기본 정보
        </h2>

        <div className="space-y-1.5">
          <Label htmlFor="title">스테이지 제목 *</Label>
          <Input id="title" {...register("title")} placeholder="스테이지 제목을 입력하세요" />
          {errors.title && (
            <p className="text-xs text-destructive">{errors.title.message}</p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>스테이지 시작 *</Label>
            <DateTimePicker
              value={watch("event_date") || undefined}
              onChange={(v) => setValue("event_date", v, { shouldValidate: true, shouldDirty: true })}
              placeholder="시작 날짜·시간"
            />
            {errors.event_date && (
              <p className="text-xs text-destructive">{errors.event_date.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>스테이지 종료</Label>
            <DateTimePicker
              value={watch("event_end_date") || undefined}
              onChange={(v) => setValue("event_end_date", v, { shouldValidate: true, shouldDirty: true })}
              placeholder="종료 날짜·시간"
              clearable
            />
            {errors.event_end_date && (
              <p className="text-xs text-destructive">
                {errors.event_end_date.message}
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">

          <div className="space-y-1.5">
            <Label htmlFor="venue">스테이지 장소 *</Label>
            <div className="flex gap-2">
              <Input
                id="venue"
                {...register("venue")}
                placeholder="스테이지 장소를 입력하세요"
                className="flex-1"
              />
              <KakaoAddressSearch
                onSelect={(data) => {
                  setValue("venue", data.venue, { shouldValidate: true, shouldDirty: true });
                  setValue("venue_address", data.venue_address, { shouldDirty: true });
                }}
              />
            </div>
            {errors.venue && (
              <p className="text-xs text-destructive">{errors.venue.message}</p>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="price">티켓 가격 (원) *</Label>
            <Input
              id="price"
              type="number"
              min={0}
              {...register("price", {
                // valueAsNumber는 빈 입력을 NaN으로 넘겨 영문 zod 메시지를 띄운다
                setValueAs: (v: string) => (v === "" ? undefined : Number(v)),
              })}
              placeholder="0"
            />
            {errors.price && (
              <p className="text-xs text-destructive">{errors.price.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="capacity">
              좌석 한도{" "}
              <span className="text-muted-foreground font-normal">(미입력 시 무제한)</span>
            </Label>
            <Input
              id="capacity"
              type="number"
              min={1}
              {...register("capacity", {
                setValueAs: (v: string) => {
                  if (v === "") return undefined; // 미입력 = 무제한
                  const n = Number.parseInt(v, 10);
                  return Number.isNaN(n) ? undefined : n;
                },
              })}
              placeholder="예: 100"
            />
            {errors.capacity && (
              <p className="text-xs text-destructive">{errors.capacity.message}</p>
            )}
          </div>
        </div>

        {/* 현장 예매 가격 — 비우면(체크 시) 온라인 가격과 동일하게 받는다 */}
        <div className="space-y-1.5">
          <Label htmlFor="onsite_price">현장 예매 가격 (원)</Label>
          {!sameOnsitePrice && (
            <Input
              id="onsite_price"
              type="number"
              min={0}
              {...register("onsite_price", {
                setValueAs: (v: string) => (v === "" ? undefined : Number(v)),
              })}
              placeholder="예: 15000"
            />
          )}
          <label className="flex cursor-pointer items-center gap-2 text-[13px] text-muted-foreground">
            <input
              type="checkbox"
              className="accent-primary"
              checked={sameOnsitePrice}
              onChange={(e) => {
                setSameOnsitePrice(e.target.checked);
                // 체크 = 동일 가격(null 저장). 해제 직후에는 빈 입력으로 시작한다.
                setValue("onsite_price", undefined, { shouldDirty: true });
              }}
            />
            온라인 예매 가격과 동일해요
          </label>
          {errors.onsite_price && (
            <p className="text-xs text-destructive">
              {errors.onsite_price.message}
            </p>
          )}
          {!sameOnsitePrice && (
            <p className="text-xs text-muted-foreground">
              비워두면 온라인 예매 가격과 동일하게 적용됩니다. 현장 예매 등록의
              금액 안내에만 쓰여요.
            </p>
          )}
        </div>
      </section>

      <Separator />

      {/* 안내 & 포스터 */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          안내 & 포스터
        </h2>

        <div className="space-y-1.5">
          <Label>스테이지 안내</Label>
          <RichTextField
            value={description ?? ""}
            placeholder="스테이지 소개, 프로그램, 준비물 등을 적어 주세요."
            onChange={(v) => setValue("description", v, { shouldDirty: true })}
          />
        </div>

        <div className="space-y-1.5">
          <Label>
            예매 주의사항{" "}
            <span className="text-muted-foreground font-normal">
              (신청 폼 상단에 노출)
            </span>
          </Label>
          <RichTextField
            value={bookingNotice ?? ""}
            placeholder="예매 전에 꼭 알아야 할 내용을 적어 주세요."
            onChange={(v) => setValue("booking_notice", v, { shouldDirty: true })}
          />
        </div>

        <div className="space-y-1.5">
          <Label>
            취소·환불 규정{" "}
            <span className="text-muted-foreground font-normal">
              (신청 시 안내 + 참석자가 취소할 때 다시 표시)
            </span>
          </Label>
          <RichTextField
            value={cancelPolicy ?? ""}
            placeholder="예: 스테이지 3일 전까지 전액 환불, 이후 환불 불가"
            onChange={(v) => setValue("cancel_policy", v, { shouldDirty: true })}
          />
          <p className="text-xs text-muted-foreground">
            미입력 시 참석자 취소 화면에는 규정 없이 연락처 안내만 표시됩니다.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label>포스터 이미지</Label>
          {posterPreview ? (
            <div className="relative w-fit">
              <div className="relative h-48 w-32 overflow-hidden rounded-lg border">
                <Image
                  src={posterPreview}
                  alt="포스터 미리보기"
                  fill
                  className="object-cover"
                />
              </div>
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 size-6"
                onClick={removePoster}
                aria-label="포스터 이미지 삭제"
              >
                <X className="size-3" />
              </Button>
            </div>
          ) : (
            <div
              className="flex h-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors hover:bg-muted/50"
              onClick={() => !uploading && fileInputRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <ImageIcon className="size-6 text-muted-foreground" />
                  <p className="mt-1 text-xs text-muted-foreground">
                    클릭하여 이미지 업로드 (최대 20MB)
                  </p>
                </>
              )}
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePosterChange}
          />
        </div>
      </section>

      <Separator />

      {/* 결제 & 연락 */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          결제 & 연락
        </h2>

        {needsBankInfo && (
          <div className="space-y-1.5">
            <Label htmlFor="bank_info">입금 계좌 *</Label>
            <Input
              id="bank_info"
              {...register("bank_info")}
              placeholder="예: 카카오뱅크 3333-123-456789 홍길동"
            />
            {errors.bank_info && (
              <p className="text-xs text-destructive">{errors.bank_info.message}</p>
            )}
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="contact">연락처 *</Label>
          <Input
            id="contact"
            {...register("contact")}
            placeholder="오픈카톡 URL 또는 전화번호"
          />
          {errors.contact && (
            <p className="text-xs text-destructive">{errors.contact.message}</p>
          )}
        </div>
      </section>

      <Separator />

      {/* 예매 기간 */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          예매 기간{" "}
          <span className="normal-case font-normal text-muted-foreground">(미설정 시 수동 관리)</span>
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>예매 시작</Label>
            <DateTimePicker
              value={watch("booking_start") || undefined}
              onChange={(v) => setValue("booking_start", v, { shouldValidate: true, shouldDirty: true })}
              placeholder="시작 날짜·시간 선택"
              clearable
            />
            {errors.booking_start && (
              <p className="text-xs text-destructive">
                {errors.booking_start.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>예매 종료</Label>
            <DateTimePicker
              value={watch("booking_end") || undefined}
              onChange={(v) => setValue("booking_end", v, { shouldValidate: true, shouldDirty: true })}
              placeholder="종료 날짜·시간 선택"
              clearable
            />
            {errors.booking_end && (
              <p className="text-xs text-destructive">
                {errors.booking_end.message}
              </p>
            )}
          </div>
        </div>

        {!watch("booking_end") && (
          <p className="text-xs text-muted-foreground">
            예매 종료를 비워두면 마감 일시 없이 예매를 받아요. 좌석이 차거나
            스테이지가 종료될 때까지 열려 있고, 언제든 직접 마감할 수 있어요.
          </p>
        )}
        {!watch("booking_start") && !!watch("booking_end") && (
          <p className="text-xs text-muted-foreground">
            예매 시작이 없으면 자동으로 열리지 않아요. 스테이지 상세의 상태
            변경에서 &lsquo;티켓 오픈&rsquo;을 직접 눌러 주세요.
          </p>
        )}
      </section>

      <Separator />

      {/* 커스텀 필드 */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          커스텀 필드
        </h2>
        <p className="text-xs text-muted-foreground">
          기본 필수 필드: <span className="font-medium text-foreground">이름, 입금자명, 입금시간</span> (비회원은 비밀번호 추가)
          <br />
          아래에서 추가로 받을 정보를 설정하세요.
        </p>
        <CustomFieldEditor
          value={customFields}
          onChange={(fields) => setValue("custom_fields", fields, { shouldDirty: true })}
        />
      </section>

      {mode === "create" && (
        <p className="text-xs text-muted-foreground">
          작성 내용은 이 브라우저에 자동 저장돼요(포스터 제외). 다른 기기에서는 이어
          쓸 수 없고, 필수 항목만 채워 저장하면 &lsquo;작성 중&rsquo; 상태로 남아 예매는
          직접 열기 전까지 시작되지 않아요.
        </p>
      )}
      <div className="flex justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            // 앱 내부 이동은 beforeunload가 잡지 못하므로 여기서 직접 확인한다
            if (
              isDirty &&
              !window.confirm(
                "작성 중인 내용이 저장되지 않습니다. 이 화면을 나가시겠어요?"
              )
            ) {
              return;
            }
            router.back();
          }}
          disabled={isPending}
        >
          취소
        </Button>
        <Button type="submit" disabled={isPending || uploading}>
          {isPending && <Loader2 className="size-4 mr-2 animate-spin" />}
          {mode === "create" ? "스테이지 생성" : "수정 완료"}
        </Button>
      </div>
    </form>
  );
}
