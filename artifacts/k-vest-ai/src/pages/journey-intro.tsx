import { ArrowRight, Calculator, Search, Sparkles, Wallet, type LucideIcon } from 'lucide-react';
import type { JourneyStep } from '@workspace/api-client-react';
import { JourneyShell, type JourneyCtx } from '@/components/journey/shell';

interface IntroDef {
  from: JourneyStep;
  next: JourneyStep;
  step: 1 | 2 | 3 | 4;
  Icon: LucideIcon;
  title: [string, string];
  description: [string, string];
}

const defs: Record<string, IntroDef> = {
  scan: {
    from: 'scan-intro', next: 'scan', step: 1, Icon: Search,
    title: ['Scan the market', 'استكشف السوق'],
    description: ['Browse Kuwait-listed companies and save any that catch your interest.', 'تصفّح الشركات المدرجة في الكويت واحفظ ما يلفت انتباهك.'],
  },
  research: {
    from: 'research-intro', next: 'research', step: 2, Icon: Sparkles,
    title: ['Research a company', 'ابحث عن شركة'],
    description: ['Ask the AI helper to explain a company’s strengths and risks in plain language.', 'اطلب من المساعد الذكي شرح نقاط قوة الشركة ومخاطرها بكلمات بسيطة.'],
  },
  practice: {
    from: 'practice-intro', next: 'practice', step: 3, Icon: Wallet,
    title: ['Practice with demo money', 'تدرّب بمال تجريبي'],
    description: ['Try a trade with 1,000 KWD of demo money. Trading is optional.', 'جرّب التداول باستخدام 1,000 دينار تجريبي. التداول اختياري.'],
  },
  roi: {
    from: 'roi-intro', next: 'roi', step: 4, Icon: Calculator,
    title: ['Understand return on investment', 'افهم العائد على الاستثمار'],
    description: ['Explore possible returns with a budget and target price. The calculator is optional.', 'استكشف العائد المحتمل باستخدام ميزانية وسعر مستهدف. الحاسبة اختيارية.'],
  },
};

function IntroBody({ ctx, def }: { ctx: JourneyCtx; def: IntroDef }) {
  const { tr, isAr } = ctx;
  const Icon = def.Icon;
  const stepText = isAr
    ? `الخطوة ${new Intl.NumberFormat('ar-KW').format(def.step)} من ${new Intl.NumberFormat('ar-KW').format(4)}`
    : `Step ${def.step} of 4`;
  return (
    <section className="jx-intro" aria-labelledby="intro-title" data-testid={`section-intro-${def.next}`}>
      <div className="jx-intro__progress-group">
        <div className="jx-intro__progress-label">
          <span>{stepText}</span>
          <span>{tr('Your learning journey', 'رحلتك التعليمية')}</span>
        </div>
        <div
          className="jx-intro__progress-track"
          role="progressbar"
          aria-label={tr('Learning journey progress', 'تقدّم الرحلة التعليمية')}
          aria-valuemin={1}
          aria-valuemax={4}
          aria-valuenow={def.step}
          aria-valuetext={stepText}
          data-testid="progress-intro-phase"
        >
          <span className="jx-intro__progress-fill" style={{ width: `${(def.step / 4) * 100}%` }} />
        </div>
      </div>
      <div className="jx-intro__icon" aria-hidden="true"><Icon size={38} strokeWidth={1.8} /></div>
      <div className="jx-intro__copy">
        <h1 id="intro-title">{tr(...def.title)}</h1>
        <p data-testid="text-intro-description">{tr(...def.description)}</p>
      </div>
      {ctx.advanceError && <p className="jx-field-error" role="alert" data-testid="text-advance-error">{ctx.advanceError}</p>}
      <div className="jx-intro__actions">
        <button type="button" className="jx-btn" disabled={ctx.advancing} onClick={() => void ctx.advance(def.from, def.next)} data-testid={`button-intro-${def.next}`}>
          {tr('Next', 'التالي')} <ArrowRight size={18} aria-hidden="true" className="jx-flip" />
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
