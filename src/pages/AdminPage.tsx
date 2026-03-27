import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Shield, Trash2, ArrowLeft, Users, FileText } from "lucide-react";

interface UserRow {
  user_id: string;
  role: string;
  email?: string;
}

interface PresetRow {
  id: string;
  name: string;
  template_id: string;
  paper_size: string;
  device_id: string;
  created_at: string;
}

export default function AdminPage() {
  const { user, isAdmin, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [presets, setPresets] = useState<PresetRow[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate("/login");
    }
  }, [user, isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  const loadData = async () => {
    setLoadingData(true);
    const [rolesRes, presetsRes] = await Promise.all([
      supabase.from("user_roles").select("*"),
      supabase.from("poster_presets").select("*").order("created_at", { ascending: false }),
    ]);
    setUsers((rolesRes.data as UserRow[]) ?? []);
    setPresets((presetsRes.data as PresetRow[]) ?? []);
    setLoadingData(false);
  };

  const toggleAdmin = async (userId: string, currentRole: string) => {
    if (currentRole === "admin") {
      const { error } = await supabase
        .from("user_roles")
        .update({ role: "user" as any })
        .eq("user_id", userId)
        .eq("role", "admin" as any);
      if (error) {
        toast.error("Erro ao remover admin");
        return;
      }
      toast.success("Admin removido");
    } else {
      const { error } = await supabase
        .from("user_roles")
        .update({ role: "admin" as any })
        .eq("user_id", userId)
        .eq("role", "user" as any);
      if (error) {
        toast.error("Erro ao promover admin");
        return;
      }
      toast.success("Usuário promovido a admin");
    }
    loadData();
  };

  const deletePreset = async (id: string) => {
    const { error } = await supabase.from("poster_presets").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir preset");
      return;
    }
    toast.success("Preset excluído");
    loadData();
  };

  if (authLoading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-lg font-black text-foreground flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" /> Painel Admin
          </h1>
        </div>
        <Button variant="outline" size="sm" onClick={() => signOut()}>
          Sair
        </Button>
      </header>

      <div className="max-w-4xl mx-auto p-4">
        <Tabs defaultValue="users">
          <TabsList className="mb-4">
            <TabsTrigger value="users" className="gap-2">
              <Users className="w-4 h-4" /> Usuários
            </TabsTrigger>
            <TabsTrigger value="presets" className="gap-2">
              <FileText className="w-4 h-4" /> Presets
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            {loadingData ? (
              <p className="text-muted-foreground text-sm">Carregando...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User ID</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.user_id + u.role}>
                      <TableCell className="font-mono text-xs">{u.user_id.slice(0, 12)}...</TableCell>
                      <TableCell>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${u.role === "admin" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                          {u.role}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleAdmin(u.user_id, u.role)}
                          disabled={u.user_id === user?.id && u.role === "admin"}
                        >
                          {u.role === "admin" ? "Remover Admin" : "Tornar Admin"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {users.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        Nenhum usuário encontrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          <TabsContent value="presets">
            {loadingData ? (
              <p className="text-muted-foreground text-sm">Carregando...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Tamanho</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {presets.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-semibold">{p.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.template_id}</TableCell>
                      <TableCell className="text-sm">{p.paper_size}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(p.created_at).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="destructive" size="sm" onClick={() => deletePreset(p.id)}>
                          <Trash2 className="w-3 h-3 mr-1" /> Excluir
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {presets.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        Nenhum preset encontrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
