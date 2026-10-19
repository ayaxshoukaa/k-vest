import { ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';
import './home-link.css';

export function JourneyHomeLink({ isAr }: { isAr: boolean }) {
  return (
    <nav className="journey-home-nav" aria-label={isAr ? 'التنقل للعودة' : 'Return navigation'}>
      <Link href="/" className="journey-home-link" data-testid="link-back-home">
        <ArrowLeft size={17} aria-hidden="true" />
        <span>{isAr ? 'العودة إلى الرئيسية' : 'Back to home'}</span>
      </Link>
    </nav>
  );
}
