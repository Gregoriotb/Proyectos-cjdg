import HeroSection from './HeroSection';
import SpecialServicesWidget from './SpecialServicesWidget';
import OffersWidget from './OffersWidget';
import QuickAccessNav from './QuickAccessNav';

type SectionKey = 'overview' | 'catalog' | 'cart' | 'services' | 'quotations' | 'invoices' | 'profile';

interface Props {
  onNavigate: (section: SectionKey) => void;
}

export default function ClientHome({ onNavigate }: Props) {
  return (
    <div className="space-y-6">
      <HeroSection onNavigate={onNavigate} />
      <div className="grid gap-6 lg:grid-cols-2">
        <SpecialServicesWidget onGoToServices={() => onNavigate('services')} />
        <OffersWidget onGoToCatalog={() => onNavigate('catalog')} />
      </div>
      <QuickAccessNav onNavigate={onNavigate} />
    </div>
  );
}
