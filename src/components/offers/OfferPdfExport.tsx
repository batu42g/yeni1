'use client'

import { useRef } from 'react'
import { Download } from 'lucide-react'

interface OfferPdfProps {
    offer: {
        id: string
        amount: number
        status: string
        created_at: string
        customers: { name: string; email: string; phone: string } | null
    }
    companyName: string
}

export function OfferPdfExport({ offer, companyName }: OfferPdfProps) {
    const handleExport = () => {
        const statusLabel = offer.status === 'approved' ? 'Onaylandı' : offer.status === 'rejected' ? 'Reddedildi' : 'Beklemede'
        const formattedDate = new Date(offer.created_at).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })
        const formattedAmount = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(offer.amount)

        const html = `
<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<title>Teklif - ${offer.id.slice(0, 8)}</title>
<style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', sans-serif; color: #1a1a2e; padding: 48px; background: #fff; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 48px; padding-bottom: 24px; border-bottom: 2px solid #e8e8ef; }
    .company { font-size: 24px; font-weight: 700; color: #0f0f1a; }
    .company-sub { font-size: 11px; color: #8b8ba0; margin-top: 4px; }
    .doc-title { text-align: right; }
    .doc-title h2 { font-size: 28px; color: #6366f1; letter-spacing: -0.5px; }
    .doc-title .date { font-size: 12px; color: #8b8ba0; margin-top: 4px; }
    .section { margin-bottom: 32px; }
    .section-title { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.2px; color: #8b8ba0; margin-bottom: 12px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .info-item { padding: 16px; background: #f8f8fc; border-radius: 8px; }
    .info-label { font-size: 11px; color: #8b8ba0; margin-bottom: 4px; }
    .info-value { font-size: 15px; font-weight: 600; color: #1a1a2e; }
    .amount-box { text-align: center; padding: 32px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 12px; color: #fff; margin: 32px 0; }
    .amount-box .label { font-size: 12px; opacity: 0.8; letter-spacing: 1px; text-transform: uppercase; }
    .amount-box .value { font-size: 36px; font-weight: 700; margin-top: 8px; }
    .status { display: inline-block; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .status.approved { background: #dcfce7; color: #16a34a; }
    .status.pending { background: #fef3c7; color: #d97706; }
    .status.rejected { background: #fecaca; color: #dc2626; }
    .footer { margin-top: 64px; padding-top: 16px; border-top: 1px solid #e8e8ef; text-align: center; font-size: 11px; color: #b0b0c0; }
</style>
</head><body>
    <div class="header">
        <div>
            <div class="company">${companyName}</div>
            <div class="company-sub">Teklif Dokümanı</div>
        </div>
        <div class="doc-title">
            <h2>TEKLİF</h2>
            <div class="date">${formattedDate}</div>
        </div>
    </div>
    <div class="section">
        <div class="section-title">Müşteri Bilgileri</div>
        <div class="info-grid">
            <div class="info-item">
                <div class="info-label">Ad / Ünvan</div>
                <div class="info-value">${offer.customers?.name || '-'}</div>
            </div>
            <div class="info-item">
                <div class="info-label">E-posta</div>
                <div class="info-value">${offer.customers?.email || '-'}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Telefon</div>
                <div class="info-value">${offer.customers?.phone || '-'}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Durum</div>
                <div class="info-value"><span class="status ${offer.status}">${statusLabel}</span></div>
            </div>
        </div>
    </div>
    <div class="amount-box">
        <div class="label">Teklif Tutarı</div>
        <div class="value">${formattedAmount}</div>
    </div>
    <div class="section">
        <div class="section-title">Teklif Detayları</div>
        <div class="info-grid">
            <div class="info-item">
                <div class="info-label">Teklif No</div>
                <div class="info-value">#${offer.id.slice(0, 8).toUpperCase()}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Tarih</div>
                <div class="info-value">${formattedDate}</div>
            </div>
        </div>
    </div>
    <div class="footer">
        Bu belge ${companyName} tarafından oluşturulmuştur. • ${formattedDate}
    </div>
</body></html>`

        const printWindow = window.open('', '_blank')
        if (printWindow) {
            printWindow.document.write(html)
            printWindow.document.close()
            setTimeout(() => {
                printWindow.print()
            }, 300)
        }
    }

    return (
        <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105"
            style={{
                background: 'var(--color-accent-glow)',
                color: 'var(--color-accent)',
                border: '1px solid rgba(0,229,160,0.2)',
            }}
        >
            <Download className="w-3.5 h-3.5" />
            PDF İndir
        </button>
    )
}
