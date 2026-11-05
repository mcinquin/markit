/** Message d'erreur de formulaire (rien si vide). */
export function FormError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="rounded-sm border border-red-200 bg-danger-soft px-3 py-2 text-sm font-semibold text-danger shadow-[1px_2px_0_rgba(220,38,38,0.15)]"
    >
      {message}
    </div>
  );
}

/** Message de succès de formulaire (rien si vide). */
export function FormSuccess({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div
      role="status"
      className="rounded-sm border border-accent/30 bg-accent-soft px-3 py-2 text-sm font-semibold text-accent-hover shadow-[1px_2px_0_rgba(15,159,147,0.15)]"
    >
      {message}
    </div>
  );
}
