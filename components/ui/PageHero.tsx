import { Container } from "./Container";

export function PageHero({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="border-pisao-gold/10 bg-pisao-carbon-soft border-b py-16 sm:py-20">
      <Container>
        {eyebrow && (
          <p className="text-pisao-gold text-xs font-semibold tracking-[0.2em] uppercase">
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-pisao-cream mt-2 text-4xl sm:text-5xl">
          {title}
        </h1>
        {description && (
          <p className="text-pisao-cream-muted mt-4 max-w-2xl">{description}</p>
        )}
      </Container>
    </div>
  );
}
