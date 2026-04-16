import Link from "next/link";
import { ChevronLeft, Search } from "lucide-react";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function BookingLookupPage({ params }: Props) {
  const { slug } = await params;

  return (
    <div className="mx-auto max-w-lg px-4 py-8 space-y-6">
      <div>
        <Link
          href={`/e/${slug}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          이벤트로 돌아가기
        </Link>
        <h1 className="mt-2 text-xl font-semibold">비회원 예약 조회</h1>
      </div>

      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-12 text-center">
        <Search className="size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          비회원 예약 조회 기능은 M5에서 구현됩니다.
        </p>
      </div>
    </div>
  );
}
