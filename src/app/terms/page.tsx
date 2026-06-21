import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "이용약관 — 밑줄",
};

export default function TermsPage() {
  return (
    <div className="min-h-dvh bg-[var(--color-cream)] flex flex-col max-w-[430px] mx-auto w-full">
      <header className="sticky top-0 z-10 bg-[var(--color-cream)]/95 backdrop-blur-sm border-b border-[var(--color-border)] px-5 h-14 flex items-center gap-3">
        <Link href="/" className="text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <span className="font-serif text-lg font-semibold text-[var(--color-ink)]">이용약관</span>
      </header>

      <main className="flex-1 px-5 py-8">
        <article>
          <p className="text-xs text-[var(--color-ink-faint)] mb-8">시행일: 2026년 6월 22일</p>

          <Section title="제1조 (목적)">
            <p>이 약관은 (주)얼리커뮤니케이션(이하 "회사")이 운영하는 밑줄 서비스(이하 "서비스")의 이용 조건과 절차, 회사와 이용자 간의 권리·의무를 규정합니다.</p>
          </Section>

          <Section title="제2조 (약관의 효력 및 변경)">
            <ul>
              <li>이 약관은 서비스 이용자에게 공지함으로써 효력이 발생합니다.</li>
              <li>회사는 관련 법령을 위반하지 않는 범위에서 약관을 개정할 수 있습니다.</li>
              <li>약관 변경 시 시행일 7일 전에 서비스 내 공지를 통해 안내합니다.</li>
              <li>변경된 약관에 동의하지 않으면 서비스 탈퇴를 통해 이용을 중단할 수 있습니다.</li>
            </ul>
          </Section>

          <Section title="제3조 (서비스의 내용)">
            <p>밑줄은 책 속 하이라이트(밑줄 친 문장)를 사진으로 기록하고 다른 독자와 공유하는 소셜 독서 플랫폼입니다. 회사는 다음 기능을 제공합니다.</p>
            <ul>
              <li>사진 OCR을 통한 밑줄 문장 자동 인식 및 저장</li>
              <li>밑줄 친 문장의 공개 피드 및 공유 이미지 카드 생성</li>
              <li>같은 책을 읽은 독자 간의 연결 기능</li>
              <li>카카오 도서 API 기반 책 정보 검색</li>
            </ul>
          </Section>

          <Section title="제4조 (회원 가입 및 탈퇴)">
            <SubSection title="가입">
              <ul>
                <li>만 14세 이상만 가입할 수 있습니다.</li>
                <li>이메일 또는 Google 계정으로 가입할 수 있습니다.</li>
                <li>허위 정보로 가입한 경우 서비스 이용이 제한될 수 있습니다.</li>
              </ul>
            </SubSection>
            <SubSection title="탈퇴">
              <ul>
                <li>이용자는 언제든지 서비스 탈퇴를 요청할 수 있습니다.</li>
                <li>탈퇴 즉시 회원 정보 및 게시물이 삭제됩니다. 단, 관련 법령에 따라 보존이 필요한 정보는 예외입니다.</li>
              </ul>
            </SubSection>
          </Section>

          <Section title="제5조 (게시물 및 저작권)">
            <SubSection title="이용자 게시물">
              <ul>
                <li>이용자가 서비스에 게시한 밑줄 문장, 이미지, 사진의 저작권은 이용자 본인에게 있습니다.</li>
                <li>이용자는 서비스에 게시물을 등록함으로써, 회사가 서비스 운영 및 홍보 목적으로 해당 게시물을 전시·복제·배포할 수 있도록 비독점적 라이선스를 부여합니다.</li>
                <li>이용자가 탈퇴하거나 게시물을 삭제하면 라이선스도 종료됩니다. 단, 제3자가 적법하게 공유한 사본은 예외입니다.</li>
              </ul>
            </SubSection>
            <SubSection title="책 문장 인용">
              <ul>
                <li>이용자는 저작권법 제28조(공표된 저작물의 인용)의 범위 내에서 책 문장을 저장하고 공유할 수 있습니다.</li>
                <li>저장 시 반드시 책 제목·저자·출판사를 함께 기재해야 합니다.</li>
                <li>저작권자의 허락 없이 책 전체 또는 상당 분량을 복제하거나 배포하는 행위는 금지됩니다.</li>
              </ul>
            </SubSection>
          </Section>

          <Section title="제6조 (금지 행위)">
            <p>이용자는 다음 행위를 해서는 안 됩니다.</p>
            <ul>
              <li>타인의 개인정보 도용 또는 허위 정보 입력</li>
              <li>타인의 저작권, 상표권 등 지식재산권 침해</li>
              <li>서비스 운영을 방해하는 행위 (스팸, 악성 코드 등)</li>
              <li>타인을 비방·혐오·차별하는 콘텐츠 게시</li>
              <li>상업적 광고·홍보 목적의 무단 게시</li>
              <li>관련 법령을 위반하는 일체의 행위</li>
            </ul>
            <p className="mt-2">위반 시 회사는 게시물 삭제, 서비스 이용 제한, 계정 정지 등의 조치를 취할 수 있습니다.</p>
          </Section>

          <Section title="제7조 (저작권 침해 신고)">
            <p>저작권 침해를 발견하신 경우 아래 채널로 신고해 주세요. 회사는 영업일 3일 이내에 검토 후 조치합니다.</p>
            <p className="mt-2">신고 이메일: <a href="mailto:yj.kim@earlyc.co.kr" className="text-[var(--color-forest)]">yj.kim@earlyc.co.kr</a></p>
            <p className="mt-1 text-[var(--color-ink-faint)]">신고 시 포함 사항: 침해 게시물 URL, 원저작물 정보, 신고자 연락처</p>
          </Section>

          <Section title="제8조 (서비스 변경 및 중단)">
            <ul>
              <li>회사는 서비스의 내용을 변경하거나 중단할 수 있습니다.</li>
              <li>중단 시 30일 전에 서비스 내 공지를 통해 안내합니다. 단, 불가피한 사유(천재지변, 긴급 보안 조치 등)의 경우 예외입니다.</li>
              <li>서비스 변경 또는 중단으로 인한 손해에 대해 회사는 고의 또는 중과실이 없는 한 책임을 지지 않습니다.</li>
            </ul>
          </Section>

          <Section title="제9조 (면책)">
            <ul>
              <li>회사는 천재지변, 전쟁 등 불가항력으로 인한 서비스 중단에 대해 책임을 지지 않습니다.</li>
              <li>이용자의 귀책 사유로 발생한 손해에 대해 회사는 책임을 지지 않습니다.</li>
              <li>이용자 간 분쟁에 회사는 개입하지 않으며, 이로 인한 손해를 배상할 의무가 없습니다.</li>
            </ul>
          </Section>

          <Section title="제10조 (분쟁 해결)">
            <ul>
              <li>이 약관은 대한민국 법률에 따라 규율됩니다.</li>
              <li>서비스 이용과 관련한 분쟁은 서울중앙지방법원을 관할 법원으로 합니다.</li>
            </ul>
          </Section>

          <Section title="제11조 (회사 정보)">
            <table>
              <tbody>
                <Row label="상호" value="(주)얼리커뮤니케이션" />
                <Row label="사업자등록번호" value="220-87-27297" />
                <Row label="대표자" value="김용준" />
                <Row label="이메일" value="yj.kim@earlyc.co.kr" />
              </tbody>
            </table>
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
