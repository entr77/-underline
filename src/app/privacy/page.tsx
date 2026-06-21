import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "개인정보처리방침 — 밑줄",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-dvh bg-[var(--color-cream)] flex flex-col max-w-[430px] mx-auto w-full">
      <header className="sticky top-0 z-10 bg-[var(--color-cream)]/95 backdrop-blur-sm border-b border-[var(--color-border)] px-5 h-14 flex items-center gap-3">
        <Link href="/" className="text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <span className="font-serif text-lg font-semibold text-[var(--color-ink)]">개인정보처리방침</span>
      </header>

      <main className="flex-1 px-5 py-8">
        <article className="prose-legal">
          <p className="text-xs text-[var(--color-ink-faint)] mb-8">시행일: 2026년 6월 22일</p>

          <Section title="1. 개인정보 처리자 정보">
            <p>(주)얼리커뮤니케이션(이하 "회사")은 밑줄 서비스(이하 "서비스")를 운영하며, 이용자의 개인정보를 소중히 보호합니다.</p>
            <table>
              <tbody>
                <Row label="상호" value="(주)얼리커뮤니케이션" />
                <Row label="사업자등록번호" value="220-87-27297" />
                <Row label="대표자" value="김용준" />
                <Row label="이메일" value="yj.kim@earlyc.co.kr" />
              </tbody>
            </table>
          </Section>

          <Section title="2. 수집하는 개인정보 항목">
            <p className="mb-3">회사는 서비스 제공을 위해 다음과 같은 개인정보를 수집합니다.</p>
            <SubSection title="이메일 회원가입">
              <ul>
                <li><strong>필수</strong>: 이메일 주소, 닉네임</li>
                <li><strong>선택</strong>: 취향 태그</li>
              </ul>
            </SubSection>
            <SubSection title="Google 소셜 로그인">
              <ul>
                <li><strong>필수</strong>: 이메일 주소, 프로필 이름, 프로필 사진 URL</li>
              </ul>
            </SubSection>
            <SubSection title="서비스 이용 중 생성되는 정보">
              <ul>
                <li>이미지 파일 (책 페이지 사진 — OCR 처리 목적)</li>
                <li>밑줄 친 문장 텍스트</li>
                <li>책 정보 (카카오 도서 API를 통해 수집한 제목·저자·출판사·ISBN)</li>
                <li>서비스 이용 기록 (접속 시각, IP 주소)</li>
              </ul>
            </SubSection>
            <p className="mt-3 text-[var(--color-ink-faint)] text-sm">※ 업로드된 이미지에서 위치 정보(EXIF)는 수집하지 않습니다.</p>
          </Section>

          <Section title="3. 개인정보 수집 목적 및 법적 근거">
            <table>
              <thead>
                <tr>
                  <Th>목적</Th>
                  <Th>항목</Th>
                  <Th>법적 근거</Th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <Td>회원 가입 및 관리</Td>
                  <Td>이메일, 닉네임</Td>
                  <Td>계약 이행</Td>
                </tr>
                <tr>
                  <Td>밑줄 저장 및 공유 기능 제공</Td>
                  <Td>이미지, 밑줄 텍스트, 책 정보</Td>
                  <Td>계약 이행</Td>
                </tr>
                <tr>
                  <Td>서비스 개선 및 통계 분석</Td>
                  <Td>서비스 이용 기록</Td>
                  <Td>정당한 이익</Td>
                </tr>
                <tr>
                  <Td>부정 이용 방지 및 법적 의무 이행</Td>
                  <Td>접속 로그, IP</Td>
                  <Td>법적 의무</Td>
                </tr>
              </tbody>
            </table>
          </Section>

          <Section title="4. 개인정보 보유 및 이용 기간">
            <ul>
              <li><strong>회원 탈퇴 시</strong>: 즉시 삭제 (단, 아래 예외 사항 제외)</li>
              <li><strong>관계 법령에 따른 보존</strong>: 전자상거래 관련 기록 5년, 접속 로그 3개월 (통신비밀보호법)</li>
              <li><strong>이미지 파일</strong>: OCR 처리 완료 후 30일 이내 자동 삭제</li>
            </ul>
          </Section>

          <Section title="5. 개인정보 처리 위탁">
            <p className="mb-3">회사는 서비스 제공을 위해 다음 업체에 개인정보 처리를 위탁합니다.</p>
            <table>
              <thead>
                <tr>
                  <Th>수탁사</Th>
                  <Th>위탁 업무</Th>
                  <Th>보유 및 이용 기간</Th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <Td>Supabase, Inc.</Td>
                  <Td>데이터베이스 및 파일 스토리지 운영</Td>
                  <Td>서비스 이용 기간</Td>
                </tr>
                <tr>
                  <Td>Vercel, Inc.</Td>
                  <Td>서비스 호스팅</Td>
                  <Td>서비스 이용 기간</Td>
                </tr>
                <tr>
                  <Td>Anthropic PBC</Td>
                  <Td>이미지 분석 (OCR·밑줄 감지·책 식별)</Td>
                  <Td>API 호출 즉시 삭제 (저장 없음)</Td>
                </tr>
                <tr>
                  <Td>카카오(주)</Td>
                  <Td>도서 정보 검색</Td>
                  <Td>검색 결과 반환 후 즉시 처리</Td>
                </tr>
                <tr>
                  <Td>Google LLC</Td>
                  <Td>Google 소셜 로그인 인증</Td>
                  <Td>인증 처리 후 세션 유지 기간</Td>
                </tr>
              </tbody>
            </table>
          </Section>

          <Section title="6. 이용자의 권리">
            <p>이용자는 언제든지 다음 권리를 행사할 수 있습니다.</p>
            <ul>
              <li><strong>열람권</strong>: 본인 개인정보 열람 요청</li>
              <li><strong>정정·삭제권</strong>: 부정확한 개인정보 정정 또는 삭제 요청</li>
              <li><strong>처리 정지권</strong>: 개인정보 처리 정지 요청</li>
              <li><strong>탈퇴권</strong>: 서비스 탈퇴를 통한 개인정보 삭제</li>
            </ul>
            <p className="mt-3">권리 행사: <a href="mailto:yj.kim@earlyc.co.kr" className="text-[var(--color-forest)]">yj.kim@earlyc.co.kr</a></p>
          </Section>

          <Section title="7. 개인정보 보호책임자">
            <table>
              <tbody>
                <Row label="성명" value="김용준" />
                <Row label="직책" value="대표" />
                <Row label="이메일" value="yj.kim@earlyc.co.kr" />
              </tbody>
            </table>
          </Section>

          <Section title="8. 방침의 변경">
            <p>이 방침은 법령 또는 서비스 정책 변경에 따라 업데이트될 수 있습니다. 변경 시 서비스 내 공지를 통해 사전 안내합니다.</p>
          </Section>
        </article>
      </main>

      <footer className="px-5 py-6 border-t border-[var(--color-border)] text-center">
        <p className="text-xs text-[var(--color-ink-faint)]">(주)얼리커뮤니케이션 · 대표 김용준</p>
        <p className="text-xs text-[var(--color-ink-faint)] mt-1">
          <Link href="/terms" className="hover:text-[var(--color-forest)] transition-colors">이용약관</Link>
          {" · "}
          <Link href="/privacy" className="hover:text-[var(--color-forest)] transition-colors">개인정보처리방침</Link>
        </p>
      </footer>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="font-semibold text-[var(--color-ink)] text-base mb-3 pb-2 border-b border-[var(--color-border)]">{title}</h2>
      <div className="text-sm text-[var(--color-ink-muted)] leading-relaxed space-y-2">{children}</div>
    </section>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <p className="font-medium text-[var(--color-ink)] text-sm mb-1">{title}</p>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td className="py-1.5 pr-4 text-[var(--color-ink-faint)] whitespace-nowrap">{label}</td>
      <td className="py-1.5 text-[var(--color-ink)]">{value}</td>
    </tr>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left py-2 pr-3 text-[var(--color-ink-faint)] font-medium text-xs">{children}</th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td className="py-2 pr-3 text-[var(--color-ink)] align-top">{children}</td>
  );
}
