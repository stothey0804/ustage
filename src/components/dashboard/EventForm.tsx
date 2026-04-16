"use client";

import { useTransition, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ImageIcon, Loader2, X } from "lucide-react";

import { eventSchema, type EventFormValues } from "@/lib/validations/event";
import { createEvent, updateEvent } from "@/app/actions/event";
import { createClient } from "@/lib/supabase/client";
import { resizeImage } from "@/lib/image";
import { CustomFieldEditor } from "./CustomFieldEditor";
import { KakaoAddressSearch } from "./KakaoAddressSearch";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { DateTimePicker } from "@/components/ui/date-time-picker";

const RichTextEditor = dynamic(
  () => import("./RichTextEditor").then((m) => m.RichTextEditor),
  { ssr: false, loading: () => <div className="h-48 rounded-md border bg-muted animate-pulse" /> }
);

interface EventFormProps {
  mode: "create" | "edit";
  eventId?: string;
  defaultValues?: Partial<EventFormValues>;
  userId: string;
}

export function EventForm({
  mode,
  eventId,
  defaultValues,
  userId,
}: EventFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [posterPreview, setPosterPreview] = useState<string | null>(
    defaultValues?.poster_url ?? null
  );
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: "",
      description: "",
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
  const watchPrice = watch("price") ?? 0;
  const customFields = watch("custom_fields") ?? [];

  async function handlePosterChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("이미지 파일만 업로드할 수 있습니다.");
      return;
    }
    // 원본 20MB 초과는 차단 (리사이징 전 안전망)
    if (file.size > 20 * 1024 * 1024) {
      toast.error("파일 크기는 20MB 이하여야 합니다.");
      return;
    }

    setUploading(true);

    let uploadBlob: Blob;
    try {
      // 최대 1200×1800px, JPEG 85% 품질로 리사이징
      uploadBlob = await resizeImage(file);
    } catch {
      toast.error("이미지 처리에 실패했습니다.");
      setUploading(false);
      return;
    }

    const supabase = createClient();
    const path = `${userId}/${Date.now()}.jpg`;

    const { data, error } = await supabase.storage
      .from("posters")
      .upload(path, uploadBlob, { contentType: "image/jpeg", cacheControl: "3600", upsert: false });

    if (error) {
      console.error("[poster upload]", error);
      toast.error("포스터 업로드에 실패했습니다. Storage 버킷을 확인해 주세요.");
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("posters")
      .getPublicUrl(data.path);

    setValue("poster_url", urlData.publicUrl);
    setPosterPreview(urlData.publicUrl);
    setUploading(false);
  }

  function removePoster() {
    setValue("poster_url", "");
    setPosterPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const onSubmit = (values: EventFormValues) => {
    startTransition(async () => {
      const result =
        mode === "create"
          ? await createEvent(values)
          : await updateEvent(eventId!, values);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(
        mode === "create" ? "이벤트가 생성되었습니다." : "이벤트가 수정되었습니다."
      );

      if (mode === "create") {
        router.push(`/dashboard/events/${result.id}`);
      } else {
        router.push(`/dashboard/events/${eventId}`);
        router.refresh();
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* 기본 정보 */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          기본 정보
        </h2>

        <div className="space-y-1.5">
          <Label htmlFor="title">공연 제목 *</Label>
          <Input id="title" {...register("title")} placeholder="공연 제목을 입력하세요" />
          {errors.title && (
            <p className="text-xs text-destructive">{errors.title.message}</p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>공연 시작 *</Label>
            <DateTimePicker
              value={watch("event_date") || undefined}
              onChange={(v) => setValue("event_date", v, { shouldValidate: true })}
              placeholder="시작 날짜·시간"
            />
            {errors.event_date && (
              <p className="text-xs text-destructive">{errors.event_date.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>공연 종료</Label>
            <DateTimePicker
              value={watch("event_end_date") || undefined}
              onChange={(v) => setValue("event_end_date", v)}
              placeholder="종료 날짜·시간"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">

          <div className="space-y-1.5">
            <Label htmlFor="venue">공연 장소 *</Label>
            <div className="flex gap-2">
              <Input
                id="venue"
                {...register("venue")}
                placeholder="공연 장소를 입력하세요"
                className="flex-1"
              />
              <KakaoAddressSearch
                onSelect={(data) => {
                  setValue("venue", data.venue, { shouldValidate: true });
                  setValue("venue_address", data.venue_address);
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
              {...register("price", { valueAsNumber: true })}
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
                setValueAs: (v: string) =>
                  v === "" ? undefined : parseInt(v, 10),
              })}
              placeholder="예: 100"
            />
            {errors.capacity && (
              <p className="text-xs text-destructive">{errors.capacity.message}</p>
            )}
          </div>
        </div>
      </section>

      <Separator />

      {/* 안내 & 포스터 */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          안내 & 포스터
        </h2>

        <div className="space-y-1.5">
          <Label>공연 안내</Label>
          <RichTextEditor
            value={description ?? ""}
            onChange={(v) => setValue("description", v)}
          />
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
                    클릭하여 이미지 업로드 (최대 5MB)
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

        {watchPrice > 0 && (
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
              onChange={(v) => setValue("booking_start", v)}
              placeholder="시작 날짜·시간 선택"
            />
          </div>

          <div className="space-y-1.5">
            <Label>예매 종료</Label>
            <DateTimePicker
              value={watch("booking_end") || undefined}
              onChange={(v) => setValue("booking_end", v)}
              placeholder="종료 날짜·시간 선택"
            />
          </div>
        </div>
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
          onChange={(fields) => setValue("custom_fields", fields)}
        />
      </section>

      <div className="flex justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isPending}
        >
          취소
        </Button>
        <Button type="submit" disabled={isPending || uploading}>
          {isPending && <Loader2 className="size-4 mr-2 animate-spin" />}
          {mode === "create" ? "이벤트 생성" : "수정 완료"}
        </Button>
      </div>
    </form>
  );
}
