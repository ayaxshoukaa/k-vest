import { ArrowRight } from 'lucide-react';
import type { JourneyStep } from '@workspace/api-client-react';
import { JourneyShell, type JourneyCtx } from '@/components/journey/shell';

interface IntroDef {
  from: JourneyStep;
  next: JourneyStep;
  n: string;
  title: [string, string];
  lines: [string, string][];
  cta: [string, string];
}

const defs: Record<string, IntroDef> = {
  scan: {
    from: 'scan-intro', next: 'scan', n: '01',
    title: ['Scan the market', 'استكشف السوق'],
    lines: [
      ['See companies listed on Boursa Kuwait in one place.', 'شاهد الشركات المدرجة في بورصة الكويت في مكان واحد.'],
      ['Tap the star on any company that catches your eye.', 'اضغط على النجمة بجانب أي شركة تلفت انتباهك.'],
      ['Choose at least one, or let us pick for you.', 'اختر شركة واحدة على الأقل، أو دعنا نختار لك.'],
    ],
    cta: ['Start scanning', 'ابدأ الاستكشاف'],
  },
  research: {
    from: 'research-intro', next: 'research', n: '02',
    title: ['Research a company', 'ابحث عن شركة'],
    lines: [
      ['Ask our AI helper to explain a company in plain words.', 'اطلب من المساعد الذكي شرح الشركة بكلمات بسيطة.'],
      ['You will see strengths, risks and an outlook.', 'ستشاهد نقاط القوة والمخاطر والتوقعات.'],
    ],
    cta: ['Start researching', 'ابدأ البحث'],
  },
  practice: {
    from: 'practice-intro', next: 'practice', n: '03',
    title: ['Practice with demo money', 'تدرّب بمال تجريبي'],
    lines: [
      ['You get 1,000 KWD of pretend money. Nothing here is real.', 'لديك 1,000 دينار من المال التجريبي. لا شيء هنا حقيقي.'],
      ['Buy and sell whole shares and watch what happens.', 'اشترِ وبِع أسهمًا كاملة وراقب النتيجة.'],
      ['A practice trade is optional. You can continue without making one.', 'الصفقة التدريبية اختيارية. يمكنك المتابعة دون إجرائها.'],
    ],
    cta: ['Open the practice wallet', 'افتح محفظة التدريب'],
  },
  roi: {
    from: 'roi-intro', next: 'roi', n: '04',
    title: ['Understand return on investment', 'افهم العائد على الاستثمار'],
    lines: [
      ['Try what-if numbers: a budget, a buy price and a target.', 'جرّب أرقامًا افتراضية: ميزانية وسعر شراء وسعر مستهدف.'],
      ['See profit, loss and yearly return, calculated for you.', 'شاهد الربح والخسارة والعائد السنوي محسوبة لك.'],
      ['The calculator is optional. You can finish the journey without it.', 'الحاسبة اختيارية. يمكنك إنهاء الرحلة دون استخدامها.'],
    ],
    cta: ['Open the calculator', 'افتح الحاسبة'],
  },
};

function IntroBody({ ctx, def }: { ctx: JourneyCtx; def: IntroDef }) {
  const { tr } = ctx;
  return (
    <section className="jx-intro" aria-labelledby="intro-title" data-testid={`section-intro-${def.next}`}>
      <span className="jx-intro__num" aria-hidden="true">{def.n}</span>
      <h1 id="intro-title">{tr(...def.title)}</h1>
      <ul>
        {def.lines.map((l, i) => <li key={i} data-testid={`text-intro-line-${i + 1}`}>{tr(...l)}</li>)}
      </ul>
      {ctx.advanceError && <p className="jx-field-error" role="alert" data-testid="text-advance-error">{ctx.advanceError}</p>}
      <div className="jx-intro__actions">
        <button type="button" className="jx-btn" disabled={ctx.advancing} onClick={() => void ctx.advance(def.from, def.next)} data-testid={`button-intro-${def.next}`}>
          {tr(...def.cta)} <ArrowRight size={18} aria-hidden="true" className="jx-flip" />
        </button>
      </div>
    </section>
  );
}

function makeIntro(key: keyof typeof defs) {
  const def = defs[key];
  return function IntroPage() {
    return <JourneyShell step={def.from}>{(ctx) => <IntroBody ctx={ctx} def={def} />}</JourneyShell>;
  };
}

export const ScanIntroPage = makeIntro('scan');
export const ResearchIntroPage = makeIntro('research');
export const PracticeIntroPage = makeIntro('practice');
export const RoiIntroPage = makeIntro('roi');
