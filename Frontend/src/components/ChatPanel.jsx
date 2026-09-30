import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeftIcon,
  MessageSquareIcon,
  SendIcon,
  XIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/store/authStore';
import { useChatStore } from '@/store/chatStore';
import { MAX_TEXT_LEN } from '@/lib/chatCodec';

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function initials(name) {
  return (name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}

// Floating chat panel. Mounted once per dashboard (keeps polling alive while
// closed for the unread badge) and rendered null when hidden.
function ChatPanel() {
  const open = useChatStore((s) => s.open);
  const activeId = useChatStore((s) => s.activeId);
  const threads = useChatStore((s) => s.threads);
  const sending = useChatStore((s) => s.sending);
  const error = useChatStore((s) => s.error);
  const role = useAuthStore((s) => s.user?.role) || 'employee';

  const [draft, setDraft] = useState('');
  const endRef = useRef(null);

  useEffect(() => {
    const store = useChatStore.getState();
    store.startPolling();
    return () => store.stopPolling();
  }, []);

  const thread = threads.find((t) => t.id === activeId) || null;
  const messages = thread ? thread.msgs : [];
  const isAdminList = role === 'admin' && !thread;
  const showComposer = role === 'employee' || !!thread;

  // Follow new messages while the panel is open (DOM effect, no state).
  useEffect(() => {
    if (open && endRef.current) {
      endRef.current.scrollIntoView({ block: 'end' });
    }
  }, [open, activeId, messages.length]);

  async function handleSend() {
    const value = draft.trim();
    if (!value || sending) return;
    setDraft('');
    const ok = await useChatStore.getState().send(value);
    if (!ok) setDraft(value); // restore so the text is not lost
  }

  if (!open) return null;

  return (
    <section
      aria-label="Chat"
      className="fixed right-4 top-16 z-50 flex h-[28rem] max-h-[calc(100vh-5rem)] w-96 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
    >
      <header className="flex items-center gap-2 border-b bg-muted/30 px-3 py-2.5">
        {role === 'admin' && thread && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Back to conversations"
            onClick={() => useChatStore.getState().closeThread()}
          >
            <ArrowLeftIcon />
          </Button>
        )}
        {(!thread || isAdminList) && (
          <MessageSquareIcon className="size-4 text-primary" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">
            {isAdminList
              ? 'Messages'
              : thread
                ? thread.title
                : 'Conversation'}
          </p>
          {thread && (
            <p className="truncate text-xs text-muted-foreground">
              {role === 'admin' ? thread.email : 'Team admin'}
            </p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Close chat"
          onClick={() => useChatStore.getState().toggle()}
        >
          <XIcon />
        </Button>
      </header>

      {isAdminList ? (
        <div className="flex-1 overflow-y-auto">
          {threads.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              No employees yet — add one to start chatting.
            </p>
          ) : (
            threads.map((t) => (
              <button
                key={t.id}
                type="button"
                className="flex w-full items-center gap-3 border-b px-3 py-2.5 text-left last:border-b-0 hover:bg-muted/50"
                onClick={() => useChatStore.getState().openThread(t.id)}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {initials(t.title)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium text-foreground">
                      {t.title}
                    </span>
                    {t.unread > 0 && (
                      <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                        {t.unread}
                      </span>
                    )}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {t.msgs.length > 0 ? t.msgs[t.msgs.length - 1].t : t.email}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      ) : (
        <div className="flex-1 space-y-2 overflow-y-auto p-3">
          {!thread && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Loading conversation...
            </p>
          )}
          {thread && messages.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No messages yet — say hi.
            </p>
          )}
          {messages.map((m) =>
            m.system ? (
              <div key={m.id} className="flex justify-center">
                <p className="max-w-[90%] rounded-lg border border-dashed border-border bg-muted/50 px-3 py-1.5 text-center text-xs italic text-muted-foreground">
                  {m.t}
                </p>
              </div>
            ) : (
              <div
                key={m.id}
                className={`flex ${m.by === role ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-1.5 text-sm ${
                    m.by === role
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-border bg-muted text-foreground'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{m.t}</p>
                  <p
                    className={`mt-0.5 text-right text-[10px] ${
                      m.by === role
                        ? 'text-primary-foreground/70'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {formatTime(m.ts)}
                  </p>
                </div>
              </div>
            )
          )}
          <div ref={endRef} />
        </div>
      )}

      {error && (
        <p className="border-t px-3 py-1 text-xs text-destructive">{error}</p>
      )}

      {showComposer && (
        <form
          className="flex items-center gap-2 border-t p-3"
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
        >
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type a message..."
            maxLength={MAX_TEXT_LEN}
            disabled={sending}
            aria-label="Message"
          />
          <Button
            type="submit"
            size="icon-sm"
            aria-label="Send message"
            disabled={sending || !draft.trim()}
            onClick={handleSend}
          >
            <SendIcon />
          </Button>
        </form>
      )}
    </section>
  );
}

export default ChatPanel;
