import { useEffect, useRef, useState } from 'react'
import { addDoc, collection, deleteDoc, doc, limit, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore'
import { db } from '../../services/firebase'
import { useAuth } from '../../hooks/useAuth'
import Avatar from './Avatar'
import Icon from './Icon'

const QUICK = ['¡Vaya birdie! 🔥', 'Ese capitán… 😂', 'Esta semana es mía 🏆', 'Mi equipo despierta mañana 💤']

const timeFormat = new Intl.DateTimeFormat('es-ES', { weekday: 'short', hour: '2-digit', minute: '2-digit' })

// Vestuario: chat de la liga para picarse durante el torneo
export default function LockerRoom({ leagueId }) {
  const { user, profile } = useAuth()
  const [messages, setMessages] = useState(null)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const listRef = useRef(null)

  useEffect(() => {
    const q = query(collection(db, 'leagues', leagueId, 'messages'), orderBy('createdAt', 'desc'), limit(50))
    return onSnapshot(q, (snap) => setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })).reverse()), () => setMessages([]))
  }, [leagueId])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  async function send(value) {
    const body = value.trim().slice(0, 280)
    if (!body) return
    setSending(true)
    try {
      await addDoc(collection(db, 'leagues', leagueId, 'messages'), {
        uid: user.uid,
        displayName: profile?.displayName ?? user.displayName ?? 'Jugador',
        color: profile?.color ?? null,
        text: body,
        createdAt: serverTimestamp(),
      })
      setText('')
    } catch (err) {
      console.error('No se pudo enviar:', err)
    }
    setSending(false)
  }

  return (
    <section className="card mt-6 animate-fade-up p-4">
      <h2 className="headline px-1 text-[1.8rem]">Vestuario</h2>
      <p className="mb-3 px-1 text-xs text-muted">Solo lo ven los de la liga · aquí se cuenta en directo lo que pasa en el torneo</p>

      <ol ref={listRef} className="flex max-h-96 flex-col gap-2.5 overflow-y-auto px-1 py-1">
        {messages?.length === 0 && <li className="py-6 text-center text-sm text-muted">Nadie ha dicho nada todavía. Rompe el hielo.</li>}
        {messages?.map((m) => {
          // Mensajes del motor: lo que pasa en el torneo (cierre, eagles, líder, ganador)
          if (m.uid === 'system') {
            return (
              <li key={m.id} className="my-1 flex justify-center">
                <p className="max-w-[92%] rounded-2xl bg-pine/10 px-3.5 py-2 text-center text-[0.82rem] leading-snug font-medium text-pine dark:bg-pine/30">
                  {m.text}
                  <span className="mt-0.5 block text-[0.62rem] font-normal text-muted">{m.createdAt ? timeFormat.format(m.createdAt.toDate()) : ''}</span>
                </p>
              </li>
            )
          }
          const mine = m.uid === user.uid
          return (
            <li key={m.id} className={`group flex items-end gap-2 ${mine ? 'flex-row-reverse' : ''}`}>
              {!mine && <Avatar name={m.displayName} color={m.color} uid={m.uid} size="sm" />}
              <div className={`max-w-[78%] rounded-2xl px-3.5 py-2 ${mine ? 'rounded-br-md bg-pine text-white' : 'rounded-bl-md bg-bg'}`}>
                {!mine && <p className="text-[0.7rem] font-semibold text-pine">{m.displayName}</p>}
                <p className="text-[0.92rem] leading-snug break-words whitespace-pre-wrap">{m.text}</p>
                <p className={`mt-0.5 text-[0.62rem] ${mine ? 'text-white/60' : 'text-faint'}`}>{m.createdAt ? timeFormat.format(m.createdAt.toDate()) : 'enviando…'}</p>
              </div>
              {mine && (
                <button onClick={() => deleteDoc(doc(db, 'leagues', leagueId, 'messages', m.id))} className="p-1 text-faint opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100" aria-label="Borrar mensaje">
                  <Icon name="close" className="size-3.5" />
                </button>
              )}
            </li>
          )
        })}
      </ol>

      <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
        {QUICK.map((q) => (
          <button key={q} onClick={() => send(q)} disabled={sending} className="h-8 shrink-0 rounded-full bg-bg px-3 text-xs font-medium text-pine transition-colors hover:bg-track">{q}</button>
        ))}
      </div>
      <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); send(text) }}>
        <input className="input-field bg-bg" placeholder="Escribe algo…" value={text} onChange={(e) => setText(e.target.value)} maxLength={280} aria-label="Mensaje" />
        <button type="submit" className="flex size-12 shrink-0 items-center justify-center rounded-full bg-pine text-white disabled:opacity-45" disabled={sending || !text.trim()} aria-label="Enviar">
          <Icon name="arrow" />
        </button>
      </form>
    </section>
  )
}
