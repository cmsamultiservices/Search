import { SearchHero } from '@/components/search-hero';

export default function Home() {
  return (
    <main className="flex-1">
      <div className="container mx-auto px-4 md:px-6">
        <SearchHero />
      </div>
    </main>
  );
}
