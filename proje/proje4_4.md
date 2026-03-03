✅ TASK: Audit/Event Payload Standardization + Sensitive Data Hardening
🎯 Amaç

Audit UI şu an “old_value/new_value JSON dump” gösteriyor. Bu enterprise değil.
Bundan sonra audit kayıtları:

Alan bazlı diff (changes[]) üretecek

Allowlist ile sadece gerekli alanları tutacak

Denylist ile hassas/şişiren alanları kesinlikle tutmayacak/göstermeyecek

UI’da JSON dump yerine “Changes table” gösterecek

1) GLOBAL KURALLAR (Her Action İçin)
1.1 Kesinlikle TUTMA / GÖSTERME (Denylist)

Aşağıdaki alanlar audit metadata içinde hiç bulunmayacak. Varsa sanitize ile sil:

token, token_hash, access_token, refresh_token

password, secret, api_key

user_agent (UI’da default gösterme; gerekiyorsa sadece admin + masked)

ip (UI’da default gösterme; gerekiyorsa masked: 78.186.xxx.xxx)

created_at, updated_at (diff’te gürültü)

deleted_at, deleted_by (audit action zaten anlatır)

tüm full-row snapshot’lar (id/status/created_at gibi)

Kural: “Eski satırın tamamı” (old_value full object) audit’e koymak yasak.

1.2 Audit metadata formatı (Zorunlu Standart)

Her audit kaydı metadata’sı şu formatta olacak:

{
  "context": { ... },
  "changes": [
    { "field": "status", "old": "pending", "new": "revoked" }
  ]
}

context: hedefi anlamaya yetecek minimal bilgi

changes: sadece değişen alanlar

1.3 UI Render Standardı

Audit UI:

changes[] varsa: diff tablosu göster

old_value/new_value JSON dump göstermeyi kapat

context alanlarını “etiket” gibi göster (email, title vb)

2) INVITE_REVOKED (Davet iptali) – Doğru Payload

Mevcut yanlış örnek:

old_value içine invitation row’un tamamı basılıyor (id, company_id, invited_by, created_at, revoked_at vs.)

2.1 INVITE_REVOKED için TUTULACAK ALANLAR (Allowlist)

Context:

invite_id (maskeli gösterebilirsin: 6dd0…fb93)

email (opsiyonel mask: g***@gmail.com)

role

expires_at

Changes:

status: pending -> revoked

revoked_at: null -> timestamp (istersen UI’da göster)

revoked_by: null -> actor_user_id (istersen)

2.2 INVITE_REVOKED için TUTULMAYACAK ALANLAR

company_id

invited_by

created_at

accepted, accepted_at

tüm id’ler (tam haliyle) UI’da default görünmesin

full snapshot

2.3 Örnek Doğru metadata (INVITE_REVOKED)
{
  "context": {
    "invite_id": "6dd0...fb93",
    "email": "gbatuhan4672@gmail.com",
    "role": "staff",
    "expires_at": "2026-03-01T22:05:00.276137+00:00"
  },
  "changes": [
    { "field": "status", "old": "pending", "new": "revoked" }
  ]
}
3) PROJECT_UPDATED – Doğru Payload

Mevcut yanlış örnek:

new_value içine description dahil full payload dump

old_value minimal ama yine JSON dump

3.1 PROJECT_UPDATED için TUTULACAK ALANLAR (Allowlist)

Context:

project_id

title

customer_id (UI’da customer name varsa onu da context’e ekle)

Changes:

Sadece değişen alanlar:

status (pending -> in_progress)

budget değişmişse

title değişmişse

customer_id değişmişse

3.2 PROJECT_UPDATED için TUTULMAYACAK ALANLAR (Denylist)

description (tam metin) KESİNLİKLE audit’e girmez

Sebep: şişirir + PII kaçırır + projede zaten var

large text fields genel olarak audit’te tutulmaz

Eğer description değişimini izlemek gerekiyorsa:

sadece şu tutulur:

{ "field":"description", "old":"(redacted)", "new":"(redacted)" }

veya old_hash/new_hash (opsiyonel)

3.3 Örnek Doğru metadata (PROJECT_UPDATED)
{
  "context": {
    "project_id": "....",
    "title": "başlık",
    "customer_id": "d2a0...d232"
  },
  "changes": [
    { "field": "status", "old": "pending", "new": "in_progress" }
  ]
}
4) Uygulama Seviyesi Değişiklikler (Zorunlu)
4.1 Audit yazan fonksiyonları güncelle

Her action için:

DB’den “old” minimal allowlist snapshot çek

Update/insert sonrası “new” minimal allowlist snapshot çek

computeChanges(old, new, allowlist) ile changes[] üret

metadata’ya sadece context + changes yaz

4.2 Sanitize katmanı

sanitizeAuditMetadata() şu kuralları uygulayacak:

denylist alanlarını recursive sil

UUID’leri maskle (UI tarafında)

description gibi büyük metinleri drop/redact

JSON dump’u engelle

4.3 UI’da JSON dump kapat

Audit UI sadece:

action label

context chips

changes table
gösterir.

“old_value/new_value” ham render kaldırılacak.

5) Acceptance Criteria

INVITE_REVOKED audit kaydında artık full old_value yok

PROJECT_UPDATED audit kaydında description asla görünmüyor

Audit UI’da JSON dump yerine changes[] diff tablosu var

Token/token_hash asla görünmez

Export sadece sanitize edilmiş alanları içerir

Admin görür, staff görmez