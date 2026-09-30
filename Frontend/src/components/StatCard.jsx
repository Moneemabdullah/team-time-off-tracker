function StatCard({ label, value }) {
  return (
    <div className="min-w-[7.5rem]  rounded-xl border border-border bg-card px-4 py-2.5 shadow-sm">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="flex gap-2 items-center">
        <p className="mt-0.5 text-lg font-semibold tracking-tight text-foreground">
        {value}
      </p>
      </div>
    </div>
  );
}

export { StatCard };
