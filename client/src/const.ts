import { toast } from "sonner";

export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

export const startLogin = () => {
  void import("@/lib/firebaseAuth")
    .then(({ startGoogleLogin }) => startGoogleLogin())
    .catch((error: unknown) => {
      const code = (error as { code?: string }).code;
      if (code === "auth/popup-closed-by-user") return;
      if (code === "auth/unauthorized-domain") {
        toast.error("Este endereço ainda não foi autorizado para login.");
        return;
      }
      toast.error(
        "Não foi possível abrir o Google. Tente novamente ou use o acesso por e-mail."
      );
    });
};
