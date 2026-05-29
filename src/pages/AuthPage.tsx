import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Loader2 } from "lucide-react";

const AuthPage = () => {
  const { session, isLoading, signIn, signUp } = useAdminAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }
  if (session) return <Navigate to="/" replace />;

  const handle = async (mode: "in" | "up") => {
    setErr(null); setInfo(null); setBusy(true);
    const fn = mode === "in" ? signIn : signUp;
    const msg = await fn(email, password);
    setBusy(false);
    if (msg) { setErr(msg); return; }
    if (mode === "up") setInfo("Konto utworzone. Zaloguj sie.");
    else navigate("/");
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <Shield className="w-10 h-10 text-primary mx-auto" />
          <h1 className="font-display text-2xl text-foreground">ALFA Console</h1>
          <p className="text-xs text-muted-foreground font-mono">
            Pierwszy zarejestrowany uzytkownik otrzymuje role admin.
          </p>
        </div>

        <Tabs defaultValue="in">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="in">Logowanie</TabsTrigger>
            <TabsTrigger value="up">Rejestracja</TabsTrigger>
          </TabsList>

          {["in", "up"].map((mode) => (
            <TabsContent key={mode} value={mode} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-xs">Email</Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  autoComplete="email" className="bg-secondary border-border" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Haslo</Label>
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  autoComplete={mode === "in" ? "current-password" : "new-password"}
                  className="bg-secondary border-border" />
              </div>
              <Button disabled={busy || !email || !password}
                onClick={() => handle(mode as "in" | "up")} className="w-full">
                {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : (mode === "in" ? "Zaloguj" : "Zarejestruj")}
              </Button>
            </TabsContent>
          ))}
        </Tabs>

        {err && <p className="text-xs font-mono text-destructive">{err}</p>}
        {info && <p className="text-xs font-mono text-success">{info}</p>}
      </div>
    </div>
  );
};

export default AuthPage;
