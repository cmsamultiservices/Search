import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";

function LoginFallback() {
  return (
    <section className="container mx-auto flex min-h-[calc(100vh-8rem)] max-w-md items-center px-4 py-10">
      <div className="w-full rounded-lg border bg-card p-6">
        <p className="text-sm text-muted-foreground">Cargando formulario...</p>
      </div>
    </section>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}
