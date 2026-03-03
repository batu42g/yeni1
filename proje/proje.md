PROJE TANIMI
Demo SaaS – Multi-Tenant CRM / Admin Panel Showcase
🎯 Projenin Amacı

Bu proje tamamen ücretsiz bir demo SaaS uygulamasıdır.
Amaç:

Next.js + Tailwind + Supabase bilgimi göstermek

Gerçek production seviyesinde SaaS mimarisi sergilemek

Potansiyel müşterilerin:

Authentication

Role-based access

Database ilişkileri

Realtime özellikler

Modern UI

Responsive tasarım

Deployment bilgimi görmesi

Bu bir landing page değil.
Gerçek çalışan bir sistemdir.

--TEKNOLOJİLER

Framework: Next.js (App Router)

Styling: TailwindCSS

Backend & DB: Supabase

Auth: Supabase Auth

Deployment: Vercel

Database: PostgreSQL (Supabase)

Realtime: Supabase Realtime

Grafikler: Recharts veya Chart.js

--GENEL MİMARİ
SaaS Modeli: Multi-Tenant

Her kullanıcı:

Bir “company” oluşturur.

Veriler company_id üzerinden ayrılır.

Her şirketin verisi diğerinden izole edilir.

Bu yapı Row Level Security (RLS) ile korunacaktır.

--VERİTABANI TASARIMI
1. companies
id (uuid, pk)
name (text)
created_at (timestamp)

2. users (Supabase auth ile bağlantılı)
id (uuid, pk)  → auth.users.id
company_id (uuid, fk)
role (text) → 'admin' | 'staff'
created_at

3. customers
id (uuid, pk)
company_id (uuid, fk)
name (text)
email (text)
phone (text)
status (text) → 'lead' | 'active' | 'inactive'
created_at

4. projects
id (uuid)
company_id
customer_id
title
description
status → 'pending' | 'in_progress' | 'completed'
budget
created_at

5. tasks
id
company_id
project_id
assigned_to (user_id)
title
status → 'todo' | 'doing' | 'done'
due_date
created_at

6. offers
id
company_id
customer_id
amount
status → 'pending' | 'approved' | 'rejected'
created_at

--RLS (GÜVENLİK KURALLARI)

Tüm tablolarda:

Kullanıcı sadece kendi company_id’sine ait verileri görebilir.

Staff sadece:

Kendine atanmış task’leri görebilir.

Admin:

Şirket içindeki tüm verileri görebilir.

Bu özellikle belirtilmeli.

--UYGULAMA MODÜLLERİ
1️⃣ Authentication

Email + password login

Register

Demo login butonu

Session yönetimi

Protected routes

2️⃣ Dashboard

Dashboard içermelidir:

Toplam müşteri sayısı

Aktif projeler

Bekleyen teklifler

Yapılacak görevler

Aylık proje grafiği

Veriler gerçek DB’den çekilmeli.

3️⃣ CRUD Modülleri

Her modülde:

Create

Edit

Delete

Search

Pagination

Modüller:

Customers

Projects

Tasks

Offers

Formlar modal veya ayrı sayfa olabilir.

4️⃣ Realtime Özellik

Tasks modülünde:

Yeni görev eklendiğinde liste anında güncellensin.

Status değiştiğinde kanban board otomatik güncellensin.

Supabase Realtime kullanılmalı.

5️⃣ Role-Based UI

Admin:

Tüm modülleri görebilir.

Staff:

Sadece kendi görevlerini görebilir.

Proje düzenleyemez.

UI rol bazlı condition rendering içermeli.

6️⃣ UI/UX Gereksinimleri

Sidebar layout

Responsive tasarım

Modern SaaS görünüm

Card yapıları

Yumuşak shadow

Rounded 2xl

Temiz grid sistem

Dark/Light mode (opsiyonel ama etkileyici)

ROUTE YAPISI
/login
/register
/dashboard
/customers
/projects
/tasks
/offers
/settings


App Router kullanılmalı.
Server Component + Client Component dengesi doğru kurulmalı.

--EKSTRA PROFESYONEL DETAYLAR

Loading skeleton

Error boundary

Toast notification

Optimistic UI update

Form validation (Zod önerilir)

Server Actions (Next 14+)

--AMAÇLANAN ETKİ

Bu proje şunları göstermeli:

Production-ready mimari

Gerçek SaaS mantığı

Backend bilgisi

Database relation tasarımı

Security awareness (RLS)

Clean code yapısı

Modern UI tasarımı

--PROJENİN TEMEL HEDEFİ

Bu uygulama:

Ücretsizdir.

Gerçek bir SaaS örneğidir.

Demo amaçlıdır.

Potansiyel müşterilere geliştiricinin teknik seviyesini göstermek için yapılmıştır.