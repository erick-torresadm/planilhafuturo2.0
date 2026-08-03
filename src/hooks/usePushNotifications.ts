import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";

/**
 * Registra o fluxo de notificações do admin + aviso de novo cadastro.
 *
 * - SEMPRE (qualquer usuário logado): chama `notificarCadastroSeNovo()` — no
 *   1º login de um usuário novo, o servidor dispara o push de "novo cadastro"
 *   para o admin (dedupe server-side).
 * - SÓ admin: pede permissão de notificação, assina Web Push com a chave VAPID
 *   pública e salva a subscription no servidor.
 *
 * O client nunca decide sozinho quem é admin: `isAdminLogado()`/`salvarPushSubscription`
 * validam o email logado no servidor.
 */
export function usePushNotifications() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    const run = async () => {
      // 1) Novo cadastro — roda para todos os usuários (dedupe no servidor).
      try {
        const m = await import("@/lib/push.functions");
        await m.notificarCadastroSeNovo();
      } catch {
        /* best-effort */
      }

      // 2) Fluxo de push do admin.
      let isAdmin = false;
      try {
        const m = await import("@/lib/push.functions");
        isAdmin = await m.isAdminLogado();
      } catch {
        return;
      }
      if (!isAdmin || cancelled) return;

      if (!("Notification" in window) || !("serviceWorker" in navigator)) return;
      if (Notification.permission === "denied") return;

      let permission: NotificationPermission = Notification.permission;
      if (permission === "default") {
        try {
          permission = await Notification.requestPermission();
        } catch {
          return;
        }
      }
      if (permission !== "granted" || cancelled) return;

      try {
        const m = await import("@/lib/push.functions");
        const vapid = await m.getVapidPublicKey();
        if (!vapid || cancelled) return;

        const reg = await navigator.serviceWorker.ready;
        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: vapid,
          });
        }
        if (cancelled || !sub) return;

        // p256dh/auth vêm como ArrayBuffer no objeto PushSubscription.
        const keys = (sub as any).toJSON?.()?.keys ?? {};
        await m.salvarPushSubscription({
          data: { endpoint: sub.endpoint, p256dh: keys.p256dh, auth: keys.auth },
        });
      } catch {
        /* permissão negada ou browser sem push — segue a vida */
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);
}
