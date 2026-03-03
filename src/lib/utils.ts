

export function parseUTCDate(dateString: string): Date {
    if (!dateString) return new Date();
    // Append 'Z' to force UTC parsing if missing
    const hasTimezone = /(Z|[+-]\d{2}:\d{2})$/.test(dateString);
    const dateToParse = hasTimezone ? dateString : `${dateString}Z`;
    return new Date(dateToParse);
}

export function formatDate(dateString: string): string {
    return new Intl.DateTimeFormat('tr-TR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    }).format(parseUTCDate(dateString))
}

export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount)
}

export function getStatusBadgeClass(status: string): string {
    const map: Record<string, string> = {
        active: 'badge-success',
        lead: 'badge-info',
        inactive: 'badge-neutral',
        pending: 'badge-warning',
        in_progress: 'badge-info',
        completed: 'badge-success',
        todo: 'badge-neutral',
        doing: 'badge-info',
        done: 'badge-success',
        approved: 'badge-success',
        rejected: 'badge-danger',
    }
    return map[status] || 'badge-neutral'
}

export function getStatusLabel(status: string): string {
    const map: Record<string, string> = {
        active: 'Aktif',
        lead: 'Aday',
        inactive: 'Pasif',
        pending: 'Beklemede',
        in_progress: 'Devam Ediyor',
        completed: 'Tamamlandı',
        todo: 'Yapılacak',
        doing: 'Yapılıyor',
        done: 'Tamamlandı',
        approved: 'Onaylandı',
        rejected: 'Reddedildi',
    }
    return map[status] || status
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
    return classes.filter(Boolean).join(' ')
}
