import { Construction } from 'lucide-react';

type ComingSoonProps = {
  title: string;
  phase: number;
};

export function ComingSoon({ title, phase }: ComingSoonProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
        <Construction className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">Trang đang phát triển — Phase {phase}</p>
      </div>
    </div>
  );
}
