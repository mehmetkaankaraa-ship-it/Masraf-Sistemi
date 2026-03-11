"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getClientById, updateClient } from "@/actions/clients"
import {
  User, Phone, Mail, CreditCard, MapPin, StickyNote,
  ArrowLeft, CheckCircle2, Loader2,
} from "lucide-react"
import Link from "next/link"

function Field({
  label, name, type = "text", placeholder, required, icon: Icon, defaultValue,
}: {
  label: string; name: string; type?: string; placeholder?: string;
  required?: boolean; icon?: React.ElementType; defaultValue?: string
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
        {required && <span className="text-red-400 font-normal">*</span>}
      </label>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue ?? ""}
        className="w-full px-3.5 py-2.5 text-sm bg-white border border-border rounded-xl outline-none
          focus:border-primary/60 focus:ring-2 focus:ring-primary/10 transition-all
          placeholder:text-muted-foreground/60"
      />
    </div>
  )
}

function TextAreaField({
  label, name, placeholder, rows = 3, icon: Icon, defaultValue,
}: {
  label: string; name: string; placeholder?: string; rows?: number;
  icon?: React.ElementType; defaultValue?: string
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </label>
      <textarea
        name={name}
        rows={rows}
        placeholder={placeholder}
        defaultValue={defaultValue ?? ""}
        className="w-full px-3.5 py-2.5 text-sm bg-white border border-border rounded-xl outline-none
          focus:border-primary/60 focus:ring-2 focus:ring-primary/10 transition-all resize-none
          placeholder:text-muted-foreground/60"
      />
    </div>
  )
}

function Section({
  title, description, children,
}: {
  title: string; description?: string; children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl border card-shadow overflow-hidden">
      <div className="px-6 py-4 border-b bg-muted/20">
        <h2 className="text-[13px] font-semibold text-foreground">{title}</h2>
        {description && (
          <p className="text-[12px] text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  )
}

export default function EditClientPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [client, setClient] = useState<Awaited<ReturnType<typeof getClientById>>>(null)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    getClientById(params.id).then((c) => {
      if (!c) router.push("/clients")
      else { setClient(c); setFetching(false) }
    })
  }, [params.id, router])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const fd = new FormData(e.currentTarget)
      const payload = {
        name: String(fd.get("name") ?? "").trim(),
        phone: String(fd.get("phone") ?? "").trim() || undefined,
        email: String(fd.get("email") ?? "").trim() || undefined,
        taxId: String(fd.get("taxId") ?? "").trim() || undefined,
        address: String(fd.get("address") ?? "").trim() || undefined,
        notes: String(fd.get("notes") ?? "").trim() || undefined,
      }

      const res = await updateClient(params.id, payload)
      if (!res.success) { setError(res.error); return }

      setSuccess(true)
      setTimeout(() => router.push(`/clients/${params.id}`), 600)
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!client) return null

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <Link
        href={`/clients/${params.id}`}
        className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {client.name}
      </Link>

      <div>
        <h1 className="text-lg font-semibold text-foreground">Müvekkil Düzenle</h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">
          Müvekkil bilgilerini güncelleyin.
        </p>
      </div>

      {error && (
        <div className="rounded-xl px-4 py-3 text-sm bg-red-50 text-red-700 border border-red-200">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <Section title="Kimlik Bilgileri" description="Müvekkili tanımlayan temel bilgiler">
          <div className="space-y-4">
            <Field
              label="Ad Soyad / Şirket Adı" name="name" required
              placeholder="Ahmet Yılmaz veya XYZ Hukuk A.Ş." icon={User}
              defaultValue={client.name}
            />
            <Field
              label="TC / Vergi No" name="taxId" placeholder="11223344556"
              icon={CreditCard} defaultValue={client.taxId ?? ""}
            />
          </div>
        </Section>

        <Section title="İletişim Bilgileri" description="Telefon ve e-posta adres bilgileri">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field
              label="Telefon" name="phone" type="tel"
              placeholder="+90 5xx xxx xx xx" icon={Phone}
              defaultValue={client.phone ?? ""}
            />
            <Field
              label="E-posta" name="email" type="email"
              placeholder="ornek@email.com" icon={Mail}
              defaultValue={client.email ?? ""}
            />
          </div>
        </Section>

        <Section title="Adres Bilgileri" description="Yazışma ve tebligat adresi">
          <TextAreaField
            label="Adres" name="address" rows={3}
            placeholder="Cadde, Sokak, Bina No, İlçe, İl..." icon={MapPin}
            defaultValue={client.address ?? ""}
          />
        </Section>

        <Section title="Notlar ve Ek Bilgiler" description="İç notlar, hatırlatmalar veya ek bilgiler">
          <TextAreaField
            label="Notlar" name="notes" rows={3}
            placeholder="Bu müvekkile ait önemli notlar..." icon={StickyNote}
            defaultValue={client.notes ?? ""}
          />
        </Section>

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={loading || success}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-xl hover:opacity-90 transition-all disabled:opacity-60 shadow-sm"
          >
            {success ? (
              <><CheckCircle2 className="h-4 w-4" /> Güncellendi!</>
            ) : loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Kaydediliyor...</>
            ) : "Kaydet"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-5 py-2.5 bg-white border text-foreground text-sm font-medium rounded-xl hover:bg-accent transition-all"
          >
            İptal
          </button>
        </div>
      </form>
    </div>
  )
}
