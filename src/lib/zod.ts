import { z } from "zod";
import { ko } from "zod/locales";

/**
 * zod 기본 오류 메시지를 한국어로 — **zod는 이 모듈에서만 가져온다.**
 *
 * 스키마에 message를 적어둔 검증은 그 문구가 그대로 쓰이고, 적지 않은 검증
 * (타입 불일치 등)은 zod 기본 문구가 사용자에게 그대로 노출된다. 영문
 * "Invalid input: expected string, received undefined"가 예매 폼에 뜬 적이 있어
 * 전역 로케일을 깔아둔다.
 *
 * 설정은 첫 parse보다 먼저 실행돼야 하므로, 모든 스키마가 이 모듈의 `z`를 쓴다
 * (`from "zod"` 직접 import 금지 — 설정이 적용되지 않은 인스턴스가 섞인다).
 * 다만 기본 문구는 개발자 말투에 가깝다 — 사용자에게 보일 검증에는 message를 직접 적는다.
 */
z.config(ko());

export { z };
