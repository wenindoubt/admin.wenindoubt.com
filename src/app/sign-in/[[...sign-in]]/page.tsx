import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
      {/* Background gradient mesh */}
      <div className="absolute inset-0 bg-background" />
      <div className="absolute top-0 left-1/4 h-96 w-96 rounded-full bg-gold-400/[0.04] blur-3xl" />
      <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-violet-500/[0.03] blur-3xl" />

      <div className="relative z-10 flex flex-col items-center gap-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex size-14 items-center justify-center rounded-xl bg-gold-400/10 ring-1 ring-gold-400/25">
            <span className="font-heading text-2xl font-bold text-gold-400">W</span>
          </div>
          <div className="text-center">
            <h1 className="font-heading text-2xl font-bold tracking-tight">WenInDoubt</h1>
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground mt-1">Admin Platform</p>
          </div>
        </div>

        <SignIn />
      </div>
    </div>
  );
}
