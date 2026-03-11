// src/components/admin/SourceAccountsManager.tsx
'use client'

import { useState } from 'react'
import { useToast } from '@/components/ui/use-toast'
import {
  createSourceAccount, updateSourceAccount, toggleSourceAccount, deleteSourceAccount,
} from '@/actions/advances'
import { Building2, Plus, Pencil, Power, Trash2, Check, X } from 'lucide-react'

interface Account {
  id: string
  name: string
  description: string | null
  isActive: boolean
  usageCount: number
  createdAt: Date
}

interface Props {
  initialAccounts: Account[]
}

export function SourceAccountsManager({ initialAccounts }: Props) {
  const [accounts, setAccounts] = useState(initialAccounts)
  const [loading, setLoading] = useState<string | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [adding, setAdding] = useState(false)
  const { toast } = useToast()

  async function handleAdd() {
    if (!newName.trim()) return
    setLoading('add')
    const res = await createSourceAccount({ name: newName.trim(), description: newDesc.trim() || undefined })
    setLoading(null)
    if (!res.success) { toast({ title: 'Hata', description: res.error, variant: 'destructive' }); return }
    toast({ title: 'Hesap eklendi' })
    setNewName(''); setNewDesc(''); setAdding(false)
    // Re-fetch via router.refresh alternative: just reload
    window.location.reload()
  }

  async function handleSaveEdit(id: string) {
    if (!editName.trim()) return
    setLoading(id)
    const res = await updateSourceAccount(id, { name: editName.trim(), description: editDesc.trim() || undefined })
    setLoading(null)
    if (!res.success) { toast({ title: 'Hata', description: res.error, variant: 'destructive' }); return }
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, name: editName, description: editDesc || null } : a))
    setEditId(null)
    toast({ title: 'Güncellendi' })
  }

  async function handleToggle(id: string) {
    setLoading(id + '_toggle')
    const res = await toggleSourceAccount(id)
    setLoading(null)
    if (!res.success) { toast({ title: 'Hata', description: res.error, variant: 'destructive' }); return }
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, isActive: !a.isActive } : a))
  }

  async function handleDelete(id: string, usageCount: number) {
    if (usageCount > 0) {
      toast({ title: 'Devre dışı bırakıldı', description: 'Transfer kayıtları olduğu için hesap devre dışı bırakıldı.' })
    } else {
      if (!confirm('Bu hesabı silmek istediğinizden emin misiniz?')) return
    }
    setLoading(id + '_del')
    const res = await deleteSourceAccount(id)
    setLoading(null)
    if (!res.success) { toast({ title: 'Hata', description: res.error, variant: 'destructive' }); return }
    if (usageCount > 0) {
      setAccounts(prev => prev.map(a => a.id === id ? { ...a, isActive: false } : a))
    } else {
      setAccounts(prev => prev.filter(a => a.id !== id))
    }
    toast({ title: 'İşlendi' })
  }

  const inputCls = 'border rounded-xl px-3 py-2 text-[13px] bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all'

  return (
    <div className="bg-white rounded-2xl border card-shadow overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-[13px] font-semibold text-foreground">Hesap Listesi</h2>
        </div>
        <button
          onClick={() => setAdding(v => !v)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-[12px] font-medium rounded-xl hover:opacity-90 transition-all"
        >
          <Plus className="h-3.5 w-3.5" />Yeni Hesap
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <div className="px-5 py-4 bg-muted/20 border-b flex flex-col sm:flex-row gap-3 items-start sm:items-end">
          <div className="flex-1 min-w-0">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Hesap Adi *</label>
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ornek: Ziraat TL Hesap" className={`${inputCls} w-full`} />
          </div>
          <div className="flex-1 min-w-0">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Açıklama</label>
            <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Opsiyonel..." className={`${inputCls} w-full`} />
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={handleAdd} disabled={loading === 'add'} className="px-4 py-2 bg-primary text-primary-foreground text-[12px] font-medium rounded-xl hover:opacity-90 disabled:opacity-60 transition-all flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5" />{loading === 'add' ? 'Ekleniyor...' : 'Ekle'}
            </button>
            <button onClick={() => { setAdding(false); setNewName(''); setNewDesc('') }} className="px-3 py-2 border text-[12px] text-muted-foreground rounded-xl hover:bg-muted transition-all">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {accounts.length === 0 ? (
        <div className="px-5 py-10 text-center text-[13px] text-muted-foreground">Henüz hesap yok.</div>
      ) : (
        <div className="divide-y divide-border/60">
          {accounts.map(acct => (
            <div key={acct.id} className={`px-5 py-4 hover:bg-muted/10 transition-colors ${!acct.isActive ? 'opacity-50' : ''}`}>
              {editId === acct.id ? (
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
                  <div className="flex-1">
                    <input value={editName} onChange={e => setEditName(e.target.value)} className={`${inputCls} w-full`} />
                  </div>
                  <div className="flex-1">
                    <input value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Açıklama..." className={`${inputCls} w-full`} />
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => handleSaveEdit(acct.id)} disabled={loading === acct.id} className="px-3 py-2 bg-primary text-primary-foreground text-[12px] rounded-xl hover:opacity-90 disabled:opacity-60 transition-all flex items-center gap-1">
                      <Check className="h-3.5 w-3.5" />Kaydet
                    </button>
                    <button onClick={() => setEditId(null)} className="px-3 py-2 border text-[12px] text-muted-foreground rounded-xl hover:bg-muted transition-all">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-[13px] font-medium text-foreground">{acct.name}</span>
                      {!acct.isActive && (
                        <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Devre disi</span>
                      )}
                      <span className="text-[10px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded-full">{acct.usageCount} transfer</span>
                    </div>
                    {acct.description && <p className="text-[11px] text-muted-foreground mt-0.5 ml-5">{acct.description}</p>}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => { setEditId(acct.id); setEditName(acct.name); setEditDesc(acct.description ?? '') }}
                      className="w-7 h-7 rounded-lg border hover:bg-accent flex items-center justify-center transition-colors"
                      title="Düzenle"
                    >
                      <Pencil className="h-3 w-3 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => handleToggle(acct.id)}
                      disabled={loading === acct.id + '_toggle'}
                      className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-colors ${acct.isActive ? 'hover:bg-orange-50 hover:border-orange-200' : 'hover:bg-emerald-50 hover:border-emerald-200'}`}
                      title={acct.isActive ? 'Devre dışı bırak' : 'Aktifleştir'}
                    >
                      <Power className={`h-3 w-3 ${acct.isActive ? 'text-orange-500' : 'text-emerald-500'}`} />
                    </button>
                    <button
                      onClick={() => handleDelete(acct.id, acct.usageCount)}
                      disabled={loading === acct.id + '_del'}
                      className="w-7 h-7 rounded-lg border hover:bg-red-50 hover:border-red-200 flex items-center justify-center transition-colors"
                      title="Sil"
                    >
                      <Trash2 className="h-3 w-3 text-rose-400" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
